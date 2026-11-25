// Utilidades de generación compartidas por las arenas y el lobby.
// No importa nada de Minecraft: también se usa en Node para dibujar las vistas previas.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Builder {
  constructor() { this.map = new Map(); }
  key(x, y, z) { return `${x},${y},${z}`; }
  set(x, y, z, id, states) { this.map.set(this.key(x, y, z), { x, y, z, id, states }); }
  setIfAir(x, y, z, id, states) { if (!this.map.has(this.key(x, y, z))) this.set(x, y, z, id, states); }
  del(x, y, z) { this.map.delete(this.key(x, y, z)); }
  has(x, y, z) { return this.map.has(this.key(x, y, z)); }
  get(x, y, z) { return this.map.get(this.key(x, y, z)); }
  box(x1, y1, z1, x2, y2, z2, id, states) {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
        for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++)
          id ? this.set(x, y, z, id, states) : this.del(x, y, z);
  }
  /** Paredes de una caja (sin suelo ni techo). */
  walls(x1, y1, z1, x2, y2, z2, id, states) {
    for (let y = y1; y <= y2; y++)
      for (let x = x1; x <= x2; x++)
        for (let z = z1; z <= z2; z++)
          if (x === x1 || x === x2 || z === z1 || z === z2) this.set(x, y, z, id, states);
  }
  disc(cx, y, cz, r, id, states, onlyIfAir = false) {
    for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++)
      for (let dz = -Math.ceil(r); dz <= Math.ceil(r); dz++)
        if (dx * dx + dz * dz <= r * r + 0.3)
          onlyIfAir ? this.setIfAir(cx + dx, y, cz + dz, id, states) : this.set(cx + dx, y, cz + dz, id, states);
  }
  ring(cx, y, cz, r1, r2, id, states) {
    for (let dx = -Math.ceil(r2); dx <= Math.ceil(r2); dx++)
      for (let dz = -Math.ceil(r2); dz <= Math.ceil(r2); dz++) {
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d >= r1 - 0.3 && d <= r2 + 0.3) this.set(cx + dx, y, cz + dz, id, states);
      }
  }
  /** Bloques ordenados de abajo hacia arriba (la arena y los cactus siempre tienen soporte). */
  list() { return [...this.map.values()].sort((a, b) => a.y - b.y); }
}

export const LEAVES = { persistent_bit: true };
export const CAP = { huge_mushroom_bits: 14 };
export const STEM = { huge_mushroom_bits: 15 };

/**
 * Isla flotante con forma de cono invertido irregular.
 * opts: { surface, sub, core, ores, oreChance, stretch:[sx,sz], lumpy }
 * Devuelve las posiciones de la superficie.
 */
export function island(b, rng, opts, cx, cy, cz, radius, depth) {
  const lobes = Array.from({ length: 12 }, () => 0.8 + rng() * 0.4);
  const [sx, sz] = opts.stretch ?? [1, 1];
  const surface = [];
  for (let dy = 0; dy <= depth; dy++) {
    // dy 0 y 1 usan el mismo radio: así la arena (con gravedad) siempre tiene soporte debajo
    const f = 1 - Math.max(0, dy - 1) / (depth + 1);
    const layerR = radius * Math.pow(f, opts.lumpy ? 0.7 : 0.85);
    const R = Math.ceil(layerR * 1.25 * Math.max(sx, sz)) + 1;
    for (let dx = -R; dx <= R; dx++) {
      for (let dz = -R; dz <= R; dz++) {
        const ex = dx / sx, ez = dz / sz;
        const ang = (Math.atan2(ez, ex) + Math.PI) / (2 * Math.PI) * 12;
        const i0 = Math.floor(ang) % 12, i1 = (i0 + 1) % 12, t = ang - Math.floor(ang);
        const lobe = lobes[i0] * (1 - t) + lobes[i1] * t;
        const d = Math.sqrt(ex * ex + ez * ez);
        if (d > layerR * lobe + (dy > 0 ? rng() * 0.6 : 0)) continue;
        const x = cx + dx, y = cy - dy, z = cz + dz;
        let id;
        if (dy === 0) id = opts.surface;
        else if (dy <= 2) id = opts.sub;
        else id = opts.ores?.length && rng() < (opts.oreChance ?? 0.06) ? opts.ores[Math.floor(rng() * opts.ores.length)] : opts.core;
        b.set(x, y, z, id);
        if (dy === 0) surface.push({ x, z });
      }
    }
  }
  return surface;
}

export function blob(b, cx, cy, cz, r, id, states, rng, hollowChance = 0.15) {
  for (let dx = -r; dx <= r; dx++)
    for (let dy = -r; dy <= r; dy++)
      for (let dz = -r; dz <= r; dz++) {
        const d = Math.sqrt(dx * dx + dy * dy * 1.6 + dz * dz);
        if (d > r + 0.3) continue;
        if (d > r - 0.7 && rng() < hollowChance) continue;
        b.setIfAir(cx + dx, cy + dy, cz + dz, id, states);
      }
}

/** Árboles y "árboles" temáticos. y = altura de la superficie (el tronco empieza en y+1). */
export function tree(b, rng, kind, x, y, z) {
  switch (kind) {
    case "oak": case "birch": {
      const h = 4 + Math.floor(rng() * 2);
      for (let i = 1; i <= h; i++) b.set(x, y + i, z, `${kind}_log`);
      blob(b, x, y + h, z, 2, `${kind}_leaves`, LEAVES, rng);
      break;
    }
    case "spruce": {
      const h = 6 + Math.floor(rng() * 2);
      for (let i = 1; i <= h; i++) b.set(x, y + i, z, "spruce_log");
      for (let i = 2; i <= h + 1; i++) {
        const r = Math.max(0, Math.round((h + 1 - i) / 2.2));
        for (let dx = -r; dx <= r; dx++)
          for (let dz = -r; dz <= r; dz++)
            if (Math.abs(dx) + Math.abs(dz) <= r + 0.5) b.setIfAir(x + dx, y + i, z + dz, "spruce_leaves", LEAVES);
      }
      b.setIfAir(x, y + h + 1, z, "spruce_leaves", LEAVES);
      b.setIfAir(x, y + h + 2, z, "snow_layer");
      break;
    }
    case "jungle": {
      const h = 7 + Math.floor(rng() * 3);
      for (let i = 1; i <= h; i++) b.set(x, y + i, z, "jungle_log");
      blob(b, x, y + h, z, 3, "jungle_leaves", LEAVES, rng);
      for (let i = 2; i < h - 1; i++) if (rng() < 0.5) b.setIfAir(x + 1, y + i, z, "vine", { vine_direction_bits: 2 });
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

/** Farol: poste de valla con farol encima. */
export function lamp(b, x, y, z, h = 3, post = "oak_fence", light = "lantern") {
  for (let i = 1; i <= h; i++) b.set(x, y + i, z, post);
  b.set(x, y + h + 1, z, light);
}
