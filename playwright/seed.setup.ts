import { test, expect } from "@playwright/test";

test("seed: ensure vault exists and can be unlocked", async ({ page }) => {
  await page.goto("/");

  const createVaultBtn = page.getByRole("button", { name: /^create vault$/i });
  const unlockBtn = page.getByRole("button", { name: /^unlock$/i });

  // Wait until we are clearly in either Setup or Unlock mode
  await expect(createVaultBtn.or(unlockBtn)).toBeVisible();

  if (await createVaultBtn.isVisible()) {
    await page.getByLabel(/passphrase/i).fill("correct-password");
    await createVaultBtn.click();

    // Recovery screen (use a unique selector, not /save/)
    await expect(
      page.getByRole("heading", { name: /save your recovery key/i })
    ).toBeVisible();

    await page.getByRole("checkbox", { name: /i have saved/i }).check();
    await page.getByRole("button", { name: /^continue$/i }).click();

    await expect(page.getByLabel(/create note/i)).toBeVisible();
    return;
  }

  // Unlock flow
  await expect(page.getByText(/unlock vault/i)).toBeVisible();
  await page.getByLabel(/passphrase/i).fill("correct-password");
  await unlockBtn.click();

  await expect(page.getByLabel(/create note/i)).toBeVisible();
});
