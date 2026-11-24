import { test, expect } from '@playwright/test';

test.describe('Pełny flow: wybór → podpowiedź → sprawdź (bez solution) → solution → 100/100', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.__elector?.resetStores());
    await page.reload();
  });

  test('scoring bez zmontowania <100, z załadowanym solution = 100', async ({ page }) => {
    // Lista zadań
    await expect(page.getByRole('heading', { name: /Wybierz zadanie/i })).toBeVisible();

    // Otwórz dol-4kw – scena startuje z samego presetu (zasilanie, drzwi, listwy)
    await page.getByRole('button', { name: /Otwórz zadanie dol-4kw/i }).click();

    // Odsłoń podpowiedź
    const hintBtn = page.getByRole('button', { name: /💡 Podpowiedź/i });
    await expect(hintBtn).toBeVisible();
    await hintBtn.click();
    const hintsPanel = page.getByTestId('hints-panel');
    await expect(hintsPanel).toBeVisible();
    await expect(hintsPanel).toContainText(/Sprawdź czy -F2/i);

    // Sprawdź rozwiązanie bez montażu – wynik <100, modal otwarty
    await page.getByRole('button', { name: /Sprawdź rozwiązanie/i }).click();
    const dialog = page.getByRole('dialog', { name: /Wynik/i });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/Rozruch i zatrzymanie działają/i);
    // Są kryteria niezdane – modal pokazuje szczegół „Brak aparatu -Q1" itp.
    await expect(dialog).toContainText(/Brak aparatu/i);
    // Wynik mniejszy niż 100
    await expect(dialog).not.toContainText(/100\s*\/\s*100/);

    // Zamknij modal
    await dialog.getByRole('button', { name: 'Zamknij', exact: true }).click();
    await expect(dialog).toBeHidden();

    // Powrót na listę – status pokazuje W toku i wynik
    await page.getByRole('button', { name: 'Zadania' }).click();
    const card = page.getByTestId('task-card-dol-4kw');
    await expect(card).toContainText(/W toku/i);

    // Otwórz z powrotem, załaduj solution przez bridge, Sprawdź → 100/100
    await page.getByRole('button', { name: /Otwórz zadanie dol-4kw/i }).click();
    const loaded = await page.evaluate(() => window.__elector?.loadSolution());
    expect(loaded?.ok).toBe(true);

    await page.getByRole('button', { name: /Sprawdź rozwiązanie/i }).click();
    const dialog2 = page.getByRole('dialog', { name: /Wynik/i });
    await expect(dialog2).toBeVisible();
    // 100 − kara za podpowiedź (subtelna = 2) = 98/100
    await expect(dialog2).toContainText(/98\s*\/\s*100/);
    await expect(dialog2).toContainText(/Kary:\s*podpowiedzi\s*−2/);
    await dialog2.getByRole('button', { name: 'Zamknij', exact: true }).click();

    // Lista: status "W toku" + 98/100 (nie ukończone bo <100)
    await page.getByRole('button', { name: 'Zadania' }).click();
    await expect(page.getByTestId('task-card-dol-4kw')).toContainText(/98\/100/);
  });

  test('bez użycia podpowiedzi solution daje 100/100 i status ukonczone', async ({ page }) => {
    await page.getByRole('button', { name: /Otwórz zadanie dol-4kw/i }).click();
    await page.evaluate(() => window.__elector?.loadSolution());
    await page.getByRole('button', { name: /Sprawdź rozwiązanie/i }).click();
    const dialog = page.getByRole('dialog', { name: /Wynik/i });
    await expect(dialog).toContainText(/100\s*\/\s*100/);
    await expect(dialog).toContainText(/zaliczone/i);
    await dialog.getByRole('button', { name: 'Zamknij', exact: true }).click();

    await page.getByRole('button', { name: 'Zadania' }).click();
    await expect(page.getByTestId('task-card-dol-4kw')).toContainText(/Ukończone/i);
    await expect(page.getByTestId('task-card-dol-4kw')).toContainText(/100\/100/);
  });
});
