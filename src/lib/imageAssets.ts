import daniImg from '../assets/Dani.png';
import mateImg from '../assets/Mate.png';
import petiImg from '../assets/Peti.png';
import robiImg from '../assets/Robi.png';
import somaImg from '../assets/Soma.png';
import tomiImg from '../assets/Tomi.png';
import foxconnLogoImg from '../assets/foxconn-logo.png';

type AssetEntry = { key: string; url: string };

const ASSET_ENTRIES: AssetEntry[] = [
  { key: 'Dani.png', url: daniImg },
  { key: 'Mate.png', url: mateImg },
  { key: 'Peti.png', url: petiImg },
  { key: 'Robi.png', url: robiImg },
  { key: 'Soma.png', url: somaImg },
  { key: 'Tomi.png', url: tomiImg },
  { key: 'foxconn-logo.png', url: foxconnLogoImg },
];

const ASSET_URL_BY_KEY = new Map<string, string>();
const CANONICAL_KEY_BY_ALIAS = new Map<string, string>();

for (const { key, url } of ASSET_ENTRIES) {
  const lowerKey = key.toLowerCase();
  const base = key.replace(/\.[^/.]+$/, '');
  const lowerBase = base.toLowerCase();
  const stemWithExt = key;

  ASSET_URL_BY_KEY.set(key, url);
  CANONICAL_KEY_BY_ALIAS.set(lowerKey, key);
  CANONICAL_KEY_BY_ALIAS.set(lowerBase, key);
  CANONICAL_KEY_BY_ALIAS.set(`assets/${lowerKey}`, key);
  CANONICAL_KEY_BY_ALIAS.set(`src/assets/${lowerKey}`, key);
  CANONICAL_KEY_BY_ALIAS.set(stemWithExt.toLowerCase(), key);
}

function maybeCanonicalAssetKey(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const decoded = decodeURIComponent(trimmed);
  const normalized = decoded.replace(/\\/g, '/').toLowerCase();
  const basename = normalized.split('/').pop() ?? normalized;
  const basenameNoQuery = basename.split('?')[0].split('#')[0];
  const basenameStem = basenameNoQuery.replace(/\.[^/.]+$/, '');

  return (
    CANONICAL_KEY_BY_ALIAS.get(normalized) ??
    CANONICAL_KEY_BY_ALIAS.get(basenameNoQuery) ??
    CANONICAL_KEY_BY_ALIAS.get(basenameStem) ??
    null
  );
}

export function normalizeRunnerImageInput(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const canonicalKey = maybeCanonicalAssetKey(trimmed);
  return canonicalKey ?? trimmed;
}

export function resolveRunnerImageUrl(input: string | null | undefined): string | null {
  const normalized = normalizeRunnerImageInput(input);
  if (!normalized) return null;

  const assetUrl = ASSET_URL_BY_KEY.get(normalized);
  return assetUrl ?? normalized;
}

export const foxconnLogoUrl = foxconnLogoImg;
