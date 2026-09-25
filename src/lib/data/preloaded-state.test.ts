import { describe, expect, it } from 'vitest';
import { extractBuildDocument } from './preloaded-state';

const DOC = {
  id: '00e278a1',
  data: { name: '[0.5.5] ED Contagion Lich', buildVariants: { values: [] } },
  content: [],
  tags: { data: [] },
};

function stateWith(queries: unknown[]) {
  return { api: { lang: 'en_us' }, poe2State: { apollo: { graphqlV2: { mutations: [], queries } } } };
}

function documentQuery(doc: unknown) {
  return {
    queryKey: ['ngf-ug-featured-document-page', 'builds', 'slug', 'en_us'],
    state: { data: [{ game: { documents: { userGeneratedDocumentBySlug: { error: null, data: doc } } } }, null] },
  };
}

const BANNER_QUERY = { queryKey: ['ngf-banner-takeover'], state: { data: [{ game: {} }, null] } };

function pageHtml(stateScript: string) {
  return `<!doctype html><html><head>
    <script>window.__APP_ENV__={"A":1};</script>
    <script>${stateScript}</script>
  </head><body><div id="root"></div></body></html>`;
}

/** Same escaping the site uses for "/" inside the inline script. */
function serialize(state: unknown) {
  return `window.__PRELOADED_STATE__=${JSON.stringify(state).replaceAll('/', '\\u002F')};`;
}

describe('extractBuildDocument', () => {
  it('accepts a community document without the featured query key', () => {
    const query = { ...documentQuery(DOC), queryKey: ['community-guide', 'nicktew', 'build'] };
    expect(extractBuildDocument(pageHtml(serialize(stateWith([BANNER_QUERY, query]))))).toEqual({ ok: true, doc: DOC });
  });

  it('accepts an individual document lookup by ID with an unwrapped result', () => {
    const query = { queryKey: ['community-guide'], state: { data: { game: { documents: { userGeneratedDocumentById: { data: DOC } } } } } };
    expect(extractBuildDocument(pageHtml(serialize(stateWith([query]))))).toEqual({ ok: true, doc: DOC });
  });

  it('skips lists and null documents before the actual guide', () => {
    const list = { state: { data: [{ game: { documents: { userGeneratedDocuments: { data: [DOC] } } } }] } };
    expect(extractBuildDocument(pageHtml(serialize(stateWith([list, documentQuery(null), documentQuery(DOC)]))))).toEqual({ ok: true, doc: DOC });
    expect(extractBuildDocument(pageHtml(serialize(stateWith([list]))))).toMatchObject({ ok: false });
  });
  it('finds the build document in page HTML', () => {
    const html = pageHtml(serialize(stateWith([BANNER_QUERY, documentQuery(DOC)])));

    const result = extractBuildDocument(html);

    expect(result).toEqual({ ok: true, doc: DOC });
  });

  it('accepts a parsed Document', () => {
    const html = pageHtml(serialize(stateWith([documentQuery(DOC)])));
    const document = new DOMParser().parseFromString(html, 'text/html');

    expect(extractBuildDocument(document)).toEqual({ ok: true, doc: DOC });
  });

  it('decodes \\u002F escapes in strings', () => {
    const doc = { ...DOC, data: { ...DOC.data, name: 'Chaos/Spell' } };
    const html = pageHtml(serialize(stateWith([documentQuery(doc)])));

    const result = extractBuildDocument(html);

    expect(result.ok && result.doc.data.name).toBe('Chaos/Spell');
  });

  it('keeps a "</" sequence inside JSON strings intact', () => {
    const doc = { ...DOC, data: { ...DOC.data, name: 'a \\u003C/b' } };
    const html = pageHtml(serialize(stateWith([documentQuery(doc)])));

    expect(extractBuildDocument(html).ok).toBe(true);
  });

  it('reports a missing state script', () => {
    const result = extractBuildDocument(pageHtml('window.__APP_I18N__={};'));

    expect(result).toMatchObject({ ok: false, error: { code: 'no-state-script' } });
  });

  it('reports broken JSON', () => {
    const result = extractBuildDocument(pageHtml('window.__PRELOADED_STATE__={"api":'));

    expect(result).toMatchObject({ ok: false, error: { code: 'invalid-json' } });
  });

  it('reports a state without the build document query', () => {
    const html = pageHtml(serialize(stateWith([BANNER_QUERY])));

    expect(extractBuildDocument(html)).toMatchObject({ ok: false, error: { code: 'no-build-document' } });
  });

  it('reports a query whose document is null', () => {
    const html = pageHtml(serialize(stateWith([documentQuery(null)])));

    expect(extractBuildDocument(html)).toMatchObject({ ok: false, error: { code: 'no-build-document' } });
  });

  it('reports a state of unexpected shape', () => {
    const html = pageHtml(serialize({ api: {} }));

    expect(extractBuildDocument(html)).toMatchObject({ ok: false, error: { code: 'no-build-document' } });
  });
});
