import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Runner, PositionPoint } from '../lib/types';
import { getRoute } from '../lib/api';

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

function makeRunnerIcon(color: string, isActive: boolean, imgUrl: string | null): L.DivIcon {
  const size = isActive ? 46 : 30;
  const inner = imgUrl
    ? `<img src="${imgUrl}" alt="" style="width:100%;height:100%;object-fit:cover;" />`
    : `<div style="width:100%;height:100%;background:${color};"></div>`;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;
      border:${isActive ? '3px' : '2px'} solid ${color};
      box-shadow:0 4px 10px rgba(0,0,0,0.3);background:#fff;
      ${isActive ? 'animation: glow 1.8s infinite;' : ''}
    ">${inner}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function MapFollower({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.panTo(position, { animate: true, duration: 0.8 });
  }, [position, map]);
  return null;
}

interface Props {
  runners: Runner[];
  followRunnerId: string | null;
  defaultCenter?: [number, number];
}

export default function RaceMap({ runners, followRunnerId, defaultCenter }: Props) {
  const [routes, setRoutes] = useState<Map<string, PositionPoint[]>>(new Map());

  // Fetch each runner's historical route once
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

  // Append live points from runner.last_lat/lon changes (no need for separate subscription)
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

  const center = useMemo((): [number, number] => {
    const withPos = runners.find((r) => r.last_lat && r.last_lon);
    if (withPos) return [withPos.last_lat!, withPos.last_lon!];
    return defaultCenter ?? [46.8495, 17.7285]; // Balaton
  }, [runners, defaultCenter]);

  return (
    <MapContainer center={center} zoom={13} style={{ width: '100%', height: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      {runners.map((runner, idx) => {
        const color = runnerColor(idx);
        const pts = routes.get(runner.id) ?? [];
        const positions: [number, number][] = pts.map((p) => [p.lat, p.lon]);
        const hasPos = runner.last_lat != null && runner.last_lon != null;
        return (
          <React.Fragment key={runner.id}>
            {positions.length > 1 && (
              <Polyline
                positions={positions}
                pathOptions={{
                  color,
                  weight: runner.is_active ? 5 : 3,
                  opacity: runner.is_active ? 0.95 : 0.55,
                }}
              />
            )}
            {hasPos && (
              <Marker
                position={[runner.last_lat!, runner.last_lon!]}
                icon={makeRunnerIcon(color, runner.is_active, runner.img_url)}
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
      <MapFollower position={followPos} />
    </MapContainer>
  );
}
