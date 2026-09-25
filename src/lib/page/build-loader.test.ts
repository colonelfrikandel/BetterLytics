import { describe, expect, it, vi } from 'vitest';
import type { StaticDataResult } from '@/lib/data/static-data';
import { createBuildLoader } from './build-loader';

function pageHtml(name: string) {
  const doc = { id: name, data: { name, buildVariants: { values: [] } }, content: [] };
  const state = {
    poe2State: {
      apollo: {
        graphqlV2: {
          queries: [{ queryKey: ['ngf-ug-featured-document-page'], state: { data: [{ game: { documents: { userGeneratedDocumentBySlug: { data: doc } } } }] } }],
        },
      },
    },
  };
  return `<html><head><script>window.__PRELOADED_STATE__=${JSON.stringify(state)};</script></head><body></body></html>`;
}

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');
const STATIC_OK: StaticDataResult = { ok: true, snapshot: { staticData: { poe2Gems: { data: [] } }, cacheVersion: 'v1', timestamp: 1 } };
const STATIC_MISSING: StaticDataResult = { ok: false, reason: 'unavailable', message: 'nope' };

const BUILD_A = 'https://mobalytics.gg/poe-2/builds/build-a';
const BUILD_B = 'https://mobalytics.gg/poe-2/builds/build-b?weaponSet=set1#skills';

function setup(overrides: Partial<Parameters<typeof createBuildLoader>[0]> = {}) {
  const deps = {
    initialUrl: `${BUILD_A}#equipment`,
    initialDocument: parse(pageHtml('[0.5.5] Build A')),
    fetchHtml: vi.fn(async (_url: string) => pageHtml('[0.5] Build B')),
    readStaticData: vi.fn(async () => STATIC_OK),
    ...overrides,
  };
  return { deps, load: createBuildLoader(deps) };
}

describe('createBuildLoader', () => {
  it('loads a profile guide and fetches again for another author with the same build slug', async () => {
    const url = 'https://mobalytics.gg/poe-2/profile/nicktew/builds/0-cost-coc-gemling-wip-turd';
    const html = pageHtml('Community Guide').replace('ngf-ug-featured-document-page', 'community-guide');
    const { deps, load } = setup({ initialUrl: url, initialDocument: parse(html) });
    expect(await load(url)).toMatchObject({ ok: true, build: { title: 'Community Guide' } });
    expect(deps.fetchHtml).not.toHaveBeenCalled();
    const otherAuthor = url.replace('/nicktew/', '/another-author/');
    expect(await load(otherAuthor)).toMatchObject({ ok: true, build: { title: 'Build B' } });
    expect(deps.fetchHtml).toHaveBeenCalledWith(otherAuthor, undefined);
  });
  it('passes on how the fetch is going, so the guide can show progress', async () => {
    const fetchHtml = vi.fn(async (_url: string, onProgress?: (progress: { attempt: number; attempts: number }) => void) => {
      onProgress?.({ attempt: 2, attempts: 4 });
      return pageHtml('[0.5] Build B');
    });
    const { load } = setup({ fetchHtml });
    const progress = vi.fn();

    await load(BUILD_B, progress);

    expect(progress).toHaveBeenCalledWith({ attempt: 2, attempts: 4 });
  });

  it('reads the build the page was opened with from the current document', async () => {
    const { deps, load } = setup();

    const result = await load(BUILD_A);

    expect(result).toMatchObject({ ok: true, build: { title: 'Build A', patch: '0.5.5', hasStaticData: true } });
    expect(deps.fetchHtml).not.toHaveBeenCalled();
  });

  it('fetches the page when the current document holds no build, as for a signed-in user', async () => {
    // Signed in, the site renders the page in the browser and ships an almost empty state.
    const signedIn = `<html><head><script>window.__PRELOADED_STATE__=${JSON.stringify({ poe2State: { apollo: { graphqlV2: { queries: [] } } } })};</script></head></html>`;
    const fetchHtml = vi.fn(async (_url: string) => pageHtml('[0.5.5] Build A'));
    const { load } = setup({ initialDocument: parse(signedIn), fetchHtml });

    const result = await load(`${BUILD_A}#gear`);

    expect(fetchHtml.mock.calls[0]?.[0]).toBe(`${BUILD_A}#gear`);
    expect(result).toMatchObject({ ok: true, build: { title: 'Build A' } });
  });

  it('fetches fresh HTML for a build reached by in-app navigation', async () => {
    const { deps, load } = setup();

    const result = await load(BUILD_B);

    expect(vi.mocked(deps.fetchHtml).mock.calls[0]?.[0]).toBe(BUILD_B);
    expect(result).toMatchObject({ ok: true, build: { title: 'Build B' } });
  });

  it('reads static data once and reuses it', async () => {
    const { deps, load } = setup();

    await load(BUILD_A);
    await load(BUILD_B);

    expect(deps.readStaticData).toHaveBeenCalledTimes(1);
  });

  it('retries static data after it was unavailable, parsing without it meanwhile', async () => {
    const readStaticData = vi.fn<() => Promise<StaticDataResult>>().mockResolvedValueOnce(STATIC_MISSING).mockResolvedValue(STATIC_OK);
    const { load } = setup({ readStaticData });

    expect(await load(BUILD_A)).toMatchObject({ ok: true, build: { hasStaticData: false } });
    expect(await load(BUILD_A)).toMatchObject({ ok: true, build: { hasStaticData: true } });
    expect(readStaticData).toHaveBeenCalledTimes(2);
  });

  it('shares one static data read between concurrent loads', async () => {
    const { deps, load } = setup();

    await Promise.all([load(BUILD_A), load(BUILD_B)]);

    expect(deps.readStaticData).toHaveBeenCalledTimes(1);
  });

  it('reports a page it cannot read, keeping the reason for bug reports', async () => {
    const { load } = setup({ fetchHtml: vi.fn(async () => '<html></html>') });

    expect(await load(BUILD_B)).toEqual({
      ok: false,
      message: "The site's page has changed in a way the guide can't read yet. (no-state-script)",
    });
  });

  it('explains a page without a build guide, e.g. a removed build', async () => {
    const empty = `<html><head><script>window.__PRELOADED_STATE__=${JSON.stringify({ poe2State: { apollo: { graphqlV2: { queries: [] } } } })};</script></head></html>`;
    const { load } = setup({ fetchHtml: vi.fn(async () => empty) });

    expect(await load(BUILD_B)).toEqual({ ok: false, message: 'This page has no build guide. It may have been removed or made private.' });
  });

  it('reports a failed page request', async () => {
    const { load } = setup({
      fetchHtml: vi.fn(async () => {
        throw new Error('HTTP 503');
      }),
    });

    expect(await load(BUILD_B)).toEqual({ ok: false, message: "Couldn't load the build page (HTTP 503). Check your connection and try again." });
  });

  it('rejects a URL that is not a build page', async () => {
    const { deps, load } = setup();

    expect(await load('https://mobalytics.gg/poe-2/builds')).toEqual({ ok: false, message: 'Not a build page' });
    expect(deps.fetchHtml).not.toHaveBeenCalled();
  });
});
