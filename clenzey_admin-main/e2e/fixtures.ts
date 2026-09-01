import { test as base, expect } from "@playwright/test";

import { seedBrowserSession } from "./helpers/auth";
import { ADMIN_USERS } from "./helpers/constants";

type WorkerFixtures = {
  workerAuthContext: import("@playwright/test").BrowserContext;
  workerSession: {
    accessToken: string;
    user: {
      id: string;
      phone: string;
      role: string;
      username: string;
    };
  };
};

declare module "@playwright/test" {
  interface PlaywrightTestOptions {
    adminUsername?: string;
  }
}

function resolveAdminUsername(projectName: string, configured?: string): string {
  if (configured) return configured;
  if (projectName === "chromium-ops") return ADMIN_USERS.opsadmin.username;
  if (projectName === "chromium-finance") return ADMIN_USERS.financeadmin.username;
  if (projectName === "chromium-support") return ADMIN_USERS.supportadmin.username;
  return ADMIN_USERS.superadmin.username;
}

export const test = base.extend<{}, WorkerFixtures>({
  workerAuthContext: [
    async ({ browser }, use) => {
      const context = await browser.newContext();
      await use(context);
      await context.close();
    },
    { scope: "worker" },
  ],

  workerSession: [
    async ({ workerAuthContext }, use, workerInfo) => {
      const adminUsername = resolveAdminUsername(
        workerInfo.project.name,
        workerInfo.project.use.adminUsername,
      );
      const bootstrap = await workerAuthContext.newPage();
      const session = await seedBrowserSession(bootstrap, adminUsername);
      await bootstrap.close();
      await use(session);
    },
    { scope: "worker" },
  ],

  page: async ({ workerAuthContext, workerSession }, use) => {
    const page = await workerAuthContext.newPage();
    await page.goto("/login");
    await page.evaluate(
      ({ accessToken, user }) => {
        localStorage.setItem("clenzey_admin_access_token", accessToken);
        localStorage.setItem("clenzey_admin_user", JSON.stringify(user));
      },
      workerSession,
    );
    await use(page);
    await page.close();
  },
});

export { expect };
