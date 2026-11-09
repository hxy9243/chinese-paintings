import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({base:process.env.PAINTING_BASE??'/ink-chicks/',build:{outDir:'dist',emptyOutDir:true,rollupOptions:{input:{painting:fileURLToPath(new URL('./index.html',import.meta.url)),hen:fileURLToPath(new URL('./hen-study/index.html',import.meta.url))}}}});
