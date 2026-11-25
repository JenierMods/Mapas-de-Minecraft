// Dibuja vistas previas isométricas de las 10 arenas usando el MISMO generador
// que usa el juego (behavior_pack/scripts/arenas.js).
// Uso: node tools/render-previews.mjs   (requiere Playwright + Chromium)
import { generateArena, THEMES, SPAWN_COUNT } from "../behavior_pack/scripts/arenas.js";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const here = path.dirname(url.fileURLToPath(import.meta.url));
const outDir = path.join(here, "..", "previews");
fs.mkdirSync(outDir, { recursive: true });

const COLORS = {
  grass_block: "#6aa84f", dirt: "#8b5e3c", stone: "#8a8a8a", coal_ore: "#5a5a5a", iron_ore: "#b89a82",
  gold_ore: "#d8c25a", lapis_ore: "#3b5fbf", emerald_ore: "#3fbf6a", copper_ore: "#c07a50",
  sand: "#e3d39a", sandstone: "#d4c17f", cut_sandstone: "#cdb877", gold_block: "#f5d33b",
  snow: "#f4f8fb", packed_ice: "#9cc2f0", spruce_log: "#5a3f22", spruce_leaves: "#3d5e3a",
  crimson_nylium: "#9a2424", netherrack: "#6e2a2a", blackstone: "#2c2830", quartz_ore: "#d8c8c0",
  nether_gold_ore: "#9a5a2a", crimson_stem: "#7a2a40", nether_wart_block: "#8a1515", shroomlight: "#f0a040",
  nether_bricks: "#3a1a20", nether_brick: "#3a1a20", magma: "#c0501a", glowstone: "#f0d070", crimson_roots: "#b02a3a",
  end_stone: "#e8e8a8", obsidian: "#1e1530", crying_obsidian: "#4a2a8a", purpur_pillar: "#a77ca7", end_rod: "#fafae0",
  mycelium: "#7a6a7a", mushroom_stem: "#d8d0c0", red_mushroom_block: "#c02a2a", brown_mushroom: "#9a7050", red_mushroom: "#d03030",
  mossy_cobblestone: "#6a7a5a", cobblestone: "#7a7a7a", cobblestone_wall: "#7a7a7a", jungle_log: "#6a5530", jungle_leaves: "#2f8a2a",
  vine: "#2a6a20", fern: "#4a8a3a", prismarine: "#5aa898", dark_prismarine: "#2a5a4a", prismarine_bricks: "#64b0a0", sea_lantern: "#dff0ea",
  cherry_log: "#4a2a2a", cherry_leaves: "#f2a6c8", cherry_planks: "#e8bcb0", dark_oak_log: "#3a2a1a", pink_petals: "#f0a0c0", lantern: "#f0c060",
  calcite: "#e0e0dc", smooth_basalt: "#4a4a50", deepslate: "#4a4a4e", deepslate_diamond_ore: "#5ab0b0", deepslate_iron_ore: "#7a6a60",
  amethyst_block: "#8a5ac0", budding_amethyst: "#7a4ab0", amethyst_cluster: "#b080e0",
  oak_log: "#6a5030", oak_leaves: "#4a8a30", oak_fence: "#a0804a", oak_planks: "#b0905a", water: "#3a6ad0",
  poppy: "#d02020", dandelion: "#f0e030", deadbush: "#8a6a3a", cactus: "#3a7a2a", chest: "#b07a2a",
  glass: "#cfe8f0", red_wool: "#c02a2a", blue_wool: "#2a4ac0",
};
const SMALL = new Set(["poppy", "dandelion", "deadbush", "crimson_roots", "brown_mushroom", "red_mushroom", "fern", "vine",
  "pink_petals", "amethyst_cluster", "end_rod", "lantern", "oak_fence", "cobblestone_wall"]);

const SKIES = {
  pradera: ["#8fc7ff", "#e8f4ff"], desierto: ["#ffd8a0", "#fff4e0"], glaciar: ["#a8c8e8", "#f0f6ff"],
  infierno: ["#3a0a0a", "#8a2a1a"], fin: ["#120a1e", "#3a2a50"], hongos: ["#b8a8d0", "#efe8f8"],
  jungla: ["#8fd0b0", "#e8fff0"], oceano: ["#5ab0e0", "#d8f4ff"], cerezos: ["#ffc8e0", "#fff0f6"], amatista: ["#2a1a40", "#6a4a90"],
};

const arenas = THEMES.map((_, i) => {
  const a = generateArena(i);
  // Mostrar también las jaulas de cristal tal como aparecen antes de empezar.
  const blocks = a.blocks.map((bl) => ({ ...bl }));
  for (const s of a.spawns) {
    const fy = s.y + 2;
    blocks.push({ x: s.x, y: fy, z: s.z, id: s.team === "red" ? "red_wool" : "blue_wool" });
    for (let dy = 1; dy <= 3; dy++) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++)
      if ((dx || dz) || dy === 3) blocks.push({ x: s.x + dx, y: fy + dy, z: s.z + dz, id: "glass" });
  }
  return { name: a.theme.name, id: a.theme.id, index: i, blocks: blocks.map((b) => [b.x, b.y, b.z, b.id]), chests: a.chests.length, spawns: a.spawns.length };
});

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;font-family:system-ui,Segoe UI,sans-serif}
.card{width:1200px;height:760px;position:relative;overflow:hidden}
canvas{position:absolute;left:0;top:0;width:100%;height:100%}
.label{position:absolute;left:32px;top:26px;color:#fff;text-shadow:0 0 3px #000c,0 2px 10px #000a}
.label h1{margin:0;font-size:44px;letter-spacing:1px}
.label p{margin:4px 0 0;font-size:20px;opacity:.95}
</style></head><body><div class="card" id="card"><canvas id="c" width="2400" height="1520"></canvas><div class="label"><h1 id="t"></h1><p id="s"></p></div></div>
<script>
const COLORS=${JSON.stringify(COLORS)};const SMALL=new Set(${JSON.stringify([...SMALL])});const SKIES=${JSON.stringify(SKIES)};
function shade(hex,f){const n=parseInt(hex.slice(1),16);let r=n>>16,g=(n>>8)&255,b=n&255;r=Math.min(255,r*f|0);g=Math.min(255,g*f|0);b=Math.min(255,b*f|0);return 'rgb('+r+','+g+','+b+')'}
window.draw=function(a){
  document.getElementById('t').textContent='Mapa '+(a.index+1)+' · '+a.name;
  document.getElementById('s').textContent=a.spawns+' islas de aparición · '+a.chests+' cofres · jaulas de equipo rojo y azul';
  const cv=document.getElementById('c'),ctx=cv.getContext('2d');
  const sky=SKIES[a.id]||['#8fc7ff','#fff'];const g=ctx.createLinearGradient(0,0,0,cv.height);g.addColorStop(0,sky[0]);g.addColorStop(1,sky[1]);
  ctx.fillStyle=g;ctx.fillRect(0,0,cv.width,cv.height);
  const S=13.5,W=S*Math.sqrt(3)/2,H=S/2;
  const set=new Set(a.blocks.map(b=>b[0]+','+b[1]+','+b[2]));
  const solid=(x,y,z)=>set.has(x+','+y+','+z);
  const bl=a.blocks.slice().sort((p,q)=>(p[0]+p[2])-(q[0]+q[2])||p[1]-q[1]);
  const cx=cv.width/2,cy=cv.height/2+40;
  for(const [x,y,z,id] of bl){
    if(solid(x,y+1,z)&&solid(x+1,y,z)&&solid(x,y,z+1))continue;
    const col=COLORS[id]||'#ff00ff';
    const sx=cx+(x-z)*W, sy=cy+(x+z)*H-y*S;
    const k=SMALL.has(id)?0.5:1;
    const alpha=id==='glass'?0.35:1;ctx.globalAlpha=alpha;
    const w=W*k,h=H*k,s=S*k,ox=sx,oy=sy+(S-s);
    // cara superior
    ctx.fillStyle=shade(col,1.08);ctx.beginPath();ctx.moveTo(ox,oy-h);ctx.lineTo(ox+w,oy);ctx.lineTo(ox,oy+h);ctx.lineTo(ox-w,oy);ctx.closePath();ctx.fill();
    // cara izquierda
    ctx.fillStyle=shade(col,0.82);ctx.beginPath();ctx.moveTo(ox-w,oy);ctx.lineTo(ox,oy+h);ctx.lineTo(ox,oy+h+s);ctx.lineTo(ox-w,oy+s);ctx.closePath();ctx.fill();
    // cara derecha
    ctx.fillStyle=shade(col,0.64);ctx.beginPath();ctx.moveTo(ox+w,oy);ctx.lineTo(ox,oy+h);ctx.lineTo(ox,oy+h+s);ctx.lineTo(ox+w,oy+s);ctx.closePath();ctx.fill();
    if(id==='chest'){ctx.fillStyle='#3a2a10';ctx.fillRect(ox-1.5,oy+h+2,3,4)}
  }
  ctx.globalAlpha=1;
}
</script></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 760 }, deviceScaleFactor: 2 });
await page.setContent(html);
for (const a of arenas) {
  await page.evaluate((a) => window.draw(a), a);
  const file = path.join(outDir, `mapa-${String(a.index + 1).padStart(2, "0")}-${a.id}.png`);
  await page.locator("#card").screenshot({ path: file });
  console.log("ok", file, a.blocks.length, "bloques");
}
// Ícono del pack (cuadrado) y miniatura del mundo, a partir del mapa 1.
const small = await browser.newPage({ viewport: { width: 1200, height: 760 }, deviceScaleFactor: 1 });
await small.setContent(html);
await small.evaluate((a) => { window.draw(a); document.querySelector(".label").remove(); }, arenas[0]);
const bp = path.join(here, "..", "behavior_pack");
await small.screenshot({ path: path.join(bp, "pack_icon.png"), clip: { x: 330, y: 150, width: 540, height: 540 } });
await small.screenshot({ path: path.join(here, "..", "world_icon.jpeg"), type: "jpeg", quality: 85, clip: { x: 160, y: 130, width: 880, height: 495 } });
console.log("ok iconos");
await browser.close();
