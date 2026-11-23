import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import dol4kwRaw from '../tasks/examples/dol-4kw.json';
import { loadDeviceLibrary } from '@/tasks/devices';
import { loadTask } from '@/tasks/loader';
import { useProjectStore } from '@/store/project';
import { Palette, PALETTE_DND_TYPE } from '@/ui/components/Palette';

const library = loadDeviceLibrary();
const task = loadTask(dol4kwRaw, { devices: library });

beforeEach(() => {
  useProjectStore.getState().init(task, library);
});

describe('M5 – paleta aparatów', () => {
  it('renderuje wszystkie typy z task.scene.palette', () => {
    render(<Palette library={library} paletteIds={task.scene.palette ?? []} />);
    const cards = screen.getAllByRole('button', { name: /Przeciągnij na płytę/ });
    expect(cards.length).toBe(task.scene.palette?.length ?? 0);
  });

  it('filtruje listę po wpisaniu frazy w wyszukiwarce', () => {
    render(<Palette library={library} paletteIds={task.scene.palette ?? []} />);
    const input = screen.getByPlaceholderText('Szukaj aparatu…') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Stycznik' } });
    const cards = screen.getAllByRole('button', { name: /Przeciągnij na płytę/ });
    expect(cards.length).toBe(1);
    expect(cards[0]?.getAttribute('data-type-id')).toBe('contactor-3p-9a-24vdc');
  });

  it('karta ustawia DataTransfer na dragstart (typeId)', () => {
    let payload: string | null = null;
    render(<Palette library={library} paletteIds={['contactor-3p-9a-24vdc']} />);
    const card = screen.getByRole('button', { name: /Przeciągnij na płytę/ });
    const dt = {
      data: new Map<string, string>(),
      setData(type: string, value: string) {
        this.data.set(type, value);
        if (type === PALETTE_DND_TYPE) payload = value;
      },
      getData(type: string) {
        return this.data.get(type) ?? '';
      },
      effectAllowed: '',
    };
    fireEvent.dragStart(card, { dataTransfer: dt });
    expect(payload).toBe('contactor-3p-9a-24vdc');
  });
});
