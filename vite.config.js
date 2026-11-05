import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// vercel.json sends a CSP whose connect-src allows any https or wss host, because the
// API address is only known at build time. This plugin adds a second policy to the
// built page that names exactly the configured API and websocket origins; the browser
// applies both, so the narrower one wins. Dev server and previews without these
// variables are left alone.
function exactConnectSrc(env) {
  const origins = new Set(["'self'"]);
  // The app shell checks GitHub for new OTA bundles (see src/lib/ota.js).
  origins.add('https://api.github.com');
  for (const value of [env.VITE_API_BASE_URL, env.VITE_WS_URL]) {
    if (!value) continue;
    try {
      const url = new URL(value);
      origins.add(url.origin);
      origins.add(`${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`);
    } catch {
      // An unparsable value is a build misconfiguration the app would fail on anyway.
    }
  }
  return {
    name: 'exact-connect-src',
    apply: 'build',
    transformIndexHtml() {
      if (origins.size < 2) return [];
      return [{ tag: 'meta', injectTo: 'head-prepend', attrs: { 'http-equiv': 'Content-Security-Policy', content: `connect-src ${[...origins].join(' ')}` } }];
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), exactConnectSrc(loadEnv(mode, process.cwd(), 'VITE_'))],
  // The web bundle version, stamped on API requests and the socket handshake
  // so the backend can tell which bundle a client is running (OTA spec, section 5).
  define: { __APP_VERSION__: JSON.stringify(process.env.VITE_APP_VERSION || version) },
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        // Libraries change rarely; keeping them apart lets the browser cache them across app releases.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          data: ['@tanstack/react-query', 'axios', 'zustand'],
          socket: ['socket.io-client'],
        },
      },
    },
  },
  test: { environment: 'jsdom', globals: true, setupFiles: ['./tests/setup.js'] },
}));
