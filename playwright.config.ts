import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./playwright",

  /* ---------------- Global behavior ---------------- */
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },

  /* ---------------- Projects ---------------- */
  projects: [
    /* ---------- SETUP (seed) ---------- */
    {
      name: "setup-chromium",
      testMatch: /.*\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "setup-firefox",
      testMatch: /.*\.setup\.ts/,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "setup-webkit",
      testMatch: /.*\.setup\.ts/,
      use: { ...devices["Desktop Safari"] },
    },

    /* ---------- E2E ---------- */
    {
      name: "chromium",
      dependencies: ["setup-chromium"],
      testIgnore: /.*\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      dependencies: ["setup-firefox"],
      testIgnore: /.*\.setup\.ts/,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      dependencies: ["setup-webkit"],
      testIgnore: /.*\.setup\.ts/,
      use: { ...devices["Desktop Safari"] },
    },
  ],

  /* ---------------- Dev server ---------------- */
  webServer: {
    command: "npm run dev",
    cwd: "./web",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
