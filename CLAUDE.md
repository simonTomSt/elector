# Symulator szafy sterowniczej – instrukcja dla Claude Code

Webowa aplikacja do nauki dla elektryków i automatyków. Kursant dostaje zadanie, rysuje schemat i/lub montuje aparaty w szafie, okablowuje je, a aplikacja symuluje przepływ prądu (zwarcia, zadziałanie zabezpieczeń, stany aparatów, pomiary miernikiem).

## Najpierw przeczytaj

1. `docs/DECISIONS.md` – przyjęte założenia (stack, zakres v1).
2. `docs/ROADMAP.md` – kolejność prac. Pracuj etapami, jeden etap = jeden PR/commit z testami.
3. `docs/SPEC-SIM.md` – model domeny i silnik symulacji. **To jest rdzeń aplikacji.**
4. `docs/SPEC-UI.md` – ekrany, komponenty, interakcje.
5. `design/tokens.json` – jedyne źródło kolorów, typografii i odstępów.
6. `design/mockups/` – makiety (format `.dc.html`, opis w `design/mockups/README.md`). Traktuj je jako referencję wizualną i źródło geometrii (np. trasy przewodów w `Plyta.dc.html`), nie jako kod do skopiowania.
7. `data/devices.json` i `tasks/` – biblioteka aparatów i przykładowe zadania. Na nich opieraj testy.

## Stack

- React 18 + TypeScript (strict) + Vite
- Zustand (stan aplikacji), Immer opcjonalnie
- Scena szafy i schematu: **SVG** renderowane przez React (bez canvas, bez bibliotek grafów)
- Vitest + @testing-library/react; Playwright dla kilku scenariuszy e2e (od etapu M6)
- ESLint + Prettier
- Bez backendu w v1: zadania ładowane z `tasks/*.json`, postęp w `localStorage`

## Struktura katalogów (docelowa)

```
src/
  domain/        # typy: Device, Terminal, Wire, Net, Task… (bez Reacta)
  sim/           # silnik symulacji – czyste funkcje, 100% testowane
  validation/    # wymagania zadań, kolory, zgodność schemat ↔ szafa
  store/         # Zustand: projekt kursanta, tryb, zaznaczenie, symulacja
  ui/
    theme/       # tokens.ts generowane/importowane z design/tokens.json
    components/  # TopBar, Palette, Stage, Inspector, Multimeter, Toast…
    scene/       # MountingPlate, Rail, Duct, DeviceView, WireView, Terminal
    schematic/   # Sheet, Symbol*, Connection
    screens/     # EditorScreen, SchematicScreen, MixedScreen, TaskEditor…
  tasks/         # loader + walidacja JSON schema
tests/           # testy silnika i scenariuszy zadań
```

## Zasady

- **Silnik symulacji jest niezależny od UI.** `src/sim` nie importuje Reacta ani store'a. Wejście: model szafy + stan wejść (przyciski, wyłączniki) + czas; wyjście: stan aparatów, potencjały sieci, ścieżki prądu, zdarzenia.
- Każda funkcja silnika ma testy. Scenariusze testowe zadań (`tasks/examples/*.json` → `testScenarios`) muszą przechodzić na rozwiązaniu wzorcowym.
- Oznaczenia wg PN-EN 81346: `-Q1`, `-F2`, `-K1`, `-T1`, `-X1`, `-S1`, `-H1`, `-M1`. Zacisk = `"-K1:A1"`.
- Interfejs **po polsku**, przecinek dziesiętny (`230,4 V`), jednostki ze spacją.
- Kolory przewodów wg PN-EN 60204-1 (tabela w `design/tokens.json` → `wire`).
- Stan nigdy nie jest komunikowany samym kolorem: każdy z 5 stanów ma też formę (poświata, animowane kreski, pulsowanie, paski). Patrz `SPEC-UI.md` → Stany.
- Cele dotykowe ≥ 44 px, kontrast tekstu ≥ 4,5:1 w obu motywach, prawdziwe `<button>`/`<input>`/`<label>`.
- Fonty systemowe (bez pobierania): sans `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`, mono `ui-monospace, "SF Mono", Menlo, Consolas, monospace` – mono dla oznaczeń, zacisków i odczytów.
- Aparaty generyczne i parametryczne, bez logo producentów.
- Małe kroki: po każdym etapie `npm run typecheck && npm test` muszą przechodzić.

## Komendy (do utworzenia w M0)

```
npm run dev        # Vite
npm run build
npm run typecheck  # tsc --noEmit
npm test           # vitest run
npm run test:e2e   # playwright (od M6)
npm run lint
```
