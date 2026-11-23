# Specyfikacja modelu i silnika symulacji

Model jest **logiczny** (D3): liczy, które zaciski są połączone, jakie mają potencjały, które odbiorniki są zasilone i którędy płynie prąd. Wartości prądów i czasów są wyznaczane z prostych wzorów na podstawie danych odbiorników i zabezpieczeń – wystarczająco wiernie dla dydaktyki, bez rozwiązywania równań obwodu.

## 1. Słownik

| Pojęcie | Znaczenie |
| --- | --- |
| Aparat (`DeviceInstance`) | Egzemplarz typu z `data/devices.json`, z oznaczeniem (`-K1`), pozycją na szynie i stanem |
| Zacisk (`TerminalRef`) | `"<oznaczenie>:<zacisk>"`, np. `"-K1:A1"`, `"-X1:L1.top"` dla złączek (strona `top`/`bot`) |
| Element przewodzący | Krawędź grafu: przewód, styk zamknięty, mostek wewnętrzny, element grzejny termika |
| Odbiornik | Element pomiędzy zaciskami, który pobiera prąd: cewka, lampka, uzwojenia silnika, wejście zasilacza |
| Sieć (`Net`) | Zbiór zacisków połączonych elementami przewodzącymi (union-find) |
| Potencjał | Etykieta źródła na sieci: `L1`, `L2`, `L3`, `N`, `PE`, `DC+`, `DC0` (+ identyfikator źródła) |

## 2. Typy domeny (TypeScript, skrót)

```ts
type Potential = 'L1' | 'L2' | 'L3' | 'N' | 'PE' | 'DC+' | 'DC0';
type TerminalRef = string;               // "-K1:A1"

interface DeviceType {                   // z data/devices.json
  id: string;                            // "contactor-3p-9a"
  kind: 'mainSwitch'|'mcb'|'motorBreaker'|'contactor'|'overload'|'psu'|'terminal'|'peBar'
      | 'pushbutton'|'lamp'|'motor'|'timer'|'supply';
  prefix: string;                        // "-K"
  widthMm: number;                       // 45
  mount: 'rail'|'door'|'external';
  terminals: { id: string; side: 'top'|'bottom'|'front'; x: number }[];  // x w mm od lewej
  contacts?: Contact[];                  // styki sterowane stanem
  links?: [string, string][];            // stałe połączenia wewnętrzne
  loads?: Load[];                        // odbiorniki
  params: Record<string, number|string>; // In, curve, Ucoil, setRange…
}
interface Contact { from: string; to: string; type: 'NO'|'NC'; actuator: 'coil'|'handle'|'button'|'thermal'|'trip'; }
interface Load { a: string; b: string; kind: 'coilDC'|'coilAC'|'lamp'|'psuIn'|'motorWinding'; }

interface DeviceInstance {
  tag: string;                           // "-K1"
  typeId: string;
  placement?: { rail: number; xMm: number } | { door: true; x: number; y: number };
  params?: Record<string, number|string>; // nadpisania, np. nastawa termika setA = 8.5
  state: DeviceState;
}
interface Wire {
  id: string; a: TerminalRef; b: TerminalRef;
  color: 'brown'|'black'|'grey'|'blue'|'greenYellow'|'darkBlue'|'red'|'white';
  crossSection: 0.75|1|1.5|2.5|4; ferrule: boolean;
  route: { x: number; y: number }[];     // w mm na płycie; przewód w korytku ma punkty na pasie korytka
  fault?: 'open'|'loose';                // wstrzyknięte usterki
}
interface Project { devices: DeviceInstance[]; wires: Wire[]; schematic?: Schematic; }
```

## 3. Graf przewodzenia i sieci

1. Wierzchołki: wszystkie zaciski wszystkich aparatów.
2. Krawędzie (budowane od nowa przy każdej zmianie stanu):
   - każdy przewód bez usterki `open` (przewód `loose` przewodzi z prawdopodobieństwem 0,7 na krok – migotanie, deterministyczny seed),
   - każde `links` z typu (np. złączka `top`↔`bot`, szyna PE – wszystkie zaciski),
   - każdy **zamknięty** styk (`NO` gdy aktuator aktywny, `NC` gdy nieaktywny),
   - element grzejny termika (biegun 1→2, 3→4, 5→6) – zawsze przewodzi.
3. Sieci = składowe spójne (union-find). Odbiorniki **nie są** krawędziami.

## 4. Źródła i potencjały

- Źródło zewnętrzne `supply` (zaciski `L1, L2, L3, N, PE`, 400/230 V, 50 Hz) – w zadaniach podłączone do `-Q0` lub bezpośrednio do `-X1` (`tasks/*.json` → `scene.supply`).
- Zasilacz `psu`: gdy jego obciążenie `psuIn` (L–N) ma napięcie 230 V AC przez ≥ 100 ms, wyjścia dostają potencjały `DC+` i `DC0` własnego źródła (`sourceId = "-T1"`), do `params.Imax`.
- Propagacja: każda sieć dostaje zbiór `(potential, sourceId)` wszystkich źródeł, które do niej należą.

### Zwarcie

Sieć z dwoma różnymi potencjałami tego samego rodzaju napięcia jest zwarciem:

| Para | Typ | Prąd zwarciowy (model) |
| --- | --- | --- |
| Lx–N, Lx–PE | jednofazowe | `Ik = 230 V / Zs`, `Zs = 0,19 Ω` → ≈ 1,2 kA |
| Lx–Ly | międzyfazowe | `Ik = 400 V / (2·Zs)` → ≈ 1,05 kA |
| DC+–DC0 | zwarcie wyjścia zasilacza | zasilacz przechodzi w ograniczenie prądu (hiccup), `DC+` znika po 5 ms |

Zabezpieczenie, które zadziała = pierwszy aparat z wyzwalaczem (`mcb`, `motorBreaker`) na ścieżce od źródła do miejsca zwarcia (BFS po krawędziach, z pamiętaniem, przez którą krawędź-styk aparatu przeszła ścieżka). Czas zadziałania z §6. Do czasu zadziałania sieć ma flagę `fault: 'short'` (UI pulsuje), potem wyzwalacz otwiera styki i graf się przebudowuje.

## 5. Pętla symulacji

Krok stały `dt = 1 ms` czasu symulowanego; UI wywołuje `step(n)` z mnożnikiem tempa (0,01× / 0,1× / 1×) i pauzą.

```
function step(state, inputs, dt):
  1. zbuduj graf (§3) → sieci
  2. przypisz potencjały (§4), wykryj zwarcia
  3. oceń odbiorniki: napięcie na odbiorniku = różnica potencjałów jego dwóch sieci
     - coilDC: zasilona, gdy a∈DC+ i b∈DC0 tego samego źródła (≥ 85% Un)
     - coilAC/lamp/psuIn: zasilone przy 230 V (L–N) lub wg params.Un
     - motor: U,V,W mają trzy różne fazy → praca; dwie fazy → praca dwufazowa (przeciążenie ×1,7); jedna → stoi
  4. zaktualizuj aparaty (§6) z opóźnieniami (cewka: zamknięcie 15 ms, otwarcie 10 ms)
  5. jeśli w tym kroku zmienił się stan jakiegoś styku → wróć do 1 (maks. 20 iteracji; przekroczenie = zdarzenie "oscylacja", np. przekaźnik sam siebie wyłącza)
  6. wyznacz ścieżki prądu (§7) i prądy, zapisz zdarzenia
```

Wynik kroku (`SimSnapshot`):

```ts
interface SimSnapshot {
  t: number;                                       // ms
  nets: { id: string; terminals: TerminalRef[]; potentials: Potential[]; fault?: 'short' }[];
  devices: Record<string, DeviceState>;            // np. { '-K1': { coil: true, closed: true } }
  wires: Record<string, { live: boolean; current: number; flow: boolean; fault?: 'short'|'open' }>;
  events: { t: number; level: 'info'|'warn'|'error'; text: string; tags: string[] }[];
}
```

## 6. Modele aparatów

| Rodzaj | Stan | Zachowanie |
| --- | --- | --- |
| `mainSwitch` (-Q0) | `on`, `locked` | Ręczny 0/I. `locked` (kłódka LOTO) blokuje przejście na I |
| `mcb` (-F1) | `on`, `tripped` | Krzywa B/C: zwarcie ≥ 5×Iₙ (B: ≥ 3×Iₙ) → zadziałanie w 4 ms; przeciążenie: `t = 40 s / ((I/Iₙ)² − 1)` dla I > 1,13·Iₙ |
| `motorBreaker` (-Q1) | `on`, `tripped` | Jak `mcb` krzywa C + nastawa termiczna `setA` |
| `contactor` (-K1) | `coil`, `closed`, `manual` | `closed` po 15 ms od zasilenia cewki; `manual` (ręczne dociśnięcie) tylko gdy cewka bez napięcia |
| `overload` (-F2) | `heat` 0–1, `tripped`, `resetMode` H/A | `heat += dt · ((I/Iset)² − 1)/τ` dla I > Iset, chłodzenie `heat −= dt/τc`; klasa 10A: τ dobrane tak, by 7,2×Iset wyzwalało w 4–10 s; `heat ≥ 1` → `tripped` (95–96 otwarty, 97–98 zamknięty); TEST = natychmiastowe wyzwolenie; RESET tylko gdy `heat < 0,7` |
| `psu` (-T1) | `out` | §4 |
| `pushbutton` | `pressed` | Chwilowy; styki NO/NC |
| `lamp` | `lit` | Świeci, gdy obciążenie zasilone |
| `motor` (-M1) | `rpm`, `I` | Rozruch: `I = 6×Iₙ` przez 0,6 s, potem `Iₙ × obciążenie` (domyślnie 0,95); `rpm` narasta liniowo do `params.nN` |
| `timer` | `elapsed`, `out` | Opóźnione załączenie (TON) z nastawą `tSet` |

## 7. Ścieżki prądu i prądy

- Dla każdego zasilonego odbiornika: najkrótsza ścieżka w grafie od każdego jego zacisku do źródła (osobno strona „gorąca” i powrotna). Wszystkie krawędzie-przewody na ścieżkach dostają `flow: true` i prąd odbiornika (sumowany, gdy ścieżki się pokrywają).
- Prądy odbiorników: cewka `P/U` (np. 2,4 W / 24 V = 0,1 A), lampka `params.P/U`, silnik §6, wejście zasilacza `Iout·24/(230·0,85)`.
- `live: true` dla przewodu, którego sieć ma potencjał inny niż `N`, `PE`, `DC0`.
- Przekrój: prąd > dopuszczalnego dla przekroju (0,75 → 6 A, 1 → 10 A, 1,5 → 16 A, 2,5 → 21 A) → ostrzeżenie walidacji.

## 8. Miernik

| Zakres | Wynik |
| --- | --- |
| V~ | Różnica potencjałów AC sond: faza–faza 400 V, faza–N/PE 230 V, poza tym 0. Szum ±0,5 V deterministyczny (np. `230,4`) |
| V= | DC+–DC0 tego samego źródła: 24,1 V; przy AC ~0,02 V |
| Ω | Tylko gdy obie sieci sond są bez napięcia. Ta sama sieć → 0,1–0,3 Ω; przez odbiornik → jego `params.R` (cewka K1 240 Ω, uzwojenie silnika 3,6 Ω); inaczej `OL`. Pod napięciem → `BLOK` |
| ·))) | Jak Ω, sygnał gdy < 30 Ω |
| A~ (cęgi) | Prąd przewodu z §7 |

## 9. Schemat i porównanie ze szafą

- Schemat (`Schematic`) to zbiór wystąpień symboli (`{ tag, element, terminals }` – np. styk `-K1:13–14` na arkuszu 1, kolumna 6) i połączeń między pinami symboli oraz potencjałów (`+24V`, `0V`, `L1`…) łączących sieci przez arkusze.
- Netlist schematu: union-find po połączeniach + po pinach o tym samym `TerminalRef` + po potencjałach o tej samej nazwie.
- Porównanie: dla każdego `TerminalRef` występującego w obu – czy zbiory zacisków w jego sieci są równe. Różnice → `{ terminal, inSchematic: TerminalRef[], inCabinet: TerminalRef[] }`, UI pokazuje je jako „Niezgodność”.
- ERC schematu: pin niepołączony, dwa potencjały w jednej sieci, cewka bez lustra styków, styk bez cewki o tym samym oznaczeniu.
- Symulacja na schemacie (zadania `schematic`): ten sam silnik, graf z netlisty schematu (styki z symboli).

## 10. Walidacja zadań

Wymagania w zadaniu są predykatami (lista w `tasks/task.schema.json` → `requirement.check`):

| `check` | Parametry | Spełnione, gdy |
| --- | --- | --- |
| `deviceExists` | `tag`, `typeKind` | aparat jest na płycie |
| `connected` | `a`, `b` | `a` i `b` w jednej sieci (przy wszystkich stykach w stanie spoczynku i zamkniętych wyłącznikach) |
| `inSeries` | `path: TerminalRef[]` | kolejne pary połączone wyłącznie przez wskazane styki |
| `parallel` | `a`, `b`, `with` | styk `with` łączy te same sieci co `a`–`b` |
| `wireColors` | – | kolor każdego przewodu zgodny z potencjałem sieci (L1/L2/L3 brown/black/grey, N blue, PE greenYellow, DC darkBlue) |
| `setting` | `tag`, `param`, `min`, `max` | nastawa w zakresie (np. termik 1,0–1,05 × Iₙ silnika) |
| `scenario` | `id` | scenariusz testowy przechodzi |
| `schematicMatchesCabinet` | – | brak niezgodności z §9 |

Komunikaty walidacji mają format jak w makietach: `"Brak połączenia -K1:A1 ↔ -S2:14"`, `"Przewód N w złym kolorze"`.

## 11. Scenariusze testowe

Scenariusz = lista kroków wykonywanych na silniku:

```json
[{ "do": "set", "tag": "-Q0", "state": { "on": true } },
 { "do": "press", "tag": "-S2", "ms": 200 },
 { "do": "wait", "ms": 1000 },
 { "expect": { "-K1.closed": true, "-M1.running": true, "-H1.lit": true } }]
```

Nagrywanie w edytorze zadań (M11) zapisuje akcje użytkownika jako `do`, a stan po każdej akcji jako `expect`.

## 12. Bezpieczeństwo (LOTO)

- „Dotknięcie okablowania” = rozpoczęcie przeciągania przewodu, odkręcenie zacisku lub usunięcie aparatu w trybie symulacji. Jeśli jakakolwiek sieć jest `live` → modal „Praca pod napięciem!” (treść w `SPEC-UI.md`).
- Procedura: `-Q0` → 0, `locked = true` (kłódka), pomiar braku napięcia (V~ na każdej parze faz i faza–PE). Zadania diagnostyczne punktują kolejność; pominięcie = kara z `task.scoring.lotoPenalty`.
