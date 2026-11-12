# Mikkeller Airways – AR-t-shirt, København

Hi-fi demo af t-shirten, hvor **selve trykket er AR-triggeren**. Husene får farve, regnen falder ud over t-shirten, skiltet bladrer destinationer, og flyet letter.

**Forløbet:** Brugeren peger telefonens almindelige kamera på t-shirten. QR-koden, der er malet på ladcyklens kasse, åbner Web-AR.Studio-versionen: på iPhone som App Clip (et kort nedefra, ingen app og ingen Safari), på Android i browseren. Kameraet genkender hele tegningen og starter AR'en oven på trykket. Se `web-ar-studio/README.md`.

Den egne WebAR-version i denne mappe (med lag i 3D) åbnes via linket nedenfor, ikke længere via QR-koden.

Hvorfor en QR-kode i trykket: iPhone- og Android-kameraet genkender kun QR-koder, ikke almindelige tegninger. Koden starter siden; selve AR'en følger tegningen.

Links: AR-kameraet er https://aske0772.github.io/mikkeller-airways-ar/ og prototypen er https://aske0772.github.io/mikkeller-airways-ar/prototype.html

## Find filerne

| Fil | Hvad |
| --- | --- |
| `index.html` | **Selve AR'en**, sidens forside og det QR-koden peger på. Åbner direkte i kameraet. Skal åbnes via https (eller localhost). |
| `prototype.html` | Prototypen til præsentation: hele forløbet på en telefon (mærke → kamera → AR → boardingkort → pas). Virker uden kamera. Trin 1 viser stadig den gamle idé med QR i nakkemærket. |
| `live.html` | Gammel adresse; sender videre til forsiden. |
| `print/koebenhavn-print-4800px.png` | Trykfilen i høj opløsning (gennemsigtig baggrund). Til t-shirt eller papir-test. |
| `print/koebenhavn-print.svg` | Samme tryk som vektor. |
| `print/koebenhavn-ar-maal.png` | Det billede, kameraet er lært at genkende. |
| `assets/target/koebenhavn.mind` | AR-målet (MindAR), lavet ud fra `koebenhavn-ar-maal.png`. |
| `js/scene.js` | Tegningen og animationen. Både trykket og AR-lagene tegnes herfra, så de passer præcist sammen. |
| `js/live.js` | Kamera og billedgenkendelse (MindAR 1.2.5). Testtrin: `?trin=1` kun kamera, `?trin=2` genkendelse uden AR, `?trin=3` fladt billede på trykket. `?let` tvinger ét fladt lag. |
| `js/canvas-layer.js` | Tegner AR-lagene på lærreder i stedet for som SVG. iPhone-Safari gik ned af hukommelsesmangel med SVG-lagene i 3D. |
| `js/prototype.js`, `js/boarding.js` | Prototypen, boardingkortet og passet. |
| `tools/` | Lokal server, eksport af trykfil og AR-mål, og genkendelsestesten. |

## Test i virkeligheden (papir på t-shirt)

1. Print `print/koebenhavn-print-4800px.png` på A4 på tværs, ca. 20–25 cm bredt, på mat papir.
2. Tape det fladt på brystet af en t-shirt.
3. Åbn telefonens kamera, peg på QR-koden på ladcyklens kasse (ca. 20–30 cm væk), og tryk på linket. Giv siden lov til at bruge kameraet.
4. Hold telefonen 30–60 cm fra trykket i godt lys. Tryk på **Lyd** for at få regn og fly med.

## Hvad er testet

- Genkendelse (`tools/tracking-test.html`): trykket blev fundet i 5 af 5 testbilleder (lige på, drejet, skråt, langt væk, sløret med støj). Et andet motiv (Tokyo-stemplet) blev korrekt ikke genkendt.
- Prototypen er gennemklikket i browseren.
- QR-koden på kassen er afkodet til sidens adresse ved seks størrelser, ned til 46 pixels bred, og drejet. Et meget sløret billede kunne ikke læses, så telefonen skal have fokus.
- AR-kameraet med et rigtigt kamera på en telefon er **ikke testet endnu**.

## Kør lokalt

```bash
node tools/server.cjs
```

Åbn http://localhost:5610. Lav trykfil og AR-mål igen efter ændringer i `js/scene.js` via http://localhost:5610/tools/export.html.

## Kilder og valg

- Farver: `../mikkeller-colors/palette.json` (version 5).
- Lyde: regn, fly-swish og stempel fra `../reklamefilm/remotion/public/audio/`.
- Passtempler: `../mikkeller-pas-stempel/`.
- "Mikkeller har barer i 13 lande uden for Danmark" og "4 steder i Tokyo": optalt fra mikkeller.com/locations 9. nov. 2026, se `../virksomhedsanalyse/01_mikkeller-research.md`.
- Skrift: Google-fonten Bowlby One (samme valg som i reklamefilmen), ikke Mikkellers egen skrift.
- Tegningen er lavet i kode som konceptgrafik og kan udskiftes med en GPT-tegning senere; den skal da deles op i samme lag.
