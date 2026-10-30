import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  plugins: [react()],
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
});
