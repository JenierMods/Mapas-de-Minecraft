// Tablas de botín de los cofres. Dos niveles: Normal y Extremo.
// Cada entrada: [idItem, peso, cantidadMin, cantidadMax, encantamientos?]
import * as mc from "@minecraft/server";
const { ItemStack } = mc;

const NORMAL = {
  spawn: [
    ["minecraft:oak_planks", 10, 16, 32], ["minecraft:cobblestone", 10, 16, 32],
    ["minecraft:stone_sword", 6, 1, 1], ["minecraft:iron_sword", 2, 1, 1],
    ["minecraft:leather_helmet", 3, 1, 1], ["minecraft:chainmail_chestplate", 3, 1, 1],
    ["minecraft:iron_leggings", 2, 1, 1], ["minecraft:leather_boots", 3, 1, 1],
    ["minecraft:stone_pickaxe", 4, 1, 1], ["minecraft:stone_axe", 3, 1, 1],
    ["minecraft:cooked_beef", 6, 2, 5], ["minecraft:bread", 5, 2, 5], ["minecraft:apple", 4, 1, 3],
    ["minecraft:snowball", 5, 4, 12], ["minecraft:egg", 3, 4, 8],
    ["minecraft:bow", 2, 1, 1], ["minecraft:arrow", 3, 4, 10],
    ["minecraft:water_bucket", 2, 1, 1], ["minecraft:lava_bucket", 1, 1, 1],
  ],
  mid: [
    ["minecraft:iron_sword", 5, 1, 1], ["minecraft:iron_chestplate", 3, 1, 1], ["minecraft:iron_helmet", 3, 1, 1],
    ["minecraft:iron_boots", 3, 1, 1], ["minecraft:bow", 4, 1, 1], ["minecraft:arrow", 5, 8, 16],
    ["minecraft:golden_apple", 2, 1, 2], ["minecraft:ender_pearl", 2, 1, 1], ["minecraft:iron_pickaxe", 3, 1, 1],
    ["minecraft:cobblestone", 6, 16, 32], ["minecraft:cooked_porkchop", 5, 2, 5],
    ["minecraft:fishing_rod", 3, 1, 1], ["minecraft:flint_and_steel", 2, 1, 1], ["minecraft:tnt", 2, 1, 3],
  ],
  center: [
    ["minecraft:diamond_sword", 4, 1, 1], ["minecraft:diamond_chestplate", 3, 1, 1], ["minecraft:diamond_helmet", 3, 1, 1],
    ["minecraft:diamond_leggings", 2, 1, 1], ["minecraft:diamond_boots", 3, 1, 1], ["minecraft:iron_sword", 4, 1, 1, [["sharpness", 1]]],
    ["minecraft:bow", 4, 1, 1, [["power", 1]]], ["minecraft:arrow", 5, 8, 24], ["minecraft:golden_apple", 4, 1, 3],
    ["minecraft:ender_pearl", 4, 1, 2], ["minecraft:tnt", 3, 2, 5], ["minecraft:flint_and_steel", 2, 1, 1],
    ["minecraft:diamond_pickaxe", 2, 1, 1], ["minecraft:cobblestone", 4, 16, 48], ["minecraft:experience_bottle", 3, 4, 12],
  ],
};

const EXTREME = {
  spawn: [
    ["minecraft:oak_planks", 8, 32, 64], ["minecraft:iron_sword", 6, 1, 1], ["minecraft:diamond_sword", 2, 1, 1],
    ["minecraft:iron_helmet", 4, 1, 1], ["minecraft:iron_chestplate", 4, 1, 1], ["minecraft:iron_leggings", 4, 1, 1], ["minecraft:iron_boots", 4, 1, 1],
    ["minecraft:bow", 4, 1, 1], ["minecraft:arrow", 5, 16, 32], ["minecraft:golden_apple", 4, 1, 3],
    ["minecraft:ender_pearl", 3, 1, 2], ["minecraft:cooked_beef", 5, 4, 8], ["minecraft:iron_pickaxe", 4, 1, 1],
    ["minecraft:water_bucket", 3, 1, 1], ["minecraft:lava_bucket", 2, 1, 1], ["minecraft:snowball", 4, 8, 16],
  ],
  mid: [
    ["minecraft:diamond_sword", 5, 1, 1, [["sharpness", 2]]], ["minecraft:diamond_chestplate", 4, 1, 1, [["protection", 1]]],
    ["minecraft:diamond_helmet", 4, 1, 1], ["minecraft:diamond_boots", 4, 1, 1], ["minecraft:bow", 4, 1, 1, [["power", 2]]],
    ["minecraft:arrow", 5, 16, 32], ["minecraft:golden_apple", 4, 2, 4], ["minecraft:ender_pearl", 4, 1, 3],
    ["minecraft:tnt", 3, 3, 8], ["minecraft:crossbow", 2, 1, 1], ["minecraft:shield", 3, 1, 1], ["minecraft:experience_bottle", 3, 8, 16],
  ],
  center: [
    ["minecraft:diamond_sword", 5, 1, 1, [["sharpness", 3], ["fire_aspect", 1]]], ["minecraft:netherite_sword", 1, 1, 1],
    ["minecraft:diamond_chestplate", 4, 1, 1, [["protection", 2]]], ["minecraft:diamond_leggings", 4, 1, 1, [["protection", 2]]],
    ["minecraft:netherite_helmet", 1, 1, 1], ["minecraft:bow", 4, 1, 1, [["power", 3], ["punch", 1]]], ["minecraft:arrow", 5, 24, 48],
    ["minecraft:enchanted_golden_apple", 1, 1, 1], ["minecraft:golden_apple", 4, 2, 5], ["minecraft:ender_pearl", 4, 2, 4],
    ["minecraft:tnt", 3, 4, 10], ["minecraft:totem_of_undying", 1, 1, 1], ["minecraft:trident", 1, 1, 1, [["loyalty", 1]]],
  ],
};

// Premio extra de los cofres secretos de los túneles
const SECRET = [
  ["minecraft:enchanted_golden_apple", 1], ["minecraft:diamond_sword", 1, [["sharpness", 2]]],
  ["minecraft:diamond_chestplate", 1, [["protection", 2]]], ["minecraft:ender_pearl", 3],
  ["minecraft:bow", 1, [["power", 3], ["flame", 1]]], ["minecraft:totem_of_undying", 1],
];

// Lo que un cofre de aparición SIEMPRE tiene, para que nadie empiece sin nada.
const GUARANTEED = {
  normal: [["minecraft:cobblestone", 24], ["minecraft:stone_sword", 1]],
  extreme: [["minecraft:oak_planks", 48], ["minecraft:iron_sword", 1]],
};

const ITEMS_PER_CHEST = { spawn: [4, 6], mid: [4, 6], center: [5, 8] };

function pick(pool) {
  const total = pool.reduce((s, e) => s + e[1], 0);
  let r = Math.random() * total;
  for (const e of pool) { if ((r -= e[1]) <= 0) return e; }
  return pool[pool.length - 1];
}

function makeItem(id, amount, enchants) {
  let item;
  try { item = new ItemStack(id, amount); } catch { return undefined; }
  if (enchants) {
    try {
      const comp = item.getComponent("minecraft:enchantable");
      for (const [name, level] of enchants) {
        const type = mc.EnchantmentTypes?.get?.(name) ?? name;
        try { comp?.addEnchantment({ type, level }); } catch {}
      }
    } catch {}
  }
  return item;
}

/**
 * Llena el contenedor de un cofre.
 * @param {import("@minecraft/server").Container} container
 * @param {"spawn"|"mid"|"center"} kind
 * @param {"normal"|"extreme"} tier
 * @param {boolean} withGuaranteed  solo el primer cofre de cada isla de aparición
 * @param {boolean} secret  cofre escondido en un túnel: trae un premio extra
 */
export function fillChest(container, kind, tier, withGuaranteed, secret = false) {
  if (container.clearAll) container.clearAll();
  else for (let i = 0; i < container.size; i++) container.setItem(i, undefined);
  const pool = (tier === "extreme" ? EXTREME : NORMAL)[kind];
  const [min, max] = ITEMS_PER_CHEST[kind];
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const slots = [...Array(container.size).keys()].sort(() => Math.random() - 0.5);
  let s = 0;
  if (withGuaranteed) {
    for (const [id, n] of GUARANTEED[tier]) {
      const it = makeItem(id, n);
      if (it) container.setItem(slots[s++], it);
    }
  }
  if (secret) {
    const [id, n, ench] = SECRET[Math.floor(Math.random() * SECRET.length)];
    const it = makeItem(id, n, ench);
    if (it) container.setItem(slots[s++], it);
  }
  for (let i = 0; i < count; i++) {
    const [id, , a, b, ench] = pick(pool);
    const it = makeItem(id, a + Math.floor(Math.random() * (b - a + 1)), ench);
    if (it) container.setItem(slots[s++], it);
  }
}
