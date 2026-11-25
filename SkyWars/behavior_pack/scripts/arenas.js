// Generador de las 10 arenas de SkyWars.
// No importa nada de Minecraft: lo usa el juego (main.js) para construir las islas
// y también tools/render-previews.mjs para dibujar las imágenes de vista previa.
import { Builder, mulberry32, island, tree, blob, lamp, LEAVES, CAP, STEM } from "./gen.js";

const HANG = { hanging: true }; // farol colgando del bloque de arriba

// Centro de la arena (las islas se construyen en el cielo).
export const ARENA = { x: 0, y: 180, z: 0 };
// Caja que se limpia antes de construir cada arena (relativa a ARENA).
export const ARENA_BOUNDS = { r: 60, yMin: -22, yMax: 44 };
// Radio a partir del cual se empuja a los jugadores de vuelta (límite del mapa).
export const BORDER = 56;
export const SPAWN_COUNT = 8;

// pattern: circle | square | staggered    lift: altura extra de la isla central
export const THEMES = [
  {
    id: "pradera", name: "Pradera", desc: "Molino, casitas de madera y un pozo en el centro",
    surface: "grass_block", sub: "dirt", core: "stone", ores: ["coal_ore", "iron_ore", "copper_ore"],
    tree: "oak", deco: ["poppy", "dandelion", "short_grass", "azure_bluet"], light: "glowstone", hang: "dirt",
    layout: { pattern: "circle", spawnDist: 36, midCount: 4, midDist: 20, centerR: 11, spawnY: 0, midY: 1, lift: 0, lobes: 0 },
    spawn: "cottage", mid: "windmill", center: "well", tunnels: 1,
  },
  {
    id: "desierto", name: "Desierto", desc: "Pirámide central con túneles, pozos y obeliscos",
    surface: "sand", sub: "sandstone", core: "sandstone", ores: ["gold_ore", "coal_ore"],
    tree: "cactus", deco: ["deadbush"], light: "glowstone", hang: "sandstone",
    layout: { pattern: "square", spawnDist: 36, midCount: 4, midDist: 20, centerR: 12, spawnY: 0, midY: 0, lift: 0, lobes: 0, stretch: [1.15, 0.95] },
    spawn: "desertWell", mid: "obelisk", center: "pyramid", tunnels: 2,
  },
  {
    id: "glaciar", name: "Glaciar", desc: "Iglús, torres de hielo y picos congelados",
    surface: "snow", sub: "packed_ice", core: "stone", ores: ["iron_ore", "lapis_ore", "diamond_ore"], oreChance: 0.05,
    tree: "spruce", deco: ["snow_layer"], light: "sea_lantern", hang: "packed_ice",
    layout: { pattern: "staggered", spawnDist: 36, midCount: 3, midDist: 19, centerR: 11, spawnY: 0, midY: 2, lift: 1, lobes: 2 },
    spawn: "igloo", mid: "iceTower", center: "icespikes", tunnels: 1,
  },
  {
    id: "infierno", name: "Infierno", desc: "Ruinas de fortaleza, puentes del Nether y hongos carmesí",
    surface: "crimson_nylium", sub: "netherrack", core: "blackstone", ores: ["quartz_ore", "nether_gold_ore", "gilded_blackstone"],
    tree: "crimson", deco: ["crimson_roots", "crimson_fungus"], light: "shroomlight", hang: "basalt",
    layout: { pattern: "circle", spawnDist: 35, midCount: 4, midDist: 20, centerR: 11, spawnY: -3, midY: -1, lift: 3, lobes: 0 },
    spawn: "netherArch", mid: "fortress", center: "lavafall", tunnels: 2,
  },
  {
    id: "fin", name: "El Fin", desc: "Torres de purpur, pilares de obsidiana y una isla central elevada",
    surface: "end_stone", sub: "end_stone", core: "obsidian", ores: ["end_bricks"], oreChance: 0.15,
    tree: "purpur", deco: [], light: "sea_lantern", hang: "obsidian",
    layout: { pattern: "circle", spawnDist: 37, midCount: 4, midDist: 21, centerR: 10, spawnY: 0, midY: 3, lift: 6, lobes: 3 },
    spawn: "endTower", mid: "obsidianPillar", center: "obsidianTower", tunnels: 1,
  },
  {
    id: "hongos", name: "Champiñones", desc: "Champiñones gigantes, casitas-hongo y seis islas intermedias",
    surface: "mycelium", sub: "dirt", core: "stone", ores: ["coal_ore", "iron_ore"],
    tree: "mushroom", deco: ["brown_mushroom", "red_mushroom"], light: "glowstone", hang: "dirt",
    layout: { pattern: "circle", spawnDist: 37, midCount: 6, midDist: 22, midR: 4.5, centerR: 11, spawnY: 0, midY: 0, lift: 0, lobes: 0 },
    spawn: "mushroomHut", mid: "mushroomPair", center: "bigMushroom", tunnels: 1,
  },
  {
    id: "jungla", name: "Jungla", desc: "Templo en ruinas, árboles gigantes y lianas colgando",
    surface: "grass_block", sub: "dirt", core: "mossy_cobblestone", ores: ["emerald_ore", "coal_ore"],
    tree: "jungle", deco: ["fern", "short_grass", "melon_block"], light: "glowstone", hang: "jungle_leaves",
    layout: { pattern: "staggered", spawnDist: 36, midCount: 4, midDist: 21, centerR: 11, spawnY: 0, midY: 1, lift: 1, lobes: 2 },
    spawn: "jungleRuin", mid: "bigJungleTree", center: "temple", tunnels: 2,
  },
  {
    id: "oceano", name: "Océano", desc: "Atolón con monumento, barcos naufragados y ruinas de prismarina",
    surface: "sand", sub: "prismarine", core: "dark_prismarine", ores: ["sea_lantern"], oreChance: 0.04,
    tree: "prismarine", deco: [], light: "sea_lantern", hang: "prismarine",
    layout: { pattern: "square", spawnDist: 36, midCount: 4, midDist: 20, centerR: 11, spawnY: 0, midY: -1, lift: 0, lobes: 0, stretch: [1.3, 0.85] },
    spawn: "oceanRuin", mid: "shipwreck", center: "monument", tunnels: 1,
  },
  {
    id: "cerezos", name: "Cerezos", desc: "Portales torii, pabellones y una pagoda que sube hacia el centro",
    surface: "grass_block", sub: "dirt", core: "stone", ores: ["iron_ore", "copper_ore"],
    tree: "cherry", deco: ["pink_petals"], light: "lantern", hang: "cherry_leaves",
    layout: { pattern: "circle", spawnDist: 36, midCount: 4, midDist: 20, centerR: 11, spawnY: -3, midY: 0, lift: 3, lobes: 0 },
    spawn: "torii", mid: "pavilion", center: "pagoda", tunnels: 1,
  },
  {
    id: "amatista", name: "Geoda", desc: "Geoda gigante, cristales de amatista y cuevas de basalto",
    surface: "calcite", sub: "smooth_basalt", core: "deepslate", ores: ["deepslate_diamond_ore", "deepslate_iron_ore", "amethyst_block"], oreChance: 0.08,
    tree: "amethyst", deco: ["amethyst_cluster"], light: "sea_lantern", hang: "amethyst_block",
    layout: { pattern: "staggered", spawnDist: 36, midCount: 3, midDist: 19, centerR: 11, spawnY: 0, midY: 1, lift: 2, lobes: 3 },
    spawn: "crystals", mid: "geodeHalf", center: "geode", tunnels: 2,
  },
];

// ---------------------------------------------------------------------------
// Estructuras de las islas de aparición (pequeñas, junto a la jaula)
// (x, y, z) = punto de anclaje; y = altura de la superficie
// ---------------------------------------------------------------------------
const SPAWN_STRUCTS = {
  cottage(b, rng, x, y, z) {
    b.box(x - 1, y, z - 1, x + 1, y, z + 1, "oak_planks");
    for (let h = 1; h <= 3; h++) {
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.set(x + dx, y + h, z + dz, "oak_log");
      for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) b.set(x + dx, y + h, z + dz, h === 2 ? "glass_pane" : "oak_planks");
    }
    b.del(x, y + 1, z - 1); b.del(x, y + 2, z - 1); // puerta
    b.box(x - 2, y + 4, z - 2, x + 2, y + 4, z + 2, "spruce_planks");
    b.box(x - 1, y + 5, z - 1, x + 1, y + 5, z + 1, "spruce_planks");
    b.set(x, y + 6, z, "spruce_planks");
    b.set(x, y + 1, z, "lantern");
  },
  desertWell(b, rng, x, y, z) {
    b.walls(x - 1, y, z - 1, x + 1, y + 1, z + 1, "cut_sandstone");
    b.set(x, y, z, "water"); b.set(x, y - 1, z, "sandstone");
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(x + dx, y + 2, z + dz, x + dx, y + 3, z + dz, "sandstone_wall");
    b.box(x - 1, y + 4, z - 1, x + 1, y + 4, z + 1, "smooth_sandstone");
    b.set(x, y + 5, z, "chiseled_sandstone");
  },
  igloo(b, rng, x, y, z) {
    for (let dx = -2; dx <= 2; dx++) for (let dy = 0; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) {
      const d = Math.sqrt(dx * dx + dy * dy * 1.4 + dz * dz);
      if (d <= 2.5 && d > 1.4) b.set(x + dx, y + 1 + dy, z + dz, "snow");
      else if (d <= 1.4) b.del(x + dx, y + 1 + dy, z + dz);
    }
    b.del(x, y + 1, z - 2); b.del(x, y + 2, z - 2); // entrada
    b.set(x, y + 1, z, "lantern");
    b.set(x + 1, y + 1, z + 1, "blue_ice");
  },
  netherArch(b, rng, x, y, z) {
    for (let h = 1; h <= 4; h++) { b.set(x - 2, y + h, z, "nether_brick"); b.set(x + 2, y + h, z, "nether_brick"); }
    b.box(x - 2, y + 5, z, x + 2, y + 5, z, "red_nether_brick");
    b.set(x - 1, y + 4, z, "nether_brick_fence"); b.set(x + 1, y + 4, z, "nether_brick_fence");
    b.set(x, y + 6, z, "soul_lantern");
    b.set(x - 2, y + 6, z, "nether_brick_fence"); b.set(x + 2, y + 6, z, "nether_brick_fence");
    if (rng() < 0.5) b.del(x + 2, y + 5, z); // un poco en ruinas
  },
  endTower(b, rng, x, y, z) {
    for (let h = 1; h <= 6; h++) {
      b.walls(x - 1, y + h, z - 1, x + 1, y + h, z + 1, h % 3 === 0 ? "purpur_pillar" : "purpur_block");
      b.del(x, y + h, z);
    }
    b.del(x, y + 1, z - 1); b.del(x, y + 2, z - 1); b.del(x + 1, y + 4, z); b.del(x - 1, y + 4, z);
    b.box(x - 1, y + 7, z - 1, x + 1, y + 7, z + 1, "end_bricks");
    b.set(x, y + 8, z, "end_rod");
  },
  mushroomHut(b, rng, x, y, z) {
    for (let h = 1; h <= 3; h++) b.set(x, y + h, z, "mushroom_stem", STEM);
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++)
      if (Math.abs(dx) + Math.abs(dz) <= 3) b.set(x + dx, y + 4, z + dz, "brown_mushroom_block", CAP);
    b.set(x + 1, y + 1, z, "brown_mushroom");
  },
  jungleRuin(b, rng, x, y, z) {
    for (let dx = -2; dx <= 2; dx++) {
      const h = 1 + Math.floor(rng() * 3);
      for (let i = 1; i <= h; i++) b.set(x + dx, y + i, z - 1, rng() < 0.5 ? "mossy_stone_bricks" : "cracked_stone_bricks");
    }
    for (let i = 1; i <= 3; i++) b.set(x - 2, y + i, z, "mossy_stone_bricks");
    b.set(x - 2, y + 4, z, "lantern");
    b.set(x, y + 1, z + 1, "moss_block");
  },
  oceanRuin(b, rng, x, y, z) {
    for (const [dx, dz] of [[-1, -1], [1, 1]]) for (let i = 1; i <= 3 + Math.floor(rng() * 2); i++) b.set(x + dx, y + i, z + dz, "prismarine_bricks");
    b.set(x - 1, y + 5, z - 1, "sea_lantern");
    b.set(x + 1, y + 1, z - 1, "dark_prismarine"); b.set(x - 1, y + 1, z + 1, "prismarine");
  },
  torii(b, rng, x, y, z) {
    for (let h = 1; h <= 4; h++) { b.set(x - 2, y + h, z, "red_concrete"); b.set(x + 2, y + h, z, "red_concrete"); }
    b.box(x - 2, y + 4, z, x + 2, y + 4, z, "red_concrete");
    b.box(x - 3, y + 5, z, x + 3, y + 5, z, "black_concrete");
    b.set(x, y + 3, z, "lantern", HANG);
  },
  crystals(b, rng, x, y, z) {
    for (const [dx, dz, h] of [[0, 0, 4], [1, 1, 2], [-1, 1, 3], [1, -1, 1]]) {
      for (let i = 1; i <= h; i++) b.set(x + dx, y + i, z + dz, i === h ? "tinted_glass" : "amethyst_block");
      b.set(x + dx, y + h + 1, z + dz, "amethyst_cluster");
    }
  },
};

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
// Estructura principal de la isla central
// ---------------------------------------------------------------------------
function centerFeature(b, rng, theme, y) {
  switch (theme.center) {
    case "well":
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
        const edge = Math.abs(dx) === 2 || Math.abs(dz) === 2;
        b.set(dx, y, dz, edge ? "stone_bricks" : "water");
        if (edge) b.set(dx, y + 1, dz, "cobblestone_wall");
        if (!edge) b.set(dx, y - 1, dz, "stone");
      }
      for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) for (let i = 2; i <= 3; i++) b.set(dx, y + i, dz, "oak_fence");
      b.box(-3, y + 4, -3, 3, y + 4, 3, "spruce_planks");
      b.box(-2, y + 5, -2, 2, y + 5, 2, "spruce_planks");
      b.set(0, y + 6, 0, "lantern");
      for (const [dx, dz] of [[-6, 0], [6, 0], [0, -6], [0, 6]]) lamp(b, dx, y, dz);
      break;
    case "pyramid":
      for (let lvl = 0; lvl < 6; lvl++) {
        const r = 5 - lvl;
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++)
          if (Math.abs(dx) === r || Math.abs(dz) === r || lvl === 5) b.set(dx, y + 1 + lvl, dz, lvl % 2 ? "cut_sandstone" : "smooth_sandstone");
      }
      for (const z of [-5, 5]) for (let i = 1; i <= 2; i++) b.del(0, y + i, z); // entradas
      b.set(0, y + 6, 0, "gold_block");
      b.set(0, y + 1, 0, "chiseled_sandstone"); b.set(0, y + 2, 0, "lantern");
      break;
    case "icespikes":
      for (const [sx, sz, h] of [[0, 0, 12], [3, 3, 7], [-3, -2, 6], [3, -3, 5]]) {
        for (let i = 1; i <= h; i++) {
          b.set(sx, y + i, sz, i > h - 3 ? "blue_ice" : "packed_ice");
          if (i < h / 2) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(sx + dx, y + i, sz + dz, "packed_ice");
        }
      }
      break;
    case "lavafall":
      for (let i = 1; i <= 8; i++) for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) b.set(dx, y + i, dz, "nether_brick");
      b.box(-2, y + 9, -2, 2, y + 9, 2, "nether_brick");
      b.walls(-2, y + 10, -2, 2, y + 10, 2, "nether_brick_fence");
      b.set(0, y + 10, 0, "magma"); b.set(0, y + 8, 0, "glowstone");
      for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) b.set(dx, y + 11, dz, "soul_lantern");
      break;
    case "obsidianTower":
      for (let i = 1; i <= 12; i++) b.walls(-1, y + i, -1, 1, y + i, 1, i % 4 === 0 ? "crying_obsidian" : "obsidian");
      b.del(0, y + 1, -1); b.del(0, y + 2, -1);
      b.box(-1, y + 13, -1, 1, y + 13, 1, "purpur_block");
      for (const [dx, dz] of [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]) b.set(dx, y + 14, dz, "end_rod");
      for (const [dx, dz] of [[-4, 0], [4, 0], [0, 4]]) for (let i = 1; i <= 3; i++) b.set(dx, y + i, dz, "purpur_pillar");
      break;
    case "bigMushroom":
      for (let i = 1; i <= 9; i++) b.box(0, y + i, 0, 1, y + i, 1, "mushroom_stem", STEM);
      for (let dx = -4; dx <= 5; dx++) for (let dz = -4; dz <= 5; dz++) {
        const d = Math.hypot(dx - 0.5, dz - 0.5);
        if (d <= 4.8) b.set(dx, y + 10, dz, "red_mushroom_block", CAP);
        if (d <= 3.4) b.set(dx, y + 11, dz, "red_mushroom_block", CAP);
        if (d > 4 && d <= 5.2) b.set(dx, y + 9, dz, "red_mushroom_block", CAP);
      }
      b.set(0, y + 9, 2, "glowstone"); b.set(2, y + 9, 0, "glowstone");
      break;
    case "temple":
      for (let lvl = 0; lvl < 5; lvl++) {
        const r = 5 - lvl;
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++)
          if (Math.abs(dx) === r || Math.abs(dz) === r || lvl === 4) b.set(dx, y + 1 + lvl, dz, rng() < 0.45 ? "mossy_cobblestone" : rng() < 0.5 ? "mossy_stone_bricks" : "cobblestone");
      }
      for (let i = 1; i <= 2; i++) { b.del(0, y + i, -5); b.del(0, y + i, 5); }
      b.set(0, y + 6, 0, "emerald_block");
      for (let i = -4; i <= 4; i++) if (i !== 0 && rng() < 0.7) b.setIfAir(i, y + 1, -6, "vine", { vine_direction_bits: 1 }); // pegadas a la pared sur
      break;
    case "monument":
      for (let i = 1; i <= 6; i++) for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) b.set(dx, y + i, dz, "prismarine_bricks");
      b.walls(-3, y + 7, -3, 3, y + 7, 3, "dark_prismarine");
      b.box(-2, y + 8, -2, 2, y + 8, 2, "prismarine_bricks");
      b.set(0, y + 9, 0, "sea_lantern");
      b.set(0, y + 1, 0, "sea_lantern"); b.set(0, y + 2, 0, "prismarine");
      for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) b.set(dx, y + 8, dz, "sea_lantern");
      break;
    case "pagoda":
      for (let floor = 0; floor < 3; floor++) {
        const base = y + 1 + floor * 4, r = 3 - floor;
        for (let i = 0; i < 3; i++) for (const [dx, dz] of [[-r, -r], [r, -r], [-r, r], [r, r]]) b.set(dx, base + i, dz, "dark_oak_log");
        const rr = r + 1;
        for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++)
          b.set(dx, base + 3, dz, Math.abs(dx) === rr || Math.abs(dz) === rr ? "red_concrete" : "cherry_planks");
        b.set(0, base + 2, 0, "lantern", HANG);
      }
      b.set(0, y + 13, 0, "gold_block");
      break;
    case "geode":
      for (let dx = -5; dx <= 5; dx++) for (let dy = 0; dy <= 7; dy++) for (let dz = -5; dz <= 5; dz++) {
        const d = Math.sqrt(dx * dx + (dy - 2.5) * (dy - 2.5) * 1.2 + dz * dz);
        if (d > 5.4 || d < 4) continue;
        if (Math.abs(dz) > 3 && dy <= 2 && Math.abs(dx) <= 1) continue; // entradas
        b.set(dx, y + 1 + dy, dz, d > 4.9 ? "smooth_basalt" : d > 4.45 ? "calcite" : "amethyst_block");
      }
      b.set(0, y + 1, 0, "budding_amethyst"); b.set(0, y + 2, 0, "amethyst_cluster");
      b.set(2, y + 1, 2, "amethyst_block"); b.set(-2, y + 1, -1, "amethyst_block");
      break;
  }
}

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
  const [cx, cz] = along(axis === "x" ? -3 : 3, -1);
  b.del(cx, yT + 1, cz);
  b.set(cx, yT, cz, "chest");
  chests.push({ x: cx, y: yT, z: cz, kind: "center", secret: true });
}

/** Puntas que cuelgan bajo una isla. */
function hangUnder(b, rng, surface, top, id, count, maxLen) {
  for (let n = 0; n < count && surface.length; n++) {
    const p = surface[Math.floor(rng() * surface.length)];
    let y = top; while (b.has(p.x, y - 1, p.z)) y--;
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

  // --- Isla central (con lóbulos extra en algunos mapas) ---
  const cy = L.lift;
  const centerSurface = island(b, rng, { ...isl, stretch: L.stretch }, 0, cy, 0, L.centerR, 12);
  for (let k = 0; k < L.lobes; k++) {
    const a = rot + (k * 2 * Math.PI) / L.lobes + 0.4;
    centerSurface.push(...island(b, rng, isl, Math.round(Math.cos(a) * 9), cy, Math.round(Math.sin(a) * 9), 5, 7));
  }
  centerFeature(b, rng, theme, cy);
  for (const [tx, tz] of [[-8, 5], [8, -4], [4, 8]]) if (b.get(tx, cy, tz)?.id === theme.surface && !b.has(tx, cy + 1, tz)) tree(b, rng, theme.tree, tx, cy, tz);
  const centerChestSpots = [[-7, -2], [7, 2], [-2, 7], [2, -7], [-6, 5], [6, -5]];
  for (const [x, z] of centerChestSpots) {
    if (!b.has(x, cy, z)) continue;
    b.set(x, cy + 1, z, "chest");
    chests.push({ x, y: cy + 1, z, kind: "center" });
  }
  // Túneles con cofre secreto
  tunnel(b, theme, "x", cy - 4, L.centerR + 4, chests);
  if (theme.tunnels > 1) tunnel(b, theme, "z", cy - 7, L.centerR + 4, chests);
  hangUnder(b, rng, centerSurface, cy, theme.hang, 14, 4);
  decorate(b, rng, theme, centerSurface, cy, 0.1, chests.concat([{ x: 0, z: 0 }]));

  // --- Islas intermedias ---
  for (let i = 0; i < L.midCount; i++) {
    const a = rot + Math.PI / 4 + (i * 2 * Math.PI) / L.midCount;
    const fx = Math.cos(a), fz = Math.sin(a);
    const x = Math.round(fx * L.midDist), z = Math.round(fz * L.midDist);
    const y = L.midY + Math.round(rng() * 2) - 1;
    const surf = island(b, rng, isl, x, y, z, L.midR ?? 6, 7);
    // Cofre del lado que mira al centro y la estructura del lado de afuera
    MID_STRUCTS[theme.mid](b, rng, x + Math.round(fx * 2), y, z + Math.round(fz * 2));
    const chx = x - Math.round(fx * 3), chz = z - Math.round(fz * 3);
    b.set(chx, y, chz, theme.sub); // suelo firme bajo el cofre
    b.set(chx, y + 1, chz, "chest");
    chests.push({ x: chx, y: y + 1, z: chz, kind: "mid" });
    hangUnder(b, rng, surf, y, theme.hang, 5, 3);
    decorate(b, rng, theme, surf, y, 0.12, [{ x: chx, z: chz }]);
  }

  // --- Islas de aparición (8 jugadores) ---
  for (let i = 0; i < SPAWN_COUNT; i++) {
    const a = rot + (i * 2 * Math.PI) / SPAWN_COUNT;
    let dist = L.spawnDist, y = L.spawnY;
    if (L.pattern === "square") dist += i % 2 ? 3 : -1;
    if (L.pattern === "staggered") { dist += i % 2 ? -4 : 1; y += i % 2 ? 3 : -2; }
    const fx = Math.cos(a), fz = Math.sin(a), rx = -fz, rz = fx;
    const x = Math.round(fx * dist), z = Math.round(fz * dist);
    const surf = island(b, rng, isl, x, y, z, 6, 7);
    // La estructura del lado de adentro, un árbol a un costado y dos cofres del lado de afuera
    SPAWN_STRUCTS[theme.spawn](b, rng, x - Math.round(fx * 4), y, z - Math.round(fz * 4));
    const tx = x + Math.round(rx * 4), tz = z + Math.round(rz * 4);
    if (b.get(tx, y, tz)?.id === theme.surface && !b.has(tx, y + 1, tz)) tree(b, rng, theme.tree, tx, y, tz);
    for (const s of [1, -1]) {
      const cx = x + Math.round(fx * 3 + rx * 2 * s), cz = z + Math.round(fz * 3 + rz * 2 * s);
      b.set(cx, y, cz, theme.sub);
      b.set(cx, y + 1, cz, "chest");
      chests.push({ x: cx, y: y + 1, z: cz, kind: "spawn", island: i });
    }
    hangUnder(b, rng, surf, y, theme.hang, 4, 3);
    decorate(b, rng, theme, surf, y, 0.14, chests.concat([{ x, z }]));
    spawns.push({ x, y: y + 1, z, team: i < SPAWN_COUNT / 2 ? "red" : "blue" });
  }

  // --- Rocas flotantes decorativas entre las islas ---
  for (let k = 0; k < 8; k++) {
    const a = rot + Math.PI / 8 + (k * 2 * Math.PI) / 8;
    const d = 28 + rng() * 3;
    const x = Math.round(Math.cos(a) * d), z = Math.round(Math.sin(a) * d), y = Math.round(rng() * 10) - 4;
    island(b, rng, isl, x, y, z, 1.6, 2);
    if (rng() < 0.5) b.setIfAir(x, y + 1, z, theme.light === "lantern" ? "lantern" : theme.deco[0] ?? theme.light);
  }

  // Despejar el espacio de las jaulas (incluida la caída hasta la isla) y encima de cada cofre,
  // por si un árbol, estructura o decoración quedó encima.
  for (const sp of spawns)
    for (let dy = 0; dy <= 5; dy++) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++)
      b.del(sp.x + dx, sp.y + dy, sp.z + dz);
  for (const ch of chests) b.del(ch.x, ch.y + 1, ch.z);

  // Puntos seguros de la isla central para la muerte súbita
  const safe = [];
  for (const p of centerSurface) {
    const d = Math.hypot(p.x, p.z);
    if (d < 6 || d > 10) continue;
    const ground = b.get(p.x, cy, p.z);
    if (!ground || ["water", "chest"].includes(ground.id)) continue;
    if (b.has(p.x, cy + 1, p.z) || b.has(p.x, cy + 2, p.z)) continue;
    safe.push({ x: p.x, y: cy + 1, z: p.z });
  }

  return { theme, index, blocks: b.list(), spawns, chests, safe, center: { x: 0, y: cy + 1, z: 0 } };
}
