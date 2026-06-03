import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // This correctly ensures the app loads at domain.com/slqc-admin
  base: '/slqc-admin/',
  plugins: [react()],
  server: {
    port: 5174,
    allowedHosts: ["al-azhar.duckdns.org"],
    proxy: {
      // 1. Catch the new /pb1 path instead of /api
      '/pb1': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        // 2. Strip '/pb1' from the URL before sending it to PocketBase on 8080
        // This exactly mimics the behavior of your Nginx proxy_pass!
        rewrite: (path) => path.replace(/^\/pb1/, '')
      }
    }
  }
});