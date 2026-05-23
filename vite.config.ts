import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    allowedHosts: ['.onrender.com', 'localhost'],
  },
  build: {
    target: 'ES2020',
    sourcemap: true,
    minify: 'terser',
    outDir: 'dist',
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})
