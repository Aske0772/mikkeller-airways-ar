# Mikkeller Airways – AR-t-shirt, København

Hi-fi demo af t-shirten, hvor **selve trykket er AR-triggeren**. Kameraet genkender tegningen og vækker den til live: husene får farve, regnen falder ud over t-shirten, skiltet bladrer destinationer, og flyet letter. QR-koden i nakkemærket åbner bare kamerasiden første gang.

## Find filerne

| Fil | Hvad |
| --- | --- |
| `live.html` | **Selve AR'en.** Åbner direkte i kameraet. Peg på trykket. Skal åbnes via https (eller localhost). |
| `index.html` | Prototypen til præsentation: hele forløbet på en telefon (mærke → kamera → AR → boardingkort → pas). Virker uden kamera. |
| `print/koebenhavn-print-4800px.png` | Trykfilen i høj opløsning (gennemsigtig baggrund). Til t-shirt eller papir-test. |
| `print/koebenhavn-print.svg` | Samme tryk som vektor. |
| `print/koebenhavn-ar-maal.png` | Det billede, kameraet er lært at genkende. |
| `assets/target/koebenhavn.mind` | AR-målet (MindAR), lavet ud fra `koebenhavn-ar-maal.png`. |
| `js/scene.js` | Tegningen og animationen. Både trykket og AR-lagene tegnes herfra, så de passer præcist sammen. |
| `js/live.js` | Kamera og billedgenkendelse (MindAR 1.2.5). |
| `js/prototype.js`, `js/boarding.js` | Prototypen, boardingkortet og passet. |
| `tools/` | Lokal server, eksport af trykfil og AR-mål, og genkendelsestesten. |

## Test i virkeligheden (papir på t-shirt)

1. Print `print/koebenhavn-print-4800px.png` på A4 på tværs, ca. 20–25 cm bredt, på mat papir.
2. Tape det fladt på brystet af en t-shirt.
3. Åbn `live.html` på telefonen via https-linket, og giv lov til kameraet.
4. Hold telefonen 30–60 cm fra trykket i godt lys. Tryk på **Lyd** for at få regn og fly med.

## Hvad er testet

- Genkendelse (`tools/tracking-test.html`): trykket blev fundet i 5 af 5 testbilleder (lige på, drejet, skråt, langt væk, sløret med støj). Et andet motiv (Tokyo-stemplet) blev korrekt ikke genkendt.
- Prototypen er gennemklikket i browseren.
- `live.html` med et rigtigt kamera på en telefon er **ikke testet endnu**.

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
