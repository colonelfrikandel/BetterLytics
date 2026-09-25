import { describe, expect, it } from 'vitest';
import { getBuildSlug, isBuildPageUrl } from './build-url';

const SAMPLE =
  'https://mobalytics.gg/poe-2/builds/chaos-dot-lich-starter-deadrabbit?weaponSet=set1&ws-ngf5-f7d82102-7e77-4a44-ad24-33b67e8ae7bf=activeVariantId%2Cdefault-variant#4b46748c-2c9b-4cb5-b49e-7d4dddb609b6-equipment-4';

describe('getBuildSlug', () => {
  it('recognizes NickTew community builds and ignores variant queries and hashes', () => {
    const path = 'profile/nicktew/builds/0-cost-coc-gemling-wip-turd';
    expect(getBuildSlug(`https://mobalytics.gg/poe-2/${path}?variant=budget#skills`)).toBe(path);
    expect(getBuildSlug(`https://www.mobalytics.gg/poe-2/${path}/`)).toBe(path);
  });

  it('keeps authors and featured builds with identical slugs distinct', () => {
    const urls = ['builds/example', 'profile/alice/builds/example', 'profile/bob/builds/example'];
    expect(new Set(urls.map((path) => getBuildSlug(`https://mobalytics.gg/poe-2/${path}`))).size).toBe(3);
  });

  it.each(['profile/nicktew', 'profile/nicktew/builds', 'profile/nicktew/builds/example/edit', 'profile//builds/example'])('ignores non-guide profile paths: %s', (path) => {
    expect(getBuildSlug(`https://mobalytics.gg/poe-2/${path}`)).toBeNull();
  });
  it.each([
    ['https://mobalytics.gg/poe-2/builds/chaos-dot-lich-starter-deadrabbit', 'chaos-dot-lich-starter-deadrabbit'],
    ['https://mobalytics.gg/poe-2/builds/chaos-dot-lich-starter-deadrabbit/', 'chaos-dot-lich-starter-deadrabbit'],
    [SAMPLE, 'chaos-dot-lich-starter-deadrabbit'],
    ['https://www.mobalytics.gg/poe-2/builds/some-build', 'some-build'],
  ])('returns slug for build page %s', (url, slug) => {
    expect(getBuildSlug(url)).toBe(slug);
  });

  it.each([
    ['builds list', 'https://mobalytics.gg/poe-2/builds'],
    ['builds list with slash', 'https://mobalytics.gg/poe-2/builds/'],
    ['builds list with filters', 'https://mobalytics.gg/poe-2/builds?class=witch'],
    ['nested path', 'https://mobalytics.gg/poe-2/builds/some-build/edit'],
    ['PoE 1 build', 'https://mobalytics.gg/poe/builds/some-build'],
    ['Diablo 4 build', 'https://mobalytics.gg/diablo-4/builds/some-build'],
    ['other site', 'https://example.com/poe-2/builds/some-build'],
    ['lookalike domain', 'https://mobalytics.gg.example.com/poe-2/builds/some-build'],
    ['insecure scheme', 'http://mobalytics.gg/poe-2/builds/some-build'],
    ['not a URL', 'not a url'],
  ])('returns null for %s', (_name, url) => {
    expect(getBuildSlug(url)).toBeNull();
  });
});

describe('isBuildPageUrl', () => {
  it('is true for a build page', () => {
    expect(isBuildPageUrl(SAMPLE)).toBe(true);
  });

  it('is false for the builds list', () => {
    expect(isBuildPageUrl('https://mobalytics.gg/poe-2/builds')).toBe(false);
  });
});
