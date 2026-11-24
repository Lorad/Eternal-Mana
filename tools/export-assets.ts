/**
 * ASSET-PIPELINE von Eternal Mana.
 *
 *   Quelle (Pixel-Zeichenprogramme in client/src/gfx/**)  →  npm run assets  →  fertige Spielressourcen
 *
 * Erzeugt:
 *   client/public/assets/sprites/{chars,mobs,bosses}/<key>.png + .json   Spritesheets im Aseprite-JSON-Format (frames + frameTags)
 *   client/public/assets/atlases/{obj,fx,icons}.png + .json               Atlanten im TexturePacker-JSON-Hash-Format (Phaser: load.atlas)
 *   client/public/assets/liquids/<biom>.png, overlays/<name>.png          animierte Flüssigkeiten (Streifen) und Overlay-Texturen
 *   client/public/assets/manifest.json                                    Inhaltsverzeichnis, das der Client beim Start lädt
 *   assets/tiled/<zone>.tmj + terrain_kinds.png                           alle Karten als Tiled-Dateien (Ansicht/Analyse in Tiled)
 *   docs/ASSETS.md, docs/art/*.png                                        Asset-Katalog und Kontaktbögen
 *
 * Läuft in Node mit @napi-rs/canvas als Canvas-Ersatz – kein Browser nötig. Die Ausgabe ist deterministisch.
 */
import { createCanvas, ImageData, loadImage, type Canvas } from '@napi-rs/canvas';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'client/public/assets');
const DOCS = path.join(root, 'docs');

// Canvas-Ersatz für die Zeichenprogramme (sie nutzen nur document.createElement('canvas') und ImageData)
(globalThis as any).document = { createElement: (t: string) => { if (t !== 'canvas') throw new Error('nur canvas'); return createCanvas(1, 1); } };
(globalThis as any).ImageData = ImageData;

const spec = await import('../client/src/gfx/spec');
const gen = await import('../client/src/gfx/build');
const { objSource } = await import('../client/src/gfx/objects/index');
const { ZONE_LIST } = await import('../shared/src/data/zones');
const { getMap } = await import('../shared/src/maps/mapgen');
const { SKILL_LIST } = await import('../shared/src/data/skills');
const { ITEMS } = await import('../shared/src/data/items');
const { FACTION_LIST } = await import('../shared/src/data/factions');
const { traderGoods } = await import('../shared/src/data/events');
const { REGIONS } = await import('../shared/src/data/worlditems');
type Rect = { x: number; y: number; w: number; h: number };
const png = (c: any): Buffer => (c as Canvas).toBuffer('image/png');
const write = (file: string, data: Buffer | string) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data); };
const rel = (f: string) => path.relative(OUT, f).split(path.sep).join('/');

fs.rmSync(OUT, { recursive: true, force: true });
const t0 = performance.now();
const bundle = gen.buildGfx();
const manifest: any = { version: 2, generated: 'npm run assets', sheets: {}, outfits: {}, atlases: {}, liquids: {}, overlays: {}, mobMeta: bundle.mobMeta, bossMeta: bundle.bossMeta };
const catalog: { group: string; rows: string[][] }[] = [];

// ---------------------------------------------------------------- Spritesheets (Raster)
function asepriteJson(image: string, w: number, h: number, fw: number, fh: number, cols: number, rows: number, anims: Record<string, { start: number; len: number; fps: number; loop: boolean }>, rowNames: string[]) {
  const frames: any = {}, frameTags: any[] = [];
  for (let r = 0; r < rows; r++) for (const [name, a] of Object.entries(anims)) {
    const tag = rowNames.length > 1 ? `${name}_${rowNames[r]}` : name;
    frameTags.push({ name: tag, from: r * cols + a.start, to: r * cols + a.start + a.len - 1, direction: 'forward', repeat: a.loop ? 0 : 1 });
    for (let i = 0; i < a.len; i++) {
      const idx = r * cols + a.start + i;
      frames[String(idx)] = { frame: { x: (a.start + i) * fw, y: r * fh, w: fw, h: fh }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: fw, h: fh }, sourceSize: { w: fw, h: fh }, duration: Math.round(1000 / a.fps) };
    }
  }
  return { frames, meta: { app: 'eternal-mana asset pipeline', version: '2', image, format: 'RGBA8888', size: { w, h }, scale: '1', frameTags } };
}
function exportSheets(group: string, sheets: Record<string, any>, fwOf: (key: string) => [number, number], cols: number, rows: number, anims: any, rowNames: string[]) {
  const table: string[][] = [];
  for (const key of Object.keys(sheets).sort()) {
    const s = sheets[key];
    let [fw, fh] = fwOf(key);
    if (!fw || !fh) { fw = s.canvas.width / cols; fh = s.canvas.height / rows; }
    const file = path.join(OUT, 'sprites', group, key + '.png');
    write(file, png(s.canvas));
    write(file.replace(/\.png$/, '.json'), JSON.stringify(asepriteJson(key + '.png', s.canvas.width, s.canvas.height, fw, fh, cols, rows, anims, rowNames)));
    if (s.canvas.width !== fw * cols || s.canvas.height !== fh * rows) console.warn('  WARNUNG: ' + `${key}: Sheet ${s.canvas.width}x${s.canvas.height} passt nicht zum Raster ${cols}x${rows} à ${fw}x${fh} (noch v1?)`);
    manifest.sheets[key] = { file: rel(file), fw, fh, cols, rows };
    table.push([`\`${key}\``, `${fw}×${fh}`, `${cols * rows}`, Object.entries(anims).map(([n, a]: any) => `${n} ${a.len}`).join(', ')]);
  }
  catalog.push({ group: `Spritesheets: ${group}`, rows: [['Sheet', 'Frame', 'Frames', 'Animationen (Frames)'], ...table] });
}
exportSheets('chars', bundle.chars, () => [spec.CHAR_FRAME_W, spec.CHAR_FRAME_H], spec.CHAR_COLS, 3, spec.CHAR_ANIMS, ['down', 'side', 'up']);
exportSheets('mobs', bundle.mobs, k => { const m = bundle.mobMeta[k.replace(/^mob_/, '')]; return [m?.w ?? 0, m?.h ?? 0]; }, spec.MOB_FRAMES, 1, spec.MOB_ANIMS, ['']);
exportSheets('bosses', bundle.bosses, k => { const m = bundle.bossMeta[k.replace(/^boss_/, '')]; return [m?.w ?? 0, m?.h ?? 0]; }, spec.BOSS_FRAMES, 1, spec.BOSS_ANIMS, ['']);

// ---------------------------------------------------------------- Gewand-Varianten (Garderobe)
// Gleiches Raster wie die Klassen-Sheets, aber eigener Manifest-Abschnitt `outfits`: Der Client lädt sie erst bei Bedarf
// (runtime.ts → loadCharSheet). Nur PNG – Raster und Animations-Tags stehen in der JSON-Datei des Klassen-Sheets.
// Als Paletten-PNG geschrieben (wenige Farben je Sheet), das halbiert die Dateigröße gegenüber RGBA.
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function pngChunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]), out = Buffer.alloc(body.length + 8);
  let c = 0xffffffff;
  for (const b of body) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  out.writeUInt32BE(data.length, 0); body.copy(out, 4); out.writeUInt32BE((c ^ 0xffffffff) >>> 0, body.length + 4);
  return out;
}
/** Paletten-PNG (8 Bit, bis 256 Farben inkl. Alpha); null, wenn das Bild mehr Farben hat. */
function pngIndexed(canvas: any): Buffer | null {
  const w = canvas.width, h = canvas.height, px = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const pal = new Map<number, number>(), raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, a = px[i + 3], key = a === 0 ? 0 : ((px[i] << 24) | (px[i + 1] << 16) | (px[i + 2] << 8) | a) >>> 0;
    let n = pal.get(key);
    if (n === undefined) { n = pal.size; if (n > 255) return null; pal.set(key, n); }
    raw[y * (w + 1) + 1 + x] = n;
  }
  const keys = [...pal.keys()], plte = Buffer.alloc(keys.length * 3), trns = Buffer.alloc(keys.length);
  keys.forEach((k, n) => { plte[n * 3] = k >>> 24; plte[n * 3 + 1] = (k >>> 16) & 255; plte[n * 3 + 2] = (k >>> 8) & 255; trns[n] = k & 255; });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 3;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', ihdr), pngChunk('PLTE', plte), pngChunk('tRNS', trns), pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })), pngChunk('IEND', Buffer.alloc(0))]);
}
const outfits = gen.buildOutfits();
{
  const table: string[][] = [];
  let bytes = 0;
  for (const key of Object.keys(outfits).sort()) {
    const s = outfits[key], file = path.join(OUT, 'sprites', 'outfits', key + '.png'), data = pngIndexed(s.canvas) ?? png(s.canvas);
    write(file, data); bytes += data.length;
    if (s.canvas.width !== spec.CHAR_FRAME_W * spec.CHAR_COLS || s.canvas.height !== spec.CHAR_FRAME_H * 3) console.warn(`  WARNUNG: ${key}: Sheet passt nicht zum Figurenraster`);
    const base = key.slice(0, key.lastIndexOf('_'));
    manifest.outfits[key] = { file: rel(file), fw: spec.CHAR_FRAME_W, fh: spec.CHAR_FRAME_H, cols: spec.CHAR_COLS, rows: 3, base };
    table.push([`\`${key}\``, `\`${base}\``, `${spec.CHAR_FRAME_W}×${spec.CHAR_FRAME_H}`, `${spec.CHAR_COLS * 3}`, `${(data.length / 1024).toFixed(1)} kB`]);
  }
  catalog.push({ group: `Spritesheets: outfits (Garderobe; ${Object.keys(outfits).length} Sheets, ${(bytes / 1024).toFixed(0)} kB; werden erst bei Bedarf geladen, Raster und Animationen wie das Klassen-Sheet)`, rows: [['Sheet', 'Klasse', 'Frame', 'Frames', 'Größe'], ...table] });
}

// ---------------------------------------------------------------- Atlanten (TexturePacker-JSON-Hash)
function exportAtlas(name: string, canvas: any, frames: Record<string, Rect>, describe: (n: string) => string) {
  const file = path.join(OUT, 'atlases', name + '.png');
  write(file, png(canvas));
  const out: any = {};
  for (const n of Object.keys(frames).sort()) { const f = frames[n]; out[n] = { frame: { x: f.x, y: f.y, w: f.w, h: f.h }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: f.w, h: f.h }, sourceSize: { w: f.w, h: f.h } }; }
  write(file.replace(/\.png$/, '.json'), JSON.stringify({ frames: out, meta: { app: 'eternal-mana asset pipeline', version: '2', image: name + '.png', format: 'RGBA8888', size: { w: canvas.width, h: canvas.height }, scale: '1' } }));
  manifest.atlases[name] = { file: rel(file), json: rel(file.replace(/\.png$/, '.json')), frames: Object.keys(frames).length };
  // Katalog: Animationen zusammenfassen
  const groups = new Map<string, { n: number; w: number; h: number }>();
  for (const n of Object.keys(frames)) { const m = /^(.*)_(\d+)$/.exec(n); const base = m ? m[1] : n; const g = groups.get(base) ?? { n: 0, w: frames[n].w, h: frames[n].h }; g.n++; groups.set(base, g); }
  const rows = [...groups].sort((a, b) => a[0].localeCompare(b[0])).map(([base, g]) => [`\`${base}\``, `${g.w}×${g.h}`, g.n > 1 ? `${g.n} (\`_0…_${g.n - 1}\`)` : '1', describe(base)]);
  catalog.push({ group: `Atlas: ${name} (${Object.keys(frames).length} Frames, ${canvas.width}×${canvas.height})`, rows: [['Name', 'Größe', 'Frames', 'Herkunft / Verwendung'], ...rows] });
}
const objUse = (n: string) => {
  const mod = objSource.get(n) ?? objSource.get(n + '_0') ?? '?';
  const use = n.startsWith('crit_') ? 'Kleintier (Umgebung)' : n.startsWith('d_') ? 'Dungeon-Ausstattung' : /^(chest|door|gate|lever|plate|brazier|torch|wall_torch|boulder|push|quellstein|portal|cave|stairs|spikes|turret|node|shard|drop|grave|seal)/.test(n) ? 'interaktives Objekt' : 'Weltdeko';
  return `${use} · Modul \`objects/${mod}.ts\`${mod === 'legacy' ? ' (v1)' : ''}`;
};
exportAtlas('obj', bundle.obj.canvas, bundle.obj.frames, objUse);
exportAtlas('fx', bundle.fx.canvas, bundle.fx.frames, n => (/^(slash|thrust|smash|claw|bite|hit|block)/.test(n) ? 'Kampf: Waffenspur/Treffer' : /^(bolt|arrow|dagger|lance|spore|orb)/.test(n) ? 'Geschoss' : /^explosion/.test(n) ? 'Explosion' : /^(leaf|petal|snow|rain|ash|ember|mote|drip|heat|void_mote|godray)/.test(n) ? 'Wetter/Umgebung' : /^(exclaim|question|bubble|target|arrow_marker|status)/.test(n) ? 'Weltmarker' : 'Effekt'));

// Prüfung: jedes Icon eines Gegenstands existiert im Atlas (sonst zeigt das Spiel den Ersatz-Edelstein), und die
// Namen in UNIQUE_ICONS passen zu den benannten Schmuckstücken der Fraktionen und der fahrenden Händlerin.
function checkItemIcons() {
  const known = new Set<string>(spec.ITEM_ICONS as readonly string[]);
  const missing = Object.values(ITEMS as Record<string, { id: string; icon: string }>).filter(b => !known.has(b.icon)).map(b => `${b.id} → ${b.icon}`);
  if (missing.length) console.warn('  WARNUNG: Gegenstände ohne Icon im Atlas: ' + missing.join(', '));
  const names = new Set<string>();
  for (const f of FACTION_LIST) for (const o of f.stock) if (o.unique) names.add(o.unique.name);
  for (const z of REGIONS) { const g = traderGoods(z); for (const o of [...g.fixed, ...g.pool]) if (o.unique) names.add(o.unique.name); }
  const uq: Record<string, string> = spec.UNIQUE_ICONS;
  for (const n of names) if (!uq[n]) console.warn(`  WARNUNG: benanntes Schmuckstück ohne eigenes Icon (UNIQUE_ICONS in gfx/spec.ts): ${n}`);
  for (const n of Object.keys(uq)) {
    if (!names.has(n)) console.warn(`  WARNUNG: UNIQUE_ICONS nennt ein unbekanntes Schmuckstück: ${n}`);
    if (!known.has(uq[n])) console.warn(`  WARNUNG: UNIQUE_ICONS verweist auf ein fehlendes Icon: ${uq[n]}`);
  }
}

// Icons: alle Gegenstands-Icons und jede Skill-Glyphe in jeder Elementfarbe
{
  const keys: [string, string | undefined][] = spec.ITEM_ICONS.map((n: string) => [`item_${n}`, undefined] as [string, undefined]);
  const els = ['phys', 'fire', 'water', 'earth', 'wind', 'light', 'dark'];
  for (const g of spec.SKILL_GLYPHS) for (const el of els) keys.push([`skill_${g}`, el]);
  const cols = 20, S = 24, pad = 1;
  const cv = createCanvas(cols * (S + pad) + pad, Math.ceil(keys.length / cols) * (S + pad) + pad);
  const ctx = cv.getContext('2d');
  const frames: Record<string, Rect> = {};
  for (let i = 0; i < keys.length; i++) {
    const [k, el] = keys[i];
    const url = gen.iconUrl(k, el as any);
    const img = await loadImage(Buffer.from(url.split(',')[1], 'base64'));
    const x = pad + (i % cols) * (S + pad), y = pad + Math.floor(i / cols) * (S + pad);
    ctx.drawImage(img, x, y);
    frames[el ? `${k}_${el}` : k] = { x, y, w: S, h: S };
  }
  exportAtlas('icons', cv, frames, n => (n.startsWith('item_') ? 'Gegenstands-Icon (Inventar, Händler, Beute)' : 'Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste)'));
  void SKILL_LIST; checkItemIcons();
}

// ---------------------------------------------------------------- Flüssigkeiten & Overlays
for (const biome of Object.keys(bundle.liquids)) {
  const fr = (bundle.liquids as any)[biome] as Canvas[];
  const w = fr[0].width, h = fr[0].height;
  const cv = createCanvas(w * fr.length, h);
  const ctx = cv.getContext('2d');
  fr.forEach((f, i) => ctx.drawImage(f as any, i * w, 0));
  const file = path.join(OUT, 'liquids', biome + '.png');
  write(file, png(cv));
  manifest.liquids[biome] = { file: rel(file), fw: w, fh: h, frames: fr.length };
}
catalog.push({ group: 'Flüssigkeiten (nahtlos kachelnde Animationsstreifen)', rows: [['Biom', 'Frame', 'Frames'], ...Object.entries(manifest.liquids).map(([b, m]: any) => [`\`liquids/${b}.png\``, `${m.fw}×${m.fh}`, String(m.frames)])] });
for (const name of Object.keys(bundle.overlays ?? {})) {
  const file = path.join(OUT, 'overlays', name + '.png');
  write(file, png((bundle.overlays as any)[name]));
  manifest.overlays[name] = { file: rel(file) };
}
catalog.push({ group: 'Overlays (256×256, nahtlos)', rows: [['Datei', 'Verwendung'], ...Object.keys(manifest.overlays).map(n => [`\`overlays/${n}.png\``, n === 'fog' ? 'ziehender Nebel' : n === 'cloud_shadow' ? 'Wolkenschatten über der Oberwelt' : n === 'leaf_shadow' ? 'Blätterschatten im Grünwald' : 'Overlay'])] });
write(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));

// ---------------------------------------------------------------- Tiled-Karten
{
  const dir = path.join(root, 'assets/tiled');
  fs.rmSync(dir, { recursive: true, force: true });
  const KINDS = ['void', 'ground', 'ground2', 'path', 'floor', 'wall', 'liquid', 'bridge', 'hazard'];
  const COL = ['#07080d', '#4f9a3e', '#8fbf4a', '#c69a5a', '#8a8794', '#4a4458', '#2aa7a0', '#8a5a34', '#c0392b'];
  const ts = createCanvas(16 * KINDS.length, 16), c = ts.getContext('2d');
  KINDS.forEach((_, i) => { c.fillStyle = COL[i]; c.fillRect(i * 16, 0, 16, 16); c.strokeStyle = 'rgba(0,0,0,.25)'; c.strokeRect(i * 16 + 0.5, 0.5, 15, 15); });
  write(path.join(dir, 'terrain_kinds.png'), png(ts));
  for (const z of ZONE_LIST) {
    const m = getMap(z.id);
    let oid = 1;
    const obj = (name: string, type: string, x: number, y: number, props: Record<string, any> = {}) => ({ id: oid++, name, type, x, y, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: Object.entries(props).filter(([, v]) => typeof v !== 'object').map(([k, v]) => ({ name: k, type: typeof v === 'number' ? 'float' : typeof v === 'boolean' ? 'bool' : 'string', value: v })) });
    const tmj = {
      type: 'map', version: '1.10', tiledversion: '1.10.2', orientation: 'orthogonal', renderorder: 'right-down', infinite: false,
      width: m.w, height: m.h, tilewidth: 16, tileheight: 16, nextlayerid: 5, nextobjectid: 0,
      properties: [{ name: 'zone', type: 'string', value: z.id }, { name: 'biome', type: 'string', value: z.biome }, { name: 'seed', type: 'int', value: z.seed }],
      tilesets: [{ firstgid: 1, name: 'terrain_kinds', image: 'terrain_kinds.png', imagewidth: 16 * KINDS.length, imageheight: 16, tilewidth: 16, tileheight: 16, tilecount: KINDS.length, columns: KINDS.length, margin: 0, spacing: 0,
        tiles: KINDS.map((k, i) => ({ id: i, type: k })) }],
      layers: [
        { id: 1, name: 'terrain', type: 'tilelayer', x: 0, y: 0, width: m.w, height: m.h, opacity: 1, visible: true, data: Array.from(m.tiles, t => t + 1) },
        { id: 2, name: 'decor', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true, objects: m.decor.map(d => obj(d.f, 'decor', d.x, d.y)) },
        { id: 3, name: 'objects', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true, objects: m.objects.map(o => obj(o.tag ?? o.type, o.type, o.x, o.y, o.props ?? {})) },
        { id: 4, name: 'spawns', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true, objects: m.spawns.map(s => obj(s.mob, 'spawn', s.x, s.y, { level: s.lvl, group: s.group, elite: !!s.elite })) },
      ],
    };
    tmj.nextobjectid = oid;
    write(path.join(dir, z.id + '.tmj'), JSON.stringify(tmj));
  }
}

// ---------------------------------------------------------------- Kontaktbögen & Katalog
async function contact(name: string, items: { label: string; canvas: any; rect?: Rect }[], scale: number, cellW: number, cellH: number, cols: number, bg = '#2b3040') {
  const rows = Math.ceil(items.length / cols);
  const cv = createCanvas(cols * cellW, rows * cellH), ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
  items.forEach((it, i) => {
    const r = it.rect ?? { x: 0, y: 0, w: it.canvas.width, h: it.canvas.height };
    const cx = (i % cols) * cellW, cy = Math.floor(i / cols) * cellH;
    const s = Math.min(scale, (cellW - 6) / r.w, (cellH - 18) / r.h);
    const sc = s >= 1 ? Math.floor(s) : s;
    ctx.drawImage(it.canvas, r.x, r.y, r.w, r.h, cx + (cellW - r.w * sc) / 2, cy + (cellH - 14 - r.h * sc), r.w * sc, r.h * sc);
    ctx.fillStyle = '#cfd6e6'; ctx.fillText(it.label, cx + cellW / 2, cy + cellH - 3);
  });
  write(path.join(DOCS, 'art', name + '.png'), png(cv));
}
const frameOf = (s: any, n: string) => ({ canvas: s.canvas, rect: s.frames[n] as Rect });
await contact('chars', Object.keys(bundle.chars).sort().map(k => ({ label: k, ...frameOf(bundle.chars[k], '0') })), 3, 112, 140, 10, '#4c7a3c');
await contact('outfits', spec.CLASS_IDS.flatMap((c: string) => [`char_${c}`, ...spec.OUTFIT_IDS.map((o: string) => `char_${c}_${o}`)]).map((k: string) => ({ label: k.replace('char_', ''), ...frameOf(outfits[k] ?? bundle.chars[k], '0') })), 3, 132, 140, 6, '#3c4a5c');
await contact('mobs', Object.keys(bundle.mobs).sort().map(k => ({ label: k.replace('mob_', ''), ...frameOf(bundle.mobs[k], '0') })), 3, 150, 150, 9, '#3c4a5c');
await contact('bosses', Object.keys(bundle.bosses).sort().map(k => ({ label: k.replace('boss_', ''), ...frameOf(bundle.bosses[k], '0') })), 2, 270, 280, 6, '#2a2636');
{
  const names = Object.keys(bundle.obj.frames).filter(n => !/_[1-9]\d*$/.test(n)).sort();
  await contact('objects', names.map(n => ({ label: n.replace(/_0$/, ''), ...frameOf(bundle.obj, n) })), 2, 124, 150, 14, '#4c7a3c');
  const fxn = Object.keys(bundle.fx.frames).filter(n => !/_[1-9]\d*$/.test(n) && bundle.fx.frames[n].w <= 128).sort();
  await contact('fx', fxn.map(n => ({ label: n.replace(/_0$/, ''), ...frameOf(bundle.fx, n) })), 2, 110, 110, 16, '#1c2030');
}
{
  let md = '# Asset-Katalog\n\n> Automatisch erzeugt von `npm run assets` – nicht von Hand bearbeiten.\n\n';
  md += 'Alle Ressourcen liegen unter `client/public/assets/` und werden beim Spielstart über `manifest.json` geladen.\n';
  md += 'Quelle jeder Grafik ist ein Zeichenprogramm in `client/src/gfx/` (siehe `docs/ART_BIBLE.md`). Kontaktbögen: `docs/art/`.\n\n';
  md += '| Format | Verwendung | Lesbar mit |\n|---|---|---|\n| `sprites/**/<key>.png` + `.json` | Raster-Spritesheets mit Animations-Tags | Aseprite (Import Sprite Sheet / JSON), Phaser |\n| `atlases/*.png` + `.json` | gepackte Atlanten, JSON-Hash | TexturePacker, Phaser `load.atlas` |\n| `assets/tiled/*.tmj` | Karten aller Zonen (Terrain-Art, Deko, Objekte, Gegner) | Tiled |\n\n';
  for (const g of catalog) {
    md += `## ${g.group}\n\n| ${g.rows[0].join(' | ')} |\n|${g.rows[0].map(() => '---').join('|')}|\n`;
    for (const r of g.rows.slice(1)) md += `| ${r.join(' | ')} |\n`;
    md += '\n';
  }
  write(path.join(DOCS, 'ASSETS.md'), md);
}
const legacy = [...objSource].filter(([, m]) => m === 'legacy').map(([n]) => n);
const size = (dir: string): number => fs.readdirSync(dir, { withFileTypes: true }).reduce((a, e) => a + (e.isDirectory() ? size(path.join(dir, e.name)) : fs.statSync(path.join(dir, e.name)).size), 0);
console.log(`Assets exportiert in ${((performance.now() - t0) / 1000).toFixed(1)} s → ${rel(OUT) || 'client/public/assets'} (${(size(OUT) / 1024).toFixed(0)} kB)`);
console.log(`  ${Object.keys(manifest.sheets).length} Spritesheets, ${Object.keys(manifest.outfits).length} Gewand-Sheets, obj ${manifest.atlases.obj.frames} Frames, fx ${manifest.atlases.fx.frames} Frames, icons ${manifest.atlases.icons.frames}`);
if (legacy.length) console.log(`  Hinweis: ${legacy.length} Objekt-Frames stammen noch aus v1 (objects/legacy.ts): ${legacy.slice(0, 12).join(', ')}${legacy.length > 12 ? ' …' : ''}`);
