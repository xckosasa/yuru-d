import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: './',
  plugins: [vue()],
  server: {
    host: '127.0.0.1',
    port: 5175,
    strictPort: true,
    headers: {
      'Cache-Control': 'no-store'
    },
    watch: {
      usePolling: true,
      interval: 100
    }
  }
})
