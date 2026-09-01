import { expect, test } from "../fixtures";

import { SEED_ENTITIES } from "../helpers/constants";
import { gotoDashboard } from "../helpers/auth";
import { expectPageHeading, dataTable } from "../helpers/navigation";

test.describe("Payments", () => {
  test("loads revenue KPIs and payout table", async ({ page }) => {
    await gotoDashboard(page, "/payments");
    await expectPageHeading(page, "Payments");
    await expect(page.getByText("Total Revenue").first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", { name: "Partner Payout Reports" }),
    ).toBeVisible();
  });

  test("shows ratings distribution and refund tracker sections", async ({
    page,
  }) => {
    await gotoDashboard(page, "/payments");
    await expect(page.getByText("Ratings Analysis")).toBeVisible();
    await expect(page.getByText("Refund Transactions")).toBeVisible();
  });

  test("search input is disabled as expected edge case", async ({ page }) => {
    await gotoDashboard(page, "/payments");
    const search = page.getByPlaceholder(/search transactions/i);
    await expect(search).toBeDisabled();
  });
});

test.describe("Payroll", () => {
  test("loads payroll management sections", async ({ page }) => {
    await gotoDashboard(page, "/payroll");
    await expectPageHeading(page, "Payroll");
    await expect(page.getByText(/salary|attendance|payroll run/i).first()).toBeVisible();
  });

  test("shows payroll runs history table", async ({ page }) => {
    await gotoDashboard(page, "/payroll");
    await expect(dataTable(page).first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Platform Pricing", () => {
  test("loads current rates and publish form", async ({ page }) => {
    await gotoDashboard(page, "/pricing-settings");
    await expectPageHeading(page, "Platform Pricing");
    await expect(page.getByText("Current effective rates")).toBeVisible();
    await expect(page.getByText("Publish new configuration")).toBeVisible();
  });

  test("shows version history table", async ({ page }) => {
    await gotoDashboard(page, "/pricing-settings");
    await expect(page.getByText("Version history")).toBeVisible();
    await expect(dataTable(page).first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Services catalogue", () => {
  test("loads service tabs and cards", async ({ page }) => {
    await gotoDashboard(page, "/services");
    await expectPageHeading(page, "Service catalogue");
    await expect(page.getByRole("tab", { name: "All" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Residential" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Commercial" })).toBeVisible();
  });

  test("filters services by search query", async ({ page }) => {
    await gotoDashboard(page, "/services");
    await page.getByPlaceholder(/search/i).fill("clean");
    await page.waitForTimeout(400);
    await expect(page.locator("a[href*='/services/']").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("opens add service sheet", async ({ page }) => {
    await gotoDashboard(page, "/services");
    await page.getByRole("button", { name: "Add service" }).click();
    await expect(page.getByText("New service")).toBeVisible();
  });

  test("navigates to service detail editor", async ({ page }) => {
    await gotoDashboard(page, "/services");
    await page.locator("a[href*='/services/']").first().click();
    await expect(page).toHaveURL(/\/services\/[a-f0-9-]+/i);
    await expect(page.getByText(/variant|addon|inclusion|pricing/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("service detail shows zone coverage panel", async ({ page }) => {
    await gotoDashboard(page, "/services");
    await page.locator("a[href*='/services/']").first().click();
    await expect(page.getByText(/coverage|region|zone/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe("Coupons", () => {
  test("loads coupon tabs and table", async ({ page }) => {
    await gotoDashboard(page, "/coupons");
    await expectPageHeading(page, "Coupons");
    await expect(page.getByRole("tab", { name: "Active" })).toBeVisible();
    await expect(dataTable(page)).toBeVisible({ timeout: 15_000 });
  });

  test("shows seeded coupon in table", async ({ page }) => {
    await gotoDashboard(page, "/coupons");
    await expect(
      page.getByText(SEED_ENTITIES.couponCode, { exact: true }).first(),
    ).toBeVisible({
      timeout: 15_000,
    });
  });

  test("opens create coupon sheet", async ({ page }) => {
    await gotoDashboard(page, "/coupons");
    await page.getByRole("button", { name: "New coupon" }).click();
    await expect(page.getByText("New Coupon")).toBeVisible();
  });
});

test.describe("Geofences / Zones", () => {
  test("loads zone map and list", async ({ page }) => {
    await gotoDashboard(page, "/zones");
    await expectPageHeading(page, "Service polygons");
    await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 15_000 });
  });

  test("navigates to create zone page", async ({ page }) => {
    await gotoDashboard(page, "/zones");
    await page.getByRole("link", { name: "Draw new zone" }).click();
    await expect(page).toHaveURL(/\/zones\/new/);
    await expectPageHeading(page, "Draw a service zone");
    await expect(page.locator(".leaflet-container")).toBeVisible();
  });

  test("navigates to zone edit page from list", async ({ page }) => {
    await gotoDashboard(page, "/zones");
    await page.getByRole("link", { name: "Edit →" }).first().click();
    await expect(page).toHaveURL(/\/zones\/[a-f0-9-]+/i);
    await expect(page.locator(".leaflet-container")).toBeVisible();
  });
});
