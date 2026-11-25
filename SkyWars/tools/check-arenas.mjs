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
    if (!c.buried && at(c.x, c.y + 1, c.z)) err(`cofre tapado en ${c.x},${c.y},${c.z}`);
  }
  for (const s of a.spawns) {
    for (let dy = 0; dy <= 5; dy++) if (at(s.x, s.y + dy, s.z)) err(`columna de la jaula ocupada (${at(s.x, s.y + dy, s.z).id}) en spawn ${s.x},${s.z} dy=${dy}`);
    if (!at(s.x, s.y - 1, s.z)) err(`sin suelo bajo spawn ${s.x},${s.z}`);
  }
  for (const s of a.safe) if (at(s.x, s.y, s.z) || at(s.x, s.y + 1, s.z) || !at(s.x, s.y - 1, s.z)) err("punto seguro inválido");
  // ¿Se puede LLEGAR caminando a cada cofre? (sube 1 bloque, baja hasta 3, necesita 2 de alto)
  const PASS = new Set(["poppy","dandelion","deadbush","crimson_roots","crimson_fungus","brown_mushroom","red_mushroom","fern","short_grass",
    "azure_bluet","pink_petals","amethyst_cluster","snow_layer","vine","lantern","soul_lantern","end_rod","water","glass_pane","iron_bars"]);
  const solid = (x, y, z) => { const bl = at(x, y, z); return bl && !PASS.has(bl.id); };
  const free = (x, y, z) => !solid(x, y, z) && (!at(x, y, z) || PASS.has(at(x, y, z).id)) && at(x, y, z)?.id !== "glass_pane" && at(x, y, z)?.id !== "iron_bars";
  const standable = (x, y, z) => free(x, y, z) && free(x, y + 1, z) && solid(x, y - 1, z) && !["chest"].includes(at(x, y - 1, z)?.id ?? "");
  const reach = (sx, sy, sz, limit) => {
    const seen = new Set([`${sx},${sy},${sz}`]), q = [[sx, sy, sz]];
    while (q.length) {
      const [x, y, z] = q.shift();
      for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) for (let ny = y + 1; ny >= y - 3; ny--) {
        const nx = x + dx, nz = z + dz, k = `${nx},${ny},${nz}`;
        if (seen.has(k) || Math.hypot(nx - sx, nz - sz) > limit) continue;
        if (!standable(nx, ny, nz)) continue;
        if (ny === y + 1 && !free(x, y + 2, z)) continue; // espacio para saltar
        if (ny < y && !(free(nx, y, nz) && free(nx, y + 1, nz))) continue; // pasar por encima del borde
        seen.add(k); q.push([nx, ny, nz]); break;
      }
    }
    return seen;
  };
  const canOpen = (seen, c) => [[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dz]) => [c.y - 1, c.y, c.y + 1].some((yy) => seen.has(`${c.x + dx},${yy},${c.z + dz}`)));
  for (const s of a.spawns) {
    const seen = reach(s.x, s.y, s.z, 11);
    const mine = a.chests.filter((c) => c.kind === "spawn" && Math.hypot(c.x - s.x, c.z - s.z) < 10);
    if (mine.length !== 3) err(`la isla ${s.x},${s.z} tiene ${mine.length} cofres (deben ser 3)`);
    for (const c of mine) if (!canOpen(seen, c)) err(`desde la jaula ${s.x},${s.z} no se llega al cofre de ${c.where} (${c.x},${c.y},${c.z})`);
  }
  {
    const sp = a.safe[0];
    const seen = reach(sp.x, sp.y, sp.z, 30);
    for (const c of a.chests.filter((c) => c.kind === "center" && !c.secret)) if (!canOpen(seen, c)) err(`no se llega al cofre del salón ${c.x},${c.y},${c.z}`);
    const tunnelChests = a.chests.filter((c) => c.where === "túnel");
    for (const c of tunnelChests) { const s2 = reach(c.x + (c.x < 0 ? 1 : 0), c.y, c.z + 1, 25); if (s2.size < 10) err(`túnel sin espacio para caminar cerca de ${c.x},${c.y},${c.z}`); }
  }
  const islands = new Set(a.chests.filter(c=>c.kind==="spawn").map(c=>c.island));
  console.log(`${a.theme.name.padEnd(12)} bloques=${a.blocks.length} cofres=${a.chests.length} islasConCofre=${islands.size}/8 seguros=${a.safe.length} radio=${maxR} y=${minY}..${maxY}`);
}
console.log(problems ? `${problems} problemas` : "Sin problemas");
