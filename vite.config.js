import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/** Express API (dev only); browser should use same-origin paths on the Vite port. */
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3001'

const devApiProxy = {
  '/api': {
    target: apiProxyTarget,
    changeOrigin: true,
  },
  '/media': {
    target: apiProxyTarget,
    changeOrigin: true,
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: { ...devApiProxy },
  },
  preview: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: { ...devApiProxy },
  },
})
