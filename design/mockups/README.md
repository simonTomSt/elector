# Makiety

Pliki `.dc.html` to makiety z płótna projektu (Claude Design). Nie uruchomią się samodzielnie – wymagają środowiska edytora. Czytaj je jako źródło:

- **układu i stylów** – style są inline (`style="…"`), wartości odpowiadają `design/tokens.json`;
- **danych i geometrii** – w bloku `<script type="text/x-dc">` metoda `renderVals()` zwraca dane, które markup wyświetla (`{{nazwa}}` = wartość, `<sc-for list=… as=…>` = pętla, `<sc-if value=…>` = warunek);
- **zachowania interaktywnego** – `this.state` / `setState` w tych klasach pokazują, jakie stany ma ekran.

`<dc-import name="Plyta" …>` = osadzenie innego pliku jako komponentu z propsami.

| Plik | Ekran |
| --- | --- |
| `Main.dc.html` | 1 · Edytor szafy (prop `theme`: dark/light) |
| `Main-jasny.dc.html` | 1b · ten sam w jasnym motywie |
| `Zblizenie.dc.html` | 2 · Zbliżenie, ciągnięcie przewodu, Szpula |
| `Inspektor.dc.html` | 3 · Inspektor (prop `device`: K1/F2) |
| `Inspektor-F2.dc.html` | 3b · Inspektor -F2, jasny |
| `Symulacja.dc.html` | 4 · Symulacja (prop `view`: plyta/zwarcie/drzwi) |
| `Zwarcie.dc.html`, `Drzwi.dc.html` | 4b, 4c · warianty |
| `Miernik.dc.html` | 5 · Wirtualny miernik |
| `Diagnostyka.dc.html` | 6 · Diagnostyka + LOTO |
| `EdytorZadan.dc.html` | 7 · Edytor zadań |
| `Schemat.dc.html` | 8 · Zadanie tylko ze schematem |
| `Mieszany.dc.html` | 9 · Szafa + schemat |
| `System.dc.html` | Paleta stanów, przewodów, typografia |
| `Plyta.dc.html` | Komponent płyty (prop `mode`: edit/on/short/meter/off, `select`, `ghost`) – **geometria aparatów i tras przewodów** |
| `SchematRys.dc.html` | Komponent arkusza schematu (prop `mode`: edit/draw/done/on, `select`) |
| `canvas.json` | Układ artboardów na płótnie |

Geometria w `Plyta.dc.html`: viewBox 1000×640 px = płyta 500×320 mm (2 px/mm). Trasy przewodów to tablica `W` w `renderVals()` – identyfikatory (`W1`…`W14`, `PE1`, `PE2`, `C1`…`C7`) odpowiadają przewodom w `tasks/examples/dol-4kw.json` → `solution.wires`.
