import { test, expect } from "@playwright/test";

/**
 * Echte Assertion: "erstmaliges Setzen eines Passworts klappt".
 * - Erzwingt eine frische Session über browser.newContext() (kein shared storage).
 * - Darf NICHT "fallback-unlock" machen – wenn nicht "Create vault" sichtbar ist, ist das ein Fail.
 */
test("first-time: can create vault and reach unlocked app", async ({ browser }) => {
  const context = await browser.newContext(); 
  const page = await context.newPage();

  await page.goto("/");

  await expect(page.getByText(/create vault/i)).toBeVisible();

  const pass = "correct-password";

  await page.getByPlaceholder(/12\+ characters/i).fill(pass);
  await page.getByPlaceholder(/re-enter passphrase/i).fill(pass);

  await page.getByRole("button", { name: /create vault/i }).click();


  await expect(
  page.getByRole("heading", { name: /^save your recovery key$/i })
).toBeVisible();

  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /continue/i }).click();

  await expect(page.getByLabel(/create note/i)).toBeVisible();

  await context.close();
});
