// Verifica que las 10 arenas no tengan errores de construcción (arena sin soporte,
// cofres tapados, jaulas ocupadas, bloques fuera del área, etc.). Uso: node tools/check-arenas.mjs
import { generateArena, THEMES, ARENA_BOUNDS, BORDER } from "../behavior_pack/scripts/arenas.js";
const GRAVITY = new Set(["sand", "gravel"]);
const NEEDS_SUPPORT = new Set(["poppy","dandelion","deadbush","crimson_roots","crimson_fungus","brown_mushroom","red_mushroom","fern","short_grass","azure_bluet","pink_petals","amethyst_cluster","cactus","chest","lantern","soul_lantern","end_rod","snow_layer","carved_pumpkin"]);
let problems = 0;
for (let i = 0; i < THEMES.length; i++) {
  const a = generateArena(i);
  const m = new Map(a.blocks.map((b) => [`${b.x},${b.y},${b.z}`, b]));
  const at = (x, y, z) => m.get(`${x},${y},${z}`);
  const err = (msg) => { problems++; console.log(`[${a.theme.name}] ${msg}`); };
  let maxR = 0, minY = 1e9, maxY = -1e9;
  for (const b of a.blocks) {
    maxR = Math.max(maxR, Math.abs(b.x), Math.abs(b.z)); minY = Math.min(minY, b.y); maxY = Math.max(maxY, b.y);
    if (GRAVITY.has(b.id) && !at(b.x, b.y - 1, b.z)) err(`arena sin soporte en ${b.x},${b.y},${b.z}`);
    const hanging = b.states?.hanging && at(b.x, b.y + 1, b.z);
    if (NEEDS_SUPPORT.has(b.id) && b.id !== "cactus" && !hanging && !at(b.x, b.y - 1, b.z)) err(`${b.id} flotando en ${b.x},${b.y},${b.z}`);
    if (b.id === "cactus") {
      const below = at(b.x, b.y - 1, b.z)?.id;
      if (below !== "sand" && below !== "cactus") err(`cactus sin arena debajo`);
      for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) { const n = at(b.x+dx, b.y, b.z+dz); if (n && !["deadbush"].includes(n.id)) err(`cactus junto a ${n.id}`); }
    }
    if (b.id === "water") for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) if (!at(b.x+dx,b.y,b.z+dz)) err("agua puede derramarse");
  }
  if (maxR > ARENA_BOUNDS.r || maxR > BORDER) err(`bloques fuera del área (${maxR})`);
  if (minY < ARENA_BOUNDS.yMin || maxY > ARENA_BOUNDS.yMax) err(`altura fuera del área ${minY}..${maxY}`);
  for (const b of a.blocks) if (b.id === "vine") {
    const bits = b.states?.vine_direction_bits ?? 0, dirs = [[1, [0,0,1]], [2, [-1,0,0]], [4, [0,0,-1]], [8, [1,0,0]]];
    const ok = dirs.some(([bit, [dx,,dz]]) => (bits & bit) && at(b.x+dx, b.y, b.z+dz));
    if (!ok) err(`liana sin soporte en ${b.x},${b.y},${b.z}`);
  }
  for (const c of a.chests) {
    for (const d of a.chests) if (c !== d && c.y === d.y && Math.abs(c.x-d.x) + Math.abs(c.z-d.z) === 1) err(`cofres juntos (se unen en uno doble) en ${c.x},${c.z}`);
    if (at(c.x, c.y, c.z)?.id !== "chest") err(`cofre sobrescrito en ${c.x},${c.y},${c.z}`);
    if (at(c.x, c.y + 1, c.z)) err(`cofre tapado en ${c.x},${c.y},${c.z}`);
  }
  for (const s of a.spawns) {
    for (let dy = 0; dy <= 5; dy++) if (at(s.x, s.y + dy, s.z)) err(`columna de la jaula ocupada (${at(s.x, s.y + dy, s.z).id}) en spawn ${s.x},${s.z} dy=${dy}`);
    if (!at(s.x, s.y - 1, s.z)) err(`sin suelo bajo spawn ${s.x},${s.z}`);
  }
  for (const s of a.safe) if (at(s.x, s.y, s.z) || at(s.x, s.y + 1, s.z) || !at(s.x, s.y - 1, s.z)) err("punto seguro inválido");
  const islands = new Set(a.chests.filter(c=>c.kind==="spawn").map(c=>c.island));
  console.log(`${a.theme.name.padEnd(12)} bloques=${a.blocks.length} cofres=${a.chests.length} islasConCofre=${islands.size}/8 seguros=${a.safe.length} radio=${maxR} y=${minY}..${maxY}`);
}
console.log(problems ? `${problems} problemas` : "Sin problemas");
