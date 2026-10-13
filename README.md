# MatStatus

Håll koll på maten i kylskåp, frys och skafferi. Appen påminner dig innan saker går ut och bygger inköpslistan åt dig.

## Funktioner

- **Lager per plats** – Kylskåp, Frys, Skafferi, sorterat efter bäst före-datum med färgkodning (ok / går ut snart / utgånget).
- **Skanna kvitto** – fota kvittot (eller klistra in text från ett digitalt kvitto) så läses varorna av med textigenkänning direkt i telefonen (Tesseract, svenska).
- **Bäst före-datum** – kvitton saknar datum, så varje vara får först ett **uppskattat** datum utifrån varutyp och plats (t.ex. köttfärs 4 dagar i kyl, 4 mån i frys). Uppskattade datum märks med `ca`. Fota datumet på förpackningen (📷) för att läsa av det exakta datumet – appen känner igen `2026-10-20`, `20.10.26`, `261020`, `20 okt` osv. och föredrar datumet efter "Bäst före"/"Sista förbrukningsdag".
- **Öppnad förpackning** – kortar hållbarheten automatiskt (t.ex. mjölk 4 dagar efter öppning).
- **Notiser** – daglig sammanfattning vid vald tid om vad som går ut snart (fungerar när appen är stängd på Android).
- **Inköpslista** – tryck *Slut* på en vara så hamnar den på listan. Bocka av när du handlat och tryck *Lägg in köpta hemma*.
- **Export/import** av data som JSON.

## Ladda ner APK

Varje push bygger en APK i GitHub Actions (*Actions → Build APK → Artifacts → MatStatus-apk*). Packa upp zip-filen och installera `app-debug.apk` på telefonen (tillåt installation från okända källor).

## Utveckla

```bash
npm install
npm run dev        # webbversion på http://localhost:5173
npm test           # enhetstester (kvitto-, datum- och hållbarhetslogik)
npm run android:sync && npx cap open android   # öppna i Android Studio
```

Teknik: React + TypeScript + Vite, paketerat för Android med Capacitor. Samma kod körs som webbapp.

## Roadmap

- [x] Android-app med lager, kvittoskanning, datumavläsning, notiser och inköpslista
- [ ] Webbversion med inloggning och synk mellan telefon och webb (byt ut `src/lib/store.ts` mot ett backend-API)
- [ ] Delat hushåll – flera personer i samma kylskåp
- [ ] Streckkodsskanning för att känna igen varor
- [ ] Baslager – "jag vill alltid ha mjölk hemma" → automatiskt på inköpslistan
- [ ] Receptförslag baserat på det som snart går ut
