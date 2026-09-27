/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Expose VITE_* and NEXT_PUBLIC_* variables to the browser bundle. Both prefixes mean
  // "public": only put values here that are safe for every visitor to see.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  server: { host: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
