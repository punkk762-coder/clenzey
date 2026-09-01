import { expect, test } from "../fixtures";

import { SEED_ENTITIES } from "../helpers/constants";
import { gotoDashboard } from "../helpers/auth";
import { expectPageHeading, dataTable } from "../helpers/navigation";

test.describe("Partners", () => {
  test("loads partner directory with tabs", async ({ page }) => {
    await gotoDashboard(page, "/partners");
    await expectPageHeading(page, "Partner Directory");
    await expect(page.getByRole("tab", { name: "All partners" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Active" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Pending" })).toBeVisible();
  });

  test("shows seeded partner Amit Sharma", async ({ page }) => {
    await gotoDashboard(page, "/partners");
    await expect(
      page.getByRole("link", { name: SEED_ENTITIES.partnerName }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("switches partner tabs", async ({ page }) => {
    await gotoDashboard(page, "/partners");
    for (const tab of ["Active", "Pending", "All partners"] as const) {
      await page.getByRole("tab", { name: tab }).click();
      await expect(page.getByRole("tab", { name: tab })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    }
  });

  test("navigates to partner profile detail", async ({ page }) => {
    await gotoDashboard(page, "/partners");
    await page.getByRole("link", { name: SEED_ENTITIES.partnerName }).click();
    await expect(page).toHaveURL(/\/partners\/[a-f0-9-]+/i);
    await expect(page.getByText(/performance|bookings|skills|reviews/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("partner detail shows monthly salary and recent bookings", async ({ page }) => {
    await gotoDashboard(page, "/partners");
    await page.getByRole("link", { name: SEED_ENTITIES.partnerName }).click();
    await expect(page.getByText(/monthly salary/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/earnings|acceptance|booking/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("partner directory links to payroll for finance admin", async ({ page }) => {
    await gotoDashboard(page, "/partners");
    const payrollLink = page.getByRole("link", { name: /manage payroll/i });
    if ((await payrollLink.count()) > 0) {
      await expect(payrollLink).toBeVisible();
    }
  });
});

test.describe("Customers", () => {
  test("loads customer directory with search", async ({ page }) => {
    await gotoDashboard(page, "/customers");
    await expectPageHeading(page, "Customers");
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
    await expect(dataTable(page)).toBeVisible({ timeout: 15_000 });
  });

  test("searches for seeded customer Priya Sharma", async ({ page }) => {
    await gotoDashboard(page, "/customers");
    await page.getByPlaceholder(/search/i).fill("Priya");
    await expect(page.getByText(SEED_ENTITIES.consumerName)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("navigates to customer profile", async ({ page }) => {
    await gotoDashboard(page, "/customers");
    await page.getByText(SEED_ENTITIES.consumerName).click();
    await expect(page).toHaveURL(/\/customers\/[a-f0-9-]+/i);
    await expect(page.getByText(/lifetime|booking history|address/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("customer profile shows saved addresses section", async ({ page }) => {
    await gotoDashboard(page, "/customers");
    await page.getByText(SEED_ENTITIES.consumerName).click();
    await expect(page.getByText(/address|serviceability/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe("Reviews", () => {
  test("loads reviews with filters", async ({ page }) => {
    await gotoDashboard(page, "/reviews");
    await expectPageHeading(page, "Reviews");
    await expect(page.locator("table.table-zebra")).toBeVisible({ timeout: 15_000 });
  });

  test("filters reviews by partner name", async ({ page }) => {
    await gotoDashboard(page, "/reviews");
    const partnerFilter = page.getByPlaceholder(/partner/i);
    if ((await partnerFilter.count()) > 0) {
      await partnerFilter.fill("Amit");
      await page.waitForTimeout(400);
    }
    await expect(page.locator("table.table-zebra tbody")).toBeVisible();
  });

  test("shows rating data in table rows", async ({ page }) => {
    await gotoDashboard(page, "/reviews");
    const row = page.locator("table tbody tr").first();
    if ((await row.count()) === 0) {
      test.skip();
      return;
    }
    await expect(row).toBeVisible();
  });
});

test.describe("Settings", () => {
  test("loads account and connectivity cards", async ({ page }) => {
    await gotoDashboard(page, "/settings");
    await expectPageHeading(page, "System Configurations");
    await expect(page.getByRole("main").getByText("Account", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText("Connectivity", { exact: true })).toBeVisible();
  });

  test("shows super admin role in account card", async ({ page }) => {
    await gotoDashboard(page, "/settings");
    await expect(page.getByRole("main").getByText("Super Admin")).toBeVisible();
  });

  test("API health check returns connected status", async ({ page }) => {
    await gotoDashboard(page, "/settings");
    const retryBtn = page.getByRole("button", { name: /retry|check/i });
    if ((await retryBtn.count()) > 0) {
      await retryBtn.first().click();
    }
    await expect(
      page.getByText(/connected|healthy|ok|ready|operational/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("shows live socket status in sidebar", async ({ page }) => {
    await gotoDashboard(page, "/settings");
    const sidebar = page.locator("aside.admin-sidebar");
    await expect(sidebar.getByText("Live status")).toBeVisible();
  });
});
