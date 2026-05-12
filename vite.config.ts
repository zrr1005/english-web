import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/bilibili': {
        target: 'https://api.bilibili.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bilibili/, ''),
        headers: {
          Referer: 'https://www.bilibili.com',
          Origin: 'https://www.bilibili.com',
        },
      },
      '/api/subtitle': {
        target: 'https://i0.hdslb.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/subtitle/, ''),
        headers: {
          Referer: 'https://www.bilibili.com',
        },
      },
    },
  },
})
