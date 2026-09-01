import { expect, test } from "./fixtures";

import { NAV_ROUTES } from "./helpers/constants";
import { gotoDashboard } from "./helpers/auth";
import { expectPageHeading } from "./helpers/navigation";

const FINANCE_ROUTES = NAV_ROUTES.filter((r) => "financeOnly" in r && r.financeOnly);
const NON_FINANCE_ROUTES = NAV_ROUTES.filter(
  (r) => !("financeOnly" in r && r.financeOnly),
);

test.describe("Operations admin role access", () => {
  test("can access operations routes but not finance routes in nav", async ({
    page,
  }) => {
    await gotoDashboard(page, "/overview");
    const sidebar = page.locator("aside.admin-sidebar");

    for (const route of NON_FINANCE_ROUTES) {
      await expect(
        sidebar.getByRole("link", { name: route.label, exact: true }),
      ).toBeVisible();
    }

    for (const route of FINANCE_ROUTES) {
      await expect(
        sidebar.getByRole("link", { name: route.label, exact: true }),
      ).not.toBeVisible();
    }
  });

  test("redirects away from finance routes when accessed directly", async ({
    page,
  }) => {
    await gotoDashboard(page, "/overview");
    await page.goto("/payments");
    await expect(page).not.toHaveURL(/\/payments$/);
    await page.goto("/payroll");
    await expect(page).not.toHaveURL(/\/payroll$/);
  });
});
