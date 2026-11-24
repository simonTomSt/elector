import { test, expect } from '@playwright/test';

test.describe('Schemat: drag & drop symboli', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.__elector?.resetStores());
    await page.reload();
    await page.getByRole('button', { name: /Otwórz zadanie dol-4kw/i }).click();
    await page.getByRole('button', { name: 'Schemat', exact: true }).click();
  });

  test('po dodaniu symbol da się przeciągnąć myszą na nową pozycję', async ({ page }) => {
    // Dodaj symbol z palety (coil)
    await page.getByRole('button', { name: /Wstaw: Cewka$/i }).first().click();

    // Znajdź symbol w SVG (data-sym ustawiany w SymbolView)
    const symbol = page.locator('[data-sym]').first();
    await expect(symbol).toBeVisible();

    // Zapamiętaj początkową pozycję (wyjmij z atrybutu transform)
    const getTranslate = async (): Promise<{ x: number; y: number }> => {
      const t = await symbol.getAttribute('transform');
      const m = /translate\(([-\d.]+),\s*([-\d.]+)\)/.exec(t ?? '');
      return { x: Number(m?.[1] ?? 0), y: Number(m?.[2] ?? 0) };
    };
    const before = await getTranslate();

    // Oblicz środek symbolu we współrzędnych ekranu
    const box = await symbol.boundingBox();
    expect(box).not.toBeNull();
    const startX = box!.x + box!.width / 2;
    const startY = box!.y + box!.height / 2;

    // Pointer-drag: down → ruch kilkukrotny → up (żeby trafić w drag threshold)
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 60, startY + 40, { steps: 8 });
    await page.mouse.move(startX + 120, startY + 80, { steps: 8 });
    await page.mouse.up();

    const after = await getTranslate();
    expect(after.x).not.toBe(before.x);
    expect(after.y).not.toBe(before.y);
    // Pozycja powinna się snapować do 10
    expect(after.x % 10).toBe(0);
    expect(after.y % 10).toBe(0);
  });
});
