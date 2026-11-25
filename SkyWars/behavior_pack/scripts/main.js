// SkyWars Rotativo — lógica principal.
// Fases: lobby → construyendo → cuenta atrás (jaulas) → jugando → final → lobby
import * as mc from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { ARENA, ARENA_BOUNDS, BORDER, LOBBY, THEMES, generateArena } from "./arenas.js";
import { fillChest } from "./loot.js";

const { world, system, BlockPermutation, ItemStack } = mc;

// ---------------------------------------------------------------------------
// Configuración (se guarda en el mundo)
// ---------------------------------------------------------------------------
const MODES = ["Normal (todos contra todos)", "Rojo vs Azul (equipos)"];
const LOOTS = ["Normal", "Extremo"];
const ROTATIONS = ["Secuencial (1 → 10)", "Aleatoria", "Votación de jugadores"];
const DEFAULT_CONFIG = {
  mode: 0, loot: 0, rotation: 0, autoStart: true, minPlayers: 2,
  refill: 120, timeLimit: 10, lobbyWait: 20, enabledMaps: THEMES.map(() => true),
};

function loadConfig() {
  try {
    const raw = world.getDynamicProperty("sw:config");
    if (typeof raw === "string") return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_CONFIG };
}
function saveConfig() { world.setDynamicProperty("sw:config", JSON.stringify(config)); }

let config;

// ---------------------------------------------------------------------------
// Estado de la partida
// ---------------------------------------------------------------------------
const S = {
  ready: false,          // lobby construido y área de carga lista
  phase: "lobby",        // lobby | building | countdown | playing | ending
  arena: null,           // resultado de generateArena
  nextIndex: 0,
  votes: new Map(),      // nombreJugador -> índice de mapa
  lobbyTimer: -1,
  countdown: 0,
  time: 0,
  nextRefill: 0,
  suddenDeath: false,
  lastHit: new Map(),    // id víctima -> { name, tick }
  spawnOf: new Map(),    // id jugador -> isla de aparición
  setupStarted: false,
};

const overworld = () => world.getDimension("overworld");
const T = { playing: "sw_playing", dead: "sw_dead", red: "sw_red", blue: "sw_blue", admin: "sw_admin" };

function cmd(target, command) {
  try { if (target.runCommand) return target.runCommand(command); } catch {}
  try { return target.runCommandAsync?.(command); } catch {}
}
function say(msg) { world.sendMessage(`§l§6[SkyWars]§r ${msg}`); }
function title(p, t, sub = "") {
  try { p.onScreenDisplay.setTitle(t, { subtitle: sub, fadeInDuration: 5, stayDuration: 40, fadeOutDuration: 10 }); }
  catch { cmd(p, `title @s title ${t}`); }
}
function actionbar(p, text) {
  try { p.onScreenDisplay.setActionBar(text); } catch {}
}
function abs(rel) { return { x: ARENA.x + rel.x, y: ARENA.y + rel.y, z: ARENA.z + rel.z }; }
function playing() { return world.getPlayers().filter((p) => p.hasTag(T.playing)); }
function teamOf(p) { return p.hasTag(T.red) ? "red" : p.hasTag(T.blue) ? "blue" : null; }
function valid(p) { try { return p.isValid(); } catch { return true; } }
// Ejecuta fn(p) para cada jugador; si uno falla (p. ej. se desconectó) los demás siguen.
function each(list, fn) { for (const p of list) { try { if (valid(p)) fn(p); } catch (e) { console.warn(`[SkyWars] ${e}`); } } }
function isAdmin(p) {
  const admins = world.getPlayers().filter((x) => x.hasTag(T.admin));
  return admins.length === 0 || p.hasTag(T.admin);
}

// ---------------------------------------------------------------------------
// Cola de tareas repartidas en varios ticks (para no congelar el juego)
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
  dandelion: ["yellow_flower"], poppy: ["red_flower"],
  oak_planks: ["planks", { wood_type: "oak" }],
  red_wool: ["wool", { color: "red" }], blue_wool: ["wool", { color: "blue" }],
  oak_log: ["log", { old_log_type: "oak" }], spruce_log: ["log", { old_log_type: "spruce" }],
  jungle_log: ["log", { old_log_type: "jungle" }], dark_oak_log: ["log2", { new_log_type: "dark_oak" }],
  oak_leaves: ["leaves", { old_leaf_type: "oak", persistent_bit: true }],
  spruce_leaves: ["leaves", { old_leaf_type: "spruce", persistent_bit: true }],
  jungle_leaves: ["leaves", { old_leaf_type: "jungle", persistent_bit: true }],
  fern: ["tallgrass", { tall_grass_type: "fern" }],
  mushroom_stem: ["brown_mushroom_block", { huge_mushroom_bits: 15 }],
  oak_fence: ["fence", { wood_type: "oak" }],
};

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
// Preparación del mundo y del lobby
// ---------------------------------------------------------------------------
function setupWorld() {
  const d = overworld();
  const r = ARENA_BOUNDS.r + 2;
  cmd(d, `tickingarea add ${ARENA.x - r} 0 ${ARENA.z - r} ${ARENA.x + r} 319 ${ARENA.z + r} skywars true`);
  for (const g of ["dodaylightcycle false", "doweathercycle false", "domobspawning false", "doimmediaterespawn true",
    "keepinventory false", "showdeathmessages false", "mobgriefing false"]) cmd(d, `gamerule ${g}`);
  cmd(d, "time set noon");
  cmd(d, "weather clear");
  cmd(d, "scoreboard objectives add sw_wins dummy §6Victorias");
  cmd(d, "scoreboard objectives add sw_kills dummy §cAsesinatos");
  cmd(d, "scoreboard objectives setdisplay list sw_wins");
  try { world.setDefaultSpawnLocation({ x: LOBBY.x, y: LOBBY.y + 1, z: LOBBY.z }); } catch {}
}

function buildLobby() {
  const { x, y, z, r } = LOBBY;
  const tasks = [];
  for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
    const edge = Math.abs(dx) === r || Math.abs(dz) === r;
    const corner = Math.abs(dx) === r && Math.abs(dz) === r;
    tasks.push(() => setBlock({ x: x + dx, y, z: z + dz }, corner ? "sea_lantern" : edge ? "quartz_block" : "glass"));
    if (edge) for (let h = 1; h <= 3; h++) tasks.push(() => setBlock({ x: x + dx, y: y + h, z: z + dz }, h === 1 && !corner ? "glass" : "barrier"));
  }
  // Pequeño techo de luz y carteles de colores en el suelo
  tasks.push(() => setBlock({ x, y, z }, "gold_block"));
  return tasks;
}

function trySetup(retry = false) {
  if (S.ready || (S.setupStarted && !retry)) return;
  S.setupStarted = true;
  config ??= loadConfig();
  const d = overworld();
  setupWorld();
  // Esperar a que el área de carga tenga los chunks listos
  if (!d.getBlock({ x: LOBBY.x, y: LOBBY.y, z: LOBBY.z })) { system.runTimeout(() => trySetup(true), 40); return; }
  runTasks(buildLobby(), 200, () => {
    S.ready = true;
    each(world.getPlayers(), sendToLobby); // incluye jugadores que quedaron con etiquetas de una partida anterior
    say("¡Lobby listo! Usa la §ebrújula§r para abrir el menú.");
  });
}

// ---------------------------------------------------------------------------
// Jugadores
// ---------------------------------------------------------------------------
function clearTags(p) { for (const t of [T.playing, T.dead, T.red, T.blue]) p.removeTag(t); }

function lobbyItem() {
  const it = new ItemStack("minecraft:compass", 1);
  it.nameTag = "§r§eMenú SkyWars §7(usar)";
  try { it.lockMode = mc.ItemLockMode.slot; } catch {}
  return it;
}

function sendToLobby(p) {
  clearTags(p);
  cmd(p, "gamemode adventure @s");
  cmd(p, "clear @s");
  cmd(p, "effect @s clear");
  cmd(p, "xp -1000L @s");
  p.teleport({ x: LOBBY.x + 0.5, y: LOBBY.y + 1, z: LOBBY.z + 0.5 }, { dimension: overworld() });
  cmd(p, "effect @s instant_health 1 20 true");
  // En el lobby nadie recibe daño ni pasa hambre (se quita al empezar la partida)
  cmd(p, "effect @s resistance 99999 255 true");
  cmd(p, "effect @s saturation 99999 0 true");
  cmd(p, "effect @s weakness 99999 255 true");
  system.runTimeout(() => {
    try { if (valid(p) && !p.hasTag(T.playing)) p.getComponent("minecraft:inventory").container.setItem(4, lobbyItem()); } catch {}
  }, 2);
}

function spectate(p) {
  clearTags(p);
  p.addTag(T.dead);
  cmd(p, "gamemode spectator @s");
  const c = abs(S.arena?.center ?? { x: 0, y: 0, z: 0 });
  p.teleport({ x: c.x + 0.5, y: c.y + 18, z: c.z + 0.5 }, { dimension: overworld() });
}

// ---------------------------------------------------------------------------
// Selección de mapa (rotación)
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
    // Aleatoria (sin repetir el último mapa si hay más de uno)
    const last = world.getDynamicProperty("sw:last") ?? -1;
    const pool = maps.length > 1 ? maps.filter((i) => i !== last) : maps;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  // Secuencial
  let next = world.getDynamicProperty("sw:next") ?? 0;
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
  // Bloques por comando de /fill: máximo 32.768. 121*121*2 = 29.282
  for (let y = ARENA.y + yMin; y <= ARENA.y + yMax; y += 2) {
    const y2 = Math.min(y + 1, ARENA.y + yMax);
    tasks.push(() => cmd(d, `fill ${x1} ${y} ${z1} ${x2} ${y2} ${z2} air`));
  }
  // Objetos, flechas, TNT, perlas, etc. que quedaron de la partida anterior
  const box = `x=${x1},y=${ARENA.y + yMin - 40},z=${z1},dx=${2 * r},dy=${yMax - yMin + 40},dz=${2 * r}`;
  tasks.push(() => cmd(d, `kill @e[type=!player,${box}]`));
  return tasks;
}

function buildArenaTasks(arena) {
  return arena.blocks.map((b) => () => setBlock(abs(b), b.id, b.states));
}

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
function startGame(by) {
  if (!S.ready || S.phase !== "lobby") return;
  const lobbyPlayers = world.getPlayers();
  const min = Math.max(1, by ? 1 : config.minPlayers); // un admin puede forzar inicio para pruebas
  if (lobbyPlayers.length < min) { by?.sendMessage("§cNo hay suficientes jugadores."); return; }

  const index = chooseMap();
  world.setDynamicProperty("sw:last", index);
  S.arena = generateArena(index);
  S.phase = "building";
  S.lobbyTimer = -1;
  S.votes.clear();
  say(`Preparando el mapa §b${index + 1}: ${S.arena.theme.name}§r · Modo §e${MODES[config.mode]}§r · Botín §e${LOOTS[config.loot]}`);

  runTasks(clearArenaTasks(), 1, () => runTasks(buildArenaTasks(S.arena), 250, beginCountdown));
}

function beginCountdown() {
  const arena = S.arena;
  const players = world.getPlayers().sort(() => Math.random() - 0.5);
  const participants = players.slice(0, arena.spawns.length);
  const extra = players.slice(arena.spawns.length);

  // Reparto de islas: en equipos, rojos usan las 4 primeras y azules las 4 últimas.
  const redSpawns = arena.spawns.filter((s) => s.team === "red");
  const blueSpawns = arena.spawns.filter((s) => s.team === "blue");
  const freeSpawns = [...arena.spawns];
  let i = 0;
  each(participants, (p) => {
    clearTags(p);
    let spawn;
    if (config.mode === 1) {
      const team = i++ % 2 === 0 ? "red" : "blue";
      p.addTag(team === "red" ? T.red : T.blue);
      spawn = (team === "red" ? redSpawns : blueSpawns).shift();
    } else {
      spawn = freeSpawns.shift();
    }
    p.addTag(T.playing);
    for (const [pos, id] of cageBlocks(spawn, teamOf(p))) setBlock(abs(pos), id);
    try { p.getComponent("minecraft:inventory").container.setItem(4, undefined); } catch {} // brújula bloqueada
    cmd(p, "clear @s");
    cmd(p, "gamemode adventure @s"); // en la jaula no se puede romper el cristal
    cmd(p, "effect @s clear");
    cmd(p, "effect @s instant_health 1 20 true");
    cmd(p, "effect @s saturation 3 20 true");
    const at = abs({ x: spawn.x, y: spawn.y + 3, z: spawn.z });
    p.teleport({ x: at.x + 0.5, y: at.y, z: at.z + 0.5 }, { dimension: overworld(), facingLocation: abs(arena.center) });
    S.spawnOf.set(p.id, spawn);
    if (config.mode === 1) title(p, teamOf(p) === "red" ? "§cEquipo ROJO" : "§9Equipo AZUL", "¡Elimina al otro equipo!");
  });
  each(extra, (p) => { spectate(p); p.sendMessage("§7La partida está llena (máx. 8). Estás como espectador."); });

  S.startCount = playing().length; // con 1 jugador (modo prueba) la partida no termina sola
  S.countdown = 10;
  S.phase = S.startCount ? "countdown" : "lobby";
}

function openCages() {
  for (const s of S.arena.spawns) for (const [pos] of cageBlocks(s, s.team)) setBlock(abs(pos), "air");
  refillChests(true);
  S.phase = "playing";
  S.time = 0;
  S.nextRefill = config.refill;
  S.suddenDeath = false;
  each(playing(), (p) => { cmd(p, "gamemode survival @s"); title(p, "§a¡A luchar!", `Mapa: ${S.arena.theme.name}`); });
  cmd(overworld(), "playsound random.levelup @a");
}

function refillChests(first = false) {
  const tier = config.loot === 1 ? "extreme" : "normal";
  const seenSpawnIsland = new Set();
  for (const c of S.arena.chests) {
    const pos = abs(c);
    try {
      let block = overworld().getBlock(pos);
      if (!block) continue;
      if (block.typeId !== "minecraft:chest") { setBlock(pos, "chest"); block = overworld().getBlock(pos); }
      const inv = block.getComponent("minecraft:inventory");
      // El primer cofre de cada isla de aparición trae bloques + espada asegurados
      const guaranteed = first && c.kind === "spawn" && !seenSpawnIsland.has(c.island);
      if (c.kind === "spawn") seenSpawnIsland.add(c.island);
      fillChest(inv.container, c.kind, tier, guaranteed);
    } catch {}
  }
  if (!first) {
    say("§e¡Los cofres se han rellenado!");
    cmd(overworld(), "playsound random.chestopen @a");
  }
}

function eliminate(victim, killerName) {
  if (!victim.hasTag(T.playing)) return;
  victim.removeTag(T.playing);
  victim.addTag(T.dead);
  const left = playing().length;
  if (killerName) {
    say(`§c${victim.name}§r fue eliminado por §a${killerName}§r. Quedan §e${left}`);
    cmd(overworld(), `scoreboard players add "${killerName}" sw_kills 1`);
  } else {
    say(`§c${victim.name}§r fue eliminado. Quedan §e${left}`);
  }
  system.run(checkWin);
}

function checkWin() {
  if (S.phase !== "playing") return;
  const alive = playing();
  if (config.mode === 1) {
    const teams = new Set(alive.map(teamOf));
    if (S.startCount === 1 ? alive.length === 0 : teams.size <= 1) endGame(alive, teams.size ? [...teams][0] : null);
  } else if (alive.length <= (S.startCount === 1 ? 0 : 1)) {
    endGame(alive, null);
  }
}

function endGame(winners, team) {
  S.phase = "ending";
  let text;
  if (team) text = team === "red" ? "§c¡Gana el equipo ROJO!" : "§9¡Gana el equipo AZUL!";
  else if (winners.length === 1) text = `§a¡${winners[0].name} gana!`;
  else text = "§7Empate";
  each(world.getPlayers(), (p) => title(p, text, `Mapa: ${S.arena?.theme.name ?? ""}`));
  say(text);
  for (const w of winners) cmd(overworld(), `scoreboard players add "${w.name}" sw_wins 1`);
  cmd(overworld(), "playsound random.totem @a");
  system.runTimeout(() => {
    S.phase = "lobby";
    each(world.getPlayers(), sendToLobby);
    S.arena = null;
    say("De vuelta al lobby. La siguiente partida usará otro mapa.");
  }, 120);
}

// ---------------------------------------------------------------------------
// Bucle principal (cada segundo)
// ---------------------------------------------------------------------------
function fmt(sec) { const m = Math.floor(sec / 60), s = sec % 60; return `${m}:${String(s).padStart(2, "0")}`; }

system.runInterval(() => {
  if (!S.ready) return;
  const players = world.getPlayers();

  if (S.phase === "lobby") {
    const need = config.minPlayers;
    if (config.autoStart && players.length >= need) {
      if (S.lobbyTimer < 0) S.lobbyTimer = config.lobbyWait;
      S.lobbyTimer--;
      for (const p of players) actionbar(p, `§eLa partida empieza en §f${S.lobbyTimer}s §7· ${players.length}/8 jugadores`);
      if (S.lobbyTimer <= 5 && S.lobbyTimer > 0) cmd(overworld(), "playsound random.click @a");
      if (S.lobbyTimer <= 0) startGame();
    } else {
      S.lobbyTimer = -1;
      for (const p of players) actionbar(p, `§7Esperando jugadores §f${players.length}/${need} §7· usa la §ebrújula§7 para el menú`);
    }
    // Que nadie se caiga del lobby
    each(players, (p) => { if (p.location.y < LOBBY.y - 5) sendToLobby(p); });
    return;
  }

  if (S.phase === "building") {
    for (const p of players) actionbar(p, `§bConstruyendo ${S.arena.theme.name}...`);
    return;
  }

  if (S.phase === "countdown") {
    for (const p of playing()) {
      title(p, S.countdown <= 3 ? `§c${S.countdown}` : `§e${S.countdown}`, "Las jaulas se abren pronto");
    }
    cmd(overworld(), "playsound note.pling @a");
    if (--S.countdown <= 0) openCages();
    return;
  }

  if (S.phase === "playing") {
    S.time++;
    const limit = config.timeLimit * 60;
    if (S.time >= S.nextRefill && !S.suddenDeath) { refillChests(); S.nextRefill += config.refill; }
    if (!S.suddenDeath && S.time === limit - 60) say("§6¡Falta 1 minuto para la muerte súbita!");
    if (!S.suddenDeath && S.time >= limit) {
      S.suddenDeath = true;
      say("§4§l¡MUERTE SÚBITA!§r Todos al centro.");
      const spots = S.arena.safe.length ? [...S.arena.safe].sort(() => Math.random() - 0.5) : [S.arena.center];
      each(playing(), (p) => {
        const s = abs(spots[Math.floor(Math.random() * spots.length)]);
        p.teleport({ x: s.x + 0.5, y: s.y, z: s.z + 0.5 }, { dimension: overworld(), facingLocation: abs(S.arena.center) });
      });
    }
    if (S.suddenDeath && S.time >= limit + 120) { endGame([], null); return; }
    const alive = playing();
    const refillIn = S.nextRefill - S.time;
    each(players, (p) => {
      const parts = [`§b${S.arena.theme.name}`, `§fVivos: §a${alive.length}`, `§fTiempo: §e${fmt(S.time)}`];
      if (!S.suddenDeath) parts.push(`§fRecarga: §6${fmt(Math.max(0, refillIn))}`);
      else parts.push("§4MUERTE SÚBITA");
      if (config.mode === 1) {
        const r = alive.filter((x) => x.hasTag(T.red)).length, b = alive.filter((x) => x.hasTag(T.blue)).length;
        parts.push(`§c${r} §7vs §9${b}`);
      }
      actionbar(p, parts.join(" §7| "));
    });
    checkWin();
  }
}, 20);

// Caída al vacío (más rápido que el bucle principal)
system.runInterval(() => {
  if (S.phase !== "playing" && S.phase !== "countdown") return;
  const limitY = ARENA.y + ARENA_BOUNDS.yMin - 8;
  const topY = ARENA.y + ARENA_BOUNDS.yMax - 4;
  each(playing(), (p) => {
    const l = p.location;
    if (l.y < limitY) {
      if (S.phase === "countdown") { // por si alguien se sale de la jaula
        const s = S.spawnOf.get(p.id); if (s) p.teleport({ x: ARENA.x + s.x + 0.5, y: ARENA.y + s.y + 3, z: ARENA.z + s.z + 0.5 });
        return;
      }
      try { p.kill(); } catch { cmd(p, "kill @s"); }
      return;
    }
    // Límite del mapa: nadie construye fuera del área que se limpia entre partidas
    const dx = l.x - ARENA.x, dz = l.z - ARENA.z, dist = Math.hypot(dx, dz);
    if (dist > BORDER || l.y > topY) {
      const k = dist > BORDER ? (BORDER - 3) / dist : 1;
      p.teleport({ x: ARENA.x + dx * k, y: Math.min(l.y, topY - 2), z: ARENA.z + dz * k });
      actionbar(p, "§c¡Límite del mapa!");
    }
  });
}, 5);

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------
world.afterEvents.entityHurt.subscribe((ev) => {
  const victim = ev.hurtEntity;
  if (victim.typeId !== "minecraft:player") return;
  const attacker = ev.damageSource?.damagingEntity;
  if (attacker?.typeId !== "minecraft:player" || attacker.id === victim.id) return;
  // Sin fuego amigo en Rojo vs Azul: se devuelve la vida quitada
  if (config.mode === 1 && teamOf(victim) && teamOf(victim) === teamOf(attacker)) {
    try {
      const h = victim.getComponent("minecraft:health");
      h.setCurrentValue(Math.min(h.effectiveMax, h.currentValue + ev.damage));
    } catch {}
    return;
  }
  S.lastHit.set(victim.id, { name: attacker.name, tick: system.currentTick });
});

world.afterEvents.entityDie.subscribe((ev) => {
  const victim = ev.deadEntity;
  if (victim.typeId !== "minecraft:player" || !victim.hasTag(T.playing)) return;
  let killer = ev.damageSource?.damagingEntity;
  let killerName = killer?.typeId === "minecraft:player" && killer.id !== victim.id ? killer.name : undefined;
  if (!killerName) {
    const last = S.lastHit.get(victim.id);
    if (last && system.currentTick - last.tick < 200) killerName = last.name; // empujado al vacío
  }
  S.lastHit.delete(victim.id);
  eliminate(victim, killerName);
});

world.afterEvents.playerSpawn.subscribe((ev) => {
  const p = ev.player;
  if (ev.initialSpawn) {
    if (!S.ready) {
      cmd(p, "effect @s slow_falling 60 0 true");
      cmd(p, "effect @s resistance 60 255 true");
      system.runTimeout(() => trySetup(), 20);
      return;
    }
    if (S.phase === "lobby" || S.phase === "building") system.runTimeout(() => each([p], sendToLobby), 5);
    else system.runTimeout(() => each([p], spectate), 5);
    return;
  }
  // Reaparición tras morir
  if (p.hasTag(T.dead) && S.arena) system.runTimeout(() => each([p], spectate), 2);
  else if (S.phase === "lobby") system.runTimeout(() => each([p], sendToLobby), 2);
});

world.afterEvents.playerLeave.subscribe(() => system.runTimeout(checkWin, 2));

world.afterEvents.itemUse.subscribe((ev) => {
  if (ev.itemStack?.typeId !== "minecraft:compass") return;
  const p = ev.source;
  if (p.hasTag(T.playing)) return;
  system.run(() => mainMenu(p));
});

// ---------------------------------------------------------------------------
// Menús
// ---------------------------------------------------------------------------
function mainMenu(p) {
  const f = new ActionFormData()
    .title("§lSkyWars")
    .body(`Modo: §e${MODES[config.mode]}§r\nBotín: §e${LOOTS[config.loot]}§r\nRotación: §e${ROTATIONS[config.rotation]}§r\nJugadores: §e${world.getPlayers().length}/8`)
    .button("Votar mapa")
    .button("Mis estadísticas")
    .button("Lista de mapas")
    .button("§2Iniciar partida ahora")
    .button("§6Configuración");
  f.show(p).then((r) => {
    if (r.canceled) return;
    switch (r.selection) {
      case 0: voteMenu(p); break;
      case 1: statsMenu(p); break;
      case 2: mapsMenu(p); break;
      case 3:
        if (!isAdmin(p)) { p.sendMessage("§cSolo un admin (etiqueta sw_admin) puede iniciar."); return; }
        if (S.phase !== "lobby") { p.sendMessage("§cYa hay una partida en curso."); return; }
        startGame(p); break;
      case 4:
        if (!isAdmin(p)) { p.sendMessage("§cSolo un admin (etiqueta sw_admin) puede configurar."); return; }
        if (S.phase !== "lobby") { p.sendMessage("§cLa configuración solo se cambia en el lobby."); return; }
        configMenu(p); break;
    }
  }).catch(() => {});
}

function voteMenu(p) {
  if (S.phase !== "lobby") { p.sendMessage("§cSolo se vota en el lobby."); return; }
  if (config.rotation !== 2) p.sendMessage("§7(La rotación no está en «Votación»; tu voto se guardará igual por si el admin la activa.)");
  const maps = enabledMaps();
  const f = new ActionFormData().title("Votar mapa").body("Elige el mapa de la próxima partida.");
  for (const i of maps) {
    const votes = [...S.votes.values()].filter((v) => v === i).length;
    f.button(`${i + 1}. ${THEMES[i].name} §8(${votes} votos)`);
  }
  f.show(p).then((r) => {
    if (r.canceled) return;
    const i = maps[r.selection];
    S.votes.set(p.name, i);
    say(`§b${p.name}§r votó por §e${THEMES[i].name}`);
  }).catch(() => {});
}

function score(obj, p) {
  try { return world.scoreboard.getObjective(obj)?.getScore(p.scoreboardIdentity ?? p) ?? 0; } catch { return 0; }
}

function statsMenu(p) {
  new ActionFormData().title("Estadísticas")
    .body(`§6Victorias: §f${score("sw_wins", p)}\n§cAsesinatos: §f${score("sw_kills", p)}`)
    .button("Cerrar").show(p).catch(() => {});
}

function mapsMenu(p) {
  const lines = THEMES.map((t, i) => `${config.enabledMaps[i] === false ? "§8✗" : "§a✓"} §f${i + 1}. ${t.name}`);
  new ActionFormData().title("Mapas").body(lines.join("\n")).button("Cerrar").show(p).catch(() => {});
}

function configMenu(p) {
  const f = new ModalFormData()
    .title("Configuración de SkyWars")
    .dropdown("Modo de juego", MODES, config.mode)
    .dropdown("Botín de los cofres", LOOTS, config.loot)
    .dropdown("Rotación de mapas", ROTATIONS, config.rotation)
    .toggle("Inicio automático", config.autoStart)
    .slider("Jugadores mínimos", 2, 8, 1, config.minPlayers)
    .slider("Espera en el lobby (seg)", 10, 60, 5, config.lobbyWait)
    .slider("Recarga de cofres (seg)", 60, 300, 30, config.refill)
    .slider("Tiempo hasta muerte súbita (min)", 5, 20, 1, config.timeLimit);
  THEMES.forEach((t, i) => f.toggle(`Mapa ${i + 1}: ${t.name}`, config.enabledMaps[i] !== false));
  f.show(p).then((r) => {
    if (r.canceled || !r.formValues) return;
    if (S.phase !== "lobby") { p.sendMessage("§cLa partida ya empezó; la configuración no se guardó."); return; }
    const v = r.formValues;
    config.mode = v[0]; config.loot = v[1]; config.rotation = v[2]; config.autoStart = v[3];
    config.minPlayers = v[4]; config.lobbyWait = v[5]; config.refill = v[6]; config.timeLimit = v[7];
    config.enabledMaps = THEMES.map((_, i) => v[8 + i] !== false);
    saveConfig();
    say(`Configuración guardada · Modo §e${MODES[config.mode]}§r · Botín §e${LOOTS[config.loot]}§r · Rotación §e${ROTATIONS[config.rotation]}`);
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
system.run(() => {
  if (world.getPlayers().length) trySetup();
});
