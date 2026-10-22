import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({ plugins: [react()], base: process.env.PAINTING_BASE ?? "./", build: { rollupOptions: { input: ["index.html", "figure-study.html", "style-lab.html"] } } });
