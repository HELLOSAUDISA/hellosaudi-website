
import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('dist', { recursive: true });

await copyFile(
  'functions_worker_original.js',
  'dist/_worker.js'
);

console.log('Cloudflare Pages advanced-mode worker copied to dist/_worker.js');
