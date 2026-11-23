import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { createCoverApiMiddleware } from './server/cover-api-handler.mjs';

function lorekeepCoverProxyPlugin(): Plugin {
  const middleware = createCoverApiMiddleware('.');
  return {
    name: 'lorekeep-cover-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const request = req as { url?: string };
        if (request.url?.startsWith('/api/covers')) {
          void middleware(request, res, next);
          return;
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const request = req as { url?: string };
        if (request.url?.startsWith('/api/covers')) {
          void middleware(request, res, next);
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    lorekeepCoverProxyPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['lorekeep-icon.svg'],
      manifest: {
        name: 'LOREKEEP: Narrative Archive for Video Games',
        short_name: 'LOREKEEP',
        description:
          'Local-First desktop PWA for writing stories, tales, and notes dedicated to modern PC and console video games.',
        theme_color: '#14151A',
        background_color: '#14151A',
        display: 'standalone',
        lang: 'en',
        icons: [
          {
            src: 'lorekeep-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
  },
});
