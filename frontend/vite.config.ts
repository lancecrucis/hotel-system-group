import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const backendEnv = loadEnv(mode, '../backend', '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${process.env.PORT || backendEnv.PORT || '3000'}`,
          changeOrigin: true,
        },
      },
    },
  }
})
