"""Laver js/qr-rows.js (QR-koden i trykket) ud fra CITY.appClipUrl eller en URL på kommandolinjen.

Brug (fra byens mappe, fx ar-tokyo/):
    python tools/make-qr.py                       # læser appClipUrl fra js/city.js
    python tools/make-qr.py "https://clip.webar-studio.com/..."

Kræver segno:  python -m pip install segno
Skriver også web-ar-studio/qr-<slug>.png, så QR'en kan testes alene.
"""
import os
import re
import sys

try:
    import segno
except ImportError:
    sys.exit("segno mangler. Installer med:  python -m pip install segno")

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
city_js = open(os.path.join(ROOT, "js", "city.js"), encoding="utf-8").read()
slug = re.search(r'slug:\s*"([^"]+)"', city_js).group(1)

if len(sys.argv) > 1:
    url = sys.argv[1]
else:
    m = re.search(r'appClipUrl:\s*"([^"]*)"', city_js)
    url = m.group(1) if m else ""
if not url:
    sys.exit("Ingen URL. Sæt appClipUrl i js/city.js eller giv URL'en som argument.")

q = segno.make(url, error="m", micro=False)
rows = ["".join("1" if c else "0" for c in r) for r in q.matrix]
body = ",\n".join('  "%s"' % r for r in rows)
out = (
    "// Lavet af tools/make-qr.py. Ret ikke i hånden.\n"
    "// " + url + "\n"
    "// Version %d, fejlkorrektion M, %d x %d moduler.\n" % (q.version, len(rows), len(rows))
    + "export const QR_ROWS = [\n" + body + ",\n];\n"
)
open(os.path.join(ROOT, "js", "qr-rows.js"), "w", encoding="utf-8").write(out)
os.makedirs(os.path.join(ROOT, "web-ar-studio"), exist_ok=True)
q.save(os.path.join(ROOT, "web-ar-studio", "qr-%s.png" % slug), scale=14, border=4)
print("js/qr-rows.js: version %d, %d moduler. Tegn den mindst %d trykpixels bred." % (q.version, len(rows), len(rows) * 4))
