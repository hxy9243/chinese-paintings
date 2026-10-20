import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 150000,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    reducedMotion: "reduce",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
      args: [
        "--enable-gpu",
        "--ignore-gpu-blocklist",
        "--disable-dev-shm-usage",
        ...(process.env.PLAYWRIGHT_USE_SWIFTSHADER === "1"
          ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
          : ["--use-angle=vulkan"]),
      ],
    },
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5173",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
});
