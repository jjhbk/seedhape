import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm', 'iife'],
  outExtension({ format }) {
    return format === 'cjs' ? { js: '.cjs' } : {};
  },
  globalName: 'SeedhaPe',
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: process.env['NODE_ENV'] === 'production',
});
