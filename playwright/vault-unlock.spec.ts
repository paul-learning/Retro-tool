import { test, expect } from "@playwright/test";

test("vault unlocks with correct password", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText(/unlock vault/i)).toBeVisible();

  await page.getByLabel(/passphrase/i).fill("correct-password");
  await page.getByRole("button", { name: /^unlock$/i }).click();

  await expect(page.getByLabel(/create note/i)).toBeVisible();
});
