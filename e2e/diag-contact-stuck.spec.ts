import { test, expect } from '@playwright/test';

test.describe('Diagnostyka contactWelded (diag-contact-stuck)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.__elector?.resetStores());
    await page.reload();
  });

  test('otwarcie pokazuje symptom i przycisk „Zgłoś usterkę"', async ({ page }) => {
    await page
      .getByRole('button', { name: /Otwórz zadanie diag-contact-stuck/i })
      .click();
    await expect(page.getByRole('button', { name: /Zgłoś usterkę/i })).toBeVisible();
    // Jedna z usterek została wylosowana
    const diag = await page.evaluate(() => window.__elector?.getDiagnostic());
    expect(diag?.assigned.length).toBe(1);
  });

  test('trafna diagnoza (contactWelded) → 100/100', async ({ page }) => {
    await page
      .getByRole('button', { name: /Otwórz zadanie diag-contact-stuck/i })
      .click();

    // Deterministycznie: wymuś konkretną usterkę przez bridge.
    await page.evaluate(() => window.__elector?.assignFaults(['f-k1-welded']));

    await page.getByRole('button', { name: /Zgłoś usterkę/i }).click();
    const dialog = page.getByRole('dialog', { name: /Zgłoszenie usterki/i });
    await dialog.getByRole('checkbox', { name: 'Wybierz usterkę f-k1-welded' }).check();
    await dialog.getByRole('button', { name: /Zgłoś wybrane usterki/i }).click();
    await expect(dialog).toContainText(/Trafiona usterka/i);

    const progress = await page.evaluate(() => {
      const raw = window.localStorage.getItem('elector:progress');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        payload: Record<string, { status: string; score?: number }>;
      };
      return parsed.payload['diag-contact-stuck'];
    });
    expect(progress?.status).toBe('ukonczone');
    expect(progress?.score).toBe(100);
  });

  test('repairFault usuwa device fault z diagnostic store i perystuje', async ({ page }) => {
    await page
      .getByRole('button', { name: /Otwórz zadanie diag-contact-stuck/i })
      .click();

    // Przypisz dokładnie jedną usterkę (contactWelded na -K1).
    await page.evaluate(() => window.__elector?.assignFaults(['f-k1-welded']));

    const before = await page.evaluate(() => window.__elector?.getDiagnostic());
    expect(before?.assigned).toEqual(['f-k1-welded']);
    expect(before?.repaired).toEqual([]);

    // Napraw
    const result = await page.evaluate(() => window.__elector?.repairFault('f-k1-welded'));
    expect(result?.ok).toBe(true);

    const after = await page.evaluate(() => window.__elector?.getDiagnostic());
    expect(after?.repaired).toEqual(['f-k1-welded']);

    // Perystencja w localStorage
    const saved = await page.evaluate(() => {
      const raw = window.localStorage.getItem('elector:project:diag-contact-stuck');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        payload: { repairedFaultIds?: string[]; assignedFaultIds?: string[] };
      };
      return parsed.payload;
    });
    expect(saved?.repairedFaultIds).toEqual(['f-k1-welded']);
  });

  test('zła diagnoza (coilOpen zamiast welded) → 0 pkt', async ({ page }) => {
    await page
      .getByRole('button', { name: /Otwórz zadanie diag-contact-stuck/i })
      .click();
    await page.evaluate(() => window.__elector?.assignFaults(['f-k1-welded']));

    await page.getByRole('button', { name: /Zgłoś usterkę/i }).click();
    const dialog = page.getByRole('dialog', { name: /Zgłoszenie usterki/i });
    await dialog.getByRole('checkbox', { name: 'Wybierz usterkę f-k1-coilopen' }).check();
    await dialog.getByRole('button', { name: /Zgłoś wybrane usterki/i }).click();
    await expect(dialog).toContainText(/Zła diagnoza/i);

    const progress = await page.evaluate(() => {
      const raw = window.localStorage.getItem('elector:progress');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        payload: Record<string, { status: string; score?: number }>;
      };
      return parsed.payload['diag-contact-stuck'];
    });
    expect(progress?.status).toBe('w-toku');
    expect(progress?.score).toBe(0);
  });
});
