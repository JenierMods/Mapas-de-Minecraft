// Dibuja las vistas previas de las 10 arenas y del lobby usando los MISMOS generadores
// que usa el juego, y genera los íconos del pack y del mundo con el logo de JenierMods OFC.
// Uso: NODE_PATH=$(npm root -g) node tools/render-previews.mjs   (requiere Playwright + Chromium)
import { generateArena, THEMES } from "../behavior_pack/scripts/arenas.js";
import { generateLobby } from "../behavior_pack/scripts/lobby.js";
import { render } from "./iso.mjs";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const here = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const out = path.join(root, "previews");
fs.mkdirSync(out, { recursive: true });
const logo = "data:image/png;base64," + fs.readFileSync(path.join(root, "assets", "logo-jeniermods.png")).toString("base64");

const SKIES = {
  pradera: ["#8fc7ff", "#e8f4ff"], desierto: ["#ffc88a", "#fff1dc"], glaciar: ["#9fc0e6", "#f0f6ff"],
  infierno: ["#2a0606", "#7a2412"], fin: ["#0e0818", "#3a2a50"], hongos: ["#a898c8", "#efe8f8"],
  jungla: ["#7fc8a8", "#e8fff0"], oceano: ["#4aa8e0", "#d8f4ff"], cerezos: ["#ffb8d6", "#fff0f6"], amatista: ["#22143a", "#6a4a90"],
};

function withCages(a) {
  const blocks = a.blocks.slice();
  for (const s of a.spawns) {
    const fy = s.y + 2;
    blocks.push({ x: s.x, y: fy, z: s.z, id: s.team === "red" ? "red_wool" : "blue_wool" });
    for (let dy = 1; dy <= 3; dy++) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++)
      if (dx || dz || dy === 3) blocks.push({ x: s.x + dx, y: fy + dy, z: s.z + dz, id: "glass" });
  }
  return blocks;
}

const scenes = [];
THEMES.forEach((t, i) => {
  const a = generateArena(i);
  const secret = a.chests.filter((c) => c.secret).length;
  const spawnChests = a.chests.filter((c) => c.kind === "spawn").length;
  scenes.push({
    file: path.join(out, `mapa-${String(i + 1).padStart(2, "0")}-${t.id}.png`),
    w: 1200, h: 760, scale: 13.5, center: [0, 2, 0], offset: [0, 30], sky: SKIES[t.id], logo,
    blocks: withCages(a),
    title: `Mapa ${i + 1} · ${t.name}`,
    subtitle: `${t.desc} · ${a.chests.length} cofres: ${spawnChests} en las islas (arriba, casita y cueva) y ${secret} escondidos`,
  });
});

const lobby = generateLobby();
// Vista girada 180° (la cámara mira desde el oeste/norte) para ver el mural y el portal de frente
const flip = (bs) => bs.map((b) => ({ ...b, x: -b.x, z: -b.z }));
const L = flip(lobby.blocks);
const lsky = ["#7fb8ff", "#eaf5ff"];
scenes.push(
  { file: path.join(out, "lobby-00-vista-general.png"), w: 1400, h: 900, scale: 12, center: [0, 6, 0], offset: [0, 20], sky: lsky, logo, blocks: L,
    title: "Lobby · SkyWars Rotativo", subtitle: "Portal para jugar, aldeanos de kits/mapas/ajustes/estadísticas, parkour con mural, tiro con arco, laberinto y trampolines" },
  { file: path.join(out, "lobby-01-plaza-y-aldeanos.png"), w: 1200, h: 760, scale: 30, center: [0, 3, 0], sky: lsky, logo, blocks: L.filter((b) => Math.abs(b.x) < 22 && Math.abs(b.z) < 22),
    title: "Plaza central", subtitle: "Fuente, faroles y los 4 puestos con aldeanos: Kits, Mapas y votación, Estadísticas y Ajustes" },
  { file: path.join(out, "lobby-02-portal-y-sala-de-espera.png"), w: 1200, h: 760, scale: 30, center: [0, 3, 32], sky: lsky, logo, blocks: L.filter((b) => Math.abs(b.x) < 18 && b.z > 16 && b.z < 48),
    title: "Portal y sala de espera", subtitle: "Entra al portal para unirte a la cola; la partida empieza cuando hay jugadores suficientes" },
  { file: path.join(out, "lobby-03-parkour-y-mural.png"), w: 1200, h: 760, scale: 17, center: [-30, 14, 0], sky: lsky, logo, blocks: L.filter((b) => b.x < -14 && Math.abs(b.z) < 20),
    title: "Parkour con créditos", subtitle: "36 saltos en espiral con 4 puntos de control; en la cima: Creado por JenierMods OFC y el mural del logo" },
  { file: path.join(out, "lobby-04-laberinto-y-arco.png"), w: 1200, h: 760, scale: 15, center: [-12, 2, 14], sky: lsky, logo, blocks: lobby.blocks.filter((b) => (b.z > 12 || b.x < -10) && b.z < 40 && b.x < 30),
    title: "Laberinto, tiro con arco y trampolines", subtitle: "Encuentra el bloque de oro del laberinto o prueba tu puntería con las dianas" },
);

// Detalles: isla de aparición cortada a la mitad y salón central sin techo (mapa 1)
{
  const a = generateArena(0), s0 = a.spawns[2]; // isla que mira hacia el jugador
  const near = a.blocks.filter((b) => Math.hypot(b.x - s0.x, b.z - s0.z) < 11);
  const cut = near.filter((b) => b.x <= s0.x + 1); // corte para ver adentro
  scenes.push({ file: path.join(out, "detalle-isla-de-aparicion.png"), w: 1200, h: 760, scale: 34, center: [s0.x - 1, s0.y - 4, s0.z], sky: SKIES.pradera, logo, blocks: cut,
    title: "Isla de aparición (corte)", subtitle: "3 cofres: uno arriba, otro dentro de la casita y otro en la cueva con mesa de trabajo, horno y escalera" });
  const hall = a.blocks.filter((b) => Math.hypot(b.x, b.z) < 15 && b.y <= a.center.y + 4);
  scenes.push({ file: path.join(out, "detalle-salon-central.png"), w: 1200, h: 760, scale: 30, center: [0, 0, 0], sky: SKIES.pradera, logo, blocks: hall,
    title: "Salón central (sin techo)", subtitle: "8 cofres ordenados, mesa de encantamientos con librerías y 4 puertas; debajo, un sótano secreto" });
}

// Ícono del mundo (miniatura del menú de Minecraft) y de la plantilla
scenes.push({ file: path.join(root, "world_icon.jpeg"), type: "jpeg", dpr: 1, w: 800, h: 450, scale: 13, center: [-2, 6, 0], offset: [0, 25], sky: lsky, logo, blocks: L,
  title: "SkyWars Rotativo", subtitle: "10 mapas · Normal y Rojo vs Azul" });

await render(scenes);

// Contacto: las 10 arenas en una sola imagen
const { createRequire } = await import("node:module");
const { chromium } = createRequire(import.meta.url)("playwright");
const files = fs.readdirSync(out).filter((f) => /^mapa-\d+/.test(f)).sort();
const imgs = files.map((f) => `<img src="data:image/png;base64,${fs.readFileSync(path.join(out, f)).toString("base64")}">`).join("");
const html = `<body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(2,600px);gap:6px;padding:6px;width:1206px">${imgs.replace(/<img /g, '<img style="width:600px;height:380px;display:block" ')}</body>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1218, height: 800 }, deviceScaleFactor: 2 });
await p.setContent(html);
await p.screenshot({ path: path.join(out, "todos-los-mapas.png"), fullPage: true });
await b.close();
console.log("ok todos-los-mapas.png");
