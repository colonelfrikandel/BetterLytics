import { act, fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { parseBuild } from '@/lib/build/parse-build';
import { createPageController, type PageState } from '@/lib/page/controller';
import { loadFixture } from '../../../tests/fixtures/load';
import { App, ConnectedApp } from './App';

const URL_A = 'https://mobalytics.gg/poe-2/builds/build-a';
const fixture = loadFixture('chaos-dot-lich-starter-deadrabbit');
const BUILD = parseBuild(fixture.build, fixture.staticData);
const TITLE = 'ED Contagion Lich League Starter (Level 1 to Endgame)';
const base = { active: true as const, url: URL_A, slug: 'build-a' };

function renderApp(state: PageState) {
  const onModeChange = vi.fn();
  const onRetry = vi.fn();
  const view = render(
    <App state={state} onModeChange={onModeChange} onRetry={onRetry} headerCollapsed={false} onHeaderCollapsedChange={vi.fn()} />,
  );
  return { ...view, onModeChange, onRetry };
}

describe('App', () => {
  it('renders nothing away from build pages', () => {
    const { container } = renderApp({ active: false, mode: 'extension' });

    expect(container.innerHTML).toBe('');
  });

  it('offers to open the guide while the original page is shown', () => {
    const { onModeChange } = renderApp({ ...base, mode: 'original', status: 'ready', build: BUILD });

    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open guide' }));

    expect(onModeChange).toHaveBeenCalledWith('extension');
  });

  it('says the site is being slow rather than looking stuck', () => {
    renderApp({ ...base, mode: 'extension', status: 'loading', progress: { attempt: 2, attempts: 4 } });

    expect(screen.getByRole('status').textContent).toContain('Attempt 2 of 4');
  });

  it('covers the page with a loading overlay', () => {
    const { onModeChange } = renderApp({ ...base, mode: 'extension', status: 'loading' });

    expect(screen.getByRole('dialog', { name: 'BetterLytics' })).toBeTruthy();
    expect(screen.getByText('BetterLytics', { selector: '.overlay__brand' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Loading build…');
    expect(screen.getByRole('status').querySelector('.spinner[aria-hidden="true"]')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Show original page' }));
    expect(onModeChange).toHaveBeenCalledWith('original');
  });

  it('explains a failure and leads back to the original page', () => {
    const { onModeChange } = renderApp({ ...base, mode: 'extension', status: 'error', message: "Couldn't read the build (no-state-script)" });

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain("Couldn't show this build");
    expect(alert.textContent).toContain("Couldn't read the build (no-state-script)");

    fireEvent.click(screen.getByRole('button', { name: 'Open original page' }));
    expect(onModeChange).toHaveBeenCalledWith('original');
  });

  it('lets the user try loading a failed build again', () => {
    const { onRetry } = renderApp({ ...base, mode: 'extension', status: 'error', message: 'HTTP 503' });

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('shows the loaded build with its tabs, opening the tab from the location hash', () => {
    window.location.hash = '#gear_act-2';
    const { onModeChange } = renderApp({ ...base, mode: 'extension', status: 'ready', build: BUILD });

    expect(screen.getByRole('heading', { level: 1, name: TITLE })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Gear' }).getAttribute('aria-selected')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Show original page' }));
    expect(onModeChange).toHaveBeenCalledWith('original');
  });

  it('follows hash changes made outside the UI, e.g. back and forward', async () => {
    window.location.hash = '#gear_act-2';
    renderApp({ ...base, mode: 'extension', status: 'ready', build: BUILD });

    act(() => {
      window.location.hash = '#passives_act-1';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(screen.getByRole('tab', { name: 'Passives' }).getAttribute('aria-selected')).toBe('true');
  });

  it('writes the selected tab to the location hash without adding history entries', () => {
    window.location.hash = '';
    const historyLength = window.history.length;
    renderApp({ ...base, mode: 'extension', status: 'ready', build: BUILD });

    fireEvent.click(screen.getByRole('tab', { name: 'Skills' }));

    expect(window.location.hash).toBe('#skills_act-1');
    expect(window.history.length).toBe(historyLength);
  });
});

describe('ConnectedApp', () => {
  it('keeps the header collapsed across builds and reports the preference', async () => {
    const OTHER = { ...BUILD, id: 'other-build', title: 'Other Build' };
    const controller = createPageController({
      load: async (url) => ({ ok: true, build: url.endsWith('build-b') ? OTHER : BUILD }),
      initialMode: 'extension',
    });
    const onHeaderCollapsedChange = vi.fn();
    render(<ConnectedApp controller={controller} initialHeaderCollapsed={false} onHeaderCollapsedChange={onHeaderCollapsedChange} />);

    act(() => controller.handleUrl(URL_A));
    fireEvent.click(await screen.findByRole('button', { name: 'Collapse header' }));
    expect(onHeaderCollapsedChange).toHaveBeenCalledWith(true);

    act(() => controller.handleUrl('https://mobalytics.gg/poe-2/builds/build-b'));
    await screen.findByText('Other Build', { selector: '.tab-bar__title' });

    expect(screen.getByRole('button', { name: 'Expand header' })).toBeTruthy();
  });

  it('opens a build on the tab it was last read at, and reports the tab under its build', async () => {
    window.location.hash = '';
    const controller = createPageController({ load: async () => ({ ok: true, build: BUILD }), initialMode: 'extension' });
    const onLastTabChange = vi.fn();
    render(
      <ConnectedApp
        controller={controller}
        initialHeaderCollapsed={false}
        onHeaderCollapsedChange={vi.fn()}
        initialLastTabs={{ 'build-a': 'gear' }}
        onLastTabChange={onLastTabChange}
      />,
    );

    act(() => controller.handleUrl(URL_A));

    expect((await screen.findByRole('tab', { name: 'Gear' })).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: 'Skills' }));
    expect(onLastTabChange).toHaveBeenLastCalledWith('build-a', 'skills');
  });

  // A build opened for the first time should start where a reader starts: at the overview.
  it('opens a build nobody has read yet on the overview, whatever was read elsewhere', async () => {
    window.location.hash = '';
    const OTHER = { ...BUILD, id: 'other-build', title: 'Other Build' };
    const controller = createPageController({
      load: async (url) => ({ ok: true, build: url.endsWith('build-b') ? OTHER : BUILD }),
      initialMode: 'extension',
    });
    render(
      <ConnectedApp
        controller={controller}
        initialHeaderCollapsed={false}
        onHeaderCollapsedChange={vi.fn()}
        initialLastTabs={{ 'build-a': 'gear' }}
        onLastTabChange={vi.fn()}
      />,
    );

    act(() => controller.handleUrl(URL_A));
    expect((await screen.findByRole('tab', { name: 'Gear' })).getAttribute('aria-selected')).toBe('true');

    act(() => controller.handleUrl('https://mobalytics.gg/poe-2/builds/build-b'));

    expect((await screen.findByRole('tab', { name: 'Overview' })).getAttribute('aria-selected')).toBe('true');
  });

  it('retries a failed build through the controller', async () => {
    let attempts = 0;
    const controller = createPageController({
      load: async () => (++attempts === 1 ? { ok: false, message: 'HTTP 503' } : { ok: true, build: BUILD }),
      initialMode: 'extension',
    });
    render(<ConnectedApp controller={controller} initialHeaderCollapsed={false} onHeaderCollapsedChange={vi.fn()} />);

    act(() => controller.handleUrl(URL_A));
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { name: TITLE })).toBeTruthy();
  });

  it('keeps At a Glance collapsed across builds and reports the preference', async () => {
    window.location.hash = '#overview';
    const controller = createPageController({ load: async () => ({ ok: true, build: BUILD }), initialMode: 'extension' });
    const onGlanceCollapsedChange = vi.fn();
    render(
      <ConnectedApp
        controller={controller}
        initialHeaderCollapsed={false}
        onHeaderCollapsedChange={vi.fn()}
        initialGlanceCollapsed
        onGlanceCollapsedChange={onGlanceCollapsedChange}
      />,
    );

    act(() => controller.handleUrl(URL_A));
    fireEvent.click(await screen.findByRole('button', { name: 'Expand At a Glance' }));

    expect(onGlanceCollapsedChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole('button', { name: 'Collapse At a Glance' })).toBeTruthy();
  });

  it('starts with the stored header preference', async () => {
    const controller = createPageController({ load: async () => ({ ok: true, build: BUILD }), initialMode: 'extension' });
    render(<ConnectedApp controller={controller} initialHeaderCollapsed onHeaderCollapsedChange={vi.fn()} />);

    act(() => controller.handleUrl(URL_A));

    expect(await screen.findByRole('button', { name: 'Expand header' })).toBeTruthy();
  });

  it('follows the controller state and switches modes through it', async () => {
    const controller = createPageController({ load: async () => ({ ok: true, build: BUILD }), initialMode: 'extension' });
    render(<ConnectedApp controller={controller} initialHeaderCollapsed={false} onHeaderCollapsedChange={vi.fn()} />);

    act(() => controller.handleUrl(URL_A));
    await screen.findByRole('heading', { name: TITLE });

    fireEvent.click(screen.getByRole('button', { name: 'Show original page' }));

    expect(controller.getState().mode).toBe('original');
    expect(await screen.findByRole('button', { name: 'Open guide' })).toBeTruthy();
  });
});
