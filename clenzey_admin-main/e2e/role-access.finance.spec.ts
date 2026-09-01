import { expect, test } from "./fixtures";

import { NAV_ROUTES } from "./helpers/constants";
import { gotoDashboard } from "./helpers/auth";
import { expectPageHeading } from "./helpers/navigation";

const FINANCE_ROUTES = NAV_ROUTES.filter((r) => "financeOnly" in r && r.financeOnly);

test.describe("Finance admin role access", () => {
  test("can access finance routes in navigation", async ({ page }) => {
    await gotoDashboard(page, "/overview");
    const sidebar = page.locator("aside.admin-sidebar");

    for (const route of FINANCE_ROUTES) {
      await expect(
        sidebar.getByRole("link", { name: route.label, exact: true }),
      ).toBeVisible();
    }
  });

  test("can open payments and payroll pages", async ({ page }) => {
    await gotoDashboard(page, "/payments");
    await expectPageHeading(page, "Payments");

    await gotoDashboard(page, "/payroll");
    await expectPageHeading(page, "Payroll");
  });

  test("can open platform pricing page", async ({ page }) => {
    await gotoDashboard(page, "/pricing-settings");
    await expectPageHeading(page, "Platform Pricing");
  });
});
