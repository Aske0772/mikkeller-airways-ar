# Web-AR.Studio-version (App Clip på iPhone)

Samme København-AR, bygget i Web-AR.Studio, så den på iPhone åbner som App Clip (ingen app, ingen Safari) og på Android i browseren.

- Projekt: "AR project" på platform.web-ar.studio (id 547046), placering "AR Viewer Lite" (App Clip på iOS, web på Android).
- Link: https://projects.web-ar.studio/3fc52adafb
- QR-kode til linket: `qr-web-ar-studio.png`. Samme link er malet på ladcyklens kasse i trykket, så selve t-shirten åbner App Clip'en.

## Filer

| Fil | Hvad |
| --- | --- |
| `trigger-koebenhavn.png` | Trykket som trigger (2400 px, hvid baggrund). Platformens analyse: "excellent trigger". |
| `koebenhavn-ar-magenta.mp4` | AR-animationen som video på magenta baggrund (1440 × 1110, 30 fps, 13 sek., med regn og fly-lyd). Platformen fjerner magenta (chroma key #FF00FF). |
| `frames/` | De 390 enkeltbilleder videoen er lavet af. Laves igen med `tools/render-video.html`. |

## Placering i editoren

Videoen er større end trykket, fordi regn, sky og fly går ud over t-shirten. I editoren er trykket 339 × 254 med X/Y som midtpunkt og Y opad. Videoen står på X 170, Y 185, B 509, H 392, så videoens tryk-del ligger præcis over triggeren.

## Forskel fra GitHub-versionen

Videoen er ét fladt lag: lagene løfter sig ikke i 3D, og der er ingen boardingkort eller pas. Til gengæld kører den på platformens egen genkendelse og som App Clip på iPhone.
