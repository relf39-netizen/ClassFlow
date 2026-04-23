import { build, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

async function runBuild() {
  const mode = process.env.NODE_ENV || 'production';
  const env = loadEnv(mode, process.cwd(), '');
  
  console.log('Starting programmatic build in', mode, 'mode...');
  
  try {
    await build({
      configFile: false,
      root: process.cwd(),
      base: './',
      envDir: process.cwd(),
      plugins: [react(), tailwindcss()],
      define: {
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
      },
      cacheDir: 'node_modules/.vite',
      build: {
        outDir: 'dist',
        emptyOutDir: true,
      }
    });
    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

runBuild();

