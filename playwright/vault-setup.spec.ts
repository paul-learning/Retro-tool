import { test, expect } from "@playwright/test";

test("first run: setup vault shows recovery key and unlocks app", async ({ page }) => {
  // 1. Go to app
  await page.goto("http://localhost:3000");

  // 2. We should see the setup screen
  await expect(
    page.getByText("Create your vault")
  ).toBeVisible();

  // 3. Enter passphrase
  await page.getByPlaceholder("New passphrase").fill("correct horse battery staple");

  // 4. Create vault
  await page.getByRole("button", { name: /create vault/i }).click();

  // 5. Recovery key screen should appear
  await expect(
    page.getByText("Save your recovery key")
  ).toBeVisible();

  // Grab the recovery key text (important for later tests)
  const recoveryKeyBox = page.locator("div.font-mono").first();
  const recoveryKey = await recoveryKeyBox.textContent();
  expect(recoveryKey).toBeTruthy();

  // 6. Confirm saved
  await page.getByRole("checkbox").check();

  // 7. Continue
  await page.getByRole("button", { name: /continue/i }).click();

  // 8. App should now be unlocked
  // FAB should be visible

  await expect(page.getByRole("button", { name: "Create note" })).toBeVisible();



});
