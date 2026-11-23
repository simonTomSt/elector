# Pierwsze polecenie dla Claude Code

Wklej poniższy tekst jako pierwszą wiadomość w Claude Code (w katalogu repo):

---

Przeczytaj `CLAUDE.md`, a potem wszystkie pliki w `docs/`, `design/tokens.json`, `data/devices.json` i `tasks/`. Przejrzyj makiety w `design/mockups/` (zacznij od `README.md` tam).

Następnie:

1. Wypisz mi w punktach, jak rozumiesz model symulacji z `docs/SPEC-SIM.md` i jakie widzisz w nim luki lub sprzeczności. Nie pisz jeszcze kodu.
2. Po mojej akceptacji zrealizuj etap **M0** z `docs/ROADMAP.md` (szkielet projektu), a potem **M1** (typy domeny + loader zadań + testy).
3. Po każdym etapie uruchom `npm run typecheck && npm test`, pokaż wynik i zatrzymaj się, zanim zaczniesz kolejny etap.

---

## Kolejne polecenia (przykłady)

- „Zrealizuj etap M2 z ROADMAP. Najpierw napisz testy z kryteriów akceptacji, potem implementację.”
- „Odwzoruj `design/mockups/Main.dc.html` jako `EditorScreen`. Kolory tylko z tokens. Porównaj ze zrzutem `design/screenshots/main.png`.”
- „Dodaj do `tasks/examples` zadanie z rozruchem gwiazda–trójkąt i scenariusze testowe; sprawdź, że silnik je przechodzi.”
