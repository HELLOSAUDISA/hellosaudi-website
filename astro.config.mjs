import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  site: 'https://hellosaudisa.com',
  build: { format: 'directory' }
});
