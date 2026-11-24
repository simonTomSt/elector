import { test, expect } from '@playwright/test';

test.describe('Nawigacja między widokami', () => {
  test('wszystkie widoki renderują się bez błędów konsoli', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.evaluate(() => window.__elector?.resetStores());
    await page.reload();

    // Start: widok tasks
    await expect(page.getByRole('heading', { name: /Wybierz zadanie/i })).toBeVisible();

    // Otwórz zadanie dol-4kw -> cabinet
    await page.getByRole('button', { name: /Otwórz zadanie dol-4kw/i }).click();
    await expect(page.getByRole('button', { name: /Sprawdź rozwiązanie/i })).toBeVisible();

    // Przełącz na schemat
    await page.getByRole('button', { name: 'Schemat', exact: true }).click();
    await page.waitForTimeout(100);

    // Mieszany
    await page.getByRole('button', { name: 'Szafa + schemat' }).click();
    await page.waitForTimeout(100);

    // Edytor zadań
    await page.getByRole('button', { name: 'Edytor zadań' }).click();
    await page.waitForTimeout(100);

    // Powrót do listy zadań
    await page.getByRole('button', { name: 'Zadania' }).click();
    await expect(page.getByRole('heading', { name: /Wybierz zadanie/i })).toBeVisible();

    expect(errors, `Błędy konsoli: ${errors.join(' | ')}`).toEqual([]);
  });
});
