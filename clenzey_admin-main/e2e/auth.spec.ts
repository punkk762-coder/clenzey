import { expect, test } from "@playwright/test";

import { ADMIN_PASSWORD, ADMIN_USERS } from "./helpers/constants";
import { clearBrowserSession, fillLoginForm, gotoDashboard, seedBrowserSession } from "./helpers/auth";

test.describe.configure({ mode: "serial" });

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserSession(page);
  });

  test("shows login form with disabled submit when fields are empty", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.getByText("Sign in to Clenzey")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeDisabled();
  });

  test("rejects invalid credentials with error toast", async ({ page }) => {
    await page.goto("/login");
    await fillLoginForm(page, "invalid_user", "wrong_password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid username or password/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(/\/login/);
  });

  test("logs in with valid credentials and lands on overview", async ({
    page,
  }) => {
    await page.goto("/login");
    await fillLoginForm(page, ADMIN_USERS.superadmin.username, ADMIN_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/overview/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Performance Overview", level: 1 }),
    ).toBeVisible();
  });

  test("redirects unauthenticated users to login with next param", async ({
    page,
  }) => {
    await page.goto("/bookings");
    await expect(page).toHaveURL(/\/login\?next=%2Fbookings/);
  });

  test("preserves next redirect after successful login", async ({ page }) => {
    await page.goto("/login?next=/customers");
    await fillLoginForm(page, ADMIN_USERS.superadmin.username, ADMIN_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/customers/, { timeout: 15_000 });
  });

  test("signs out and returns to login", async ({ page }) => {
    await seedBrowserSession(page, ADMIN_USERS.superadmin.username);
    await gotoDashboard(page, "/overview");
    await page
      .locator("aside.admin-sidebar")
      .getByRole("button", { name: /sign out/i })
      .click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});
