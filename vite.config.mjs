import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  base: './',
  plugins: [vue()],
  esbuild: {
    charset: 'ascii'
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app.html')
      }
    }
  },
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
