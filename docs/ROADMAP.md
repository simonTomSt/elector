# Roadmapa implementacji

Każdy etap kończy się zielonym `npm run typecheck && npm test`. Najpierw testy z kryteriów akceptacji, potem implementacja.

## M0 – Szkielet
- Vite + React + TS strict, ESLint, Prettier, Vitest, alias `@/`.
- `src/ui/theme/tokens.ts` ładujący `design/tokens.json`, przełącznik motywu (CSS custom properties na `:root[data-theme]`).
- Pusta powłoka aplikacji: TopBar + trzy kolumny (lewy panel 272 px, scena, prawy panel 340 px), zawijanie przy wąskim ekranie.

**Akceptacja:** `npm run dev` pokazuje powłokę w obu motywach; testy i typecheck przechodzą.

## M1 – Domena i zadania
- Typy z `SPEC-SIM.md` §2 (`DeviceType`, `DeviceInstance`, `Terminal`, `Wire`, `Project`, `Task`).
- Loader `data/devices.json`, loader i walidacja `tasks/*.json` wg `tasks/task.schema.json` (np. Ajv).

**Akceptacja:** wszystkie 4 przykłady ładują się bez błędów; błędny JSON daje czytelny komunikat.

## M2 – Netlist i potencjały (silnik, bez UI)
- Budowa grafu przewodzenia (`SPEC-SIM.md` §3), union-find sieci, propagacja źródeł.
- Detekcja zwarć i określenie zabezpieczenia, które zadziała.

**Akceptacja:** na rozwiązaniu `tasks/examples/dol-4kw.json`: po załączeniu `-Q0`, `-Q1`, `-F1` sieć `-T1:+` ma potencjał `DC+`, `-K1:A1` jest bez napięcia do naciśnięcia START. Test zwarcia L1–N: zadziała `-Q1` w ≤ 10 ms.

## M3 – Pętla czasowa i aparaty
- Krok symulacji (`SPEC-SIM.md` §5): cewki, styki, termik (całkowanie), wyłączniki (krzywe B/C), silnik (rozruch 6×Iₙ).
- Dziennik zdarzeń.

**Akceptacja:** wszystkie `testScenarios` z 4 przykładów przechodzą w testach.

## M4 – Statyczna scena szafy
- `MountingPlate`, `Rail`, `Duct`, `DeviceView` (parametryczny z `devices.json`), `TerminalView`, `WireView` (zaokrąglone narożniki, halo, PE w paski).
- Render rozwiązania wzorcowego `dol-4kw` 1:1 z `design/mockups/Plyta.dc.html`.

## M5 – Montaż
- Paleta aparatów, drag & drop na szynę, przyciąganie do siatki 9 mm, kolizje, widmo podczas przeciągania.
- Zoom/pan, zoom semantyczny (powyżej 200% numery zacisków, śruby, tulejki).

## M6 – Okablowanie
- Ciągnięcie przewodu od zacisku, podświetlanie zgodnych zacisków, narzędzie „Szpula” (przekrój, kolor, tulejki), prowadzenie przez korytka (auto-routing ortogonalny po pasach korytek).
- Inspektor aparatu (zaciski, podłączenia, dane, elementy interaktywne).
- Walidacja na żywo (prawy panel + znaczniki na scenie). Playwright: zbuduj `dol-4kw` od zera.

## M7 – Tryb symulacji
- Przełącznik ON/OFF, poświata/przepływ/pulsowanie, toast zwarcia, sterowanie czasem (pauza, krok, 0,01×/0,1×/1×), zakładka Drzwi z przyciskami i lampkami.

## M8 – Miernik i bezpieczeństwo
- Multimetr (V~, V=, Ω, ciągłość, A~ cęgi), sondy przeciągane na zaciski, blokady pod napięciem.
- LOTO: modal przy dotknięciu okablowania pod napięciem, kłódka na `-Q0`. Zadanie diagnostyczne z wstrzykiwaniem usterek.

## M9 – Schemat
- Edytor schematu (arkusz, symbole IEC 60617, połączenia ortogonalne, węzły, potencjały, odsyłacze, lustro styków).
- ERC (otwarte połączenia, zwarcia potencjałów, brak odsyłaczy). Symulacja na schemacie.

## M10 – Widok mieszany
- Szafa + schemat obok siebie, wspólne zaznaczenie, tabela powiązań, porównanie netlist schemat ↔ szafa (`SPEC-SIM.md` §9).

## M11 – Edytor zadań
- Formularz z `design/mockups/EdytorZadan.dc.html`, nagrywanie scenariuszy, usterki, eksport/import JSON.
