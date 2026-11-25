// Renderizador isométrico de bloques (para las imágenes de vista previa).
// Dibuja en un <canvas> dentro de Chromium (Playwright) y guarda PNG/JPEG.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

export const COLORS = {
  grass_block: "#6aa84f", dirt: "#8b5e3c", stone: "#8a8a8a", coal_ore: "#5a5a5a", iron_ore: "#b89a82", diamond_ore: "#6ad0d0",
  gold_ore: "#d8c25a", lapis_ore: "#3b5fbf", emerald_ore: "#3fbf6a", copper_ore: "#c07a50",
  sand: "#e3d39a", sandstone: "#d4c17f", cut_sandstone: "#cdb877", smooth_sandstone: "#dccb8e", chiseled_sandstone: "#c9b06a", sandstone_wall: "#d4c17f",
  gold_block: "#f5d33b", iron_block: "#dcdcdc", copper_block: "#c06a45", emerald_block: "#2ecc71",
  snow: "#f4f8fb", snow_layer: "#f8fbff", packed_ice: "#9cc2f0", blue_ice: "#74a8f0", spruce_log: "#5a3f22", spruce_leaves: "#3d5e3a",
  spruce_planks: "#7a5a36", spruce_fence: "#7a5a36", stripped_spruce_log: "#8a6a40",
  crimson_nylium: "#9a2424", netherrack: "#6e2a2a", blackstone: "#2c2830", gilded_blackstone: "#4a3a20", quartz_ore: "#d8c8c0",
  nether_gold_ore: "#9a5a2a", crimson_stem: "#7a2a40", nether_wart_block: "#8a1515", shroomlight: "#f0a040", crimson_fungus: "#b03030",
  nether_brick: "#3a1a20", red_nether_brick: "#5a1010", nether_brick_fence: "#3a1a20", magma: "#c0501a", glowstone: "#f0d070",
  crimson_roots: "#b02a3a", soul_lantern: "#60d0e0", basalt: "#4a4a50",
  end_stone: "#e8e8a8", end_bricks: "#e0e0a0", obsidian: "#1e1530", crying_obsidian: "#4a2a8a", purpur_pillar: "#a77ca7", purpur_block: "#a77ca7", end_rod: "#fafae0",
  mycelium: "#7a6a7a", mushroom_stem: "#d8d0c0", red_mushroom_block: "#c02a2a", brown_mushroom_block: "#9a7050", brown_mushroom: "#9a7050", red_mushroom: "#d03030",
  mossy_cobblestone: "#6a7a5a", cobblestone: "#7a7a7a", cobblestone_wall: "#7a7a7a", jungle_log: "#6a5530", jungle_leaves: "#2f8a2a",
  mossy_stone_bricks: "#6a7a60", cracked_stone_bricks: "#7a7a7a", stone_bricks: "#7d7d7d", chiseled_stone_bricks: "#8a8a8a", moss_block: "#5a7a2a",
  melon_block: "#7ab030", carved_pumpkin: "#e08a20", emerald: "#2ecc71",
  vine: "#2a6a20", fern: "#4a8a3a", short_grass: "#5a9a3a", prismarine: "#5aa898", dark_prismarine: "#2a5a4a", prismarine_bricks: "#64b0a0", sea_lantern: "#dff0ea",
  cherry_log: "#4a2a2a", cherry_leaves: "#f2a6c8", cherry_planks: "#e8bcb0", dark_oak_log: "#3a2a1a", dark_oak_planks: "#4a3420", dark_oak_fence: "#4a3420",
  pink_petals: "#f0a0c0", lantern: "#f0c060",
  calcite: "#e0e0dc", smooth_basalt: "#4a4a50", deepslate: "#4a4a4e", polished_deepslate: "#3a3a3e", deepslate_diamond_ore: "#5ab0b0", deepslate_iron_ore: "#7a6a60",
  amethyst_block: "#8a5ac0", budding_amethyst: "#7a4ab0", amethyst_cluster: "#b080e0", tinted_glass: "#3a2a4a",
  oak_log: "#6a5030", oak_leaves: "#4a8a30", oak_fence: "#a0804a", oak_planks: "#b0905a", birch_log: "#e0dcd0", birch_leaves: "#6a9a40",
  water: "#3a6ad0", poppy: "#d02020", dandelion: "#f0e030", azure_bluet: "#e0e8f0", oxeye_daisy: "#f0f0e0", cornflower: "#4060e0",
  deadbush: "#8a6a3a", cactus: "#3a7a2a", chest: "#b07a2a", hay_block: "#d0b030", target: "#e8d8c8",
  glass: "#cfe8f0", glass_pane: "#cfe8f0", iron_bars: "#9a9a9a", red_wool: "#c02a2a", blue_wool: "#2a4ac0", white_wool: "#f0f0f0",
  orange_wool: "#f08020", lime_wool: "#80c830", light_blue_wool: "#50b0e0",
  white_concrete: "#e8eaeb", red_concrete: "#a02020", black_concrete: "#151519", light_blue_concrete: "#2a8ac8", lime_concrete: "#5ea918",
  yellow_concrete: "#f0b010", orange_concrete: "#e06000", magenta_concrete: "#a830a0", pink_concrete: "#d06890", cyan_concrete: "#157788",
  quartz_block: "#ece6df", quartz_pillar: "#ece6df", smooth_quartz: "#efe9e2", polished_andesite: "#8a8e8e", smooth_stone: "#a0a0a0",
  grass_path: "#a08a50", polished_blackstone_bricks: "#30282e", portal: "#7a20e0", redstone_lamp: "#e0a060", slime: "#70c060",
  coarse_dirt: "#7a5638", crafting_table: "#9a6a3a", furnace: "#6a6a6a", enchanting_table: "#5a2030", bookshelf: "#8a6030", jungle_planks: "#b08050",
  azalea_leaves: "#5a8a30", flowering_azalea_leaves: "#6a9a40",
};
const SMALL = ["poppy", "dandelion", "deadbush", "crimson_roots", "crimson_fungus", "brown_mushroom", "red_mushroom", "fern", "vine", "short_grass",
  "azure_bluet", "oxeye_daisy", "cornflower", "pink_petals", "amethyst_cluster", "end_rod", "lantern", "soul_lantern", "oak_fence", "spruce_fence",
  "dark_oak_fence", "nether_brick_fence", "cobblestone_wall", "sandstone_wall", "iron_bars", "glass_pane"];
const TRANSLUCENT = { glass: 0.35, glass_pane: 0.35, water: 0.75, portal: 0.7, iron_bars: 0.6, tinted_glass: 0.8 };

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;font-family:system-ui,Segoe UI,sans-serif;background:#000}
#card{position:relative;overflow:hidden}
canvas{position:absolute;left:0;top:0;width:100%;height:100%}
.label{position:absolute;left:32px;top:24px;color:#fff;text-shadow:0 0 3px #000c,0 2px 10px #000a}
.label h1{margin:0;font-size:44px;letter-spacing:.5px}
.label p{margin:4px 0 0;font-size:20px;opacity:.95;max-width:900px}
.brand{position:absolute;right:24px;bottom:20px;display:flex;align-items:center;gap:12px;color:#fff;font-weight:700;font-size:22px;
  text-shadow:0 0 3px #000c,0 2px 8px #000a}
.brand img{width:56px;height:56px;border-radius:12px;background:#fff;padding:4px;box-shadow:0 2px 10px #0006}
</style></head><body><div id="card"><canvas id="c"></canvas><div class="label"><h1 id="t"></h1><p id="s"></p></div>
<div class="brand" id="brand"><img id="logo"><span>Creado por JenierMods OFC</span></div></div>
<script>
window.draw=function(a){
  const card=document.getElementById('card');card.style.width=a.w+'px';card.style.height=a.h+'px';
  document.getElementById('t').textContent=a.title||'';document.getElementById('s').textContent=a.subtitle||'';
  document.querySelector('.label').style.display=a.title?'block':'none';
  document.getElementById('brand').style.display=a.logo?'flex':'none';if(a.logo)document.getElementById('logo').src=a.logo;
  const cv=document.getElementById('c');cv.width=a.w*2;cv.height=a.h*2;const ctx=cv.getContext('2d');
  const g=ctx.createLinearGradient(0,0,0,cv.height);g.addColorStop(0,a.sky[0]);g.addColorStop(1,a.sky[1]);ctx.fillStyle=g;ctx.fillRect(0,0,cv.width,cv.height);
  const C=a.colors,SM=new Set(a.small),TR=a.translucent;
  const S=a.scale,W=S*Math.sqrt(3)/2,H=S/2;
  const set=new Set(a.blocks.map(b=>b[0]+','+b[1]+','+b[2]));
  const solid=(x,y,z)=>set.has(x+','+y+','+z);
  const bl=a.blocks.slice().sort((p,q)=>(p[0]+p[2])-(q[0]+q[2])||p[1]-q[1]);
  const cx=cv.width/2+(a.offset?.[0]||0)*2,cy=cv.height/2+(a.offset?.[1]||0)*2;
  const hash=(x,y,z)=>{let h=(x*374761393+y*668265263+z*2147483647)|0;h=(h^(h>>>13))*1274126177|0;return ((h^(h>>>16))>>>0)/4294967296};
  function shade(hex,f){const n=parseInt(hex.slice(1),16);let r=n>>16,g=(n>>8)&255,b=n&255;return 'rgb('+Math.min(255,r*f|0)+','+Math.min(255,g*f|0)+','+Math.min(255,b*f|0)+')'}
  for(const [x,y,z,id] of bl){
    if(solid(x,y+1,z)&&solid(x+1,y,z)&&solid(x,y,z+1))continue;
    const col=C[id]||'#ff00ff';
    const sx=cx+((x-a.center[0])-(z-a.center[2]))*W, sy=cy+((x-a.center[0])+(z-a.center[2]))*H-(y-a.center[1])*S;
    const k=SM.has(id)?0.5:1;ctx.globalAlpha=TR[id]??1;
    const w=W*k,h=H*k,s=S*k,ox=sx,oy=sy+(S-s);
    const n=0.92+hash(x,y,z)*0.16;
    ctx.fillStyle=shade(col,1.08*n);ctx.beginPath();ctx.moveTo(ox,oy-h);ctx.lineTo(ox+w,oy);ctx.lineTo(ox,oy+h);ctx.lineTo(ox-w,oy);ctx.closePath();ctx.fill();
    ctx.fillStyle=shade(col,0.80*n);ctx.beginPath();ctx.moveTo(ox-w,oy);ctx.lineTo(ox,oy+h);ctx.lineTo(ox,oy+h+s);ctx.lineTo(ox-w,oy+s);ctx.closePath();ctx.fill();
    ctx.fillStyle=shade(col,0.62*n);ctx.beginPath();ctx.moveTo(ox+w,oy);ctx.lineTo(ox,oy+h);ctx.lineTo(ox,oy+h+s);ctx.lineTo(ox+w,oy+s);ctx.closePath();ctx.fill();
    if(S>=10&&!SM.has(id)){ctx.strokeStyle='rgba(0,0,0,0.10)';ctx.lineWidth=0.6;ctx.beginPath();ctx.moveTo(ox-w,oy);ctx.lineTo(ox,oy-h);ctx.lineTo(ox+w,oy);ctx.stroke()}
    if(id==='chest'){ctx.fillStyle='#3a2a10';ctx.fillRect(ox-1.5*k,oy+h+2,3,4)}
  }
  ctx.globalAlpha=1;
}
</script></body></html>`;

/**
 * scenes: [{ blocks:[{x,y,z,id}], file, w, h, scale, center:[x,y,z], sky:[top,bottom], title, subtitle, logo(dataURL), type:'png'|'jpeg', dpr, offset }]
 */
export async function render(scenes) {
  const browser = await chromium.launch();
  for (const sc of scenes) {
    const page = await browser.newPage({ viewport: { width: sc.w, height: sc.h }, deviceScaleFactor: sc.dpr ?? 2 });
    await page.setContent(PAGE);
    await page.evaluate((a) => window.draw(a), {
      ...sc, file: undefined, blocks: sc.blocks.map((b) => [b.x, b.y, b.z, b.id]),
      colors: COLORS, small: SMALL, translucent: TRANSLUCENT,
    });
    await page.locator("#card").screenshot({ path: sc.file, type: sc.type ?? "png", ...(sc.type === "jpeg" ? { quality: 88 } : {}) });
    await page.close();
    console.log("ok", sc.file);
  }
  await browser.close();
}
