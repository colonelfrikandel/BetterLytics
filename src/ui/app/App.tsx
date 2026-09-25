import { LogOut } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import type { PageController, PageMode, PageState } from '@/lib/page/controller';
import type { RememberedVariant, TabId } from '@/lib/ui/route';
import { BuildView } from '@/ui/build/BuildView';

export interface AppProps {
  state: PageState;
  onModeChange: (mode: PageMode) => void;
  onRetry: () => void;
  headerCollapsed: boolean;
  onHeaderCollapsedChange: (collapsed: boolean) => void;
  /** Tab to open for this build when the address names none; the overview for a build not read yet. */
  lastTab?: TabId;
  onTabChange?: (tab: TabId) => void;
  glanceCollapsed?: boolean;
  onGlanceCollapsedChange?: (collapsed: boolean) => void;
  /** The variant this build was last read at, and where to report the reader's pick. */
  lastVariant?: RememberedVariant | null;
  onVariantChange?: (variant: RememberedVariant) => void;
}

export function App({
  state,
  onModeChange,
  onRetry,
  headerCollapsed,
  onHeaderCollapsedChange,
  lastTab,
  onTabChange,
  glanceCollapsed,
  onGlanceCollapsedChange,
  lastVariant,
  onVariantChange,
}: AppProps) {
  if (!state.active) return null;

  if (state.mode === 'original') {
    return (
      <button type="button" class="launcher" onClick={() => onModeChange('extension')}>
        Open guide
      </button>
    );
  }

  if (state.status === 'ready') {
    return (
      <div class="overlay" role="dialog" aria-label="BetterLytics">
        <BuildView
          key={state.build.id}
          build={state.build}
          initialHash={window.location.hash}
          onRouteChange={replaceHash}
          onOriginal={() => onModeChange('original')}
          subscribeToHash={subscribeToHash}
          headerCollapsed={headerCollapsed}
          onHeaderCollapsedChange={onHeaderCollapsedChange}
          defaultTab={lastTab}
          onTabChange={onTabChange}
          defaultVariant={lastVariant}
          onVariantChange={onVariantChange}
          glanceCollapsed={glanceCollapsed}
          onGlanceCollapsedChange={onGlanceCollapsedChange}
        />
      </div>
    );
  }

  return (
    <div class="overlay" role="dialog" aria-label="BetterLytics">
      <div class="overlay__bar">
        <span class="overlay__brand">BetterLytics</span>
        <button type="button" class="icon-button" aria-label="Show original page" title="Show original page" onClick={() => onModeChange('original')}>
          <LogOut size={16} aria-hidden="true" />
        </button>
      </div>
      <main class="overlay__body">
        {state.status === 'loading' ? (
          <p class="overlay__status" role="status">
            <span class="spinner" aria-hidden="true" />
            Loading build…
            {state.progress && <span class="overlay__progress">The site is slow to answer. Attempt {state.progress.attempt} of {state.progress.attempts}…</span>}
          </p>
        ) : (
          <div class="notice" role="alert">
            <p class="notice__title">Couldn't show this build</p>
            <p class="notice__text">{state.message}</p>
            <div class="notice__actions">
              <button type="button" class="button button--accent" onClick={onRetry}>
                Try again
              </button>
              <button type="button" class="button" onClick={() => onModeChange('original')}>
                Open original page
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/** Keeps the tab in the URL for reloads and sharing, without piling up history entries. */
function replaceHash(hash: string) {
  window.history.replaceState(window.history.state, '', hash);
}

function subscribeToHash(onHash: (hash: string) => void): () => void {
  const listener = () => onHash(window.location.hash);
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}

export interface ConnectedAppProps {
  controller: PageController;
  initialHeaderCollapsed: boolean;
  /** Persists the preference; the UI state itself lives here so it survives switching builds. */
  onHeaderCollapsedChange: (collapsed: boolean) => void;
  /** The tab each build was last read at, by build slug. */
  initialLastTabs?: Record<string, TabId>;
  /** Persists the tab this build is now read at. */
  onLastTabChange?: (buildSlug: string, tab: TabId) => void;
  initialGlanceCollapsed?: boolean;
  /** Persists whether At a Glance on the Overview tab is collapsed. */
  onGlanceCollapsedChange?: (collapsed: boolean) => void;
  /** The variant each build was last read at, by build slug. */
  initialLastVariants?: Record<string, RememberedVariant>;
  /** Persists the variant this build is now read at. */
  onVariantChange?: (buildSlug: string, variant: RememberedVariant) => void;
}

export function ConnectedApp({
  controller,
  initialHeaderCollapsed,
  onHeaderCollapsedChange,
  initialLastTabs = {},
  onLastTabChange,
  initialGlanceCollapsed = false,
  onGlanceCollapsedChange,
  initialLastVariants = {},
  onVariantChange,
}: ConnectedAppProps) {
  const [state, setState] = useState(controller.getState());
  const [headerCollapsed, setHeaderCollapsed] = useState(initialHeaderCollapsed);
  const [lastTabs, setLastTabs] = useState(initialLastTabs);
  const [glanceCollapsed, setGlanceCollapsed] = useState(initialGlanceCollapsed);
  const [lastVariants, setLastVariants] = useState(initialLastVariants);
  const buildSlug = state.active ? state.slug : null;

  useEffect(() => {
    setState(controller.getState());
    return controller.subscribe(setState);
  }, [controller]);

  const changeHeaderCollapsed = (collapsed: boolean) => {
    setHeaderCollapsed(collapsed);
    onHeaderCollapsedChange(collapsed);
  };

  const changeGlanceCollapsed = (collapsed: boolean) => {
    setGlanceCollapsed(collapsed);
    onGlanceCollapsedChange?.(collapsed);
  };

  const changeTab = (tab: TabId) => {
    if (!buildSlug) return;
    setLastTabs((remembered) => ({ ...remembered, [buildSlug]: tab }));
    onLastTabChange?.(buildSlug, tab);
  };

  const changeVariant = (variant: RememberedVariant) => {
    if (!buildSlug) return;
    setLastVariants((remembered) => ({ ...remembered, [buildSlug]: variant }));
    onVariantChange?.(buildSlug, variant);
  };

  return (
    <App
      state={state}
      onModeChange={controller.setMode}
      onRetry={controller.retry}
      headerCollapsed={headerCollapsed}
      onHeaderCollapsedChange={changeHeaderCollapsed}
      lastTab={buildSlug ? lastTabs[buildSlug] : undefined}
      onTabChange={changeTab}
      glanceCollapsed={glanceCollapsed}
      onGlanceCollapsedChange={changeGlanceCollapsed}
      lastVariant={buildSlug ? lastVariants[buildSlug] : null}
      onVariantChange={changeVariant}
    />
  );
}
