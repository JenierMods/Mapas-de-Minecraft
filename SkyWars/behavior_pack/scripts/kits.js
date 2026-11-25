// Kits que el jugador elige con el aldeano de Kits. Se entregan al abrir la jaula.
export const KITS = [
  { id: "ninguno", name: "Sin kit", icon: "textures/blocks/barrier", desc: "Solo lo que encuentres en los cofres", items: [] },
  { id: "constructor", name: "Constructor", icon: "textures/blocks/planks_oak", desc: "48 tablones y pico de piedra",
    items: [["minecraft:oak_planks", 48], ["minecraft:stone_pickaxe", 1]] },
  { id: "guerrero", name: "Guerrero", icon: "textures/items/stone_sword", desc: "Espada de piedra y peto de cuero",
    items: [["minecraft:stone_sword", 1], ["minecraft:leather_chestplate", 1]] },
  { id: "arquero", name: "Arquero", icon: "textures/items/bow_standby", desc: "Arco y 12 flechas",
    items: [["minecraft:bow", 1], ["minecraft:arrow", 12]] },
  { id: "explorador", name: "Explorador", icon: "textures/items/ender_pearl", desc: "1 perla de Ender y 16 bolas de nieve",
    items: [["minecraft:ender_pearl", 1], ["minecraft:snowball", 16]] },
  { id: "medico", name: "Médico", icon: "textures/items/apple_golden", desc: "2 manzanas doradas y 6 de pan",
    items: [["minecraft:golden_apple", 2], ["minecraft:bread", 6]] },
  { id: "demoledor", name: "Demoledor", icon: "textures/blocks/tnt_side", desc: "3 TNT y mechero",
    items: [["minecraft:tnt", 3], ["minecraft:flint_and_steel", 1]] },
  { id: "pescador", name: "Pescador", icon: "textures/items/fishing_rod_uncast", desc: "Caña de pescar y 8 de pescado cocinado",
    items: [["minecraft:fishing_rod", 1], ["minecraft:cooked_cod", 8]] },
];
