import { expect, test } from "../fixtures";

import { gotoDashboard } from "../helpers/auth";
import { expectPageHeading, dataTable } from "../helpers/navigation";

test.describe("Overview dashboard", () => {
  test("renders KPI cards with metrics", async ({ page }) => {
    await gotoDashboard(page, "/overview");
    await expectPageHeading(page, "Performance Overview");
    await expect(page.getByText("Today's Bookings")).toBeVisible();
    await expect(page.getByText("Revenue Today")).toBeVisible();
    await expect(page.getByText("Active Partners")).toBeVisible();
    await expect(page.getByText("Avg. Rating")).toBeVisible();
  });

  test("shows booking trend chart and activity feed", async ({ page }) => {
    await gotoDashboard(page, "/overview");
    await expect(page.getByText("Booking Volume Trend")).toBeVisible();
    await expect(page.getByText("Recent Activity")).toBeVisible();
  });

  test("shows top partners table or empty state", async ({ page }) => {
    await gotoDashboard(page, "/overview");
    const table = page.locator("table");
    const empty = page.getByText(/no partner data|no data/i);
    await expect(table.or(empty).first()).toBeVisible({ timeout: 15_000 });
  });

  test("alert chips link to bookings and disputes when present", async ({
    page,
  }) => {
    await gotoDashboard(page, "/overview");
    const unassigned = page.getByRole("link", { name: /unassigned/i });
    const disputes = page.getByRole("link", { name: /open dispute/i });
    if ((await unassigned.count()) > 0) {
      await expect(unassigned.first()).toHaveAttribute("href", /\/bookings/);
    }
    if ((await disputes.count()) > 0) {
      await expect(disputes.first()).toHaveAttribute("href", /\/disputes/);
    }
  });
});

test.describe("Bookings", () => {
  test("list page loads with filters and table", async ({ page }) => {
    await gotoDashboard(page, "/bookings");
    await expectPageHeading(page, "The log");
    await expect(page.getByRole("button", { name: /export/i })).toBeVisible();
    await expect(dataTable(page)).toBeVisible({ timeout: 15_000 });
  });

  test("filters by search query", async ({ page }) => {
    await gotoDashboard(page, "/bookings");
    await page.getByPlaceholder(/search booking/i).fill("BK-");
    await page.waitForTimeout(500);
    await expect(
      dataTable(page).or(page.getByText(/no bookings|no results/i)),
    ).toBeVisible();
  });

  test("navigates to booking detail from table row", async ({ page }) => {
    await gotoDashboard(page, "/bookings");
    const viewButton = dataTable(page).getByRole("link", { name: "View" }).first();
    await expect(viewButton).toBeVisible({ timeout: 15_000 });
    await viewButton.click();
    await expect(page).toHaveURL(/\/bookings\/[a-f0-9-]+/i);
    await expect(page.getByText(/pricing|lifecycle|customer/i).first()).toBeVisible();
  });

  test("booking detail shows lifecycle and pricing sections", async ({ page }) => {
    await gotoDashboard(page, "/bookings");
    await dataTable(page).getByRole("link", { name: "View" }).first().click();
    await expect(page.getByText(/lifecycle|timeline/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/total|pricing|amount/i).first()).toBeVisible();
  });
});

test.describe("Dispatch console", () => {
  test("loads escalated bookings and queue sections", async ({ page }) => {
    await gotoDashboard(page, "/dispatch");
    await expectPageHeading(page, "Dispatch console");
    await expect(page.getByText(/escalated|failed queue|scheduled/i).first()).toBeVisible();
  });

  test("shows run scheduled batch action", async ({ page }) => {
    await gotoDashboard(page, "/dispatch");
    await expect(
      page.getByRole("button", { name: "Run scheduled batch" }),
    ).toBeVisible();
  });
});

test.describe("Corporate quotations", () => {
  test("loads tabs and quotation table", async ({ page }) => {
    await gotoDashboard(page, "/quotations");
    await expectPageHeading(page, "Quotation desk");
    await expect(page.getByRole("tab", { name: "All" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Pending" })).toBeVisible();
    await expect(dataTable(page)).toBeVisible({ timeout: 15_000 });
  });

  test("switches between status tabs", async ({ page }) => {
    await gotoDashboard(page, "/quotations");
    await page.getByRole("tab", { name: "Pending" }).click();
    await page.getByRole("tab", { name: "Scheduled" }).click();
    await page.getByRole("tab", { name: "Quoted" }).click();
    await expect(dataTable(page).or(page.getByText(/no quotation/i))).toBeVisible();
  });

  test("opens quotation detail sheet on row click", async ({ page }) => {
    await gotoDashboard(page, "/quotations");
    const row = dataTable(page).locator("tbody tr").first();
    if ((await row.count()) === 0) {
      test.skip();
      return;
    }
    await row.click();
    await expect(page.getByText(/quotation|requester|site visit/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("Time slots", () => {
  test("loads slot generator and inventory viewer", async ({ page }) => {
    await gotoDashboard(page, "/slots");
    await expectPageHeading(page, "Time Slots Management");
    await expect(page.getByRole("heading", { name: "Generate Slots" })).toBeVisible();
    await expect(page.getByText("Slot inventory")).toBeVisible();
  });

  test("validates generator form edge case - end before start", async ({
    page,
  }) => {
    await gotoDashboard(page, "/slots");
    const startHour = page.locator('input[type="number"]').nth(0);
    const endHour = page.locator('input[type="number"]').nth(1);
    if ((await startHour.count()) > 0 && (await endHour.count()) > 0) {
      await startHour.fill("18");
      await endHour.fill("8");
      const generateBtn = page.getByRole("button", { name: /generate slots/i });
      if ((await generateBtn.count()) > 0) {
        await expect(generateBtn).toBeDisabled();
      }
    }
  });
});

test.describe("Disputes", () => {
  test("loads dispute list with filters", async ({ page }) => {
    await gotoDashboard(page, "/disputes");
    await expectPageHeading(page, "Resolution hub");
    await expect(dataTable(page)).toBeVisible({ timeout: 15_000 });
  });

  test("navigates to dispute detail", async ({ page }) => {
    await gotoDashboard(page, "/disputes");
    const disputeLink = dataTable(page).locator('a[href*="/disputes/"]').first();
    await expect(disputeLink).toBeVisible({ timeout: 15_000 });
    await disputeLink.click();
    await expect(page).toHaveURL(/\/disputes\/[a-f0-9-]+/i);
    await expect(page.getByText(/resolution|evidence|booking/i).first()).toBeVisible();
  });

  test("dispute detail shows resolution form", async ({ page }) => {
    await gotoDashboard(page, "/disputes");
    await dataTable(page).locator('a[href*="/disputes/"]').first().click();
    await expect(page.getByText(/status|resolution/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
