import { expect, test } from "./fixtures";

import { NAV_ROUTES } from "./helpers/constants";
import { gotoDashboard } from "./helpers/auth";
import { expectPageHeading, navigateViaSidebar } from "./helpers/navigation";

test.describe("Super Admin navigation", () => {
  test("shows all navigation items including finance routes", async ({ page }) => {
    await gotoDashboard(page, "/overview");
    const sidebar = page.locator("aside.admin-sidebar");

    for (const route of NAV_ROUTES) {
      await expect(
        sidebar.getByRole("link", { name: route.label, exact: true }),
      ).toBeVisible();
    }
  });

  test("can reach every route from sidebar", async ({ page }) => {
    await gotoDashboard(page, "/overview");

    for (const route of NAV_ROUTES) {
      await navigateViaSidebar(page, route.label);
      await expectPageHeading(page, route.title);
      await expect(page).toHaveURL(new RegExp(route.href.replace("/", "\\/")));
    }
  });
});
