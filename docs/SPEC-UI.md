# Specyfikacja interfejsu

Makiety: `design/mockups/*.dc.html`. Kolory i typografia: wyłącznie z `design/tokens.json`.

## 1. Powłoka (wszystkie ekrany)

- **TopBar** (min. 64 px): ikona, „Zadanie N z M · typ”, nazwa zadania; kroki `Schemat → Montaż → Okablowanie → Test` (kropka: zrobione ✓ / aktywne / do zrobienia); przełącznik widoku `Szafa | Schemat | Szafa + schemat` (niedostępne widoki wyszarzone wg typu zadania); `Symulacja` (switch, WŁ = bursztyn); przycisk główny „Sprawdź rozwiązanie”.
- Układ: `flex-wrap`; lewy panel `flex: 1 1 272px`, scena `flex: 999 1 560px; min-width: 0`, prawy panel `flex: 1 1 340px`. Przy wąskim ekranie panele spadają pod scenę.
- Zakładki sceny: `Płyta montażowa | Drzwi | Listwy i przyłącza | Podgląd 3D` (3D wyłączone, D4).

## 2. Ekrany

| Ekran | Makieta | Najważniejsze elementy |
| --- | --- | --- |
| Edytor szafy | `Main.dc.html`, `Main-jasny.dc.html` | Paleta aparatów (szukaj, filtry, karta z miniaturą i szerokością w modułach, stan „przeciąganie”); płyta; zoom (−, %, +, dopasuj, pan, cofnij); pasek stanu; prawy panel: treść, wymagania (checkboxy, postęp), walidacja (numerowane, przycisk „Pokaż”) |
| Zbliżenie | `Zblizenie.dc.html` | Zoom semantyczny > 200%: numery zacisków, śruby, tulejki; ciągnięcie przewodu za kursorem; pulsujące zgodne zaciski; wskaźnik celu poza widokiem; toolbar „Szpula” (przekrój 0,75/1/1,5/2,5 mm², 6 kolorów, tulejki, Esc); minimapa; panel „Nowe połączenie” z listą zgodnych zacisków |
| Inspektor | `Inspektor.dc.html`, `Inspektor-F2.dc.html` | Panel ~560 px: front aparatu z klikalnymi zaciskami, lista podłączeń, dane znamionowe; K1: ręczne dociśnięcie; F2: pokrętło 6–10 A (+ suwak, −/+), podpowiedź vs Iₙ, TEST, RESET, tryb H/A; plakietka stanu |
| Symulacja | `Symulacja.dc.html` (+ `Zwarcie`, `Drzwi`) | Pasek czasu (pauza, krok, tempo, `t = 00:42,318`); stany aparatów; legenda; dziennik zdarzeń; toast zwarcia z akcjami; drzwi: `-Q0`, `-H1`, `-H2`, `-S2`, `-S1` klikalne |
| Miernik | `Miernik.dc.html` | Pływający, przeciągany multimetr: LCD, HOLD/MINMAX/REL, pokrętło 6 pozycji, gniazda; sondy na scenie (przeciągane końcówki); cęgi; dziennik pomiarów |
| Diagnostyka | `Diagnostyka.dc.html` | Karta zgłoszenia, podpowiedzi; modal „Praca pod napięciem!” (3 kroki, „Wyłącz -Q0 i załóż kłódkę”, „Anuluj”); karta LOTO z wyłącznikiem i kłódką |
| Edytor zadań | `EdytorZadan.dc.html` | Nawigacja sekcji; treść ze zmiennymi `{moc}`, `{In}`, `{Uster}`; scena startowa (3 karty); losowane parametry; scenariusze (nagrywanie); usterki; podgląd i gotowość do publikacji |
| Edytor schematu | `Schemat.dc.html` | Biblioteka symboli IEC 60617 w grupach; arkusz z ramką 1–8 / A–E i tabliczką; narzędzia Zaznacz/Połączenie/Węzeł/Potencjał/Tekst ze skrótami V/W/J/P/T; ERC w prawym panelu |
| Szafa + schemat | `Mieszany.dc.html` | Dwa panele z uchwytem podziału; wspólne zaznaczenie; tabela powiązań; niezgodności schemat ↔ szafa; symulacja w obu |

Komponenty sceny używane wielokrotnie: `Plyta.dc.html` (płyta, tryby `edit/on/short/meter/off`) i `SchematRys.dc.html` (arkusz, tryby `edit/draw/done/on`).

## 3. Scena szafy

- Skala bazowa 2 px/mm (100%). Szyny TH35 (35 mm), korytka 40 mm z grzebieniem, siatka kropek co 9 mm.
- Aparat: prostokąt w kolorze `scene.dev`, pas zacisków (`devShade`), oznaczenie mono pogrubione, parametry pod spodem; elementy stanu: dźwignia (I/0), okienko stycznika (I podświetlone `flow`), dioda DC OK, pokrętło termika.
- Przewód: ścieżka ortogonalna, narożniki zaokrąglone r = 7 px; rysowany w warstwach: halo (szer. +2) → rdzeń 3,4 px (kolor izolacji) → PE: pasy żółte 7/7 → stan.
- Przewody w korytku idą pasami co 3–4 px (wiązka).
- Zaciski: kółko r 5,2 z nacięciem śruby; numer pod/nad zaciskiem; podświetlenie: pierścień `accent` (zgodny/zaznaczony) lub `err`.

## 4. Stany (wspólne dla szafy i schematu)

| Stan | Token | Forma |
| --- | --- | --- |
| Brak napięcia | `state.off` | przewód w kolorze izolacji |
| Pod napięciem | `state.on` | poświata (blur 3, szer. 10, krycie 0,55) |
| Prąd płynie | `state.flow` | poświata + kreski 2/12 animowane w kierunku prądu (0,9 s) |
| Błąd / zwarcie | `state.err` | pulsowanie krycia 0,9 s; brak połączenia = linia przerywana 5/5 |
| Wyzwolony | `state.trip` | paski 45° na aparacie, dźwignia w dół, etykieta „WYZWOLONY” |

`prefers-reduced-motion`: animacje zastąpione statycznym wzorem (kreski bez ruchu, pulsowanie → stała ramka).

## 5. Interakcje i skróty

| Akcja | Mysz / dotyk | Klawiatura |
| --- | --- | --- |
| Przeciągnij aparat | drag z palety | – |
| Nowy przewód | przeciągnij od zacisku / dotknij zacisk → dotknij cel | `W` |
| Punkt zagięcia | klik w trakcie | `Spacja` |
| Prowadź korytkiem | – | `K` |
| Anuluj | – | `Esc` |
| Zoom / pan | kółko, pinch / przeciąganie dwoma palcami | `+` `−` `0` |
| Inspektor | dwuklik / długie dotknięcie aparatu | `Enter` |
| Cofnij / ponów | – | `Ctrl+Z` / `Ctrl+Shift+Z` |

## 6. Teksty komunikatów (wzorce)

- Walidacja: `Brak połączenia {a} ↔ {b}`, `Przewód {rola} w złym kolorze`, `Nastawa {tag}: {wartość} > Iₙ {In}`, `Korytko {id} zapełnione w {p}%`.
- Zwarcie: `Zwarcie {para} przez {tag}, zadziałał {zabezpieczenie} ({krzywa}{In}) po {t} ms`.
- LOTO: tytuł „Praca pod napięciem!”, kroki „Wyłącz zasilanie”, „Zabezpiecz przed ponownym załączeniem”, „Sprawdź brak napięcia”.
- ERC: `Otwarte połączenie {pin}`.
- Niezgodność: `Niezgodność: {a} ↔ {b}` + opis, gdzie jest, a gdzie brakuje.
