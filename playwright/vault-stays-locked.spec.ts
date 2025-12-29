import { test, expect } from "@playwright/test";

test("vault stays locked with wrong password", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText(/unlock vault/i)).toBeVisible();

  await page.getByLabel(/passphrase/i).fill("wrong-password");
  await page.getByRole("button", { name: /^unlock$/i }).click();

  await expect(page.getByLabel(/create note/i)).not.toBeVisible();
  await expect(page.getByText(/unlock failed/i)).toBeVisible();
});
