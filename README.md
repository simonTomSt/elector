# Symulator szafy sterowniczej

Paczka startowa do implementacji w Claude Code.

## Jak zacząć

1. Wypakuj zawartość do pustego repozytorium (`git init`).
2. Uruchom Claude Code w katalogu repo.
3. Wklej polecenie z `PROMPT-START.md`.

## Co jest w paczce

| Ścieżka | Zawartość |
| --- | --- |
| `CLAUDE.md` | Stałe instrukcje dla Claude Code: stack, struktura, zasady |
| `PROMPT-START.md` | Pierwsze polecenie do wklejenia |
| `docs/DECISIONS.md` | Przyjęte założenia (do zmiany przed startem) |
| `docs/ROADMAP.md` | Etapy M0–M11 z kryteriami akceptacji |
| `docs/SPEC-SIM.md` | Model domeny i silnik symulacji |
| `docs/SPEC-UI.md` | Ekrany, komponenty, interakcje, stany |
| `design/tokens.json` | Kolory (2 motywy), stany, przewody, typografia, odstępy |
| `design/mockups/` | Makiety wszystkich ekranów (format `.dc.html`) |
| `data/devices.json` | Biblioteka aparatów z zaciskami i zachowaniem |
| `tasks/task.schema.json` | JSON Schema zadania |
| `tasks/examples/` | 4 przykładowe zadania z rozwiązaniami i scenariuszami testowymi |

## Zalecane uzupełnienie

Zrzuty ekranów makiet (PNG) wrzuć do `design/screenshots/` – Claude Code odwzorowuje wygląd dokładniej, gdy widzi obraz. Możesz je wyeksportować z płótna projektu.
