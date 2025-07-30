import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

// Custom plugin to exclude vite.ts in production
const excludeVitePlugin = {
  name: 'exclude-vite',
  setup(build) {
    if (isProduction) {
      // Resolve vite imports to empty module in production
      build.onResolve({ filter: /\.\/vite(\.js)?$/ }, () => {
        return { path: 'data:text/javascript,export const setupVite = () => console.log("Vite not available in production");', external: false }
      });
      
      // Exclude vite package entirely
      build.onResolve({ filter: /^vite$/ }, () => {
        return { path: 'data:text/javascript,export default {};', external: false }
      });
    }
  }
};

const config = {
  entryPoints: ['server/index.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  packages: 'external',
  outdir: 'dist',
  plugins: [excludeVitePlugin],
  // Additional externals for production
  external: isProduction ? [
    'vite',
    './vite.js',
    './vite'
  ] : []
};

await build(config);
console.log('✅ Server build complete');
