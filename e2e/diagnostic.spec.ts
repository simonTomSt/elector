import { test, expect } from '@playwright/test';

test.describe('Diagnostyka: zgłoszenie usterki', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.__elector?.resetStores());
    await page.reload();
  });

  test('otwarcie diag-no-start pokazuje przycisk „Zgłoś usterkę"', async ({ page }) => {
    await page.getByRole('button', { name: /Otwórz zadanie diag-no-start/i }).click();
    await expect(page.getByRole('button', { name: /Zgłoś usterkę/i })).toBeVisible();
  });

  test('klik zgłoś → modal → trafna diagnoza → 100/100', async ({ page }) => {
    await page.getByRole('button', { name: /Otwórz zadanie diag-no-start/i }).click();

    // Odczytaj wylosowaną usterkę przez bridge
    const assigned = await page.evaluate(() => {
      return (
        window as unknown as {
          __elector_test?: { assigned: string[] };
        }
      ).__elector_test?.assigned;
    });
    // Jeśli brak bridge-helpera, odczytamy ze state'u przez window
    const assignedIds = await page.evaluate(() => {
      // Dostęp do zustand store'a przez require — trudne. Użyjemy localStorage.
      const raw = window.localStorage.getItem('elector:project:diag-no-start');
      if (!raw) return [];
      const parsed = JSON.parse(raw) as { payload: { assignedFaultIds?: string[] } };
      return parsed.payload.assignedFaultIds ?? [];
    });
    expect(assignedIds.length).toBeGreaterThan(0);

    // Otwórz modal
    await page.getByRole('button', { name: /Zgłoś usterkę/i }).click();
    const dialog = page.getByRole('dialog', { name: /Zgłoszenie usterki/i });
    await expect(dialog).toBeVisible();

    // Zaznacz checkbox z aria-label `Wybierz usterkę <id>`
    for (const id of assignedIds) {
      await dialog.getByRole('checkbox', { name: `Wybierz usterkę ${id}` }).check();
    }

    // Wyślij
    await dialog.getByRole('button', { name: /Zgłoś wybrane usterki/i }).click();

    // Komunikat sukcesu
    await expect(dialog).toContainText(/Trafiona usterka/i);

    // Status zapisany: ukonczone
    const progress = await page.evaluate(() => {
      const raw = window.localStorage.getItem('elector:progress');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { payload: Record<string, { status: string; score?: number }> };
      return parsed.payload['diag-no-start'];
    });
    expect(progress?.status).toBe('ukonczone');
    expect(progress?.score).toBe(100);
    assigned; // unused silence
  });

  test('zła diagnoza daje 0 pkt i status w-toku', async ({ page }) => {
    await page.getByRole('button', { name: /Otwórz zadanie diag-no-start/i }).click();

    const assignedIds = await page.evaluate(() => {
      const raw = window.localStorage.getItem('elector:project:diag-no-start');
      if (!raw) return [];
      const parsed = JSON.parse(raw) as { payload: { assignedFaultIds?: string[] } };
      return parsed.payload.assignedFaultIds ?? [];
    });
    const allFaults = ['f-coil', 'f-loose-a2', 'f-open-c4', 'f-f1'];
    const wrongPick = allFaults.find((id) => !assignedIds.includes(id));
    expect(wrongPick).toBeDefined();

    await page.getByRole('button', { name: /Zgłoś usterkę/i }).click();
    const dialog = page.getByRole('dialog', { name: /Zgłoszenie usterki/i });
    await dialog.getByRole('checkbox', { name: `Wybierz usterkę ${wrongPick}` }).check();
    await dialog.getByRole('button', { name: /Zgłoś wybrane usterki/i }).click();

    await expect(dialog).toContainText(/Zła diagnoza/i);
    const progress = await page.evaluate(() => {
      const raw = window.localStorage.getItem('elector:progress');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { payload: Record<string, { status: string; score?: number }> };
      return parsed.payload['diag-no-start'];
    });
    expect(progress?.status).toBe('w-toku');
    expect(progress?.score).toBe(0);
  });
});
