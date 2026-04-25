import React, { useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, Pane } from 'react-leaflet';
import L from 'leaflet';
import type { Runner, PositionPoint } from '../lib/types';
import { getRoute } from '../lib/api';
import { supabase } from '../lib/supabase';
import { resolveRunnerImageUrl } from '../lib/imageAssets';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const RUNNER_COLORS = [
  '#ef4444', '#3b82f6', '#16a34a', '#eab308',
  '#a855f7', '#ec4899', '#14b8a6', '#f97316',
];

export function runnerColor(idx: number): string {
  return RUNNER_COLORS[idx % RUNNER_COLORS.length];
}

// Balaton overview - roughly covers the whole lake
const BALATON_BOUNDS: L.LatLngBoundsLiteral = [
  [46.68, 17.22], // SW (near Keszthely)
  [47.05, 18.22], // NE (near Balatonkenese)
];

function makeRunnerIcon(color: string, isActive: boolean, imgUrl: string | null, markerScale: number): L.DivIcon {
  const baseSize = isActive ? 46 : 30;
  const size = Math.round(baseSize * markerScale);
  const border = Math.max(2, Math.round((isActive ? 3 : 2) * Math.min(markerScale, 1.8)));
  const inner = imgUrl
    ? `<img src="${imgUrl}" alt="" style="width:100%;height:100%;object-fit:cover;" />`
    : `<div style="width:100%;height:100%;background:${color};"></div>`;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;
      border:${border}px solid ${color};
      box-shadow:0 4px 10px rgba(0,0,0,0.3);background:#fff;
      ${isActive ? 'animation: glow 1.8s infinite;' : ''}
    ">${inner}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

type CameraMode = 'follow' | 'overview';

/**
 * Camera controller: cycles between following the active runner and showing Balaton overview.
 * Pauses automatic panning when user manually drags the map, resumes after 15s of no interaction.
 */
function CameraController({
  cameraMode,
  followPosition,
  followZoom,
  overviewBounds,
  overviewZoomOffset,
}: {
  cameraMode: CameraMode;
  followPosition: [number, number] | null;
  followZoom: number;
  overviewBounds: L.LatLngBoundsLiteral;
  overviewZoomOffset: number;
}) {
  const map = useMap();
  const userInteractingRef = useRef(false);
  const userInteractionTimeoutRef = useRef<number | null>(null);
  const autoMoveUntilRef = useRef(0);

  // Track user interaction so auto-pan doesn't fight them
  useEffect(() => {
    const markInteracting = () => {
      if (Date.now() < autoMoveUntilRef.current) return;
      userInteractingRef.current = true;
      if (userInteractionTimeoutRef.current !== null) {
        window.clearTimeout(userInteractionTimeoutRef.current);
      }
      userInteractionTimeoutRef.current = window.setTimeout(() => {
        userInteractingRef.current = false;
      }, 15_000); // resume auto-cam after 15s idle
    };

    map.on('dragstart', markInteracting);
    map.on('zoomstart', markInteracting);
    return () => {
      map.off('dragstart', markInteracting);
      map.off('zoomstart', markInteracting);
      if (userInteractionTimeoutRef.current !== null) {
        window.clearTimeout(userInteractionTimeoutRef.current);
      }
    };
  }, [map]);

  // Apply the camera mode
  useEffect(() => {
    if (userInteractingRef.current) return;

    if (cameraMode === 'follow' && followPosition) {
      autoMoveUntilRef.current = Date.now() + 2_500;
      map.flyTo(followPosition, followZoom, { duration: 1.2, animate: true });
    } else if (cameraMode === 'overview') {
      const bounds = L.latLngBounds(overviewBounds);
      const baseZoom = map.getBoundsZoom(bounds, false, L.point(40, 40));
      const targetZoom = Math.min(18, baseZoom + overviewZoomOffset);
      autoMoveUntilRef.current = Date.now() + 2_500;
      map.flyTo(bounds.getCenter(), targetZoom, { duration: 1.2, animate: true });
    }
  }, [cameraMode, followPosition, followZoom, map, overviewBounds, overviewZoomOffset]);

  return null;
}

interface Props {
  runners: Runner[];
  followRunnerId: string | null;
  defaultCenter?: [number, number];
  /** Pass a raceId to listen to reset broadcasts and purge the polyline cache. */
  raceId?: string;
  /** If true, cycles camera: 40s follow active runner -> 20s Balaton overview, repeat. */
  autoPanCycle?: boolean;
  /** If true, locks camera to Balaton overview (used when race is finished). */
  forceOverview?: boolean;
  /** Overview bounds for the cycle. Defaults to Balaton. */
  overviewBounds?: L.LatLngBoundsLiteral;
  /** Marker icon scale factor (1 = normal). */
  markerScale?: number;
  /** Zoom level used in active follow mode. */
  followZoom?: number;
  /** Additional zoom for overview mode (0.5 = half step in). */
  overviewZoomOffset?: number;
}

export default function RaceMap({
  runners,
  followRunnerId,
  defaultCenter,
  raceId,
  autoPanCycle = false,
  forceOverview = false,
  overviewBounds = BALATON_BOUNDS,
  markerScale = 1,
  followZoom = 17,
  overviewZoomOffset = 0,
}: Props) {
  const [routes, setRoutes] = useState<Map<string, PositionPoint[]>>(new Map());
  const [cameraMode, setCameraMode] = useState<CameraMode>('follow');

  // Lock to overview when race is finished
  useEffect(() => {
    if (forceOverview) setCameraMode('overview');
  }, [forceOverview]);

  // Camera cycle timer: 40s follow -> 20s overview -> repeat
  useEffect(() => {
    if (!autoPanCycle || forceOverview) return;
    setCameraMode('follow');
    let active = true;

    const cycle = async () => {
      while (active) {
        setCameraMode('follow');
        await wait(40_000);
        if (!active) return;
        setCameraMode('overview');
        await wait(20_000);
      }
    };
    cycle();
    return () => { active = false; };
  }, [autoPanCycle, forceOverview]);

  // Load each runner's historical route once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = new Map(routes);
      for (const r of runners) {
        if (!next.has(r.id)) {
          try {
            const pts = await getRoute(r.id);
            if (!cancelled) next.set(r.id, pts);
          } catch { /* ignore */ }
        }
      }
      if (!cancelled) setRoutes(new Map(next));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runners.map((r) => r.id).join(',')]);

  // Listen to race_reset broadcast - purge polyline cache
  useEffect(() => {
    if (!raceId) return;
    const channel = supabase
      .channel(`race-${raceId}-map`)
      .on('broadcast', { event: 'race_reset' }, () => {
        setRoutes(new Map());
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [raceId]);

  // Append live points from runner.last_lat/lon changes
  useEffect(() => {
    setRoutes((prev) => {
      const next = new Map(prev);
      for (const r of runners) {
        if (r.last_lat == null || r.last_lon == null) continue;
        const existing = next.get(r.id) ?? [];
        const last = existing[existing.length - 1];
        if (!last || last.lat !== r.last_lat || last.lon !== r.last_lon) {
          next.set(r.id, [...existing, { lat: r.last_lat, lon: r.last_lon }]);
        }
      }
      return next;
    });
  }, [runners]);

  const followPos = useMemo((): [number, number] | null => {
    if (!followRunnerId) return null;
    const r = runners.find((x) => x.id === followRunnerId);
    if (!r?.last_lat || !r?.last_lon) return null;
    return [r.last_lat, r.last_lon];
  }, [runners, followRunnerId]);

  const initialCenter = useMemo((): [number, number] => {
    const withPos = runners.find((r) => r.last_lat && r.last_lon);
    if (withPos) return [withPos.last_lat!, withPos.last_lon!];
    return defaultCenter ?? [46.8495, 17.7285];
  }, [runners, defaultCenter]);

  return (
    <MapContainer
      center={initialCenter}
      zoom={13}
      zoomSnap={0.5}
      zoomDelta={0.5}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      <Pane name="labels" style={{ zIndex: 450, pointerEvents: 'none' }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          pane="labels"
          opacity={0.95}
          maxZoom={20}
        />
      </Pane>
      {runners.map((runner, idx) => {
        const color = runnerColor(idx);
        const pts = routes.get(runner.id) ?? [];
        const positions: [number, number][] = pts.map((p) => [p.lat, p.lon]);
        const hasPos = runner.last_lat != null && runner.last_lon != null;
        const runnerImgUrl = resolveRunnerImageUrl(runner.img_url);
        const lineScale = Math.min(2.4, Math.max(1.1, markerScale));
        const trackWeight = (runner.is_active ? 6 : 4) * lineScale;
        return (
          <React.Fragment key={runner.id}>
            {positions.length > 1 && (
              <>
                <Polyline
                  positions={positions}
                  pathOptions={{
                    color: '#0b1020',
                    weight: trackWeight + 4,
                    opacity: 0.42,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
                <Polyline
                  positions={positions}
                  pathOptions={{
                    color,
                    weight: trackWeight,
                    opacity: runner.is_active ? 0.98 : 0.8,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              </>
            )}
            {hasPos && (
              <Marker
                position={[runner.last_lat!, runner.last_lon!]}
                icon={makeRunnerIcon(color, runner.is_active, runnerImgUrl, markerScale)}
              >
                <Popup>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, minWidth: 140 }}>
                    <strong style={{ color, fontSize: 14 }}>{runner.name}</strong>
                    <br />
                    <span style={{ color: '#6b7280' }}>
                      {runner.logged_dist.toFixed(2)} / {runner.target_dist} km
                    </span>
                    {runner.is_active && <><br /><span style={{ color: 'var(--active)' }}>● Most fut / Active</span></>}
                    {runner.is_finished && <><br /><span style={{ color: 'var(--success)' }}>✓ Kész / Finished</span></>}
                  </div>
                </Popup>
              </Marker>
            )}
          </React.Fragment>
        );
      })}

      {autoPanCycle ? (
        <CameraController
          cameraMode={cameraMode}
          followPosition={followPos}
          followZoom={followZoom}
          overviewBounds={overviewBounds}
          overviewZoomOffset={overviewZoomOffset}
        />
      ) : (
        <ManualFollower position={followPos} />
      )}
    </MapContainer>
  );
}

function ManualFollower({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.panTo(position, { animate: true, duration: 0.8 });
  }, [position, map]);
  return null;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
