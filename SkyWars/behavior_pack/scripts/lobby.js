// Generador del lobby de SkyWars Rotativo (Creado por JenierMods OFC).
// No importa nada de Minecraft: lo usan el juego (main.js) y el render de imágenes.
// Coordenadas RELATIVAS a LOBBY. El lobby está a 1000 bloques de la arena: desde las
// islas no se ve.
import { Builder, mulberry32, island, tree, lamp, LEAVES } from "./gen.js";
import { LOGO } from "./logo.js";

export const LOBBY = { x: 1000, y: 100, z: 0 };
export const LOBBY_RADIUS = 58;     // para el área de carga (tickingarea)
export const LOBBY_VERSION = 3;     // subir este número obliga a reconstruir el lobby

const HANG = { hanging: true };

// Zonas que usa la lógica del juego (relativas a LOBBY).
export const ZONES = {
  spawn: { x: 0.5, y: 1, z: 8.5 },
  portal: { x1: -2, x2: 2, y1: 1, y2: 5, z: -27 },
  waiting: { spawn: { x: 0.5, y: 1, z: -35.5 }, exit: { x: 0, y: 0, z: -40 } },
  npcs: [
    { role: "kits", name: "§6§lKits", x: 11, y: 1, z: -11, color: "orange" },
    { role: "mapas", name: "§a§lMapas y votación", x: -11, y: 1, z: -11, color: "lime" },
    { role: "stats", name: "§b§lEstadísticas", x: -11, y: 1, z: 11, color: "light_blue" },
    { role: "ajustes", name: "§c§lAjustes", x: 11, y: 1, z: 11, color: "red" },
  ],
  archery: { x1: -19, x2: -13, z1: -4, z2: 4, y1: 0, y2: 5 },
  maze: { entry: { x: 0, z: 19 }, goal: { x: 0, z: 27 } },
  parkour: null, // se rellena abajo
  holograms: [],
};

const RAINBOW = ["white_concrete", "light_blue_concrete", "lime_concrete", "yellow_concrete",
  "orange_concrete", "magenta_concrete", "pink_concrete", "cyan_concrete"];

// --- Parkour en espiral alrededor de un pilar ------------------------------
const PK_CENTER = { x: 27, z: 0 };
const PK_RADIUS = 6;
function parkourPath() {
  const rng = mulberry32(777);
  const pts = [];
  let ang = Math.PI, y = 1;
  const start = { x: PK_CENTER.x + Math.round(Math.cos(ang) * PK_RADIUS), y, z: PK_CENTER.z + Math.round(Math.sin(ang) * PK_RADIUS) };
  let prev = start;
  const pattern = [1, 1, 0, 1, 1, 0, 1, 0];
  let n = 0;
  while (y < 24) {
    const dy = pattern[n % pattern.length];
    const [dmin, dmax] = dy ? [2.8, 3.7] : [3.0, 4.2];
    let found = null;
    for (let step = 0.25; step < 1.2; step += 0.02) {
      const a = ang + step;
      const p = { x: PK_CENTER.x + Math.round(Math.cos(a) * PK_RADIUS), y: y + dy, z: PK_CENTER.z + Math.round(Math.sin(a) * PK_RADIUS) };
      const d = Math.hypot(p.x - prev.x, p.z - prev.z);
      if (d >= dmin && d <= dmax) { found = { p, a }; break; }
    }
    if (!found) break;
    ang = found.a; y = found.p.y; prev = found.p;
    pts.push(found.p);
    n++;
  }
  rng();
  return { start, jumps: pts };
}

// --- Laberinto (DFS con semilla fija) ----------------------------------------
function mazeGrid(cells, seed) {
  const rng = mulberry32(seed);
  const W = cells * 2 + 1;
  const g = Array.from({ length: W }, () => Array(W).fill(1));
  const stack = [[0, 0]];
  g[1][1] = 0;
  const seen = new Set(["0,0"]);
  while (stack.length) {
    const [cx, cz] = stack[stack.length - 1];
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dx, dz]) => [cx + dx, cz + dz, dx, dz])
      .filter(([x, z]) => x >= 0 && z >= 0 && x < cells && z < cells && !seen.has(`${x},${z}`));
    if (!nb.length) { stack.pop(); continue; }
    const [nx, nz, dx, dz] = nb[Math.floor(rng() * nb.length)];
    g[1 + cz * 2 + dz][1 + cx * 2 + dx] = 0;
    g[1 + nz * 2][1 + nx * 2] = 0;
    seen.add(`${nx},${nz}`);
    stack.push([nx, nz]);
  }
  return g;
}

let cached = null;
export function generateLobby() {
  if (cached) return cached;
  ZONES.holograms = [];
  const rng = mulberry32(2026);
  const b = new Builder();

  // --- Isla principal ---
  const surface = island(b, rng, { surface: "grass_block", sub: "dirt", core: "stone", ores: ["coal_ore", "iron_ore", "copper_ore"] }, 0, 0, 0, 42, 16);
  // Islitas flotantes alrededor
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + 0.3, d = 50 + (k % 3) * 3;
    const x = Math.round(Math.cos(a) * d), z = Math.round(Math.sin(a) * d), y = -2 + (k % 4) * 3;
    if (Math.abs(x) > LOBBY_RADIUS - 3 || Math.abs(z) > LOBBY_RADIUS - 3) continue;
    island(b, rng, { surface: "grass_block", sub: "dirt", core: "stone" }, x, y, z, 3, 4);
    tree(b, rng, k % 2 ? "cherry" : "oak", x, y, z);
  }

  // --- Caminos (antes que todo lo demás para que las estructuras los pisen) ---
  const path = (x1, z1, x2, z2) => {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
      for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) b.set(x, 0, z, "grass_path");
  };
  path(-1, -24, 1, -10);  // al portal
  path(10, -1, 20, 1);    // al parkour
  path(-20, -1, -10, 1);  // al tiro con arco
  path(-1, 10, 1, 18);    // al laberinto
  for (const [x, z] of [[0, -16], [0, -21], [15, 0], [-15, 0], [0, 14]]) {
    for (const s of [-2, 2]) {
      const [lx, lz] = x === 0 ? [x + s, z] : [x, z + s];
      lamp(b, lx, 0, lz, 3, "dark_oak_fence", "lantern");
    }
  }

  // --- Plaza central con fuente ---
  b.disc(0, 0, 0, 10, "stone_bricks");
  b.disc(0, 0, 0, 8.6, "polished_andesite");
  b.ring(0, 0, 0, 5.5, 6.3, "smooth_stone");
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2;
    for (let r = 4; r <= 8; r++) b.set(Math.round(Math.cos(ang) * r), 0, Math.round(Math.sin(ang) * r), "chiseled_stone_bricks");
  }
  // Fuente
  b.disc(0, 0, 0, 3.6, "quartz_block");
  b.ring(0, 1, 0, 3, 3.6, "quartz_block");
  b.disc(0, 0, 0, 2.6, "water");
  b.disc(0, -1, 0, 3, "sea_lantern");
  for (let h = 1; h <= 4; h++) b.set(0, h, 0, "quartz_pillar");
  b.set(0, 5, 0, "sea_lantern");
  b.disc(0, 5, 0, 1.2, "quartz_block", undefined, true);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(dx, 4, dz, "lantern", HANG);
  // Faroles alrededor de la plaza (fuera de los caminos)
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2 + Math.PI / 8;
    lamp(b, Math.round(Math.cos(ang) * 9.3), 0, Math.round(Math.sin(ang) * 9.3), 3, "dark_oak_fence", "lantern");
  }
  ZONES.holograms.push({ id: "credits", x: 0.5, y: 7.2, z: 0.5, text: "§l§bSkyWars Rotativo§r\n§fCreado por §a§lJenierMods OFC" });
  ZONES.holograms.push({ id: "welcome", x: 0.5, y: 3.2, z: 10.5, text: "§e¡Bienvenido!\n§7Entra al §5portal§7 para jugar\n§7Toca a los aldeanos para kits, mapas y más" });

  // --- Portal para entrar a la partida (norte) ---
  b.box(-6, 0, -31, 6, 0, -23, "polished_blackstone_bricks");
  b.walls(-6, 0, -31, 6, 0, -23, "gilded_blackstone");
  const P = ZONES.portal;
  for (let x = P.x1 - 1; x <= P.x2 + 1; x++) for (let y = 0; y <= P.y2 + 1; y++) {
    const frame = x === P.x1 - 1 || x === P.x2 + 1 || y === 0 || y === P.y2 + 1;
    b.set(x, y, P.z, frame ? ((x + y) % 3 === 0 ? "crying_obsidian" : "obsidian") : "portal", frame ? undefined : { portal_axis: "x" });
  }
  for (const x of [-5, 5]) {
    for (let h = 1; h <= 7; h++) b.set(x, h, P.z, "purpur_pillar");
    b.set(x, 8, P.z, "end_rod");
  }
  b.box(-4, 7, P.z, 4, 7, P.z, "purpur_block");
  ZONES.holograms.push({ id: "portal", x: 0.5, y: 9.5, z: P.z + 0.5, text: "§l§d» JUGAR «§r\n§fEntra al portal para unirte" });
  ZONES.holograms.push({ id: "queue", x: 0.5, y: 8.6, z: P.z + 0.5, text: "§70/8 en la cola", dynamic: true });

  // --- Sala de espera (detrás del portal) ---
  b.box(-5, 0, -42, 5, 0, -32, "quartz_block");
  b.walls(-5, 0, -42, 5, 0, -32, "purpur_block");
  b.walls(-5, 1, -42, 5, 4, -32, "glass");
  b.box(-5, 5, -42, 5, 5, -32, "glass");
  for (const [x, z] of [[-5, -42], [5, -42], [-5, -32], [5, -32]]) b.box(x, 1, z, x, 5, z, "purpur_pillar");
  for (const [x, z] of [[-3, -34], [3, -34], [-3, -40], [3, -40]]) b.set(x, 5, z, "sea_lantern");
  const E = ZONES.waiting.exit;
  b.box(E.x - 1, 0, E.z - 1, E.x + 1, 0, E.z + 1, "emerald_block");
  b.set(E.x, 0, E.z, "redstone_lamp");
  ZONES.holograms.push({ id: "exit", x: 0.5, y: 2.6, z: E.z + 0.5, text: "§c§lSalir de la cola§r\n§7Párate aquí" });
  ZONES.holograms.push({ id: "waiting", x: 0.5, y: 4, z: -36.5, text: "§l§eSala de espera", dynamic: true });

  // --- Puestos con aldeanos ---
  for (const n of ZONES.npcs) {
    const { x, z } = n;
    b.box(x - 2, 0, z - 2, x + 2, 0, z + 2, `${n.color}_concrete`);
    b.set(x, 0, z, "gold_block");
    for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) for (let h = 1; h <= 4; h++) b.set(x + dx, h, z + dz, "stripped_spruce_log");
    b.box(x - 3, 5, z - 3, x + 3, 5, z + 3, `${n.color}_wool`);
    b.walls(x - 3, 5, z - 3, x + 3, 5, z + 3, "white_wool");
    b.box(x - 2, 6, z - 2, x + 2, 6, z + 2, `${n.color}_wool`);
    b.box(x - 1, 7, z - 1, x + 1, 7, z + 1, "white_wool");
    b.set(x, 4, z, "lantern", HANG);
    // Cerco de una valla de alto: el aldeano no sale y se le puede hablar por encima
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (dx || dz) b.set(x + dx, 1, z + dz, "spruce_fence");
    ZONES.holograms.push({ id: `npc_${n.role}`, x: x + 0.5, y: 8.8, z: z + 0.5, text: `${n.name}\n§7Toca al aldeano` });
  }

  // --- Parkour con el mural del logo ---
  const pk = parkourPath();
  const top = pk.jumps[pk.jumps.length - 1].y; // la plataforma final queda un bloque más arriba que el último salto
  for (let y = -1; y <= top; y++) b.box(PK_CENTER.x - 1, y, PK_CENTER.z - 1, PK_CENTER.x + 1, y, PK_CENTER.z + 1, y % 5 === 0 ? "sea_lantern" : "quartz_pillar");
  b.box(PK_CENTER.x - 3, top, PK_CENTER.z - 3, PK_CENTER.x + 3, top, PK_CENTER.z + 3, "smooth_quartz");
  b.walls(PK_CENTER.x - 3, top, PK_CENTER.z - 3, PK_CENTER.x + 3, top, PK_CENTER.z + 3, "gold_block");
  b.box(PK_CENTER.x - 1, top, PK_CENTER.z - 1, PK_CENTER.x + 1, top, PK_CENTER.z + 1, "emerald_block");
  for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) lamp(b, PK_CENTER.x + dx, top, PK_CENTER.z + dz, 1, "quartz_pillar", "lantern");
  b.box(pk.start.x - 1, 0, pk.start.z - 1, pk.start.x + 1, 0, pk.start.z + 1, "emerald_block");
  const checkpoints = [];
  pk.jumps.forEach((p, i) => {
    const isCheck = (i + 1) % 8 === 0 && i < pk.jumps.length - 1;
    b.set(p.x, p.y - 1, p.z, isCheck ? "gold_block" : RAINBOW[i % RAINBOW.length]);
    if (isCheck) checkpoints.push({ x: p.x, y: p.y, z: p.z });
  });
  ZONES.parkour = {
    start: { x: pk.start.x, y: 1, z: pk.start.z },
    checkpoints,
    jumps: pk.jumps,
    finish: { x1: PK_CENTER.x - 3, x2: PK_CENTER.x + 3, z1: PK_CENTER.z - 3, z2: PK_CENTER.z + 3, y: top + 1 },
  };
  ZONES.holograms.push({ id: "parkour", x: pk.start.x + 0.5, y: 3.4, z: pk.start.z + 0.5, text: "§l§aPARKOUR§r\n§7Sube hasta la cima\n§7Agáchate para salir" });
  ZONES.holograms.push({ id: "parkour_top", x: pk.start.x + 0.5, y: 4.6, z: pk.start.z - 2.5, text: "§6Mejores tiempos", dynamic: true });
  ZONES.holograms.push({ id: "parkour_finish", x: PK_CENTER.x + 0.5, y: top + 3, z: PK_CENTER.z + 0.5, text: "§l§a¡Llegaste a la cima!§r\n§fCreado por §a§lJenierMods OFC" });

  // Mural del logo (mirando hacia la plaza)
  const MX = 39, size = LOGO.length, baseY = 3;
  const half = Math.floor(size / 2);
  for (let y = -3; y <= 0; y++) b.box(MX - 1, y, -half - 2, MX + 2, y, size - half + 1, y === 0 ? "grass_block" : y === -1 ? "dirt" : "stone");
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
    const y = baseY + (size - 1 - row), z = col - Math.floor(size / 2);
    b.set(MX, y, z, LOGO[row][col] === "#" ? "emerald_block" : "white_concrete");
  }
  for (let y = baseY - 1; y <= baseY + size; y++) for (const z of [-Math.floor(size / 2) - 1, size - Math.floor(size / 2)]) b.set(MX, y, z, "smooth_quartz");
  for (let z = -Math.floor(size / 2) - 1; z <= size - Math.floor(size / 2); z++) { b.set(MX, baseY - 1, z, "smooth_quartz"); b.set(MX, baseY + size, z, "smooth_quartz"); }
  for (let y = 0; y <= baseY + size; y++) for (let z = -Math.floor(size / 2) - 1; z <= size - Math.floor(size / 2); z++) b.setIfAir(MX + 1, y, z, "white_concrete");
  ZONES.holograms.push({ id: "mural", x: MX - 1 + 0.5, y: baseY + size + 2.5, z: 0.5, text: "§l§aJenierMods OFC" });

  // --- Tiro con arco (oeste) ---
  const A = ZONES.archery;
  b.box(A.x1, 0, A.z1, A.x2, 0, A.z2, "spruce_planks");
  for (let x = -40; x <= A.x2; x++) { b.set(x, 1, A.z1 - 1, "spruce_fence"); b.set(x, 1, A.z2 + 1, "spruce_fence"); }
  b.box(A.x1, 0, A.z1 - 1, A.x1, 0, A.z2 + 1, "stripped_spruce_log");
  for (const [x, z, h] of [[-26, -2, 2], [-30, 2, 3], [-34, 0, 4], [-38, -3, 5], [-38, 3, 2]]) {
    for (let i = 1; i < h; i++) b.set(x, i, z, "hay_block");
    b.set(x, h, z, "target");
  }
  b.box(-40, 1, A.z1, -40, 6, A.z2, "hay_block");
  ZONES.holograms.push({ id: "archery", x: A.x2 + 0.5, y: 3.5, z: 0.5, text: "§l§6TIRO CON ARCO§r\n§7Entra para recibir un arco\n§7Dale a las dianas" });

  // --- Laberinto (sur) ---
  const cells = 8, g = mazeGrid(cells, 99), W = cells * 2 + 1;
  const MZ = 18, MXo = -Math.floor(W / 2);
  for (let r = 0; r < W; r++) for (let c = 0; c < W; c++) {
    const x = MXo + c, z = MZ + r;
    b.set(x, 0, z, "moss_block");
    if (g[r][c]) for (let h = 1; h <= 3; h++) b.set(x, h, z, h === 3 && (r + c) % 7 === 0 ? "flowering_azalea_leaves" : "azalea_leaves", LEAVES);
  }
  // Entrada al norte (hacia la plaza) y meta en el centro
  const entryC = Math.floor(W / 2);
  for (let h = 1; h <= 3; h++) b.del(MXo + entryC, h, MZ);
  if (g[1][entryC]) for (let h = 1; h <= 3; h++) b.del(MXo + entryC, h, MZ + 1);
  const goalR = 1 + 2 * Math.floor(cells / 2), goalC = goalR; // celda central
  const gx = MXo + goalC, gz = MZ + goalR;
  b.set(gx, 0, gz, "gold_block");
  b.set(gx, 4, gz, "lantern");
  for (let h = 1; h <= 3; h++) b.del(gx, h, gz);
  ZONES.maze = { entry: { x: MXo + entryC, z: MZ }, goal: { x: gx, z: gz } };
  ZONES.holograms.push({ id: "maze", x: MXo + entryC + 0.5, y: 4.5, z: MZ - 0.5, text: "§l§2LABERINTO§r\n§7Encuentra el bloque de oro" });

  // --- Trampolines de slime con torre para saltar ---
  for (const sx of [-21, 21]) {
    const sz = 17;
    b.box(sx - 1, 0, sz - 1, sx + 1, 0, sz + 1, "slime");
    for (let h = 1; h <= 5; h++) b.set(sx + (sx > 0 ? 3 : -3), h - 1, sz - 3 + h, "smooth_quartz");
    b.box(sx + (sx > 0 ? 2 : -4), 4, sz + 2, sx + (sx > 0 ? 4 : -2), 4, sz + 2, "smooth_quartz");
    ZONES.holograms.push({ id: `tramp${sx}`, x: sx + 0.5, y: 3, z: sz + 0.5, text: "§l§aTRAMPOLÍN" });
  }

  // --- Podio del ranking ---
  const pdx = 15, pdz = -22;
  b.set(pdx, 1, pdz, "gold_block"); b.set(pdx, 2, pdz, "gold_block");
  b.set(pdx - 1, 1, pdz, "iron_block"); b.set(pdx + 1, 1, pdz, "copper_block");
  b.box(pdx - 2, 0, pdz - 1, pdx + 2, 0, pdz + 1, "polished_deepslate");
  ZONES.holograms.push({ id: "ranking", x: pdx + 0.5, y: 6, z: pdz + 0.5, text: "§6§lTOP VICTORIAS", dynamic: true });

  // --- Árboles y flores en el resto de la isla ---
  const busy = (x, z) =>
    Math.hypot(x, z) < 13 ||
    (Math.abs(x) <= 7 && z <= -21 && z >= -44) ||        // portal + sala
    (x >= 17 && x <= 42 && Math.abs(z) <= 14) ||           // parkour + mural
    (x <= -12 && x >= -41 && Math.abs(z) <= 6) ||          // tiro con arco
    (Math.abs(x) <= 10 && z >= 16 && z <= 36) ||           // laberinto
    (Math.abs(Math.abs(x) - 21) <= 5 && Math.abs(z - 17) <= 5) || // trampolines
    (Math.abs(x - 15) <= 3 && Math.abs(z + 22) <= 3) ||
    ZONES.npcs.some((n) => Math.abs(n.x - x) <= 4 && Math.abs(n.z - z) <= 4) ||
    Math.abs(x) <= 2 || Math.abs(z) <= 2;
  const trees = ["oak", "birch", "cherry", "oak", "spruce"];
  for (const p of surface) {
    if (busy(p.x, p.z) || b.get(p.x, 0, p.z)?.id !== "grass_block" || b.has(p.x, 1, p.z)) continue;
    const r = rng();
    const d = Math.hypot(p.x, p.z);
    if (r < 0.018 && d < 39) tree(b, rng, trees[Math.floor(rng() * trees.length)], p.x, 0, p.z);
    else if (r < 0.2) b.set(p.x, 1, p.z, ["short_grass", "poppy", "dandelion", "azure_bluet", "oxeye_daisy", "cornflower", "short_grass"][Math.floor(rng() * 7)]);
  }

  cached = { blocks: b.list(), zones: ZONES };
  return cached;
}
