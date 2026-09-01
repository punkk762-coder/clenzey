import type { Page } from "@playwright/test";

import { API_BASE_URL, ADMIN_PASSWORD } from "./constants";

export async function fillLoginForm(
  page: Page,
  username: string,
  password = ADMIN_PASSWORD,
): Promise<void> {
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
}

export async function gotoDashboard(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page
    .getByText("Establishing terminal session…")
    .waitFor({ state: "hidden", timeout: 30_000 })
    .catch(() => undefined);
  await page.locator("aside.admin-sidebar").waitFor({ timeout: 30_000 });
}

export async function loginViaApi(
  context: import("@playwright/test").BrowserContext,
  username: string,
  password = ADMIN_PASSWORD,
) {
  const response = await context.request.post(`${API_BASE_URL}/admin/auth/login`, {
    data: { username, password },
  });

  if (!response.ok()) {
    throw new Error(
      `Login failed for ${username}: ${response.status()} ${await response.text()}`,
    );
  }

  const body = await response.json();
  return body.data as {
    accessToken: string;
    user: {
      id: string;
      phone: string;
      role: string;
      username: string;
    };
  };
}

export async function seedBrowserSession(
  page: Page,
  username: string,
  password = ADMIN_PASSWORD,
) {
  const session = await loginViaApi(page.context(), username, password);

  await page.goto("/login");
  await page.evaluate(
    ({ accessToken, user }) => {
      localStorage.setItem("clenzey_admin_access_token", accessToken);
      localStorage.setItem("clenzey_admin_user", JSON.stringify(user));
    },
    session,
  );

  return session;
}

export async function saveAuthState(
  context: import("@playwright/test").BrowserContext,
  page: Page,
  username: string,
  path: string,
): Promise<void> {
  await seedBrowserSession(page, username);
  await gotoDashboard(page, "/overview");
  await context.storageState({ path });
}

export async function clearBrowserSession(page: Page): Promise<void> {
  try {
    await page.context().request.post(`${API_BASE_URL}/admin/auth/logout`);
  } catch {
    /* ignore */
  }

  await page.context().clearCookies();
  await page.goto("/login");
  await page.evaluate(() => {
    localStorage.removeItem("clenzey_admin_access_token");
    localStorage.removeItem("clenzey_admin_user");
  });
}
