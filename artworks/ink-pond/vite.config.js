import {defineConfig} from 'vite';
export default defineConfig({base:process.env.PAINTING_BASE??'/ink-pond/',build:{outDir:'dist',emptyOutDir:true}});
