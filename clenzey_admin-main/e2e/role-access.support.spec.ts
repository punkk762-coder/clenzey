import { expect, test } from "./fixtures";

import { NAV_ROUTES } from "./helpers/constants";
import { gotoDashboard } from "./helpers/auth";
import { expectPageHeading } from "./helpers/navigation";

const FINANCE_ROUTES = NAV_ROUTES.filter((r) => "financeOnly" in r && r.financeOnly);
const NON_FINANCE_ROUTES = NAV_ROUTES.filter(
  (r) => !("financeOnly" in r && r.financeOnly),
);

test.describe("Support admin role access", () => {
  test("can browse read-only screens without finance nav", async ({ page }) => {
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

  test("can filter partners by pending tab", async ({ page }) => {
    await gotoDashboard(page, "/partners");
    await page.getByRole("tab", { name: "Pending" }).click();
    await expect(page.getByRole("tab", { name: "Pending" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
