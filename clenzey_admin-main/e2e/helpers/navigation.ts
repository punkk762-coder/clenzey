import type { Page } from "@playwright/test";

export async function navigateViaSidebar(page: Page, label: string): Promise<void> {
  const sidebar = page.locator("aside.admin-sidebar");
  await sidebar.getByRole("link", { name: label, exact: true }).click();
  await page.locator("aside.admin-sidebar").waitFor();
}

export async function expectPageHeading(page: Page, title: string): Promise<void> {
  await page.getByRole("heading", { name: title, level: 1 }).waitFor({
    timeout: 30_000,
  });
}

export function dataTable(page: Page) {
  return page.locator("table.table-zebra");
}

export async function openFirstTableRow(page: Page): Promise<boolean> {
  const row = dataTable(page).locator("tbody tr").first();
  if ((await row.count()) === 0) return false;
  await row.click();
  return true;
}
