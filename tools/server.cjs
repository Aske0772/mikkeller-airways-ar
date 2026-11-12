// Lille lokal server til demoen.
// Start: node tools/server.cjs  (fra mappen ar-demo-koebenhavn)  ->  http://localhost:5610
// POST /save?file=<sti> gemmer en fil i mappen. Bruges kun af tools/export.html,
// som laver trykfilen (SVG + PNG) og AR-målfilen (.mind) ud fra den samme tegning.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.argv[2] || 5610);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".json": "application/json",
  ".mind": "application/octet-stream",
};

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (req.method === "POST" && url.pathname === "/save") {
      const rel = url.searchParams.get("file") || "";
      const target = path.resolve(ROOT, rel);
      if (!target.startsWith(ROOT + path.sep) || !/^(print|assets\/target)\//.test(rel)) {
        res.writeHead(400).end("bad path");
        return;
      }
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, Buffer.concat(chunks));
        res.writeHead(200).end("saved " + rel);
      });
      return;
    }
    let file = path.join(ROOT, decodeURIComponent(url.pathname));
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end();
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => console.log("Mikkeller AR-demo: http://localhost:" + PORT));
