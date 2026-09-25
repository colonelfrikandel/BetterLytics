import preact from '@preact/preset-vite';
import { resolve } from 'node:path';
import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  manifestVersion: 3,
  manifest: {
    name: 'BetterLytics',
    description: 'A clean, tabbed view of Path of Exile 2 build guides on mobalytics.gg',
    permissions: ['storage'],
    icons: { 16: 'betterlytics.svg', 32: 'betterlytics.svg', 48: 'betterlytics.svg', 96: 'betterlytics.svg', 128: 'betterlytics.svg' },
    browser_specific_settings: {
      gecko: {
        id: 'betterlytics@extensions.local',
        strict_min_version: '140.0',
        data_collection_permissions: { required: ['none'] },
      },
      gecko_android: { strict_min_version: '142.0' },
    },
  },
  // Load manually through about:debugging (Mobalytics sits behind Cloudflare).
  webExt: { disabled: true },
  hooks: {
    'build:publicAssets': (wxt, files) => {
      // Keep the upstream logo out of the renamed extension; retain it in source history.
      for (let i = files.length - 1; i >= 0; i--) {
        if (/^icon[\\/]/.test(files[i]!.relativeDest)) files.splice(i, 1);
      }
      for (const file of ['LICENSE', 'NOTICE', 'PRIVACY.md']) {
        files.push({ absoluteSrc: resolve(wxt.config.root, file), relativeDest: file });
      }
    },
    // The popup only hosts dev tools (fixture export) for now.
    'entrypoints:resolved': (wxt, entrypoints) => {
      if (wxt.config.mode !== 'production') return;
      const popup = entrypoints.findIndex((entrypoint) => entrypoint.name === 'popup');
      if (popup !== -1) entrypoints.splice(popup, 1);
    },
  },
  vite: () => ({
    plugins: [preact()],
  }),
});
