// Generador de las 10 arenas de SkyWars (Creado por JenierMods OFC).
// No importa nada de Minecraft: lo usa el juego (main.js) para construir las islas
// y también tools/render-previews.mjs para dibujar las imágenes de vista previa.
//
// Cada isla de aparición tiene 3 cofres: uno arriba, otro dentro de una casita y otro
// en una cueva con mesa de trabajo y horno. La isla central tiene un salón con todos sus
// cofres ordenados, una mesa de encantamientos, un sótano secreto y túneles con cofres
// escondidos. Cada mapa tiene su propia forma de isla, distribución y estilo.
import { Builder, mulberry32, island, tree, blob, lamp, LEAVES, CAP, STEM } from "./gen.js";

const HANG = { hanging: true }; // farol colgando del bloque de arriba

// Centro de la arena (las islas se construyen en el cielo).
export const ARENA = { x: 0, y: 180, z: 0 };
// Caja que se limpia antes de construir cada arena (relativa a ARENA).
export const ARENA_BOUNDS = { r: 60, yMin: -22, yMax: 44 };
// Radio a partir del cual se empuja a los jugadores de vuelta (límite del mapa).
export const BORDER = 56;
export const SPAWN_COUNT = 8;

// shape: perfil de las islas (cone, mesa, cap, orb, steps)
// pattern: distribución de las islas de aparición (circle, square, staggered)
// roof: techo de las casitas y del salón (pyramid, flat, battlement, dome, cap, eaves, leaves)
export const THEMES = [
  {
    id: "pradera", name: "Pradera", desc: "Casitas de campo, molinos y una mansión central con mesa de encantamientos",
    surface: "grass_block", sub: "dirt", core: "stone", ores: ["coal_ore", "iron_ore", "copper_ore"],
    tree: "oak", deco: ["poppy", "dandelion", "short_grass", "azure_bluet"], light: "glowstone", hang: "dirt",
    shape: "cone", centerShape: "cone",
    build: { floor: "oak_planks", wall: "stone_bricks", corner: "oak_log", window: "glass_pane", roof: "spruce_planks", roofStyle: "pyramid", trim: "oak_planks" },
    layout: { pattern: "circle", spawnDist: 37, midCount: 4, midDist: 21, centerR: 14, spawnY: 0, midY: 1, lift: 0 },
    mid: "windmill", tunnels: 1, bridges: null,
  },
  {
    id: "desierto", name: "Desierto", desc: "Mesetas de arenisca, casas de adobe y una pirámide-salón",
    surface: "sand", sub: "sandstone", core: "sandstone", ores: ["gold_ore", "coal_ore"],
    tree: "cactus", deco: ["deadbush"], light: "glowstone", hang: "sandstone",
    shape: "mesa", centerShape: "mesa",
    build: { floor: "smooth_sandstone", wall: "cut_sandstone", corner: "chiseled_sandstone", window: "glass_pane", roof: "sandstone", roofStyle: "pyramid", trim: "smooth_sandstone" },
    layout: { pattern: "square", spawnDist: 37, midCount: 4, midDist: 21, centerR: 14, spawnY: 0, midY: 0, lift: 0 },
    mid: "obelisk", tunnels: 2, bridges: null,
  },
  {
    id: "glaciar", name: "Glaciar", desc: "Iglús, torres de hielo, picos colgantes y un palacio de hielo",
    surface: "snow", sub: "packed_ice", core: "stone", ores: ["iron_ore", "lapis_ore", "diamond_ore"], oreChance: 0.05,
    tree: "spruce", deco: ["snow_layer"], light: "sea_lantern", hang: "packed_ice", spikes: true,
    shape: "cone", centerShape: "orb",
    build: { floor: "packed_ice", wall: "snow", corner: "blue_ice", window: "glass", roof: "snow", roofStyle: "dome", trim: "packed_ice" },
    layout: { pattern: "staggered", spawnDist: 37, midCount: 3, midDist: 20, centerR: 14, spawnY: 0, midY: 2, lift: 1 },
    mid: "iceTower", tunnels: 1, bridges: null,
  },
  {
    id: "infierno", name: "Infierno", desc: "Fortaleza del Nether, puentes de ladrillo y columnas de basalto",
    surface: "crimson_nylium", sub: "netherrack", core: "blackstone", ores: ["quartz_ore", "nether_gold_ore", "gilded_blackstone"],
    tree: "crimson", deco: ["crimson_roots", "crimson_fungus"], light: "shroomlight", hang: "basalt", spikes: true,
    shape: "steps", centerShape: "steps",
    build: { floor: "polished_blackstone_bricks", wall: "nether_brick", corner: "red_nether_brick", window: "iron_bars", roof: "nether_brick", roofStyle: "battlement", trim: "nether_brick_fence" },
    layout: { pattern: "circle", spawnDist: 36, midCount: 4, midDist: 21, centerR: 14, spawnY: -3, midY: -1, lift: 2 },
    mid: "fortress", tunnels: 2, bridges: { floor: "nether_brick", rail: "nether_brick_fence" },
  },
  {
    id: "fin", name: "El Fin", desc: "Ciudad del Fin: torres de purpur y un castillo central elevado",
    surface: "end_stone", sub: "end_stone", core: "obsidian", ores: ["end_bricks"], oreChance: 0.15,
    tree: "purpur", deco: [], light: "sea_lantern", hang: "obsidian",
    shape: "orb", centerShape: "orb",
    build: { floor: "end_bricks", wall: "purpur_block", corner: "purpur_pillar", window: "glass", roof: "purpur_block", roofStyle: "battlement", trim: "end_rod" },
    layout: { pattern: "circle", spawnDist: 38, midCount: 4, midDist: 22, centerR: 14, spawnY: 0, midY: 3, lift: 6 },
    mid: "obsidianPillar", tunnels: 1, bridges: null,
  },
  {
    id: "hongos", name: "Champiñones", desc: "Islas con forma de hongo, casitas-hongo y un gran salón champiñón",
    surface: "mycelium", sub: "dirt", core: "stone", ores: ["coal_ore", "iron_ore"],
    tree: "mushroom", deco: ["brown_mushroom", "red_mushroom"], light: "glowstone", hang: "dirt",
    shape: "cap", centerShape: "cap",
    build: { floor: "brown_mushroom_block", wall: "mushroom_stem", corner: "mushroom_stem", window: "glass_pane", roof: "red_mushroom_block", roofStyle: "cap", trim: "mushroom_stem" },
    layout: { pattern: "circle", spawnDist: 38, midCount: 6, midDist: 23, midR: 5, centerR: 14, spawnY: 0, midY: 0, lift: 0 },
    mid: "mushroomPair", tunnels: 1, bridges: null,
  },
  {
    id: "jungla", name: "Jungla", desc: "Templo en ruinas, chozas de hojas, árboles gigantes y puentes colgantes",
    surface: "grass_block", sub: "dirt", core: "mossy_cobblestone", ores: ["emerald_ore", "coal_ore"],
    tree: "jungle", deco: ["fern", "short_grass", "melon_block"], light: "glowstone", hang: "jungle_leaves",
    shape: "steps", centerShape: "cone",
    build: { floor: "jungle_planks", wall: "mossy_stone_bricks", corner: "jungle_log", window: "glass_pane", roof: "jungle_leaves", roofStyle: "leaves", trim: "mossy_cobblestone" },
    layout: { pattern: "staggered", spawnDist: 37, midCount: 4, midDist: 21, centerR: 14, spawnY: 0, midY: 1, lift: 1 },
    mid: "bigJungleTree", tunnels: 2, bridges: { floor: "jungle_planks", rail: "oak_fence" },
  },
  {
    id: "oceano", name: "Océano", desc: "Ruinas de prismarina, barcos naufragados y un monumento con cúpula",
    surface: "sand", sub: "prismarine", core: "dark_prismarine", ores: ["sea_lantern"], oreChance: 0.04,
    tree: "prismarine", deco: [], light: "sea_lantern", hang: "prismarine",
    shape: "mesa", centerShape: "orb",
    build: { floor: "prismarine", wall: "prismarine_bricks", corner: "dark_prismarine", window: "glass", roof: "dark_prismarine", roofStyle: "dome", trim: "sea_lantern" },
    layout: { pattern: "square", spawnDist: 37, midCount: 4, midDist: 21, centerR: 14, spawnY: 0, midY: -1, lift: 0 },
    mid: "shipwreck", tunnels: 1, bridges: null,
  },
  {
    id: "cerezos", name: "Cerezos", desc: "Casas de té, pabellones, puentes de madera y un templo-pagoda",
    surface: "grass_block", sub: "dirt", core: "stone", ores: ["iron_ore", "copper_ore"],
    tree: "cherry", deco: ["pink_petals"], light: "lantern", hang: "cherry_leaves",
    shape: "steps", centerShape: "steps",
    build: { floor: "dark_oak_planks", wall: "cherry_planks", corner: "dark_oak_log", window: "glass_pane", roof: "red_concrete", roofStyle: "eaves", trim: "cherry_planks" },
    layout: { pattern: "circle", spawnDist: 37, midCount: 4, midDist: 21, centerR: 14, spawnY: -3, midY: 0, lift: 2 },
    mid: "pavilion", tunnels: 1, bridges: { floor: "cherry_planks", rail: "dark_oak_fence" },
  },
  {
    id: "amatista", name: "Geoda", desc: "Islas redondas de cristal, casas de calcita y un salón de amatista",
    surface: "calcite", sub: "smooth_basalt", core: "deepslate", ores: ["deepslate_diamond_ore", "deepslate_iron_ore", "amethyst_block"], oreChance: 0.08,
    tree: "amethyst", deco: ["amethyst_cluster"], light: "sea_lantern", hang: "amethyst_block",
    shape: "orb", centerShape: "orb",
    build: { floor: "polished_deepslate", wall: "calcite", corner: "smooth_basalt", window: "tinted_glass", roof: "amethyst_block", roofStyle: "dome", trim: "smooth_basalt" },
    layout: { pattern: "staggered", spawnDist: 37, midCount: 3, midDist: 20, centerR: 14, spawnY: 0, midY: 1, lift: 2 },
    mid: "geodeHalf", tunnels: 2, bridges: null,
  },
];

// ---------------------------------------------------------------------------
// Edificios (casitas y salón central). Coordenadas absolutas dentro de la arena.
// half: medio ancho exterior (2 = casita de 5x5 con interior 3x3; 6 = salón de 13x13)
// doors: lados con puerta ("n","s","e","w"); dw: ancho de la puerta
// ---------------------------------------------------------------------------
function roof(b, B, cx, y, cz, half, style) {
  const R = B.roof, st = style === "cap" ? CAP : style === "leaves" ? LEAVES : undefined;
  switch (style) {
    case "pyramid":
      for (let k = 0; k <= half + 1; k++) b.box(cx - half - 1 + k, y + k, cz - half - 1 + k, cx + half + 1 - k, y + k, cz + half + 1 - k, k % 2 ? B.trim : R);
      break;
    case "flat":
      b.box(cx - half, y, cz - half, cx + half, y, cz + half, R);
      break;
    case "battlement":
      b.box(cx - half, y, cz - half, cx + half, y, cz + half, R);
      for (let x = cx - half; x <= cx + half; x++) for (const z of [cz - half, cz + half]) if ((x + z) % 2 === 0) b.set(x, y + 1, z, R);
      for (let z = cz - half; z <= cz + half; z++) for (const x of [cx - half, cx + half]) if ((x + z) % 2 === 0) b.set(x, y + 1, z, R);
      // esquinas: torrecita (o vara del Fin) apoyada sobre el techo
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        b.set(cx + dx * half, y + 1, cz + dz * half, B.corner);
        b.set(cx + dx * half, y + 2, cz + dz * half, B.trim === "end_rod" ? "end_rod" : B.corner);
      }
      break;
    case "dome":
      for (let k = 0; k <= half + 1; k++) {
        const r = (half + 0.6) * Math.sqrt(Math.max(0, 1 - Math.pow(k / (half + 1.4), 2)));
        b.disc(cx, y + k, cz, Math.max(0.4, r), k === 0 ? B.trim : R);
      }
      break;
    case "cap":
      b.disc(cx, y, cz, half + 2, R, st);
      b.ring(cx, y - 1, cz, half + 1.6, half + 2.4, R, st);
      b.disc(cx, y + 1, cz, half + 0.8, R, st);
      b.disc(cx, y + 2, cz, Math.max(1, half - 0.6), R, st);
      break;
    case "eaves":
      b.box(cx - half - 2, y, cz - half - 2, cx + half + 2, y, cz + half + 2, R);
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.set(cx + dx * (half + 2), y + 1, cz + dz * (half + 2), R); // puntas levantadas
      b.box(cx - half, y + 1, cz - half, cx + half, y + 1, cz + half, B.trim);
      b.box(cx - half + 1, y + 2, cz - half + 1, cx + half - 1, y + 2, cz + half - 1, R);
      break;
    case "leaves":
      for (let k = 0; k <= half + 1; k++) b.box(cx - half - 1 + k, y + k, cz - half - 1 + k, cx + half + 1 - k, y + k, cz + half + 1 - k, R, st);
      break;
  }
}

function building(b, B, cx, y, cz, half, h, doors, dw = 1, style = B.roofStyle) {
  // cimientos (por si el edificio queda en el borde de la isla)
  for (let x = cx - half; x <= cx + half; x++) for (let z = cz - half; z <= cz + half; z++)
    for (let d = 1; d <= 3; d++) b.setIfAir(x, y - d, z, B.wall === "snow" ? "packed_ice" : B.wall);
  b.box(cx - half, y, cz - half, cx + half, y, cz + half, B.floor, B.floor.includes("mushroom") ? CAP : undefined);
  const wst = B.wall === "mushroom_stem" ? STEM : undefined;
  for (let k = 1; k <= h; k++) {
    for (let x = cx - half; x <= cx + half; x++) for (let z = cz - half; z <= cz + half; z++) {
      const edgeX = x === cx - half || x === cx + half, edgeZ = z === cz - half || z === cz + half;
      if (!edgeX && !edgeZ) { b.del(x, y + k, z); continue; }
      const corner = edgeX && edgeZ;
      const t = edgeX ? z - cz : x - cx; // posición a lo largo de la pared
      const isWindow = !corner && k === 2 && Math.abs(t) % 2 === (half > 3 ? 1 : 1) && Math.abs(t) < half;
      b.set(x, y + k, z, corner ? B.corner : isWindow ? B.window : B.wall, corner ? (B.corner === "mushroom_stem" ? STEM : undefined) : isWindow ? undefined : wst);
    }
  }
  // Puertas
  const dh = Math.min(h - 1, dw > 1 ? 3 : 2);
  for (const side of doors) for (let w = -Math.floor(dw / 2); w <= Math.floor(dw / 2); w++) for (let k = 1; k <= dh; k++) {
    const [x, z] = side === "n" ? [cx + w, cz - half] : side === "s" ? [cx + w, cz + half] : side === "w" ? [cx - half, cz + w] : [cx + half, cz + w];
    b.del(x, y + k, z);
  }
  roof(b, B, cx, y + h + 1, cz, half, style);
  b.set(cx, y + h, cz, "lantern", HANG);
}

// Lado de la casita que mira hacia (dx, dz)
const sideOf = (dx, dz) => (Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? "e" : "w") : dz > 0 ? "s" : "n");

// ---------------------------------------------------------------------------
// Isla de aparición: cofre arriba, casita con cofre y cueva con mesa de trabajo
// ---------------------------------------------------------------------------
function spawnIsland(b, rng, theme, isl, i, x, y, z, a, chests) {
  // Marco local alineado a los ejes: u = hacia afuera, v = a un costado
  const fx = Math.cos(a), fz = Math.sin(a);
  const [ux, uz] = Math.abs(fx) >= Math.abs(fz) ? [Math.sign(fx), 0] : [0, Math.sign(fz)];
  const [vx, vz] = [-uz, ux];
  const P = (u, v) => [x + u * ux + v * vx, z + u * uz + v * vz];
  const surf = island(b, rng, { ...isl, profile: theme.shape }, x, y, z, 6.5, 10);

  // 1) Casita del lado de adentro, con la puerta mirando a la jaula y un cofre adentro
  const [hx, hz] = P(-5, 0);
  building(b, theme.build, hx, y, hz, 2, 3, [sideOf(x - hx, z - hz)]);
  const [bx, bz] = P(-6, 0); // pared del fondo, por dentro
  const houseChest = { x: bx, y: y + 1, z: bz, kind: "spawn", island: i, where: "casa" };

  // 2) Cueva debajo: escalera desde la superficie, mesa de trabajo, horno, cofre y luz
  const floorY = y - 6;
  for (let u = -3; u <= 3; u++) for (let v = -4; v <= 2; v++) for (let yy = floorY - 1; yy <= y - 2; yy++) {
    const [cx, cz] = P(u, v);
    b.setIfAir(cx, yy, cz, rng() < 0.08 && isl.ores.length ? isl.ores[Math.floor(rng() * isl.ores.length)] : isl.core);
  }
  for (let u = -2; u <= 2; u++) for (let v = -3; v <= 1; v++) for (let yy = floorY + 1; yy <= floorY + 3; yy++) {
    const [cx, cz] = P(u, v); b.del(cx, yy, cz);
  }
  for (let u = -2; u <= 2; u++) for (let v = -3; v <= 1; v++) { const [cx, cz] = P(u, v); b.set(cx, floorY, cz, (u + v) % 2 ? isl.core : theme.sub === "dirt" ? "coarse_dirt" : theme.sub); }
  // escalera: baja un bloque por paso, desde (u=3,v=-3) hacia el centro
  for (let k = 0; k <= 5; k++) {
    const [sx, sz] = P(3 - k, -3);
    for (let h = 0; h <= 2; h++) b.del(sx, y - k + h, sz);
    if (k < 5) b.set(sx, y - k - 1, sz, isl.core);
  }
  const put = (u, v, id, st) => { const [cx, cz] = P(u, v); b.set(cx, floorY + 1, cz, id, st); };
  put(-2, 1, "crafting_table");
  put(0, 1, "furnace");
  put(2, 1, "lantern");
  const [ccx, ccz] = P(-2, -1);
  const caveChest = { x: ccx, y: floorY + 1, z: ccz, kind: "spawn", island: i, where: "cueva" };
  { const [lx, lz] = P(0, -1); b.set(lx, floorY + 4, lz, theme.light === "lantern" ? "glowstone" : theme.light); } // luz en el techo

  // 3) Cofre de arriba (el que trae lo básico asegurado) y un árbol
  const [tx, tz] = P(3, 2);
  b.set(tx, y, tz, theme.sub);
  const topChest = { x: tx, y: y + 1, z: tz, kind: "spawn", island: i, where: "arriba" };
  const [wx, wz] = P(1, 4);
  if (b.get(wx, y, wz)?.id === theme.surface && !b.has(wx, y + 1, wz)) tree(b, rng, theme.tree, wx, y, wz);

  for (const c of [topChest, houseChest, caveChest]) { b.set(c.x, c.y, c.z, "chest"); chests.push(c); }
  hangUnder(b, rng, surf, y, theme.hang, theme.spikes ? 8 : 4, theme.spikes ? 5 : 3);
  decorate(b, rng, theme, surf, y, 0.12, chests.concat([{ x, z }]));
  return { x, y: y + 1, z, team: i < SPAWN_COUNT / 2 ? "red" : "blue", stair: P(3, -3) };
}

// ---------------------------------------------------------------------------
// Isla central: salón con todos los cofres ordenados y una mesa de encantamientos
// ---------------------------------------------------------------------------
function centerHall(b, rng, theme, cy, chests) {
  const B = theme.build;
  const H = 5, half = 6;
  if (theme.roofStyle === "eaves" || B.roofStyle === "eaves") {
    // Pagoda: dos pisos
    building(b, B, 0, cy, 0, half, H, ["n", "s", "e", "w"], 3, "eaves");
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (let k = 1; k <= 3; k++) b.set(dx * 3, cy + H + 3 + k, dz * 3, B.corner);
    b.walls(-3, cy + H + 4, -3, 3, cy + H + 6, 3, B.wall);
    roof(b, B, 0, cy + H + 7, 0, 3, "eaves");
    b.set(0, cy + H + 10, 0, "gold_block");
  } else {
    building(b, B, 0, cy, 0, half, H, ["n", "s", "e", "w"], 3);
  }
  // Columnas decorativas en las esquinas de afuera
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    for (let k = 1; k <= H + 1; k++) b.set(dx * (half + 1), cy + k, dz * (half + 1), B.corner, B.corner === "mushroom_stem" ? STEM : undefined);
    b.set(dx * (half + 1), cy + H + 2, dz * (half + 1), theme.light === "lantern" ? "glowstone" : theme.light);
  }
  // 8 cofres ordenados contra las paredes (2 por pared, a los lados de cada puerta)
  for (const s of [-3, 3]) for (const [x, z] of [[s, -(half - 1)], [s, half - 1], [-(half - 1), s], [half - 1, s]]) {
    b.set(x, cy + 1, z, "chest");
    chests.push({ x, y: cy + 1, z, kind: "center", where: "salón" });
  }
  // Mesa de encantamientos con librerías alrededor
  b.set(0, cy + 1, 0, "enchanting_table");
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
    const ring = Math.max(Math.abs(dx), Math.abs(dz)) === 2;
    if (ring && dx !== 0 && dz !== 0 && !(Math.abs(dx) === 2 && Math.abs(dz) === 2)) b.set(dx, cy + 1, dz, "bookshelf");
  }
  for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) b.set(dx, cy + H, dz, "lantern", HANG);
  // Sótano secreto bajo la mesa (hay que picar el piso marcado para encontrarlo)
  b.box(-1, cy - 3, -1, 1, cy - 1, 1, null);
  b.walls(-2, cy - 3, -2, 2, cy - 1, 2, theme.core);
  b.box(-2, cy - 4, -2, 2, cy - 4, 2, theme.core);
  b.set(0, cy, 1, "chiseled_stone_bricks"); // pista en el piso
  b.set(1, cy - 3, 0, "glowstone");
  b.set(-1, cy - 3, 0, "chest");
  chests.push({ x: -1, y: cy - 3, z: 0, kind: "center", secret: true, where: "sótano secreto" });
}

// Puente entre dos puntos (a la altura de la superficie), con barandas
function bridge(b, mat, x1, y1, z1, x2, y2, z2) {
  const n = Math.max(Math.abs(x2 - x1), Math.abs(z2 - z1));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = Math.round(x1 + (x2 - x1) * t), z = Math.round(z1 + (z2 - z1) * t), y = Math.round(y1 + (y2 - y1) * t);
    if (b.has(x, y, z) && b.get(x, y, z).id !== mat.floor) continue; // ya es isla
    b.set(x, y, z, mat.floor);
    const horizontal = Math.abs(x2 - x1) >= Math.abs(z2 - z1);
    for (const s of [-1, 1]) {
      const [rx, rz] = horizontal ? [x, z + s] : [x + s, z];
      if (!b.has(rx, y, rz)) { b.set(rx, y, rz, mat.floor); if (i % 2 === 0) b.set(rx, y + 1, rz, mat.rail); }
    }
  }
}
// ---------------------------------------------------------------------------
// Estructuras de las islas intermedias (más grandes)
// ---------------------------------------------------------------------------
const MID_STRUCTS = {
  windmill(b, rng, x, y, z) {
    for (let h = 1; h <= 8; h++) b.ring(x, y + h, z, 1.5, 2.2, h % 4 === 0 ? "stone_bricks" : "cobblestone");
    b.del(x, y + 1, z - 2); b.del(x, y + 2, z - 2);
    for (let h = 9; h <= 11; h++) b.disc(x, y + h, z, 3 - (h - 9), "spruce_planks");
    // aspas
    for (let i = -4; i <= 4; i++) { b.set(x + i, y + 7, z - 3, "white_wool"); b.set(x, y + 7 + i, z - 3, "white_wool"); }
    b.set(x, y + 7, z - 3, "oak_log");
    b.setIfAir(x, y + 1, z, "lantern");
  },
  obelisk(b, rng, x, y, z) {
    b.box(x - 1, y + 1, z - 1, x + 1, y + 1, z + 1, "smooth_sandstone");
    for (let h = 2; h <= 9; h++) b.set(x, y + h, z, h % 3 === 0 ? "chiseled_sandstone" : "cut_sandstone");
    b.set(x, y + 10, z, "gold_block");
    for (const [dx, dz] of [[-2, 0], [2, 0]]) { b.set(x + dx, y + 1, z + dz, "sandstone_wall"); b.set(x + dx, y + 2, z + dz, "carved_pumpkin"); }
  },
  iceTower(b, rng, x, y, z) {
    for (let h = 1; h <= 11; h++) {
      const r = Math.max(0.6, 2.4 - h * 0.2);
      b.disc(x, y + h, z, r, h % 2 ? "packed_ice" : "blue_ice");
    }
    b.set(x, y + 12, z, "sea_lantern");
  },
  fortress(b, rng, x, y, z) {
    b.box(x - 3, y + 3, z - 1, x + 3, y + 3, z + 1, "nether_brick");
    for (const dx of [-3, 3]) for (let h = 1; h <= 2; h++) { b.set(x + dx, y + h, z - 1, "nether_brick"); b.set(x + dx, y + h, z + 1, "nether_brick"); }
    for (let dx = -3; dx <= 3; dx++) { b.set(x + dx, y + 4, z - 1, "nether_brick_fence"); b.set(x + dx, y + 4, z + 1, "nether_brick_fence"); }
    b.set(x - 3, y + 5, z - 1, "soul_lantern"); b.set(x + 3, y + 5, z + 1, "soul_lantern");
    b.set(x, y + 4, z, "magma");
  },
  obsidianPillar(b, rng, x, y, z) {
    for (let h = 1; h <= 10; h++) b.box(x - 1, y + h, z - 1, x + 1, y + h, z + 1, h === 10 ? "crying_obsidian" : "obsidian");
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++)
      if (dx || dz) b.box(x + dx, y + 11, z + dz, x + dx, y + 12, z + dz, "iron_bars");
    b.set(x, y + 11, z, "end_rod");
    b.box(x - 1, y + 13, z - 1, x + 1, y + 13, z + 1, "iron_bars");
  },
  mushroomPair(b, rng, x, y, z) {
    tree(b, rng, "mushroom", x - 1, y, z);
    for (let h = 1; h <= 3; h++) b.set(x + 2, y + h, z + 1, "mushroom_stem", STEM);
    b.disc(x + 2, y + 4, z + 1, 2, "brown_mushroom_block", CAP, true);
  },
  bigJungleTree(b, rng, x, y, z) {
    const h = 11;
    for (let i = 1; i <= h; i++) b.box(x, y + i, z, x + 1, y + i, z + 1, "jungle_log");
    blob(b, x, y + h, z, 4, "jungle_leaves", LEAVES, rng, 0.2);
    blob(b, x + 1, y + h - 3, z + 1, 3, "jungle_leaves", LEAVES, rng, 0.3);
    for (let i = 3; i < h - 2; i++) { if (rng() < 0.6) b.setIfAir(x - 1, y + i, z, "vine", { vine_direction_bits: 8 }); if (rng() < 0.6) b.setIfAir(x + 2, y + i, z + 1, "vine", { vine_direction_bits: 2 }); }
  },
  shipwreck(b, rng, x, y, z) {
    for (let dx = -4; dx <= 4; dx++) {
      const w = Math.abs(dx) >= 4 ? 0 : 1;
      b.box(x + dx, y + 1, z - w, x + dx, y + 1, z + w, "spruce_planks");
      b.set(x + dx, y + 2, z - w - 1 + (w ? 0 : 1), "spruce_planks");
      b.set(x + dx, y + 2, z + w + 1 - (w ? 0 : 1), "spruce_planks");
    }
    for (let h = 2; h <= 8; h++) b.set(x, y + h, z, "spruce_fence");
    for (let h = 4; h <= 7; h++) for (let dz = -2; dz <= 2; dz++) if (Math.abs(dz) + (h === 7 || h === 4 ? 1 : 0) <= 2) b.set(x + 1, y + h, z + dz, "white_wool");
    if (rng() < 0.7) b.del(x + 3, y + 2, z - 2); // casco roto
  },
  pavilion(b, rng, x, y, z) {
    b.box(x - 2, y, z - 2, x + 2, y, z + 2, "cherry_planks");
    for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) for (let h = 1; h <= 3; h++) b.set(x + dx, y + h, z + dz, "dark_oak_log");
    b.box(x - 3, y + 4, z - 3, x + 3, y + 4, z + 3, "cherry_planks");
    b.walls(x - 3, y + 4, z - 3, x + 3, y + 4, z + 3, "red_concrete");
    b.box(x - 2, y + 5, z - 2, x + 2, y + 5, z + 2, "cherry_planks");
    b.box(x - 1, y + 6, z - 1, x + 1, y + 6, z + 1, "dark_oak_planks");
    b.set(x, y + 3, z, "lantern", HANG);
  },
  geodeHalf(b, rng, x, y, z) {
    for (let dx = -3; dx <= 3; dx++) for (let dy = 0; dy <= 5; dy++) for (let dz = -3; dz <= 3; dz++) {
      if (dz < 0 && dy < 4) continue; // lado abierto
      const d = Math.sqrt(dx * dx + (dy - 2) * (dy - 2) + dz * dz);
      if (d > 3.6 || d < 2.4) continue;
      b.set(x + dx, y + 1 + dy, z + dz, d > 3.2 ? "smooth_basalt" : d > 2.8 ? "calcite" : "amethyst_block");
    }
    b.set(x, y + 1, z + 1, "budding_amethyst"); b.set(x, y + 2, z + 1, "amethyst_cluster");
  },
};

// ---------------------------------------------------------------------------
// Detalles: túneles, puntas colgantes, decoración
// ---------------------------------------------------------------------------

/** Túnel recto que atraviesa la isla central a la altura yT, con luces y un cofre secreto. */
function tunnel(b, theme, axis, yT, half, chests) {
  const along = (t, w) => (axis === "x" ? [t, w] : [w, t]);
  for (let t = -half; t <= half; t++) {
    for (let w = 0; w <= 1; w++) for (let h = 0; h <= 1; h++) { const [x, z] = along(t, w); b.del(x, yT + h, z); }
    if (t % 4 === 0) { const [x, z] = along(t, 0); if (b.has(x, yT + 2, z)) b.set(x, yT + 2, z, theme.light === "lantern" ? "glowstone" : theme.light); }
  }
  // Cofre secreto en un hueco lateral
  const [cx, cz] = along(axis === "x" ? -5 : 5, -1);
  b.del(cx, yT + 1, cz);
  b.set(cx, yT - 1, cz, theme.core);
  b.set(cx, yT, cz, "chest");
  chests.push({ x: cx, y: yT, z: cz, kind: "center", secret: true, where: "túnel" });
}

/** Puntas que cuelgan bajo una isla. */
function hangUnder(b, rng, surface, top, id, count, maxLen) {
  for (let n = 0; n < count && surface.length; n++) {
    const p = surface[Math.floor(rng() * surface.length)];
    // fondo REAL de la isla (buscando desde abajo; no el primer hueco, que puede ser una cueva)
    let y = top - 30; while (y < top && !b.has(p.x, y, p.z)) y++;
    if (y >= top) continue;
    const len = 1 + Math.floor(rng() * maxLen);
    for (let i = 1; i <= len; i++) b.setIfAir(p.x, y - i, p.z, id, id.endsWith("leaves") ? LEAVES : undefined);
  }
}

function decorate(b, rng, theme, surface, top, density, avoid) {
  if (!theme.deco.length) return;
  for (const p of surface) {
    if (rng() > density) continue;
    if (avoid.some((a) => Math.abs(a.x - p.x) <= 1 && Math.abs(a.z - p.z) <= 1)) continue;
    if (b.has(p.x, top + 1, p.z)) continue;
    if (b.get(p.x, top, p.z)?.id !== theme.surface) continue; // nada sobre agua, cofres, etc.
    b.set(p.x, top + 1, p.z, theme.deco[Math.floor(rng() * theme.deco.length)]);
  }
}

// ---------------------------------------------------------------------------
// Generador principal
// ---------------------------------------------------------------------------

/**
 * Genera la arena número `index` (0..9). Coordenadas RELATIVAS a ARENA.
 * @returns {{ theme, index, blocks, spawns, chests, safe, center }}
 */
export function generateArena(index) {
  const theme = THEMES[index % THEMES.length];
  const L = theme.layout;
  const rng = mulberry32(0x5eed + index * 7919);
  const b = new Builder();
  const chests = [];
  const spawns = [];
  const isl = { surface: theme.surface, sub: theme.sub, core: theme.core, ores: theme.ores, oreChance: theme.oreChance };
  const rot = (index % 2) * (Math.PI / 8);

  // --- Isla central con el salón ---
  const cy = L.lift;
  const centerSurface = island(b, rng, { ...isl, profile: theme.centerShape }, 0, cy, 0, L.centerR, 15);
  centerHall(b, rng, theme, cy, chests);
  for (const [tx, tz] of [[-10, 4], [10, -4], [4, 10], [-4, -10]])
    if (b.get(tx, cy, tz)?.id === theme.surface && !b.has(tx, cy + 1, tz)) tree(b, rng, theme.tree, tx, cy, tz);
  tunnel(b, theme, "x", cy - 6, L.centerR + 4, chests);
  if (theme.tunnels > 1) tunnel(b, theme, "z", cy - 9, L.centerR + 4, chests);
  hangUnder(b, rng, centerSurface, cy, theme.hang, theme.spikes ? 26 : 14, theme.spikes ? 7 : 4);
  decorate(b, rng, theme, centerSurface, cy, 0.08, chests.concat([{ x: 0, z: 0 }]));

  // --- Islas intermedias (estructura temática, cofre y un cofre escondido bajo tierra) ---
  for (let i = 0; i < L.midCount; i++) {
    const a = rot + Math.PI / 4 + (i * 2 * Math.PI) / L.midCount;
    const fx = Math.cos(a), fz = Math.sin(a);
    const x = Math.round(fx * L.midDist), z = Math.round(fz * L.midDist);
    const y = L.midY + Math.round(rng() * 2) - 1;
    const surf = island(b, rng, { ...isl, profile: theme.shape }, x, y, z, L.midR ?? 6, 8);
    MID_STRUCTS[theme.mid](b, rng, x + Math.round(fx * 2), y, z + Math.round(fz * 2));
    const chx = x - Math.round(fx * 3), chz = z - Math.round(fz * 3);
    b.set(chx, y, chz, theme.sub);
    b.set(chx, y + 1, chz, "chest");
    chests.push({ x: chx, y: y + 1, z: chz, kind: "mid", where: "isla intermedia" });
    // Escondido: enterrado bajo el centro de la isla (hay que picar)
    b.set(x, y - 3, z, "chest");
    b.set(x, y - 4, z, theme.core);
    chests.push({ x, y: y - 3, z, kind: "mid", secret: true, buried: true, where: "enterrado" });
    if (theme.bridges) {
      const len = Math.hypot(x, z);
      const ex = Math.round((x / len) * (L.centerR - 2)), ez = Math.round((z / len) * (L.centerR - 2));
      bridge(b, theme.bridges, x - Math.round(fx * ((L.midR ?? 6) - 1)), y, z - Math.round(fz * ((L.midR ?? 6) - 1)), ex, cy, ez);
    }
    hangUnder(b, rng, surf, y, theme.hang, theme.spikes ? 9 : 5, theme.spikes ? 5 : 3);
    decorate(b, rng, theme, surf, y, 0.12, [{ x: chx, z: chz }]);
  }

  // --- Islas de aparición (8 jugadores, 3 cofres cada una) ---
  for (let i = 0; i < SPAWN_COUNT; i++) {
    const a = rot + (i * 2 * Math.PI) / SPAWN_COUNT;
    let dist = L.spawnDist, y = L.spawnY;
    if (L.pattern === "square") dist += i % 2 ? 3 : -1;
    if (L.pattern === "staggered") { dist += i % 2 ? -3 : 1; y += i % 2 ? 3 : -2; }
    const x = Math.round(Math.cos(a) * dist), z = Math.round(Math.sin(a) * dist);
    spawns.push(spawnIsland(b, rng, theme, isl, i, x, y, z, a, chests));
  }

  // --- Rocas flotantes decorativas entre las islas ---
  for (let k = 0; k < 8; k++) {
    const a = rot + Math.PI / 8 + (k * 2 * Math.PI) / 8;
    const d = 29 + rng() * 2;
    const x = Math.round(Math.cos(a) * d), z = Math.round(Math.sin(a) * d), y = Math.round(rng() * 10) - 4;
    island(b, rng, isl, x, y, z, 1.6, 2);
  }

  // Despejar el espacio de las jaulas (y la caída hasta la isla) y encima de cada cofre
  for (const sp of spawns)
    for (let dy = 0; dy <= 5; dy++) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++)
      b.del(sp.x + dx, sp.y + dy, sp.z + dz);
  for (const ch of chests) if (!ch.buried) b.del(ch.x, ch.y + 1, ch.z);
  for (const ch of chests) b.set(ch.x, ch.y, ch.z, "chest"); // por si algo los tapó

  // La arena (cae con la gravedad) que haya quedado sin nada debajo se cambia por el bloque de abajo
  for (const bl of [...b.map.values()]) if (bl.id === "sand" && !b.has(bl.x, bl.y - 1, bl.z)) b.set(bl.x, bl.y, bl.z, theme.sub === "sand" ? "sandstone" : theme.sub);

  // Puntos seguros de la isla central para la muerte súbita (fuera del salón)
  const safe = [];
  for (const p of centerSurface) {
    const d = Math.hypot(p.x, p.z);
    if (d < 9 || d > 12) continue;
    const ground = b.get(p.x, cy, p.z);
    if (!ground || ["water", "chest"].includes(ground.id)) continue;
    if (b.has(p.x, cy + 1, p.z) || b.has(p.x, cy + 2, p.z)) continue;
    safe.push({ x: p.x, y: cy + 1, z: p.z });
  }

  return { theme, index, blocks: b.list(), spawns: spawns.map(({ stair, ...s }) => s), chests, safe, center: { x: 0, y: cy + 1, z: 0 } };
}
