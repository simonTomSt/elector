# Decyzje i założenia (v1)

Przyjęte domyślnie przy przygotowaniu paczki. Zmień przed startem, jeśli trzeba – Claude Code traktuje ten plik jako wiążący.

| # | Temat | Decyzja | Alternatywa |
| --- | --- | --- | --- |
| D1 | Stack | React + TypeScript + Vite, scena w SVG | Canvas/WebGL (PixiJS) przy bardzo dużych szafach |
| D2 | Backend | Brak w v1. Zadania z plików JSON, postęp w `localStorage` | API + konta kursantów + panel prowadzącego (v2) |
| D3 | Model symulacji | **Logiczny**: sieci (netlist), potencjały, ścieżki prądu; prądy liczone uproszczenie z danych odbiorników | Solver obwodów (analiza węzłowa) z rzeczywistymi impedancjami |
| D4 | Podgląd 3D | Poza v1 – zakładka widoczna, wyłączona z etykietą „wkrótce” | Three.js w v2 |
| D5 | Język | Tylko polski (teksty w jednym pliku `src/ui/i18n/pl.ts`, by umożliwić tłumaczenie później) | i18n od początku |
| D6 | Motywy | Ciemny (domyślny) i jasny, przełączane tokenami | – |
| D7 | Urządzenia | Desktop 1440×900, w pełni obsługiwalne dotykiem (tablet 1024+ w poziomie) | Telefon – tylko podgląd |
| D8 | Typy zadań | `cabinet` (tylko szafa), `schematic` (tylko schemat), `mixed` (szafa + schemat), `diagnostic` (szafa z usterką) | – |
| D9 | Norma symboli | IEC 60617, oznaczenia PN-EN 81346, kolory przewodów PN-EN 60204-1 | – |
| D10 | Fonty | Systemowe (jak rocket.id), mono systemowe dla oznaczeń | Font webowy |
| D11 | Siatka | Szyna TH35, moduł 18 mm, przyciąganie co 9 mm (½ modułu); skala sceny 2 px/mm przy 100% | – |
| D12 | Edytor zadań | W v1 jako ekran w tej samej aplikacji, zapis do pliku JSON (pobierz/wczytaj) | Zapis na serwerze (v2) |
