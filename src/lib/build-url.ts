const HOSTS = new Set(['mobalytics.gg', 'www.mobalytics.gg']);
const BUILD_PATH = /^\/poe-2\/builds\/([^/]+)\/?$/;
const COMMUNITY_BUILD_PATH = /^\/poe-2\/(profile\/[^/]+\/builds\/[^/]+)\/?$/;

/** Build identity, including the profile for community builds to avoid author collisions. */
export function getBuildSlug(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' || !HOSTS.has(parsed.hostname)) return null;
  return BUILD_PATH.exec(parsed.pathname)?.[1] ?? COMMUNITY_BUILD_PATH.exec(parsed.pathname)?.[1] ?? null;
}

export function isBuildPageUrl(url: string): boolean {
  return getBuildSlug(url) !== null;
}
