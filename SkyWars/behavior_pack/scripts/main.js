// SkyWars Rotativo · Creado por JenierMods OFC
// Fases de la partida: lobby → construyendo → cuenta atrás (jaulas) → jugando → final → lobby
// En el lobby: portal + sala de espera (cola), aldeanos (kits, mapas, estadísticas, ajustes),
// parkour con créditos, tiro con arco, laberinto, trampolines y ranking.
import * as mc from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { ARENA, ARENA_BOUNDS, BORDER, THEMES, generateArena } from "./arenas.js";
import { LOBBY, LOBBY_RADIUS, LOBBY_VERSION, generateLobby } from "./lobby.js";
import { fillChest } from "./loot.js";
import { KITS } from "./kits.js";

const { world, system, BlockPermutation, ItemStack } = mc;
const CREDITS = "§fCreado por §a§lJenierMods OFC";

// ---------------------------------------------------------------------------
// Configuración (se guarda en el mundo)
// ---------------------------------------------------------------------------
const MODES = ["Normal (todos contra todos)", "Rojo vs Azul (equipos)"];
const LOOTS = ["Normal", "Extremo"];
const ROTATIONS = ["Secuencial (1 → 10)", "Aleatoria", "Votación de jugadores"];
const DEFAULT_CONFIG = {
  mode: 0, loot: 0, rotation: 0, autoStart: true, minPlayers: 2,
  refill: 120, timeLimit: 10, lobbyWait: 20, kits: true, enabledMaps: THEMES.map(() => true),
};
let config;
function loadConfig() {
  try {
    const raw = world.getDynamicProperty("sw:config");
    if (typeof raw === "string") return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_CONFIG };
}
function saveConfig() { world.setDynamicProperty("sw:config", JSON.stringify(config)); }

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------
const S = {
  ready: false, setupStarted: false,
  phase: "lobby",        // lobby | building | countdown | playing | ending
  arena: null,
  votes: new Map(),      // nombreJugador -> índice de mapa
  lobbyTimer: -1, countdown: 0, time: 0, nextRefill: 0, suddenDeath: false, startCount: 0,
  lastHit: new Map(),    // id víctima -> { name, tick }
  spawnOf: new Map(),    // id jugador -> isla de aparición
  parkour: new Map(),    // id -> { start, cp }
  maze: new Map(),       // id -> inicio (tick)
  archery: new Map(),    // id -> aciertos de la sesión
  sneak: new Map(),      // id -> ticks agachado (espectadores / parkour)
  lookUp: new Map(),     // id -> ticks mirando hacia arriba (espectadores)
  fountain: new Map(),   // id -> ticks dentro de la fuente
  forced: false,
  menuCooldown: new Map(),
  holo: new Map(),       // id holograma -> entidad
};
const T = {
  playing: "sw_playing", dead: "sw_dead", red: "sw_red", blue: "sw_blue",
  queue: "sw_queue", admin: "sw_admin", npc: "sw_npc", arch: "sw_arch",
};

const overworld = () => world.getDimension("overworld");
let lobbyData = null;
const Z = () => (lobbyData ??= generateLobby()).zones;

function cmd(target, command) {
  try { if (target.runCommand) return target.runCommand(command); } catch {}
  try { return target.runCommandAsync?.(command); } catch {}
}
function say(msg) { world.sendMessage(`§l§6[SkyWars]§r ${msg}`); }
function title(p, t, sub = "", stay = 40) {
  try { p.onScreenDisplay.setTitle(t, { subtitle: sub, fadeInDuration: 5, stayDuration: stay, fadeOutDuration: 10 }); }
  catch { cmd(p, `title @s title ${t}`); }
}
function actionbar(p, text) { try { p.onScreenDisplay.setActionBar(text); } catch {} }
function sound(p, id, pitch = 1) { cmd(p, `playsound ${id} @s ~ ~ ~ 1 ${pitch}`); }
const abs = (rel) => ({ x: ARENA.x + rel.x, y: ARENA.y + rel.y, z: ARENA.z + rel.z });
const labs = (rel) => ({ x: LOBBY.x + rel.x, y: LOBBY.y + rel.y, z: LOBBY.z + rel.z });
function valid(p) { try { return p.isValid(); } catch { return true; } }
function each(list, fn) { for (const p of list) { try { if (valid(p)) fn(p); } catch (e) { console.warn(`[SkyWars] ${e}`); } } }
const players = () => world.getPlayers();
const playing = () => players().filter((p) => p.hasTag(T.playing));
const queued = () => players().filter((p) => p.hasTag(T.queue));
const inGame = (p) => p.hasTag(T.playing) || p.hasTag(T.dead);
function teamOf(p) { return p.hasTag(T.red) ? "red" : p.hasTag(T.blue) ? "blue" : null; }
function isAdmin(p) {
  const admins = players().filter((x) => x.hasTag(T.admin));
  return admins.length === 0 || p.hasTag(T.admin);
}
function getProp(p, k, d = 0) { try { return p.getDynamicProperty(k) ?? d; } catch { return d; } }
function setProp(p, k, v) { try { p.setDynamicProperty(k, v); } catch {} }
function addProp(p, k, n = 1) { setProp(p, k, getProp(p, k) + n); }
function fmtTime(ticks) { const s = ticks / 20; return `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`; }
function fmt(sec) { const m = Math.floor(sec / 60), s = sec % 60; return `${m}:${String(s).padStart(2, "0")}`; }
function inv(p) { return p.getComponent("minecraft:inventory").container; }

// ---------------------------------------------------------------------------
// Tareas repartidas en varios ticks (sin congelar el juego)
// ---------------------------------------------------------------------------
function runTasks(tasks, perTick, onDone) {
  let i = 0;
  const id = system.runInterval(() => {
    const end = Math.min(i + perTick, tasks.length);
    for (; i < end; i++) { try { tasks[i](); } catch {} }
    if (i >= tasks.length) {
      system.clearRun(id);
      try { onDone?.(); } catch (e) { console.warn(`[SkyWars] ${e}`); }
    }
  }, 1);
}

// IDs alternativos para versiones del juego con nombres de bloque antiguos.
const FALLBACK = {
  purpur_pillar: ["purpur_block", { chisel_type: "lines" }],
  dark_prismarine: ["prismarine", { prismarine_block_type: "dark" }],
  prismarine_bricks: ["prismarine", { prismarine_block_type: "bricks" }],
  cut_sandstone: ["sandstone", { sand_stone_type: "cut" }],
  chiseled_sandstone: ["sandstone", { sand_stone_type: "heiroglyphs" }],
  smooth_sandstone: ["sandstone", { sand_stone_type: "smooth" }],
  sandstone_wall: ["cobblestone_wall", { wall_block_type: "sandstone" }],
  stone_bricks: ["stonebrick", { stone_brick_type: "default" }],
  mossy_stone_bricks: ["stonebrick", { stone_brick_type: "mossy" }],
  cracked_stone_bricks: ["stonebrick", { stone_brick_type: "cracked" }],
  chiseled_stone_bricks: ["stonebrick", { stone_brick_type: "chiseled" }],
  polished_andesite: ["stone", { stone_type: "andesite_smooth" }],
  smooth_quartz: ["quartz_block", { chisel_type: "smooth" }],
  quartz_pillar: ["quartz_block", { chisel_type: "lines" }],
  grass_path: ["dirt_path"],
  dandelion: ["yellow_flower"], poppy: ["red_flower"],
  azure_bluet: ["red_flower", { flower_type: "houstonia" }],
  oxeye_daisy: ["red_flower", { flower_type: "oxeye" }],
  cornflower: ["red_flower", { flower_type: "cornflower" }],
  short_grass: ["tallgrass", { tall_grass_type: "tall" }],
  fern: ["tallgrass", { tall_grass_type: "fern" }],
  oak_planks: ["planks", { wood_type: "oak" }], spruce_planks: ["planks", { wood_type: "spruce" }],
  dark_oak_planks: ["planks", { wood_type: "dark_oak" }],
  oak_log: ["log", { old_log_type: "oak" }], spruce_log: ["log", { old_log_type: "spruce" }],
  birch_log: ["log", { old_log_type: "birch" }], jungle_log: ["log", { old_log_type: "jungle" }],
  dark_oak_log: ["log2", { new_log_type: "dark_oak" }],
  oak_leaves: ["leaves", { old_leaf_type: "oak", persistent_bit: true }],
  spruce_leaves: ["leaves", { old_leaf_type: "spruce", persistent_bit: true }],
  birch_leaves: ["leaves", { old_leaf_type: "birch", persistent_bit: true }],
  jungle_leaves: ["leaves", { old_leaf_type: "jungle", persistent_bit: true }],
  oak_fence: ["fence", { wood_type: "oak" }], spruce_fence: ["fence", { wood_type: "spruce" }],
  dark_oak_fence: ["fence", { wood_type: "dark_oak" }],
  mushroom_stem: ["brown_mushroom_block", { huge_mushroom_bits: 15 }],
  stripped_spruce_log: ["spruce_log"],
  red_nether_brick: ["nether_brick"],
};
for (const c of ["white", "orange", "magenta", "light_blue", "yellow", "lime", "pink", "gray", "light_gray", "cyan", "purple", "blue", "brown", "green", "red", "black"]) {
  FALLBACK[`${c}_wool`] = ["wool", { color: c === "light_gray" ? "silver" : c }];
  FALLBACK[`${c}_concrete`] = ["concrete", { color: c === "light_gray" ? "silver" : c }];
}

const permCache = new Map();
function resolve(id, states) {
  try { return BlockPermutation.resolve("minecraft:" + id, states); } catch {}
  if (states) try { return BlockPermutation.resolve("minecraft:" + id); } catch {}
  return null;
}
function perm(id, states) {
  const key = id + JSON.stringify(states ?? {});
  if (permCache.has(key)) return permCache.get(key);
  let p = resolve(id, states);
  if (!p && FALLBACK[id]) p = resolve(FALLBACK[id][0], FALLBACK[id][1]);
  permCache.set(key, p);
  return p;
}
function setBlock(pos, id, states) {
  const block = overworld().getBlock(pos);
  const p = perm(id, states);
  if (block && p) block.setPermutation(p);
}

// ---------------------------------------------------------------------------
// Preparación del mundo, lobby, aldeanos y hologramas
// ---------------------------------------------------------------------------
function setupWorld() {
  const d = overworld();
  const r = ARENA_BOUNDS.r + 2, lr = LOBBY_RADIUS + 2;
  // Se quitan y se vuelven a crear: un mundo de la versión 1 tenía un área más chica con el mismo nombre
  cmd(d, "tickingarea remove skywars");
  cmd(d, "tickingarea remove skywars_lobby");
  cmd(d, `tickingarea add ${ARENA.x - r} 0 ${ARENA.z - r} ${ARENA.x + r} 319 ${ARENA.z + r} skywars true`);
  cmd(d, `tickingarea add ${LOBBY.x - lr} 0 ${LOBBY.z - lr} ${LOBBY.x + lr} 319 ${LOBBY.z + lr} skywars_lobby true`);
  for (const g of ["dodaylightcycle false", "doweathercycle false", "domobspawning false", "doimmediaterespawn true",
    "keepinventory false", "showdeathmessages false", "mobgriefing false", "dofiretick false",
    "sendcommandfeedback false", "commandblockoutput false"]) cmd(d, `gamerule ${g}`);
  cmd(d, "time set noon");
  cmd(d, "weather clear");
  cmd(d, "scoreboard objectives add sw_wins dummy §6Victorias");
  cmd(d, "scoreboard objectives add sw_kills dummy §cAsesinatos");
  cmd(d, "scoreboard objectives setdisplay list sw_wins");
  try { world.setDefaultSpawnLocation(labs({ x: Math.floor(Z().spawn.x), y: 1, z: Math.floor(Z().spawn.z) })); } catch {}
}

function lobbyLoaded() {
  const d = overworld();
  try {
    for (const [x, z] of [[0, 0], [-55, -55], [55, 55], [-55, 55], [55, -55]]) if (!d.getBlock(labs({ x, y: 0, z }))) return false;
    for (const [x, z] of [[-60, -60], [60, 60]]) if (!d.getBlock(abs({ x, y: 0, z }))) return false;
  } catch { return false; } // chunk todavía sin cargar
  return true;
}

// Bloques que necesitan que su soporte ya exista (si no, se rompen y sueltan el objeto):
// faroles colgantes, lianas y el portal (necesita el marco completo).
const attached = (b) => b.states?.hanging || b.id === "vine" || b.id === "portal";
function buildOrder(blocks) { return blocks.filter((b) => !attached(b)).concat(blocks.filter(attached)); }

function buildLobbyTasks() {
  const { blocks } = generateLobby();
  const d = overworld();
  const clear = [() => cmd(d, "fill -8 230 -8 8 233 8 air")]; // quita el lobby viejo (estaba encima de la arena)
  // Limpia el área del lobby antes de construir, para que no queden restos de versiones anteriores.
  // /fill admite 32.768 bloques: 117*117*2 = 27.378 (se hace uno por tick para no trabar el juego)
  const r = LOBBY_RADIUS;
  for (let y = LOBBY.y - 20; y <= LOBBY.y + 34; y += 2)
    clear.push(() => cmd(d, `fill ${LOBBY.x - r} ${y} ${LOBBY.z - r} ${LOBBY.x + r} ${y + 1} ${LOBBY.z + r} air`));
  const build = buildOrder(blocks).map((b) => () => setBlock(labs(b), b.id, b.states));
  return { clear, build };
}

function trySetup(retry = false) {
  if (S.ready || (S.setupStarted && !retry)) return;
  S.setupStarted = true;
  config ??= loadConfig();
  if (!retry) setupWorld(); // solo una vez: volver a crear el área de carga la descarga de nuevo
  if (!lobbyLoaded()) { system.runTimeout(() => trySetup(true), 40); return; }
  const finish = () => {
    S.ready = true;
    ensurePortal();
    spawnNpcs();
    spawnHolograms();
    each(players(), sendToLobby);
  };
  if (world.getDynamicProperty("sw:lobbyVersion") === LOBBY_VERSION) { finish(); return; }
  // Mientras se construye, todos esperan flotando encima del lobby
  each(players(), floatAboveLobby);
  const { clear, build } = buildLobbyTasks();
  runTasks(clear, 1, () => runTasks(build, 400, () => {
    world.setDynamicProperty("sw:lobbyVersion", LOBBY_VERSION);
    finish();
    say("¡Lobby listo! " + CREDITS);
  }));
}

// Revisa que el portal esté completo y vuelve a poner los bloques que falten
function ensurePortal() {
  const P = Z().portal;
  for (let x = P.x1 - 1; x <= P.x2 + 1; x++) for (let y = P.y1 - 1; y <= P.y2 + 1; y++) {
    const frame = x < P.x1 || x > P.x2 || y < P.y1 || y > P.y2;
    if (!frame) continue;
    try { const pos = labs({ x, y, z: P.z }); if (overworld().getBlock(pos)?.typeId !== "minecraft:obsidian") setBlock(pos, "obsidian"); } catch {}
  }
  for (let x = P.x1; x <= P.x2; x++) for (let y = P.y1; y <= P.y2; y++) {
    try {
      const pos = labs({ x, y, z: P.z });
      if (overworld().getBlock(pos)?.typeId !== "minecraft:portal") setBlock(pos, "portal", { portal_axis: "x" });
    } catch {}
  }
}

function floatAboveLobby(p) {
  clearTags(p);
  try { p.teleport(labs({ x: 0.5, y: 45, z: 8.5 }), { dimension: overworld() }); } catch {}
  cmd(p, "gamemode adventure @s");
  cmd(p, "effect @s slow_falling 120 0 true");
  cmd(p, "effect @s resistance 120 255 true");
  actionbar(p, "§bConstruyendo el lobby...");
}

function npcEntities(role) {
  try { return overworld().getEntities({ type: "minecraft:villager_v2", tags: [`${T.npc}_${role}`] }); } catch { return []; }
}
function spawnNpcs() {
  for (const n of Z().npcs) {
    const pos = labs({ x: n.x + 0.5, y: n.y, z: n.z + 0.5 });
    const list = npcEntities(n.role);
    for (const extra of list.slice(1)) try { extra.remove(); } catch {}
    let e = list[0];
    if (!e || !valid(e)) {
      try {
        e = overworld().spawnEntity("minecraft:villager_v2", pos);
        try { e.triggerEvent("minecraft:ageable_grow_up"); } catch {}
        try { e.triggerEvent("minecraft:become_unemployed"); } catch {}
        e.addTag(T.npc); e.addTag(`${T.npc}_${n.role}`);
      } catch { continue; }
    }
    try {
      e.nameTag = n.name;
      e.teleport(pos);
      cmd(e, "effect @s slowness 99999 255 true");
      cmd(e, "effect @s resistance 99999 255 true");
      cmd(e, "effect @s instant_health 1 5 true");
    } catch {}
  }
}

function holoText(h) {
  if (!h.dynamic) return h.text;
  switch (h.id) {
    case "queue": {
      const q = queued().length;
      if (S.phase === "lobby") return `§e${q}/8 en la cola` + (S.lobbyTimer >= 0 ? ` §7· empieza en §f${S.lobbyTimer}s` : ` §7· mínimo ${config.minPlayers}`);
      if (S.phase === "building") return `§bPreparando ${S.arena?.theme.name ?? "el mapa"}...`;
      return `§cPartida en curso §7(${S.arena?.theme.name ?? ""})\n§7Entra para mirarla`;
    }
    case "waiting": return `§l§eSala de espera§r\n§f${queued().length}/8 jugadores` + (S.lobbyTimer >= 0 ? `\n§aEmpieza en ${S.lobbyTimer}s` : "");
    case "ranking": {
      const top = topWins(5);
      return "§6§lTOP VICTORIAS§r\n" + (top.length ? top.map((t, i) => `${["§e", "§f", "§6", "§7", "§7"][i]}${i + 1}. ${t.name} §7- §a${t.score}`).join("\n") : "§7¡Aún nadie ha ganado!");
    }
    case "parkour_top": {
      const top = parkourTop();
      return "§6§lMEJORES TIEMPOS§r\n" + (top.length ? top.slice(0, 5).map((t, i) => `§f${i + 1}. ${t.name} §7- §b${fmtTime(t.ticks)}`).join("\n") : "§7¡Sé el primero!");
    }
  }
  return h.text;
}
function spawnHolograms() {
  const d = overworld();
  try { for (const e of d.getEntities({ type: "jenier:texto" })) e.remove(); } catch {}
  S.holo.clear();
  for (const h of Z().holograms) {
    try {
      const e = d.spawnEntity("jenier:texto", labs(h));
      e.nameTag = holoText(h);
      S.holo.set(h.id, e);
    } catch (err) { console.warn(`[SkyWars] holograma ${h.id}: ${err}`); }
  }
}
// Vuelve a crear los hologramas que alguien haya borrado (por ejemplo con /kill @e)
function ensureHolograms() {
  for (const h of Z().holograms) {
    const e = S.holo.get(h.id);
    if (e && valid(e)) continue;
    try { const n = overworld().spawnEntity("jenier:texto", labs(h)); n.nameTag = holoText(h); S.holo.set(h.id, n); } catch {}
  }
}
function updateHolograms() {
  for (const h of Z().holograms) {
    if (!h.dynamic) continue;
    const e = S.holo.get(h.id);
    if (!e || !valid(e)) continue;
    try { e.nameTag = holoText(h); } catch {}
  }
}

// ---------------------------------------------------------------------------
// Jugadores en el lobby
// ---------------------------------------------------------------------------
function clearTags(p) { for (const t of [T.playing, T.dead, T.red, T.blue, T.queue, T.arch]) p.removeTag(t); }
function resetActivities(p) { S.parkour.delete(p.id); S.maze.delete(p.id); S.archery.delete(p.id); S.sneak.delete(p.id); }

function lobbyEffects(p) {
  cmd(p, "effect @s clear");
  cmd(p, "effect @s instant_health 1 20 true");
  cmd(p, "effect @s resistance 99999 255 true");
  cmd(p, "effect @s saturation 99999 0 true");
  cmd(p, "effect @s weakness 99999 255 true");
}

function sendToLobby(p) {
  clearTags(p);
  resetActivities(p);
  cmd(p, "gamemode adventure @s");
  cmd(p, "clear @s");
  cmd(p, "xp -1000L @s");
  p.teleport(labs(Z().spawn), { dimension: overworld(), facingLocation: labs({ x: 0.5, y: 2, z: Z().portal.z }) });
  lobbyEffects(p);
}

function joinQueue(p) {
  if (S.phase === "countdown" || S.phase === "playing" || S.phase === "ending") {
    // Partida en curso: el portal lleva a mirarla como espectador
    resetActivities(p);
    cmd(p, "clear @s");
    spectate(p);
    p.sendMessage("§7Estás mirando la partida. §eMira hacia arriba o agáchate 2 segundos§7 para volver al lobby.");
    return;
  }
  if (queued().length >= 8) { p.sendMessage("§cLa cola está llena (8 jugadores)."); bounceFromPortal(p); return; }
  resetActivities(p);
  cmd(p, "clear @s");
  p.addTag(T.queue);
  p.teleport(labs(Z().waiting.spawn), { dimension: overworld(), facingLocation: labs({ x: 0.5, y: 1, z: Z().portal.z }) });
  title(p, "§aEn la cola", `§f${queued().length}/8 · mínimo ${config.minPlayers}`);
  sound(p, "random.orb");
  say(`§b${p.name}§r entró a la cola (§e${queued().length}/8§r)`);
}
function leaveQueue(p) {
  p.removeTag(T.queue);
  sendToLobby(p);
  p.sendMessage("§7Saliste de la cola.");
}
function bounceFromPortal(p) { p.teleport(labs({ x: 0.5, y: 1, z: Z().portal.z + 4.5 }), { dimension: overworld() }); }

function spectate(p) {
  clearTags(p);
  p.addTag(T.dead);
  cmd(p, "gamemode spectator @s");
  const c = abs(S.arena?.center ?? { x: 0, y: 0, z: 0 });
  p.teleport({ x: c.x + 0.5, y: c.y + 18, z: c.z + 0.5 }, { dimension: overworld() });
}

// ---------------------------------------------------------------------------
// Selección de mapa
// ---------------------------------------------------------------------------
function enabledMaps() {
  const list = THEMES.map((_, i) => i).filter((i) => config.enabledMaps[i] !== false);
  return list.length ? list : THEMES.map((_, i) => i);
}
function chooseMap() {
  const maps = enabledMaps();
  if (config.rotation === 2 && S.votes.size) {
    const count = new Map();
    for (const v of S.votes.values()) if (maps.includes(v)) count.set(v, (count.get(v) ?? 0) + 1);
    if (count.size) {
      const best = Math.max(...count.values());
      const tied = [...count.entries()].filter(([, n]) => n === best).map(([i]) => i);
      return tied[Math.floor(Math.random() * tied.length)];
    }
  }
  if (config.rotation === 1 || config.rotation === 2) {
    const last = world.getDynamicProperty("sw:last") ?? -1;
    const pool = maps.length > 1 ? maps.filter((i) => i !== last) : maps;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  const next = world.getDynamicProperty("sw:next") ?? 0;
  for (let k = 0; k < THEMES.length; k++) {
    const i = (next + k) % THEMES.length;
    if (maps.includes(i)) { world.setDynamicProperty("sw:next", (i + 1) % THEMES.length); return i; }
  }
  return maps[0];
}

// ---------------------------------------------------------------------------
// Construcción / limpieza de la arena
// ---------------------------------------------------------------------------
function clearArenaTasks() {
  const { r, yMin, yMax } = ARENA_BOUNDS;
  const tasks = [];
  const x1 = ARENA.x - r, x2 = ARENA.x + r, z1 = ARENA.z - r, z2 = ARENA.z + r;
  const d = overworld();
  // /fill admite 32.768 bloques: 121*121*2 = 29.282
  for (let y = ARENA.y + yMin; y <= ARENA.y + yMax; y += 2) {
    const y2 = Math.min(y + 1, ARENA.y + yMax);
    tasks.push(() => cmd(d, `fill ${x1} ${y} ${z1} ${x2} ${y2} ${z2} air`));
  }
  const box = `x=${x1},y=${ARENA.y + yMin - 40},z=${z1},dx=${2 * r},dy=${yMax - yMin + 40},dz=${2 * r}`;
  tasks.push(() => cmd(d, `kill @e[type=!player,${box}]`));
  return tasks;
}
function buildArenaTasks(arena) { return buildOrder(arena.blocks).map((b) => () => setBlock(abs(b), b.id, b.states)); }
function cageBlocks(spawn, team) {
  const out = [];
  const fy = spawn.y + 2;
  const floor = config.mode === 1 ? (team === "red" ? "red_wool" : "blue_wool") : "glass";
  out.push([{ x: spawn.x, y: fy, z: spawn.z }, floor]);
  for (let dy = 1; dy <= 3; dy++) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++)
    if (dx || dz || dy === 3) out.push([{ x: spawn.x + dx, y: fy + dy, z: spawn.z + dz }, "glass"]);
  return out;
}

// ---------------------------------------------------------------------------
// Flujo de la partida
// ---------------------------------------------------------------------------
// Si solo hay una persona en el mundo, la partida empieza con ella (modo prueba)
const soloTest = () => players().length === 1 && queued().length === 1;
function startGame(by) {
  if (!S.ready || S.phase !== "lobby") return;
  const q = queued();
  const solo = soloTest();
  const min = by || solo ? 1 : config.minPlayers; // un admin puede forzar el inicio (prueba con 1 jugador)
  S.forced = !!by || solo;
  if (q.length < min) { by?.sendMessage(`§cHace falta al menos ${min} jugador(es) en la cola. Entra al portal.`); return; }
  const index = chooseMap();
  world.setDynamicProperty("sw:last", index);
  S.arena = generateArena(index);
  S.phase = "building";
  S.lobbyTimer = -1;
  S.votes.clear();
  each(q, (p) => title(p, `§b${S.arena.theme.name}`, `§7Mapa ${index + 1} · ${MODES[config.mode]}`));
  say(`Preparando el mapa §b${index + 1}: ${S.arena.theme.name}§r · §e${MODES[config.mode]}§r · Botín §e${LOOTS[config.loot]}`);
  runTasks(clearArenaTasks(), 1, () => runTasks(buildArenaTasks(S.arena), 300, beginCountdown));
}

function beginCountdown() {
  const arena = S.arena;
  const list = queued().sort(() => Math.random() - 0.5);
  if (!S.forced && list.length < 2) {
    // Alguien salió de la cola mientras se construía el mapa: se vuelve a esperar
    S.phase = "lobby";
    S.arena = null;
    each(list, (p) => p.sendMessage("§eUn jugador salió de la cola. Esperando más jugadores..."));
    return;
  }
  const participants = list.slice(0, arena.spawns.length);
  const redSpawns = arena.spawns.filter((s) => s.team === "red");
  const blueSpawns = arena.spawns.filter((s) => s.team === "blue");
  const freeSpawns = [...arena.spawns];
  let i = 0;
  each(participants, (p) => {
    clearTags(p);
    resetActivities(p);
    let spawn;
    if (config.mode === 1) {
      const team = i++ % 2 === 0 ? "red" : "blue";
      p.addTag(team === "red" ? T.red : T.blue);
      spawn = (team === "red" ? redSpawns : blueSpawns).shift();
    } else spawn = freeSpawns.shift();
    p.addTag(T.playing);
    for (const [pos, id] of cageBlocks(spawn, teamOf(p))) setBlock(abs(pos), id);
    cmd(p, "clear @s");
    cmd(p, "gamemode adventure @s"); // en la jaula no se puede romper el cristal
    cmd(p, "effect @s clear");
    cmd(p, "effect @s instant_health 1 20 true");
    cmd(p, "effect @s saturation 3 20 true");
    const at = abs({ x: spawn.x, y: spawn.y + 3, z: spawn.z });
    p.teleport({ x: at.x + 0.5, y: at.y, z: at.z + 0.5 }, { dimension: overworld(), facingLocation: abs(arena.center) });
    S.spawnOf.set(p.id, spawn);
    addProp(p, "sw:games");
    if (config.mode === 1) title(p, teamOf(p) === "red" ? "§cEquipo ROJO" : "§9Equipo AZUL", "¡Elimina al otro equipo!");
  });
  S.startCount = playing().length;
  S.countdown = 10;
  S.phase = S.startCount ? "countdown" : "lobby";
}

function giveKit(p) {
  if (!config.kits) return;
  const kit = KITS.find((k) => k.id === getProp(p, "sw:kit", "ninguno"));
  if (!kit || !kit.items.length) return;
  for (const [id, n] of kit.items) try { inv(p).addItem(new ItemStack(id, n)); } catch {}
  p.sendMessage(`§7Kit §e${kit.name}§7 entregado.`);
}

function openCages() {
  for (const s of S.arena.spawns) for (const [pos] of cageBlocks(s, s.team)) setBlock(abs(pos), "air");
  refillChests(true);
  S.phase = "playing";
  S.time = 0;
  S.nextRefill = config.refill;
  S.suddenDeath = false;
  each(playing(), (p) => {
    cmd(p, "gamemode survival @s");
    giveKit(p);
    title(p, "§a¡A luchar!", `Mapa: ${S.arena.theme.name}`);
    sound(p, "random.levelup");
  });
}

function refillChests(first = false) {
  const tier = config.loot === 1 ? "extreme" : "normal";
  const seen = new Set();
  for (const c of S.arena.chests) {
    const pos = abs(c);
    try {
      let block = overworld().getBlock(pos);
      if (!block) continue;
      if (block.typeId !== "minecraft:chest") { setBlock(pos, "chest"); block = overworld().getBlock(pos); }
      const guaranteed = first && c.kind === "spawn" && !seen.has(c.island);
      if (c.kind === "spawn") seen.add(c.island);
      fillChest(block.getComponent("minecraft:inventory").container, c.kind, tier, guaranteed, c.secret);
    } catch {}
  }
  if (!first) each(players().filter(inGame), (p) => { title(p, "", "§e¡Cofres rellenados!", 30); sound(p, "random.chestopen"); });
}

function eliminate(victim, killerName) {
  if (!victim.hasTag(T.playing)) return;
  victim.removeTag(T.playing);
  victim.addTag(T.dead);
  addProp(victim, "sw:deaths");
  const left = playing().length;
  const msg = killerName ? `§c${victim.name}§r fue eliminado por §a${killerName}§r. Quedan §e${left}` : `§c${victim.name}§r cayó. Quedan §e${left}`;
  each(players().filter(inGame), (p) => p.sendMessage(`§l§6[SkyWars]§r ${msg}`));
  if (killerName) {
    cmd(overworld(), `scoreboard players add "${killerName}" sw_kills 1`);
    const killer = players().find((p) => p.name === killerName);
    if (killer) { sound(killer, "random.orb", 1.4); actionbar(killer, `§a+1 asesinato §7(${victim.name})`); }
  }
  system.run(checkWin);
}

function checkWin() {
  if (S.phase !== "playing") return;
  const alive = playing();
  if (config.mode === 1) {
    const teams = new Set(alive.map(teamOf));
    if (S.startCount === 1 ? alive.length === 0 : teams.size <= 1) endGame(alive, teams.size ? [...teams][0] : null);
  } else if (alive.length <= (S.startCount === 1 ? 0 : 1)) endGame(alive, null);
}

function endGame(winners, team) {
  S.phase = "ending";
  let text;
  if (team) text = team === "red" ? "§c¡Gana el equipo ROJO!" : "§9¡Gana el equipo AZUL!";
  else if (winners.length === 1) text = `§a¡${winners[0].name} gana!`;
  else text = S.startCount === 1 ? "§eFin de la partida de prueba" : "§7Empate";
  each(players().filter(inGame), (p) => title(p, text, `Mapa: ${S.arena?.theme.name ?? ""}`, 80));
  say(`${text} §7(${S.arena?.theme.name ?? ""})`);
  each(winners, (w) => {
    cmd(overworld(), `scoreboard players add "${w.name}" sw_wins 1`);
    cmd(w, "summon fireworks_rocket ~ ~1 ~");
    sound(w, "random.totem");
  });
  system.runTimeout(() => {
    S.phase = "lobby";
    each(players().filter(inGame), sendToLobby);
    S.arena = null;
    say("Partida terminada. ¡Entra al portal para jugar la siguiente en otro mapa!");
    updateHolograms();
  }, 140);
}

// ---------------------------------------------------------------------------
// Ranking y récords
// ---------------------------------------------------------------------------
function topWins(n) {
  try {
    const obj = world.scoreboard.getObjective("sw_wins");
    return obj.getScores().map((s) => ({ name: s.participant.displayName, score: s.score }))
      .filter((s) => s.score > 0 && !/^commands\./.test(s.name)).sort((a, b) => b.score - a.score).slice(0, n);
  } catch { return []; }
}
function parkourTop() {
  try { return JSON.parse(world.getDynamicProperty("sw:pkTop") ?? "[]"); } catch { return []; }
}
function saveParkour(name, ticks) {
  let top = parkourTop();
  const old = top.find((t) => t.name === name);
  if (old && old.ticks <= ticks) return;
  top = top.filter((t) => t.name !== name);
  top.push({ name, ticks });
  top.sort((a, b) => a.ticks - b.ticks);
  world.setDynamicProperty("sw:pkTop", JSON.stringify(top.slice(0, 10)));
}
function score(obj, p) {
  try { return world.scoreboard.getObjective(obj)?.getScore(p.scoreboardIdentity ?? p) ?? 0; } catch { return 0; }
}

// ---------------------------------------------------------------------------
// Actividades del lobby (cada 4 ticks)
// ---------------------------------------------------------------------------
function rel(p) { const l = p.location; return { x: l.x - LOBBY.x, y: l.y - LOBBY.y, z: l.z - LOBBY.z }; }
function lobbyTick(p) {
  const r = rel(p), z = Z();
  const bx = Math.floor(r.x), by = Math.floor(r.y + 0.01), bz = Math.floor(r.z);

  // Caída fuera del lobby
  if (r.y < -20 || Math.hypot(r.x, r.z) > LOBBY_RADIUS + 20) {
    if (p.hasTag(T.queue)) p.teleport(labs(z.waiting.spawn)); else sendToLobby(p);
    return;
  }

  // Sala de espera: bloque verde de salida
  if (p.hasTag(T.queue)) {
    const e = z.waiting.exit;
    if (Math.abs(bx - e.x) <= 1 && Math.abs(bz - e.z) <= 1 && by <= e.y + 1) leaveQueue(p);
    return;
  }

  // Fuente: quien cae al agua vuelve al punto de inicio a los 30 segundos
  const F = z.fountain;
  if (F && Math.hypot(r.x - F.x, r.z - F.z) < F.r && r.y < 1.5) {
    const t = (S.fountain.get(p.id) ?? 0) + 4;
    S.fountain.set(p.id, t);
    const left = Math.ceil((600 - t) / 20);
    actionbar(p, `§bSaliendo de la fuente en §f${left}s`);
    if (t >= 600) { S.fountain.delete(p.id); sendToLobby(p); p.sendMessage("§7¡Fuera de la fuente!"); }
    return;
  } else if (S.fountain.has(p.id)) S.fountain.delete(p.id);

  // Portal
  const P = z.portal;
  if (bz === P.z && bx >= P.x1 && bx <= P.x2 && by >= P.y1 && by <= P.y2) { joinQueue(p); return; }

  // Parkour
  const pk = z.parkour, st = S.parkour.get(p.id);
  if (Math.abs(bx - pk.start.x) <= 1 && Math.abs(bz - pk.start.z) <= 1 && by === pk.start.y) {
    if (!st) { title(p, "§aParkour", "§7¡Llega a la cima! Agáchate para salir", 30); sound(p, "random.orb"); }
    S.parkour.set(p.id, { start: system.currentTick, cp: -1 });
  } else if (st) {
    actionbar(p, `§aParkour §7| §f${fmtTime(system.currentTick - st.start)} §7| punto ${st.cp + 1}/${pk.checkpoints.length} §7| agáchate para salir`);
    pk.checkpoints.forEach((c, i) => {
      if (i > st.cp && bx === c.x && bz === c.z && by === c.y) {
        st.cp = i; sound(p, "random.orb", 1.2); title(p, "", `§ePunto de control ${i + 1}/${pk.checkpoints.length}`, 20);
      }
    });
    const f = pk.finish;
    if (bx >= f.x1 && bx <= f.x2 && bz >= f.z1 && bz <= f.z2 && by >= f.y) {
      const t = system.currentTick - st.start;
      S.parkour.delete(p.id);
      const best = getProp(p, "sw:pkBest", 0);
      const record = !best || t < best;
      if (record) setProp(p, "sw:pkBest", t);
      saveParkour(p.name, t);
      title(p, "§a§l¡Parkour completado!", `§f${fmtTime(t)}${record ? " §6¡Récord!" : ""} §7· ${CREDITS}`, 100);
      p.sendMessage(`§a¡Completaste el parkour en §f${fmtTime(t)}§a! ${CREDITS}`);
      cmd(p, "summon fireworks_rocket ~ ~1 ~");
      sound(p, "random.levelup");
      updateHolograms();
    } else {
      const back = st.cp >= 0 ? pk.checkpoints[st.cp] : pk.start;
      if (r.y < back.y - 3) p.teleport(labs({ x: back.x + 0.5, y: back.y, z: back.z + 0.5 }));
      else if (Math.hypot(r.x - 27, r.z) > 14 && r.y < 3) S.parkour.delete(p.id); // se fue caminando
    }
  }

  // Tiro con arco
  const A = z.archery;
  const inArch = bx >= A.x1 && bx <= A.x2 && bz >= A.z1 && bz <= A.z2 && by >= A.y1 && by <= A.y2;
  if (inArch && !p.hasTag(T.arch)) {
    p.addTag(T.arch);
    S.archery.set(p.id, 0);
    try {
      inv(p).setItem(0, new ItemStack("minecraft:bow", 1));
      inv(p).setItem(8, new ItemStack("minecraft:arrow", 64));
    } catch {}
    actionbar(p, "§6¡Dispara a las dianas!");
  } else if (!inArch && p.hasTag(T.arch)) {
    p.removeTag(T.arch);
    cmd(p, "clear @s bow"); cmd(p, "clear @s arrow");
    const hits = S.archery.get(p.id) ?? 0;
    if (hits) p.sendMessage(`§6Tiro con arco: §f${hits} dianas§6. Tu mejor marca: §f${getProp(p, "sw:archBest")}`);
    S.archery.delete(p.id);
  } else if (inArch) {
    try { const it = inv(p).getItem(8); if (!it || it.amount < 16) inv(p).setItem(8, new ItemStack("minecraft:arrow", 64)); } catch {}
  }

  // Laberinto
  const M = z.maze;
  if (bx === M.entry.x && bz === M.entry.z && !S.maze.has(p.id)) { S.maze.set(p.id, system.currentTick); actionbar(p, "§2¡Encuentra el bloque de oro!"); }
  if (S.maze.has(p.id)) {
    if (bx === M.goal.x && bz === M.goal.z) {
      const t = system.currentTick - S.maze.get(p.id);
      S.maze.delete(p.id);
      const best = getProp(p, "sw:mazeBest", 0);
      if (!best || t < best) setProp(p, "sw:mazeBest", t);
      title(p, "§2§l¡Llegaste al centro!", `§f${fmtTime(t)}`, 60);
      cmd(p, "summon fireworks_rocket ~ ~1 ~");
      sound(p, "random.levelup");
    } else if (Math.abs(bx) > 12 || bz < 14 || bz > 40) S.maze.delete(p.id);
  }
}

// Bucle rápido: lobby, espectadores, vacío y límite del mapa
system.runInterval(() => {
  if (!S.ready) return;
  const limitY = ARENA.y + ARENA_BOUNDS.yMin - 8, topY = ARENA.y + ARENA_BOUNDS.yMax - 4;
  each(players(), (p) => {
    if (p.hasTag(T.playing)) {
      if (S.phase !== "playing" && S.phase !== "countdown") return;
      const l = p.location;
      if (l.y < limitY) {
        if (S.phase === "countdown") {
          const s = S.spawnOf.get(p.id); if (s) p.teleport({ x: ARENA.x + s.x + 0.5, y: ARENA.y + s.y + 3, z: ARENA.z + s.z + 0.5 });
          return;
        }
        try { p.kill(); } catch { cmd(p, "kill @s"); }
        return;
      }
      const dx = l.x - ARENA.x, dz = l.z - ARENA.z, dist = Math.hypot(dx, dz);
      if (dist > BORDER || l.y > topY) {
        const k = dist > BORDER ? (BORDER - 3) / dist : 1;
        p.teleport({ x: ARENA.x + dx * k, y: Math.min(l.y, topY - 2), z: ARENA.z + dz * k });
        actionbar(p, "§c¡Límite del mapa!");
      }
      return;
    }
    try { if (p.dimension.id !== "minecraft:overworld") { sendToLobby(p); return; } } catch {}
    // Agacharse: los espectadores vuelven al lobby; en el parkour se sale del recorrido
    let sneaking = false;
    try { sneaking = p.isSneaking; } catch {}
    const n = sneaking ? (S.sneak.get(p.id) ?? 0) + 4 : 0;
    S.sneak.set(p.id, n);
    if (p.hasTag(T.dead)) {
      let up = false;
      try { up = p.getRotation().x < -80; } catch {}
      const u = up ? (S.lookUp.get(p.id) ?? 0) + 4 : 0;
      S.lookUp.set(p.id, u);
      const m = Math.max(n, u);
      if (m >= 40) { S.lookUp.delete(p.id); sendToLobby(p); p.sendMessage("§7Volviste al lobby."); }
      else if (m > 0) actionbar(p, `§eVolviendo al lobby... ${Math.ceil((40 - m) / 20)}`);
      return;
    }
    if (n >= 20 && S.parkour.has(p.id)) {
      S.parkour.delete(p.id);
      p.teleport(labs({ x: Z().parkour.start.x + 0.5, y: 1, z: Z().parkour.start.z + 2.5 }));
      actionbar(p, "§7Saliste del parkour.");
      S.sneak.set(p.id, -1000);
      return;
    }
    lobbyTick(p);
  });
}, 4);

// Bucle principal (cada segundo)
let holoTimer = 0, npcTimer = 0, arrowTimer = 0;
system.runInterval(() => {
  if (!S.ready) return;
  if (++holoTimer >= 3) { holoTimer = 0; updateHolograms(); }
  if (++npcTimer >= 15) { npcTimer = 0; spawnNpcs(); ensureHolograms(); ensurePortal(); }
  if (++arrowTimer >= 5) {
    arrowTimer = 0;
    const r = LOBBY_RADIUS;
    const box = `x=${LOBBY.x - r},y=${LOBBY.y - 40},z=${LOBBY.z - r},dx=${2 * r},dy=80,dz=${2 * r}`;
    cmd(overworld(), `kill @e[type=arrow,${box}]`);
    cmd(overworld(), `kill @e[type=item,${box}]`);
  }

  if (S.phase === "lobby") {
    const q = queued();
    const solo = soloTest();
    if (config.autoStart && (q.length >= config.minPlayers || solo)) {
      if (S.lobbyTimer < 0) {
        S.lobbyTimer = solo ? Math.min(config.lobbyWait, 10) : config.lobbyWait;
        if (solo) each(q, (p) => p.sendMessage("§eEstás solo en el mundo: §fla partida empieza contigo en §bmodo prueba§f. Termina al morir o con la muerte súbita."));
      }
      S.lobbyTimer--;
      each(q, (p) => {
        actionbar(p, `§eLa partida empieza en §f${S.lobbyTimer}s §7· ${solo ? "§bmodo prueba" : `${q.length}/8 jugadores`}`);
        if (S.lobbyTimer <= 5 && S.lobbyTimer > 0) sound(p, "random.click");
      });
      if (S.lobbyTimer <= 0) startGame();
    } else {
      S.lobbyTimer = -1;
      each(q, (p) => actionbar(p, `§7Esperando jugadores §f${q.length}/${config.minPlayers} §7· bloque verde = salir de la cola`));
    }
    return;
  }
  if (S.phase === "building") {
    each(queued(), (p) => actionbar(p, `§bConstruyendo ${S.arena.theme.name}...`));
    return;
  }
  if (S.phase === "countdown") {
    each(playing(), (p) => {
      title(p, S.countdown <= 3 ? `§c${S.countdown}` : `§e${S.countdown}`, "Las jaulas se abren pronto", 20);
      sound(p, "note.pling", S.countdown <= 3 ? 1.5 : 1);
    });
    if (--S.countdown <= 0) openCages();
    return;
  }
  if (S.phase === "playing") {
    S.time++;
    const limit = config.timeLimit * 60;
    if (S.time >= S.nextRefill && !S.suddenDeath) { refillChests(); S.nextRefill += config.refill; }
    if (!S.suddenDeath && S.time === limit - 60) each(players().filter(inGame), (p) => p.sendMessage("§6¡Falta 1 minuto para la muerte súbita!"));
    if (!S.suddenDeath && S.time >= limit) {
      S.suddenDeath = true;
      each(players().filter(inGame), (p) => title(p, "§4§lMUERTE SÚBITA", "Todos al centro", 40));
      const spots = S.arena.safe.length ? S.arena.safe : [S.arena.center];
      each(playing(), (p) => {
        const s = abs(spots[Math.floor(Math.random() * spots.length)]);
        p.teleport({ x: s.x + 0.5, y: s.y, z: s.z + 0.5 }, { dimension: overworld(), facingLocation: abs(S.arena.center) });
      });
    }
    if (S.suddenDeath && S.time >= limit + 120) { endGame([], null); return; }
    const alive = playing();
    const refillIn = S.nextRefill - S.time;
    each(players().filter(inGame), (p) => {
      const parts = [`§b${S.arena.theme.name}`, `§fVivos: §a${alive.length}`, `§fTiempo: §e${fmt(S.time)}`];
      parts.push(S.suddenDeath ? "§4MUERTE SÚBITA" : `§fCofres: §6${fmt(Math.max(0, refillIn))}`);
      if (config.mode === 1) parts.push(`§c${alive.filter((x) => x.hasTag(T.red)).length} §7vs §9${alive.filter((x) => x.hasTag(T.blue)).length}`);
      if (p.hasTag(T.dead)) parts.push("§7Mira arriba o agáchate para salir");
      actionbar(p, parts.join(" §7| "));
    });
    checkWin();
  }
}, 20);

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------
world.afterEvents.entityHurt.subscribe((ev) => {
  const victim = ev.hurtEntity;
  if (victim.typeId !== "minecraft:player") return;
  const attacker = ev.damageSource?.damagingEntity;
  if (attacker?.typeId !== "minecraft:player" || attacker.id === victim.id) return;
  if (config?.mode === 1 && teamOf(victim) && teamOf(victim) === teamOf(attacker)) {
    try { const h = victim.getComponent("minecraft:health"); h.setCurrentValue(Math.min(h.effectiveMax, h.currentValue + ev.damage)); } catch {}
    return;
  }
  S.lastHit.set(victim.id, { name: attacker.name, tick: system.currentTick });
});

world.afterEvents.entityDie.subscribe((ev) => {
  const victim = ev.deadEntity;
  if (victim.typeId !== "minecraft:player" || !victim.hasTag(T.playing)) return;
  const killer = ev.damageSource?.damagingEntity;
  let killerName = killer?.typeId === "minecraft:player" && killer.id !== victim.id ? killer.name : undefined;
  if (!killerName) {
    const last = S.lastHit.get(victim.id);
    if (last && system.currentTick - last.tick < 200) killerName = last.name; // lo empujaron al vacío
  }
  S.lastHit.delete(victim.id);
  eliminate(victim, killerName);
});

world.afterEvents.playerSpawn.subscribe((ev) => {
  const p = ev.player;
  if (ev.initialSpawn) {
    system.runTimeout(() => each([p], (pl) => title(pl, "§l§bSkyWars Rotativo", CREDITS, 80)), 40);
    if (!S.ready) {
      floatAboveLobby(p);
      system.runTimeout(() => trySetup(), 20);
      return;
    }
    system.runTimeout(() => each([p], sendToLobby), 5);
    return;
  }
  if (p.hasTag(T.dead) && S.arena) system.runTimeout(() => each([p], spectate), 2);
  else if (!p.hasTag(T.playing)) system.runTimeout(() => each([p], sendToLobby), 2);
});

world.afterEvents.playerLeave.subscribe(() => system.runTimeout(checkWin, 2));

// Dianas del tiro con arco
world.afterEvents.projectileHitBlock?.subscribe((ev) => {
  const p = ev.source;
  if (p?.typeId !== "minecraft:player" || !p.hasTag(T.arch)) return;
  let block;
  try { block = ev.getBlockHit().block; } catch { return; }
  if (block?.typeId !== "minecraft:target") return;
  const hits = (S.archery.get(p.id) ?? 0) + 1;
  S.archery.set(p.id, hits);
  if (hits > getProp(p, "sw:archBest")) setProp(p, "sw:archBest", hits);
  actionbar(p, `§6¡Diana! §f${hits} §7(mejor: ${getProp(p, "sw:archBest")})`);
  sound(p, "random.orb", 1.6);
});

// Aldeanos: tocarlos (o golpearlos) abre su menú
function npcRole(entity) {
  try {
    if (entity?.typeId !== "minecraft:villager_v2" || !entity.hasTag(T.npc)) return null;
    return Z().npcs.find((n) => entity.hasTag(`${T.npc}_${n.role}`))?.role ?? null;
  } catch { return null; }
}
function openNpc(p, role) {
  const last = S.menuCooldown.get(p.id) ?? -100;
  if (system.currentTick - last < 10 || inGame(p) || p.hasTag(T.queue)) return;
  S.menuCooldown.set(p.id, system.currentTick);
  sound(p, "mob.villager.haggle");
  ({ kits: kitsMenu, mapas: mapsMenu, stats: statsMenu, ajustes: adminMenu })[role]?.(p);
}
world.beforeEvents.playerInteractWithEntity?.subscribe((ev) => {
  const role = npcRole(ev.target);
  if (!role) return;
  ev.cancel = true;
  const p = ev.player;
  system.run(() => openNpc(p, role));
});
world.afterEvents.playerInteractWithEntity?.subscribe((ev) => {
  const role = npcRole(ev.target);
  if (role) openNpc(ev.player, role);
});
world.afterEvents.entityHitEntity.subscribe((ev) => {
  const role = npcRole(ev.hitEntity);
  if (role && ev.damagingEntity?.typeId === "minecraft:player") openNpc(ev.damagingEntity, role);
});

// ---------------------------------------------------------------------------
// Menús
// ---------------------------------------------------------------------------
function kitsMenu(p) {
  const current = getProp(p, "sw:kit", "ninguno");
  const f = new ActionFormData().title("§l§6Kits").body(
    (config.kits ? "Elige el kit que recibirás al abrir tu jaula.\n" : "§cLos kits están desactivados por un admin.\n") +
    `§7Kit actual: §e${KITS.find((k) => k.id === current)?.name ?? "Sin kit"}`);
  for (const k of KITS) f.button(`${k.id === current ? "§2✔ " : ""}§l${k.name}§r\n§8${k.desc}`, k.icon);
  f.show(p).then((r) => {
    if (r.canceled) return;
    const k = KITS[r.selection];
    setProp(p, "sw:kit", k.id);
    p.sendMessage(`§6Kit seleccionado: §e${k.name}`);
    sound(p, "random.orb");
  }).catch(() => {});
}

const MAP_ICONS = ["textures/blocks/grass_side_carried", "textures/blocks/sand", "textures/blocks/ice_packed", "textures/blocks/netherrack",
  "textures/blocks/end_stone", "textures/blocks/mushroom_block_skin_red", "textures/blocks/log_jungle", "textures/blocks/prismarine_bricks",
  "textures/blocks/cherry_planks", "textures/blocks/amethyst_block"];
function mapsMenu(p) {
  const f = new ActionFormData().title("§l§aMapas y votación")
    .body(`Rotación: §e${ROTATIONS[config.rotation]}§r\n` + (config.rotation === 2 ? "§aToca un mapa para votarlo." : "§7Toca un mapa para ver su descripción. Los votos cuentan cuando la rotación es «Votación»."));
  const maps = enabledMaps();
  for (const i of THEMES.keys()) {
    const votes = [...S.votes.values()].filter((v) => v === i).length;
    const on = maps.includes(i);
    f.button(`${on ? "" : "§8"}§l${i + 1}. ${THEMES[i].name}§r\n${on ? `§8${votes} voto(s)` : "§8desactivado"}`, MAP_ICONS[i]);
  }
  f.show(p).then((r) => {
    if (r.canceled) return;
    const i = r.selection, t = THEMES[i];
    new ActionFormData().title(`§l${t.name}`)
      .body(`§f${t.desc}\n\n§7Mapa ${i + 1} de ${THEMES.length}`)
      .button("§2Votar por este mapa", "textures/items/emerald")
      .button("Volver", "textures/items/arrow")
      .show(p).then((r2) => {
        if (r2.canceled) return;
        if (r2.selection === 1) return mapsMenu(p);
        if (!maps.includes(i)) { p.sendMessage("§cEse mapa está desactivado."); return; }
        if (S.phase !== "lobby") { p.sendMessage("§cSe vota antes de que empiece la partida."); return; }
        S.votes.set(p.name, i);
        say(`§b${p.name}§r votó por §e${t.name}`);
      }).catch(() => {});
  }).catch(() => {});
}

function statsMenu(p) {
  const wins = score("sw_wins", p), kills = score("sw_kills", p), deaths = getProp(p, "sw:deaths"), games = getProp(p, "sw:games");
  const pk = getProp(p, "sw:pkBest"), mz = getProp(p, "sw:mazeBest");
  const top = topWins(10);
  new ActionFormData().title("§l§bEstadísticas")
    .body(
      `§l§f${p.name}§r\n` +
      `§6Victorias: §f${wins}   §cAsesinatos: §f${kills}\n` +
      `§7Muertes: §f${deaths}   §7Partidas: §f${games}\n` +
      `§7K/D: §f${deaths ? (kills / deaths).toFixed(2) : kills}   §7% victorias: §f${games ? Math.round((wins / games) * 100) : 0}%\n` +
      `§aParkour: §f${pk ? fmtTime(pk) : "-"}   §2Laberinto: §f${mz ? fmtTime(mz) : "-"}\n` +
      `§6Mejor racha de dianas: §f${getProp(p, "sw:archBest")}\n\n` +
      `§l§6TOP 10 VICTORIAS§r\n` + (top.length ? top.map((t, i) => `§f${i + 1}. ${t.name} §7- §a${t.score}`).join("\n") : "§7Todavía no hay ganadores."))
    .button("Cerrar", "textures/items/book_normal").show(p).catch(() => {});
}

function adminMenu(p) {
  if (!isAdmin(p)) { p.sendMessage("§cSolo un admin (etiqueta sw_admin) puede cambiar los ajustes."); return; }
  new ActionFormData().title("§l§cAjustes")
    .body(`Modo: §e${MODES[config.mode]}§r\nBotín: §e${LOOTS[config.loot]}§r\nRotación: §e${ROTATIONS[config.rotation]}§r\nKits: §e${config.kits ? "Sí" : "No"}§r\nEn la cola: §e${queued().length}/8§r\nFase: §e${S.phase}`)
    .button("§lConfiguración de la partida", "textures/items/redstone_dust")
    .button("§l§2Forzar inicio", "textures/items/clock_item")
    .button("§l§4Terminar partida actual", "textures/blocks/barrier")
    .button("§lReconstruir lobby", "textures/blocks/stonebrick")
    .show(p).then((r) => {
      if (r.canceled) return;
      if (r.selection === 0) return configMenu(p);
      if (r.selection === 1) {
        if (S.phase !== "lobby") return p.sendMessage("§cYa hay una partida en curso.");
        if (!queued().length) return p.sendMessage("§cNo hay nadie en la cola. Entra al portal primero.");
        return startGame(p);
      }
      if (r.selection === 2) {
        if (S.phase === "playing" || S.phase === "countdown") { S.phase = "playing"; endGame([], null); }
        else p.sendMessage("§7No hay ninguna partida en curso.");
        return;
      }
      if (r.selection === 3) {
        if (S.phase !== "lobby") return p.sendMessage("§cEspera a que termine la partida.");
        world.setDynamicProperty("sw:lobbyVersion", 0);
        S.ready = false; S.setupStarted = false;
        say("§eReconstruyendo el lobby...");
        trySetup();
      }
    }).catch(() => {});
}

function configMenu(p) {
  if (S.phase !== "lobby") { p.sendMessage("§cLa configuración solo se cambia entre partidas."); return; }
  const f = new ModalFormData()
    .title("§lConfiguración de SkyWars")
    .dropdown("Modo de juego", MODES, config.mode)
    .dropdown("Botín de los cofres", LOOTS, config.loot)
    .dropdown("Rotación de mapas", ROTATIONS, config.rotation)
    .toggle("Inicio automático", config.autoStart)
    .toggle("Kits activados", config.kits)
    .slider("Jugadores mínimos", 2, 8, 1, config.minPlayers)
    .slider("Espera antes de empezar (seg)", 10, 60, 5, config.lobbyWait)
    .slider("Recarga de cofres (seg)", 60, 300, 30, config.refill)
    .slider("Tiempo hasta muerte súbita (min)", 5, 20, 1, config.timeLimit);
  THEMES.forEach((t, i) => f.toggle(`Mapa ${i + 1}: ${t.name}`, config.enabledMaps[i] !== false));
  f.show(p).then((r) => {
    if (r.canceled || !r.formValues) return;
    if (S.phase !== "lobby") { p.sendMessage("§cLa partida ya empezó; no se guardó."); return; }
    const v = r.formValues;
    config.mode = v[0]; config.loot = v[1]; config.rotation = v[2]; config.autoStart = v[3]; config.kits = v[4];
    config.minPlayers = v[5]; config.lobbyWait = v[6]; config.refill = v[7]; config.timeLimit = v[8];
    config.enabledMaps = THEMES.map((_, i) => v[9 + i] !== false);
    saveConfig();
    say(`Ajustes guardados · §e${MODES[config.mode]}§r · Botín §e${LOOTS[config.loot]}§r · Rotación §e${ROTATIONS[config.rotation]}`);
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
system.run(() => { if (players().length) trySetup(); });
