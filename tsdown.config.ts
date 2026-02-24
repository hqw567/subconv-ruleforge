import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  dts: false,
  entry: ['src/scripts/generate.ts'],
  format: ['esm'],
  outDir: 'dist',
})
