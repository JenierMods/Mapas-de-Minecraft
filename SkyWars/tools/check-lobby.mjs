// Verifica el lobby: saltos del parkour posibles, espacio libre sobre cada salto,
// portal completo, aldeanos encerrados, laberinto con salida, etc. Uso: node tools/check-lobby.mjs
import { generateLobby, LOBBY_RADIUS } from "../behavior_pack/scripts/lobby.js";
const { blocks, zones } = generateLobby();
const m = new Map(blocks.map((b) => [`${b.x},${b.y},${b.z}`, b]));
const at = (x, y, z) => m.get(`${x},${y},${z}`);
let problems = 0;
const err = (msg) => { problems++; console.log("✘", msg); };

// Parkour
const pk = zones.parkour;
let prev = { ...pk.start };
for (const j of pk.jumps) {
  if (!at(j.x, j.y - 1, j.z)) err(`falta el bloque del salto ${j.x},${j.y},${j.z}`);
  for (let h = 0; h <= 2; h++) if (at(j.x, j.y + h, j.z)) err(`salto ${j.x},${j.y},${j.z} sin espacio para la cabeza (${at(j.x, j.y + h, j.z).id})`);
  const d = Math.hypot(j.x - prev.x, j.z - prev.z), dy = j.y - prev.y;
  if (dy > 1) err(`salto de ${dy} bloques de alto`);
  if (d > (dy > 0 ? 3.75 : 4.25) || d < 2) err(`salto de distancia ${d.toFixed(2)}`);
  prev = j;
}
const f = pk.finish;
const last = pk.jumps[pk.jumps.length - 1];
if (f.y - last.y > 1) err(`la plataforma final está ${f.y - last.y} bloques más alta que el último salto`);
const edge = Math.max(0, Math.max(f.x1 - last.x, last.x - f.x2)) + Math.max(0, Math.max(f.z1 - last.z, last.z - f.z2));
if (edge > 3) err(`la plataforma final está a ${edge} bloques del último salto`);
console.log(`parkour: ${pk.jumps.length} saltos, ${pk.checkpoints.length} puntos de control, cima a ${f.y} bloques`);

// Portal
const P = zones.portal;
for (let x = P.x1; x <= P.x2; x++) for (let y = P.y1; y <= P.y2; y++) if (at(x, y, P.z)?.id !== "portal") err(`portal incompleto en ${x},${y}`);
for (let x = P.x1 - 1; x <= P.x2 + 1; x++) for (const y of [P.y1 - 1, P.y2 + 1]) if (!["obsidian", "crying_obsidian"].includes(at(x, y, P.z)?.id)) err("marco del portal incompleto");

// Aldeanos: espacio libre y cerco
for (const n of zones.npcs) {
  if (at(n.x, n.y, n.z) || at(n.x, n.y + 1, n.z)) err(`aldeano ${n.role} sin espacio`);
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if ((dx || dz) && !at(n.x + dx, n.y, n.z + dz)) err(`cerco del aldeano ${n.role} abierto`);
}

// Sala de espera cerrada
const ws = zones.waiting.spawn;
if (at(Math.floor(ws.x), 1, Math.floor(ws.z))) err("punto de la sala de espera ocupado");

// Laberinto: hay camino de la entrada a la meta
const { entry, goal } = zones.maze;
const seen = new Set([`${entry.x},${entry.z}`]); const q = [[entry.x, entry.z]]; let ok = false;
while (q.length) {
  const [x, z] = q.shift();
  if (x === goal.x && z === goal.z) { ok = true; break; }
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const k = `${x + dx},${z + dz}`;
    if (seen.has(k) || at(x + dx, 1, z + dz) || !at(x + dx, 0, z + dz) || Math.abs(dz + z - 26) > 12) continue;
    seen.add(k); q.push([x + dx, z + dz]);
  }
}
if (!ok) err("el laberinto no tiene salida hacia la meta");

// Campo de tiro despejado (solo el suelo)
const A = zones.archery;
for (let x = A.x1; x <= A.x2; x++) for (let z = A.z1; z <= A.z2; z++) for (let y = 1; y <= 3; y++) if (at(x, y, z)) err(`obstáculo en el campo de tiro: ${at(x, y, z).id} en ${x},${y},${z}`);
// Trampolines: slime en el suelo
for (const sx of [-21, 21]) if (at(sx, 0, 17)?.id !== "slime") err("falta el slime del trampolín");
// Hologramas sin bloques encima de su posición
for (const h of zones.holograms) if (at(Math.floor(h.x), Math.floor(h.y), Math.floor(h.z))) err(`holograma ${h.id} dentro de un bloque`);
// Spawn libre y dentro del área
const s = zones.spawn;
if (at(Math.floor(s.x), 1, Math.floor(s.z)) || at(Math.floor(s.x), 2, Math.floor(s.z))) err("spawn ocupado");
const maxR = Math.max(...blocks.map((b) => Math.max(Math.abs(b.x), Math.abs(b.z))));
if (maxR > LOBBY_RADIUS) err(`bloques fuera del área cargada (${maxR} > ${LOBBY_RADIUS})`);
console.log(`lobby: ${blocks.length} bloques, radio ${maxR}, ${zones.holograms.length} hologramas`);
console.log(problems ? `${problems} problemas` : "Sin problemas");
