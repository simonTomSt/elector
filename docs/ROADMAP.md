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

## M12 – Persystencja i wybór zadania
- Autosave projektu kursanta w `localStorage` per `taskId` (`elector:project:<taskId>`), wersjonowany schema (`schemaVersion`), odporny na uszkodzone/stare zapisy (fallback do pustego stanu).
- Ustawienia UI (motyw, bieżący widok, otwarte zadanie) w `elector:ui`, też wersjonowane.
- Postęp zadań w `elector:progress` (status `nie-zaczete | w-toku | ukonczone`, czas ostatniej edycji).
- Nowy widok `tasks` – ekran wyboru zadania z kafelkami (`tasks/examples/*.json`), statusem i akcją „Zacznij od nowa".
- Przy wznowieniu dyskretny baner „Wznowiono zapis z &lt;data&gt;" z akcją „Zacznij od nowa".
- Eksport/import pełnego snapshotu (wszystkie zapisy zadań + ustawienia + postęp) jako jeden JSON, walidowany przy wczytaniu.

**Akceptacja:** po reloadzie przeglądarki stan sceny, motyw i widok są przywrócone; uszkodzony zapis nie wywala apki; eksport→import round-trip daje identyczny stan.

## M13 – Scoring i raport
- Interpreter `Requirement.check` obejmuje wszystkie 9 typów: `deviceExists`, `connected`, `inSeries`, `parallel`, `wireColors`, `setting`, `scenario`, `schematicMatchesCabinet`, `schematicConnected`, `noErc` (reużywa `validateLive` z M6, dodaje obsługę `scenario` przez `runScenario`).
- `computeScore(task, validation, inputs)` liczy wynik (0–100) proporcjonalnie do zdanych wymagań, odejmuje `lotoPenalty × incydenty` i `hintPenalty × podpowiedzi` z `task.scoring`, klamruje do zera.
- Licznik incydentów LOTO w `useLotoStore.incidentCount` (inkrementowany przy `openPrompt`).
- Przycisk „Sprawdź rozwiązanie" w TopBar otwiera modal z listą kryteriów (✓/✗ + detal), wynikiem i karami; zapisuje `score`, `status` (`ukonczone` jeśli 100/100) i `completedAt` do `elector:progress`.
- Kafelek zadania w widoku `tasks` pokazuje wynik przy ukończonym zadaniu.

**Akceptacja:** wzorcowe rozwiązanie `dol-4kw` daje 100/100 i `ukonczone`; sam preset (bez solution) daje <100 i `w-toku`; kary skalują się z incydentami.

## M14 – Podpowiedzi
- Nowe pole `Task.hints: Hint[]` ze schemy, każda podpowiedź ma `level` (subtelna / bezpośrednia / rozwiązanie).
- `Task.scoring.hintLevels` z karami per poziom (np. subtelna −2, bezpośrednia −5, rozwiązanie −15). Fallback do płaskiego `hintPenalty` gdy brak `hintLevels`.
- `useHintsStore` trzyma `revealedIds[]` i licznik `used`; stan perystowany w `PersistedProject.revealedHintIds` (po F5 kursant dalej ma odkryte podpowiedzi i karę).
- Przycisk „💡 Podpowiedź (n/N)" w TopBar odsłania kolejną nieodkrytą podpowiedź; `disabled` po odkryciu wszystkich.
- Panel odkrytych podpowiedzi w Inspector (pod wymaganiami), pokazywany tylko gdy coś odkryte.
- `computeScore` sumuje kary po `level` z odkrytych podpowiedzi; raport „Sprawdź rozwiązanie" pokazuje wiersz `podpowiedzi −N`.

**Akceptacja:** klik przycisku odsłania podpowiedź, scoring uwzględnia karę per poziom; po reloadzie odkryte podpowiedzi są zachowane; „Zacznij od nowa" resetuje też podpowiedzi.

## M15 – Playwright e2e
- `@playwright/test` + chromium, konfig `playwright.config.ts` z `webServer` startującym `npm run dev`, trace/screenshots/video on-failure, osobny katalog `e2e/`.
- Dev-mode-only bridge `src/e2eBridge.ts` → `window.__elector` z metodami `openTask`, `loadSolution`, `clearToPreset`, `resetStores`, `setView`. Dzięki temu e2e testuje flow UI (przyciski → modal → progress → persystencja) bez ręcznego drag-and-drop każdego aparatu.
- Trzy scenariusze: `full-flow` (preset → sprawdź → solution → 100/100 i wersja z podpowiedzią daje 98/100), `persistence` (odkryta podpowiedź/widok zachowane po reloadzie, „Zacznij od nowa" resetuje), `navigation` (wszystkie widoki renderują się bez błędów konsoli).
- Nowe skrypty: `npm run test:e2e` i `npm run test:e2e:ui`. E2e jest osobny od vitesta (`tests/` w vitest, `e2e/` w Playwright).
- `TasksScreen` force-refresh po `reset()` (zmiana z `loadProgress()` raz-na-render na `useState` trigger).

**Akceptacja:** 6 testów e2e przechodzi w ≤10 s, trace/video zapisywane tylko przy failure, dev bridge jest wyłączony w produkcyjnym bundle.

## M17 – Edytor zadań: podpowiedzi
- Nowa sekcja „7. Podpowiedzi" w `TaskEditorScreen` z listą kart (id, select poziomu, input tekstu, przycisk usuń) i przyciskiem „+ Dodaj podpowiedź".
- Akcje `addHint`, `updateHint(id, patch)`, `removeHint(id)` w `useTaskEditorStore`; `addHint` generuje unikalne `h1, h2, …` bez kolizji z istniejącymi id.
- `HINT_LEVELS` eksportowane ze store'a dla selecta.
- Pozycja w nawigacji bocznej (Nav) między „Usterki" a „Publikacja".
- `toJson()` serializuje `draft.hints` automatycznie (był przezroczysty) — eksport działa od razu, bez dodatkowej logiki.

**Akceptacja:** autor może przez UI dodawać/edytować/usuwać podpowiedzi; eksport JSON zawiera `hints` zgodne ze schematem; podpowiedzi dodane w edytorze są widoczne dla kursanta po załadowaniu zadania.

## M18 – Polerka UX
- `HintsPanel` wyekstrahowany z `Inspector` do samodzielnego komponentu z wariantami `inspector` i `sidebar`. Podpięty w prawym panelu widoków `mixed` i `schematic` (wcześniej odkryte podpowiedzi widać było tylko w cabinet).
- Kafelek w `TasksScreen` pokazuje dodatkowo `podpowiedzi: N/M` gdy kursant coś odkrył; `hintsTotal` czytane z surowych JSON-ów zadań, `revealedHints` z `PersistedProject.revealedHintIds`.
- `ResumeBanner` × ma teraz `aria-label="Schowaj komunikat"` zamiast duplikatu `"Zamknij"`; `ResultModal` zostaje przy `"Zamknij"`. Testy mogą jednoznacznie dotrzeć do konkretnego przycisku.

**Akceptacja:** odkryte podpowiedzi widać w każdym widoku zadania; lista zadań pokazuje ile ich zużyto; dwa przyciski „×" w DOM nie dzielą tego samego accessible name.

## M19 – Zadania diagnostyczne
- Nowy `src/store/diagnostic.ts`: `assignedFaultIds` (wylosowane przy otwarciu zadania `type: diagnostic`), `reportedFaultIds`, `report(ids)` zwraca `correct` gdy zbiór zgłoszonych = wylosowanych. Perystowane w `PersistedProject` (assigned/reported/reportedAt).
- `pickFaults(faults, n, rnd)` losuje N z listy bez powtórzeń; opcjonalny seed dla testów.
- `useProjectStore.init` dla `type: diagnostic` + `scene.start: 'wired'` ładuje preset+solution (gotowa szafa), losuje usterki (lub hydratuje z zapisu), a `applyAssignedFaults()` wstrzykuje `wireFault` do `wires`. Device fault (`coilOpen`, `tripped`) trafia do sim przez nowy parametr `useSimStore.turnOn(project, initialStates)`.
- `EditorScreen` używa `loadTaskRepo` zamiast `loadTask` — potrzebne by `diag-no-start` (extends `dol-4kw`) się załadował.
- UI: przycisk „🔍 Zgłoś usterkę" w TopBar widoczny tylko dla diagnostic; modal `ReportFaultModal` z listą wszystkich `task.faults[]` i checkboxami. Trafna diagnoza → 100 pkt, `ukonczone`, `setResult` otwiera standardowy raport. Pudło → 0 pkt, `w-toku`, komunikat ze wskazaną poprawną usterką.
- „Zacznij od nowa" resetuje też store diagnostyki.

**Akceptacja:** otwarcie `diag-no-start` ukrywa jedną z 4 usterek; kursant widzi tylko objaw; po zgłoszeniu trafnej usterki dostaje 100/100, po pudle 0 pkt. 3 nowe testy e2e + 12 jednostkowych.

## M20 – Skróty klawiaturowe
- Globalny hook `useGlobalShortcuts` w App: cyfry `1`..`5` przełączają widoki (`1` → zadania, `2` → szafa, `3` → schemat, `4` → mieszany, `5` → edytor).
- Ignorowane gdy fokus w `input`/`textarea`/`select`/`contenteditable` oraz gdy jest otwarty modal (`[role="dialog"][aria-modal]`).
- Modyfikatory (Ctrl/Alt/Meta/Shift) przepuszczają skrót do przeglądarki.
- `Esc` zamyka `ResultModal` i `ReportFaultModal`.
- Przyciski widoków w TopBar mają tooltipy z numerem skrótu.

**Akceptacja:** 8 testów jsdom pokrywa wszystkie przypadki brzegowe.

## M21 – Undo/Redo
- `useProjectStore` dostał stos `_past[]`/`_future[]` (snapshoty `{devices, wires}`) z limitem 50 wpisów.
- Subskrypcja monitorująca zmiany `devices`/`wires` automatycznie push'uje poprzedni stan do `_past`; flaga `historySuspended` chroni przed cyklami (undo/redo, init, applyAssignedFaults).
- Akcje `undo()`, `redo()`, `canUndo()`, `canRedo()`; nowa mutacja po undo czyści `_future` (standardowa semantyka).
- Skróty klawiaturowe `Ctrl/Cmd+Z` (undo), `Ctrl/Cmd+Shift+Z` lub `Ctrl/Cmd+Y` (redo) w `useGlobalShortcuts`; ignorowane w inputach i modalach (dzielony mechanizm z nawigacją 1..5).
- `init(task, library)` czyści historię.

**Akceptacja:** 10 testów jednostkowych + 2 skrótowe pokrywają dodanie/usunięcie urządzenia, przesunięcie, limit historii, czyszczenie przy init.

## M22 – Pomoc klawiszowa
- Modal `ShortcutsModal` (lista wszystkich skrótów z `<kbd>` + opis) otwierany klawiszem `?` lub przyciskiem `?` w TopBar; zamykany `Esc` lub `Zamknij`.
- Przycisk `?` w TopBar dla myszkowych userów — dispatchuje syntetyczny `KeyboardEvent('?')`, więc jeden punkt prawdy.

**Akceptacja:** klawisz `?` otwiera modal z listą 10 skrótów.

## M23 – Diagnostyka × silnik: integracja faultów
- `init(task, library)` dla diagnostic nie nadpisuje już istniejącego `assignedFaultIds` (poprzednio reset + losowanie kasowało ręczny hydrate w testach i w `window.__elector.openTask`).
- Przycisk „Sprawdź rozwiązanie" ukryty dla `task.type === 'diagnostic'` — scoring dla diagnostic odbywa się wyłącznie przez „Zgłoś usterkę". Wcześniej scoring przez `validateLive` fałszywie zaliczał diagnostic bo `runScenario` buduje własny projekt z `solution`, ignorując aktywny `wire.fault` w store'rze.
- 3 testy integracyjne potwierdzają: po `init` z assigned `f-open-c4` wire C4 ma `fault="open"`, graf symulacji nie łączy sieci przerwanego wire'a, a bez assigned fault nie ma.

**Akceptacja:** fault wstrzyknięty do store'a realnie wpływa na symulację (`buildGraph` go szanuje); UI diagnostic nie daje możliwości obejść scoringu przez „Sprawdź rozwiązanie".

## M24 – Wsparcie contactWelded i contactOpen w silniku
- Dwa nowe pola w `DeviceRuntimeState`: `contactsWelded` (wszystkie styki zawsze zamknięte) i `contactsOpen` (wszystkie styki zawsze otwarte).
- `isContactClosed` w `src/sim/graph.ts` najpierw sprawdza te fault'y i nadpisuje normalną logikę styków.
- `useDiagnosticStore.deviceFaultStates(task)` mapuje typy `contactWelded`/`contactOpen` z `Fault.apply.deviceFault` na odpowiednie flagi; wcześniej te warianty były cicho ignorowane.

**Akceptacja:** 3 testy `contact-faults.test.ts` potwierdzają że welded łączy pin 1-2 nawet bez cewki, a open rozłącza mimo closed=true. Diagnostyka przez `deviceFaultStates` emituje właściwe pola.
