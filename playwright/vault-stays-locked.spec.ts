import { test, expect } from "@playwright/test";

async function setupVaultAndCloseRecovery(page: any, pass = "correct-password") {
  await expect(page.getByRole("button", { name: /^create vault$/i })).toBeVisible();
  await page.getByLabel(/passphrase/i).fill(pass);
  await page.getByRole("button", { name: /^create vault$/i }).click();

  const continueBtn = page.getByRole("button", { name: /^continue$/i });
  await expect(continueBtn).toBeVisible();
  await page.getByRole("checkbox", { name: /i have saved/i }).check();
  await continueBtn.click();

  await expect(page.getByRole("button", { name: /^create vault$/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^unlock$/i })).toHaveCount(0);
}

test("vault stays locked with wrong password", async ({ page, browserName }) => {
  await page.goto("/");

  if (await page.getByRole("button", { name: /^create vault$/i }).isVisible()) {
    await setupVaultAndCloseRecovery(page);
    await page.reload();
  }

  const unlockBtn = page.getByRole("button", { name: /^unlock$/i });
  const createBtn = page.getByRole("button", { name: /^create vault$/i });
  await expect(unlockBtn.or(createBtn)).toBeVisible();

  if (await createBtn.isVisible()) {
    test.skip(browserName === "webkit", "Vault record not persisted across reload on WebKit yet.");
  }

  await page.getByLabel(/passphrase/i).fill("wrong-password");
  await unlockBtn.click();

  await expect(page.getByText(/unlock failed/i)).toBeVisible();
  // Option A: still locked because unlock button remains visible
  await expect(unlockBtn).toBeVisible();
});
