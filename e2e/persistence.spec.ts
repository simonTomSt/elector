import { test, expect } from '@playwright/test';

test.describe('Persystencja po reloadzie', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.__elector?.resetStores());
    await page.reload();
  });

  test('odkryta podpowiedź jest zachowana po reloadzie', async ({ page }) => {
    await page.getByRole('button', { name: /Otwórz zadanie dol-4kw/i }).click();
    await page.getByRole('button', { name: /💡 Podpowiedź/i }).click();
    await expect(page.getByTestId('hints-panel')).toContainText(/Sprawdź czy -F2/i);

    await page.reload();

    // Po reloadzie start na cabinet z zapisanego UI
    await expect(page.getByTestId('hints-panel')).toContainText(/Sprawdź czy -F2/i);
    // Licznik w przycisku pokazuje 1/3
    await expect(page.getByRole('button', { name: /💡 Podpowiedź \(1\/3\)/i })).toBeVisible();
  });

  test('zmiana widoku jest zachowana po reloadzie', async ({ page }) => {
    await page.getByRole('button', { name: /Otwórz zadanie dol-4kw/i }).click();
    await page.getByRole('button', { name: 'Schemat', exact: true }).click();

    await page.reload();

    const schematBtn = page.getByRole('button', { name: 'Schemat', exact: true });
    await expect(schematBtn).toHaveClass(/is-active/);
  });

  test('„Zacznij od nowa" resetuje projekt i podpowiedzi', async ({ page }) => {
    await page.getByRole('button', { name: /Otwórz zadanie dol-4kw/i }).click();
    await page.evaluate(() => window.__elector?.loadSolution());
    await page.getByRole('button', { name: /💡 Podpowiedź/i }).click();
    await page.getByRole('button', { name: /Sprawdź rozwiązanie/i }).click();
    const dialog = page.getByRole('dialog', { name: /Wynik/i });
    await dialog.getByRole('button', { name: 'Zamknij', exact: true }).click();

    await page.getByRole('button', { name: 'Zadania' }).click();
    const card = page.getByTestId('task-card-dol-4kw');
    await card.getByRole('button', { name: /Zacznij od nowa/i }).click();

    // Po resecie kafelek znów Nie zaczęte
    await expect(card).toContainText(/Nie zaczęte/i);

    // Otwórz: licznik podpowiedzi 0/3
    await page.getByRole('button', { name: /Otwórz zadanie dol-4kw/i }).click();
    await expect(page.getByRole('button', { name: /💡 Podpowiedź \(0\/3\)/i })).toBeVisible();
  });
});
