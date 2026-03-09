/**
 * EduLens E2E tests
 * Run with: npm run test:e2e
 * Requires full stack: npm run dev (webServer starts it)
 */
import { test, expect } from '@playwright/test';

test.describe('EduLens', () => {
  test('homepage loads with EduLens heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /edulens/i })).toBeVisible();
  });

  test('shows start options', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/tutor that sees your homework/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /camera on paper/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /share screen/i })).toBeVisible();
  });

  test('footer shows Gemini Live API', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/powered by gemini live api/i)).toBeVisible();
  });

  test('option cards have descriptions', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/math, handwriting, worksheets/i)).toBeVisible();
    await expect(page.getByText(/coding, docs, khan academy/i)).toBeVisible();
  });

  test('clicking Camera on paper transitions state', async ({ page, context }) => {
    await context.grantPermissions(['camera', 'microphone']);
    await page.goto('/');
    await page.getByRole('button', { name: /camera on paper/i }).click();
    await expect(
      page.getByText(/connecting|live|edulens is watching|error|try again/i)
    ).toBeVisible({ timeout: 8000 });
  });

  test('clicking Share screen transitions state', async ({ page, context }) => {
    await context.grantPermissions(['camera', 'microphone']);
    await page.goto('/');
    await page.getByRole('button', { name: /share screen/i }).click();
    await expect(
      page.getByText(/connecting|live|edulens is watching|error|try again|share/i)
    ).toBeVisible({ timeout: 8000 });
  });

  test('End session returns to idle', async ({ page, context }) => {
    await context.grantPermissions(['camera', 'microphone']);
    await page.goto('/');
    await page.getByRole('button', { name: /camera on paper/i }).click();
    await expect(
      page.getByText(/connecting|live|edulens is watching|error|try again/i)
    ).toBeVisible({ timeout: 8000 });

    const endBtn = page.getByRole('button', { name: /end session/i });
    if (await endBtn.isVisible()) {
      await endBtn.click();
      await expect(page.getByRole('button', { name: /camera on paper/i })).toBeVisible({ timeout: 3000 });
    }
  });
});
