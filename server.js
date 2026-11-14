// Tiny server: serves index.html and talks to FMCSA's QCMobile API for you,
// so your webKey stays on your computer and never goes into the web page.
// Needs Node 20.6 or newer. No npm install needed.
const http = require("http");
const fs = require("fs");
const path = require("path");

const KEY = process.env.FMCSA_WEBKEY || "";
const BASE = "https://mobile.fmcsa.dot.gov/qc/services";
const PORT = process.env.PORT || 3000;
const cache = new Map(); // url -> { t, body }  (10 minute memory, saves your quota)

function send(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

async function fmcsa(pathPart) {
  const url = `${BASE}${pathPart}?webKey=${encodeURIComponent(KEY)}`;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.t < 10 * 60 * 1000) return hit.body;
  const r = await fetch(url);
  if (!r.ok) throw Object.assign(new Error("FMCSA answered " + r.status), { status: r.status });
  const body = await r.json();
  cache.set(url, { t: Date.now(), body });
  return body;
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (url.pathname === "/api/health") return send(res, 200, { ok: true, hasKey: !!KEY });

    let m;
    if ((m = url.pathname.match(/^\/api\/mc\/(\d{1,9})$/)))
      return send(res, 200, await fmcsa(`/carriers/docket-number/${m[1]}`));
    if ((m = url.pathname.match(/^\/api\/carrier\/(\d{1,9})$/)))
      return send(res, 200, await fmcsa(`/carriers/${m[1]}`));

    if (url.pathname === "/" || url.pathname === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(fs.readFileSync(path.join(__dirname, "index.html")));
    }
    send(res, 404, { error: "not found" });
  } catch (e) {
    send(res, e.status || 500, { error: e.message });
  }
}).listen(PORT, () => console.log(`Dispatchers Desk running at http://localhost:${PORT}  (webKey ${KEY ? "loaded" : "MISSING"})`));