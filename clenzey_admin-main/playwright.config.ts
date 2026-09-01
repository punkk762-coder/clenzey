import { defineConfig, devices } from "@playwright/test";

import { ADMIN_USERS } from "./e2e/helpers/constants";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4001";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        adminUsername: ADMIN_USERS.superadmin.username,
      },
      testIgnore: [
        /auth\.spec\.ts/,
        /role-access\.ops\.spec\.ts/,
        /role-access\.finance\.spec\.ts/,
        /role-access\.support\.spec\.ts/,
      ],
    },
    {
      name: "chromium-ops",
      use: {
        ...devices["Desktop Chrome"],
        adminUsername: ADMIN_USERS.opsadmin.username,
      },
      testMatch: /role-access\.ops\.spec\.ts/,
    },
    {
      name: "chromium-finance",
      use: {
        ...devices["Desktop Chrome"],
        adminUsername: ADMIN_USERS.financeadmin.username,
      },
      testMatch: /role-access\.finance\.spec\.ts/,
    },
    {
      name: "chromium-support",
      use: {
        ...devices["Desktop Chrome"],
        adminUsername: ADMIN_USERS.supportadmin.username,
      },
      testMatch: /role-access\.support\.spec\.ts/,
    },
    {
      name: "chromium-unauth",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /auth\.spec\.ts/,
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "pnpm dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
