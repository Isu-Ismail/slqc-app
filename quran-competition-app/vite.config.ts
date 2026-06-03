import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/slqc/',
  plugins: [react()],
  server: {
    allowedHosts: ["al-azhar.duckdns.org"],
    proxy: {
      // 1. Catch requests hitting the /pb1 sub-path
      '/pb1': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        // 2. Strip /pb1 before sending it to PocketBase on port 8080
        rewrite: (path) => path.replace(/^\/pb1/, '')
      }
    }
  }
})