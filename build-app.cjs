const { build } = require('vite');
const react = require('@vitejs/plugin-react');
const path = require('path');

async function run() {
  console.log('--- Starting Programmatic Build (CJS) ---');
  try {
    await build({
      configFile: false, // Bypass discovery and bundling of vite.config.js
      root: process.cwd(),
      base: './',
      plugins: [react()],
      define: {
        'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(process.cwd(), 'src'),
        },
      },
      build: {
        outDir: 'dist',
        assetsDir: '', // Put assets in root of dist to avoid path issues
        emptyOutDir: true,
        sourcemap: false,
        minify: 'esbuild',
        rollupOptions: {
          input: path.resolve(process.cwd(), 'index.html'),
        },
      },
    });
    console.log('--- Build Successfully Completed ---');
  } catch (e) {
    console.error('--- Build Failed ---');
    console.error(e);
    process.exit(1);
  }
}

run();
