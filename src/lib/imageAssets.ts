const ASSET_URL_BY_KEY = new Map<string, string>();
const CANONICAL_KEY_BY_ALIAS = new Map<string, string>();

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
