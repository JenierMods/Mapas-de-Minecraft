// Junta las 10 vistas previas en una sola imagen (previews/todos-los-mapas.png).
import { createRequire } from "node:module";
import fs from "node:fs"; import path from "node:path"; import url from "node:url";
const { chromium } = createRequire(import.meta.url)("playwright");
const dir = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "..", "previews");
const files = fs.readdirSync(dir).filter((f) => /^mapa-\d+/.test(f)).sort();
const imgs = files.map((f) => `<img src="data:image/png;base64,${fs.readFileSync(path.join(dir, f)).toString("base64")}">`).join("");
const html = `<body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(2,600px);gap:6px;padding:6px;width:1206px">${imgs.replace(/<img /g, '<img style="width:600px;height:380px;display:block" ')}</body>`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1218, height: 800 }, deviceScaleFactor: 2 });
await p.setContent(html); await p.screenshot({ path: path.join(dir, "todos-los-mapas.png"), fullPage: true }); await b.close();
console.log("ok");
