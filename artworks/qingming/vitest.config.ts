import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["tests/*.test.ts"], maxWorkers: 1, testTimeout: 45000 } });
