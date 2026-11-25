// Generador de arenas de SkyWars.
// Este archivo NO importa nada de Minecraft: lo usa el juego (main.js) para
// construir las islas y también tools/render-previews.mjs para dibujar las
// imágenes de vista previa. Así las imágenes muestran exactamente lo que se
// construye en el juego.

// Centro de la arena (las islas se construyen en el cielo, sobre cualquier mundo).
export const ARENA = { x: 0, y: 180, z: 0 };
// Caja que se limpia antes de construir cada arena (relativa a ARENA).
export const ARENA_BOUNDS = { r: 46, yMin: -22, yMax: 30 };
// Lobby flotante encima del centro de la arena.
export const LOBBY = { x: 0, y: 230, z: 0, r: 8 };

export const SPAWN_COUNT = 8;

export const THEMES = [
  {
    id: "pradera", name: "Pradera",
    surface: "grass_block", sub: "dirt", core: "stone",
    ores: ["coal_ore", "iron_ore"], tree: "oak", deco: ["poppy", "dandelion"],
    centerFeature: "well",
  },
  {
    id: "desierto", name: "Desierto",
    surface: "sand", sub: "sandstone", core: "sandstone",
    ores: ["gold_ore", "coal_ore"], tree: "cactus", deco: ["deadbush"],
    centerFeature: "pyramid",
  },
  {
    id: "glaciar", name: "Glaciar",
    surface: "snow", sub: "packed_ice", core: "stone",
    ores: ["iron_ore", "lapis_ore"], tree: "spruce", deco: [],
    centerFeature: "icespikes",
  },
  {
    id: "infierno", name: "Infierno",
    surface: "crimson_nylium", sub: "netherrack", core: "blackstone",
    ores: ["quartz_ore", "nether_gold_ore"], tree: "crimson", deco: ["crimson_roots"],
    centerFeature: "lavafall",
  },
  {
    id: "fin", name: "El Fin",
    surface: "end_stone", sub: "end_stone", core: "obsidian",
    ores: [], tree: "purpur", deco: [],
    centerFeature: "obsidianTower",
  },
  {
    id: "hongos", name: "Champiñones",
    surface: "mycelium", sub: "dirt", core: "stone",
    ores: ["coal_ore", "iron_ore"], tree: "mushroom", deco: ["brown_mushroom", "red_mushroom"],
    centerFeature: "bigMushroom",
  },
  {
    id: "jungla", name: "Jungla",
    surface: "grass_block", sub: "dirt", core: "mossy_cobblestone",
    ores: ["emerald_ore", "coal_ore"], tree: "jungle", deco: ["fern"],
    centerFeature: "temple",
  },
  {
    id: "oceano", name: "Océano",
    surface: "sand", sub: "prismarine", core: "dark_prismarine",
    ores: ["sea_lantern"], tree: "prismarine", deco: [],
    centerFeature: "monument",
  },
  {
    id: "cerezos", name: "Cerezos",
    surface: "grass_block", sub: "dirt", core: "stone",
    ores: ["iron_ore", "copper_ore"], tree: "cherry", deco: ["pink_petals"],
    centerFeature: "pagoda",
  },
  {
    id: "amatista", name: "Geoda",
    surface: "calcite", sub: "smooth_basalt", core: "deepslate",
    ores: ["deepslate_diamond_ore", "deepslate_iron_ore"], tree: "amethyst", deco: ["amethyst_cluster"],
    centerFeature: "geode",
  },
];

// --- utilidades -----------------------------------------------------------

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Builder {
  constructor() { this.map = new Map(); }
  set(x, y, z, id, states) {
    this.map.set(`${x},${y},${z}`, { x, y, z, id, states });
  }
  setIfAir(x, y, z, id, states) {
    if (!this.map.has(`${x},${y},${z}`)) this.set(x, y, z, id, states);
  }
  has(x, y, z) { return this.map.has(`${x},${y},${z}`); }
  get(x, y, z) { return this.map.get(`${x},${y},${z}`); }
  // Bloques ordenados de abajo hacia arriba (para que la arena y los cactus
  // siempre tengan soporte al colocarse).
  list() { return [...this.map.values()].sort((a, b) => a.y - b.y); }
}

const LEAVES = { persistent_bit: true };
const CAP = { huge_mushroom_bits: 14 };
const STEM = { huge_mushroom_bits: 15 };

// Isla flotante con forma de cono invertido irregular.
// Devuelve las posiciones de la superficie (x,z) y la altura de la cima.
function island(b, rng, theme, cx, cy, cz, radius, depth) {
  const lobes = Array.from({ length: 12 }, () => 0.8 + rng() * 0.4);
  const surface = [];
  for (let dy = 0; dy <= depth; dy++) {
    const f = 1 - dy / (depth + 1);
    const layerR = radius * Math.pow(f, 0.85);
    const R = Math.ceil(layerR * 1.25) + 1;
    for (let dx = -R; dx <= R; dx++) {
      for (let dz = -R; dz <= R; dz++) {
        const ang = (Math.atan2(dz, dx) + Math.PI) / (2 * Math.PI) * 12;
        const i0 = Math.floor(ang) % 12, i1 = (i0 + 1) % 12, t = ang - Math.floor(ang);
        const lobe = lobes[i0] * (1 - t) + lobes[i1] * t;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d > layerR * lobe + (dy > 0 ? rng() * 0.6 : 0)) continue;
        const x = cx + dx, y = cy - dy, z = cz + dz;
        let id;
        if (dy === 0) id = theme.surface === "snow" ? "snow" : theme.surface;
        else if (dy <= 2) id = theme.sub;
        else id = theme.ores.length && rng() < 0.07 ? theme.ores[Math.floor(rng() * theme.ores.length)] : theme.core;
        b.set(x, y, z, id);
        if (dy === 0) surface.push({ x, z });
      }
    }
  }
  return { surface, top: cy };
}

// --- árboles y decoraciones -------------------------------------------------

function blob(b, cx, cy, cz, r, id, states, rng, hollowChance = 0.15) {
  for (let dx = -r; dx <= r; dx++)
    for (let dy = -r; dy <= r; dy++)
      for (let dz = -r; dz <= r; dz++) {
        const d = Math.sqrt(dx * dx + dy * dy * 1.6 + dz * dz);
        if (d > r + 0.3) continue;
        if (d > r - 0.7 && rng() < hollowChance) continue;
        b.setIfAir(cx + dx, cy + dy, cz + dz, id, states);
      }
}

function tree(b, rng, kind, x, y, z) {
  // y = altura de la superficie (el tronco empieza en y+1)
  switch (kind) {
    case "oak": {
      const h = 4 + Math.floor(rng() * 2);
      for (let i = 1; i <= h; i++) b.set(x, y + i, z, "oak_log");
      blob(b, x, y + h, z, 2, "oak_leaves", LEAVES, rng);
      break;
    }
    case "spruce": {
      const h = 6 + Math.floor(rng() * 2);
      for (let i = 1; i <= h; i++) b.set(x, y + i, z, "spruce_log");
      for (let i = 2; i <= h + 1; i++) {
        const r = Math.max(0, Math.round((h + 1 - i) / 2.2)) + (i % 2 === 0 ? 0 : 0);
        for (let dx = -r; dx <= r; dx++)
          for (let dz = -r; dz <= r; dz++)
            if (Math.abs(dx) + Math.abs(dz) <= r + 0.5) b.setIfAir(x + dx, y + i, z + dz, "spruce_leaves", LEAVES);
      }
      b.setIfAir(x, y + h + 1, z, "spruce_leaves", LEAVES);
      break;
    }
    case "jungle": {
      const h = 7 + Math.floor(rng() * 3);
      for (let i = 1; i <= h; i++) b.set(x, y + i, z, "jungle_log");
      blob(b, x, y + h, z, 3, "jungle_leaves", LEAVES, rng);
      for (let i = 2; i < h - 1; i++) if (rng() < 0.5) b.setIfAir(x + 1, y + i, z, "vine");
      break;
    }
    case "cherry": {
      const h = 4;
      for (let i = 1; i <= h; i++) b.set(x, y + i, z, "cherry_log");
      for (let dx = -3; dx <= 3; dx++)
        for (let dz = -3; dz <= 3; dz++) {
          const d = Math.sqrt(dx * dx + dz * dz);
          if (d <= 3.2) b.setIfAir(x + dx, y + h + 1, z + dz, "cherry_leaves", LEAVES);
          if (d <= 2.2) b.setIfAir(x + dx, y + h + 2, z + dz, "cherry_leaves", LEAVES);
          if (d <= 3.2 && d > 2.2 && rng() < 0.5) b.setIfAir(x + dx, y + h, z + dz, "cherry_leaves", LEAVES);
        }
      break;
    }
    case "cactus": {
      const h = 2 + Math.floor(rng() * 2);
      for (let i = 1; i <= h; i++) b.set(x, y + i, z, "cactus");
      break;
    }
    case "mushroom": {
      const h = 4 + Math.floor(rng() * 2);
      for (let i = 1; i <= h; i++) b.set(x, y + i, z, "mushroom_stem", STEM);
      for (let dx = -2; dx <= 2; dx++)
        for (let dz = -2; dz <= 2; dz++) {
          if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
          b.setIfAir(x + dx, y + h + 1, z + dz, "red_mushroom_block", CAP);
          if (Math.abs(dx) === 2 || Math.abs(dz) === 2) b.setIfAir(x + dx, y + h, z + dz, "red_mushroom_block", CAP);
        }
      break;
    }
    case "crimson": {
      const h = 4 + Math.floor(rng() * 2);
      for (let i = 1; i <= h; i++) b.set(x, y + i, z, "crimson_stem");
      blob(b, x, y + h, z, 2, "nether_wart_block", undefined, rng, 0.25);
      b.set(x, y + h + 1, z + 1, "shroomlight");
      break;
    }
    case "purpur": {
      const h = 4 + Math.floor(rng() * 2);
      for (let i = 1; i <= h; i++) b.set(x, y + i, z, "purpur_pillar");
      b.set(x, y + h + 1, z, "end_rod");
      break;
    }
    case "prismarine": {
      const h = 3 + Math.floor(rng() * 2);
      for (let i = 1; i <= h; i++) b.set(x, y + i, z, "prismarine_bricks");
      b.set(x, y + h + 1, z, "sea_lantern");
      break;
    }
    case "amethyst": {
      const h = 2 + Math.floor(rng() * 3);
      for (let i = 1; i <= h; i++) b.set(x, y + i, z, "amethyst_block");
      if (rng() < 0.6) b.set(x + 1, y + 1, z, "amethyst_block");
      b.set(x, y + h + 1, z, "amethyst_cluster");
      break;
    }
  }
}

function decorate(b, rng, theme, surface, top, density, avoid) {
  if (!theme.deco.length) return;
  for (const p of surface) {
    if (rng() > density) continue;
    if (avoid.some((a) => Math.abs(a.x - p.x) <= 1 && Math.abs(a.z - p.z) <= 1)) continue;
    if (b.has(p.x, top + 1, p.z)) continue;
    b.set(p.x, top + 1, p.z, theme.deco[Math.floor(rng() * theme.deco.length)]);
  }
}

// --- elementos especiales de la isla central -------------------------------

function centerFeature(b, rng, theme, top) {
  const y = top;
  switch (theme.centerFeature) {
    case "well":
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
        const edge = Math.abs(dx) === 2 || Math.abs(dz) === 2;
        b.set(dx, y, dz, edge ? "cobblestone" : "water");
        if (edge) b.set(dx, y + 1, dz, "cobblestone_wall");
      }
      for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) for (let i = 2; i <= 3; i++) b.set(dx, y + i, dz, "oak_fence");
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) b.set(dx, y + 4, dz, "oak_planks");
      break;
    case "pyramid":
      for (let lvl = 0; lvl < 5; lvl++) {
        const r = 4 - lvl;
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++)
          if (Math.abs(dx) === r || Math.abs(dz) === r || lvl === 4) b.set(dx, y + 1 + lvl, dz, lvl % 2 ? "cut_sandstone" : "sandstone");
      }
      for (let i = 1; i <= 2; i++) b.map.delete(`0,${y + i},-4`);
      b.set(0, y + 5, 0, "gold_block");
      break;
    case "icespikes":
      for (const [sx, sz, h] of [[0, 0, 9], [3, 2, 6], [-3, -2, 5]]) {
        for (let i = 1; i <= h; i++) {
          b.set(sx, y + i, sz, "packed_ice");
          if (i < h / 2) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(sx + dx, y + i, sz + dz, "packed_ice");
        }
      }
      break;
    case "lavafall":
      for (let i = 1; i <= 7; i++) for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.set(dx, y + i, dz, "nether_brick");
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) b.set(dx, y + 8, dz, "nether_brick");
      b.set(0, y + 9, 0, "magma");
      b.set(0, y + 7, 0, "glowstone");
      break;
    case "obsidianTower":
      for (let i = 1; i <= 10; i++) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) b.set(dx, y + i, dz, "obsidian");
      b.set(0, y + 11, 0, "crying_obsidian");
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.set(dx, y + 11, dz, "end_rod");
      break;
    case "bigMushroom":
      for (let i = 1; i <= 8; i++) b.set(0, y + i, 0, "mushroom_stem", STEM);
      for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d <= 4.3) b.set(dx, y + 9, dz, "red_mushroom_block", CAP);
        if (d <= 3) b.set(dx, y + 10, dz, "red_mushroom_block", CAP);
        if (d > 3.6 && d <= 4.6) b.set(dx, y + 8, dz, "red_mushroom_block", CAP);
      }
      break;
    case "temple":
      for (let lvl = 0; lvl < 4; lvl++) {
        const r = 4 - lvl;
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++)
          if (Math.abs(dx) === r || Math.abs(dz) === r || lvl === 3) b.set(dx, y + 1 + lvl, dz, rng() < 0.4 ? "mossy_cobblestone" : "cobblestone");
      }
      b.map.delete(`0,${y + 1},-4`); b.map.delete(`0,${y + 2},-4`);
      for (let i = 0; i < 6; i++) b.setIfAir(-4 + i, y + 3, -5, "vine");
      break;
    case "monument":
      for (let i = 1; i <= 5; i++) for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) b.set(dx, y + i, dz, "prismarine_bricks");
      for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++)
        if (Math.abs(dx) === 3 || Math.abs(dz) === 3) b.set(dx, y + 6, dz, "dark_prismarine");
      b.set(0, y + 1, 0, "sea_lantern"); b.set(0, y + 2, 0, "sea_lantern");
      for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) b.set(dx, y + 7, dz, "sea_lantern");
      break;
    case "pagoda":
      for (let floor = 0; floor < 3; floor++) {
        const base = y + 1 + floor * 4, r = 3 - floor;
        for (let i = 0; i < 3; i++) for (const [dx, dz] of [[-r, -r], [r, -r], [-r, r], [r, r]]) b.set(dx, base + i, dz, "dark_oak_log");
        const rr = r + 1;
        for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) b.set(dx, base + 3, dz, Math.abs(dx) === rr || Math.abs(dz) === rr ? "nether_brick" : "cherry_planks");
      }
      b.set(0, y + 13, 0, "lantern");
      break;
    case "geode":
      for (let dx = -4; dx <= 4; dx++) for (let dy = 0; dy <= 6; dy++) for (let dz = -4; dz <= 4; dz++) {
        const d = Math.sqrt(dx * dx + (dy - 2) * (dy - 2) * 1.3 + dz * dz);
        if (d > 4.6 || d < 3.4) continue;
        if (dz < -2 && dy <= 2 && Math.abs(dx) <= 1) continue; // entrada
        b.set(dx, y + 1 + dy, dz, d > 4.1 ? "smooth_basalt" : d > 3.75 ? "calcite" : "amethyst_block");
      }
      b.set(0, y + 1, 0, "budding_amethyst");
      b.set(0, y + 2, 0, "amethyst_cluster");
      break;
  }
}

// --- generador principal -------------------------------------------------

/**
 * Genera la arena número `index` (0..9).
 * Las coordenadas devueltas son RELATIVAS a ARENA.
 * @returns {{ theme, blocks, spawns, chests, center }}
 */
export function generateArena(index) {
  const theme = THEMES[index % THEMES.length];
  const rng = mulberry32(0x5eed + index * 7919);
  const b = new Builder();
  const chests = [];
  const spawns = [];

  // Cada arena tiene una distribución ligeramente distinta.
  const rot = (index % 2) * (Math.PI / 8);
  const spawnDist = 34 + (index % 3);
  const midCount = index % 3 === 2 ? 3 : 4;
  const midDist = 18 + (index % 2) * 2;

  // Isla central
  const centerR = 10 + (index % 2);
  const c = island(b, rng, theme, 0, 0, 0, centerR, 11);
  const centerChestSpots = [[-6, -2], [6, 2], [-2, 6], [2, -6], [-5, 5], [5, -5]];
  for (const [x, z] of centerChestSpots) {
    if (!b.has(x, 0, z)) continue;
    b.set(x, 1, z, "chest");
    chests.push({ x, y: 1, z, kind: "center" });
  }
  centerFeature(b, rng, theme, 0);
  for (const [tx, tz] of [[-7, 4], [6, -3]]) if (b.has(tx, 0, tz) && !b.has(tx, 1, tz)) tree(b, rng, theme.tree, tx, 0, tz);
  decorate(b, rng, theme, c.surface, 0, 0.08, chests.concat([{ x: 0, z: 0 }]));

  // Islas intermedias
  for (let i = 0; i < midCount; i++) {
    const a = rot + Math.PI / 4 + (i * 2 * Math.PI) / midCount;
    const x = Math.round(Math.cos(a) * midDist), z = Math.round(Math.sin(a) * midDist);
    const y = Math.round(rng() * 4) - 2;
    const isl = island(b, rng, theme, x, y, z, 5, 6);
    b.set(x, y + 1, z, "chest");
    chests.push({ x, y: y + 1, z, kind: "mid" });
    const t = isl.surface.find((p) => Math.abs(p.x - x) === 3 && Math.abs(p.z - z) <= 1);
    if (t) tree(b, rng, theme.tree, t.x, y, t.z);
    decorate(b, rng, theme, isl.surface, y, 0.1, [{ x, z }]);
  }

  // Islas de aparición (8 jugadores)
  for (let i = 0; i < SPAWN_COUNT; i++) {
    const a = rot + (i * 2 * Math.PI) / SPAWN_COUNT;
    const x = Math.round(Math.cos(a) * spawnDist), z = Math.round(Math.sin(a) * spawnDist);
    const y = Math.round(rng() * 2) - 1;
    const isl = island(b, rng, theme, x, y, z, 4.6, 6);
    // Dos cofres en cada isla de aparición, del lado de afuera
    const ox = Math.round(Math.cos(a) * 2.6), oz = Math.round(Math.sin(a) * 2.6);
    const px = Math.round(-Math.sin(a) * 2), pz = Math.round(Math.cos(a) * 2);
    for (const [cx, cz] of [[x + ox + px, z + oz + pz], [x + ox - px, z + oz - pz]]) {
      if (!b.has(cx, y, cz)) continue;
      b.set(cx, y + 1, cz, "chest");
      chests.push({ x: cx, y: y + 1, z: cz, kind: "spawn" });
    }
    const tx = x - Math.round(Math.cos(a) * 3) + px, tz = z - Math.round(Math.sin(a) * 3) + pz;
    if (b.has(tx, y, tz)) tree(b, rng, theme.tree, tx, y, tz);
    decorate(b, rng, theme, isl.surface, y, 0.12, chests.concat([{ x, z }]));
    spawns.push({ x, y: y + 1, z, team: i < SPAWN_COUNT / 2 ? "red" : "blue" });
  }

  return { theme, index, blocks: b.list(), spawns, chests, center: { x: 0, y: 1, z: 0 } };
}
