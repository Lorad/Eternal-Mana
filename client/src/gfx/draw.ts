/** Pixel-Puffer mit Zeichenprimitiven. Kein Anti-Aliasing; alles über gepackte Palettenfarben. */
import { INK, WHITE, Ramp, darker, lighter, mix, outlineOf } from './palette';
import type { FrameRect, Sheet } from './spec';

export type Pt = readonly [number, number];

export class Px {
  d: Uint32Array;
  constructor(public w: number, public h: number) { this.d = new Uint32Array(w * h); }

  get(x: number, y: number): number {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.d[y * this.w + x] : 0;
  }
  set(x: number, y: number, c: number): this {
    x = Math.floor(x); y = Math.floor(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c;
    return this;
  }
  /** Alpha-Blend (src-over). */
  blend(x: number, y: number, c: number): this {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    const sa = (c >>> 24) / 255;
    if (sa <= 0) return this;
    const i = y * this.w + x, dst = this.d[i], da = (dst >>> 24) / 255;
    if (sa >= 1 || da <= 0) { this.d[i] = c; return this; }
    const oa = sa + da * (1 - sa);
    const ch = (sh: number) => Math.round((((c >> sh) & 255) * sa + ((dst >> sh) & 255) * da * (1 - sa)) / oa);
    this.d[i] = ((Math.round(oa * 255) << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)) >>> 0;
    return this;
  }
  px(pts: ReadonlyArray<number>, c: number): this {
    for (let i = 0; i + 1 < pts.length; i += 2) this.set(pts[i], pts[i + 1], c);
    return this;
  }
  rect(x: number, y: number, w: number, h: number, c: number): this {
    x = Math.round(x); y = Math.round(y);
    for (let j = Math.max(0, y); j < Math.min(this.h, y + h); j++)
      for (let i = Math.max(0, x); i < Math.min(this.w, x + w); i++) this.d[j * this.w + i] = c;
    return this;
  }
  /** Rechteck mit abgeschnittenen Ecken. */
  rrect(x: number, y: number, w: number, h: number, c: number): this {
    this.rect(x + 1, y, w - 2, h, c); this.rect(x, y + 1, w, h - 2, c); return this;
  }
  line(x0: number, y0: number, x1: number, y1: number, c: number, t = 1): this {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (let n = 0; n < 400; n++) {
      if (t === 1) this.set(x0, y0, c); else this.rect(x0, y0, t, t, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
    return this;
  }
  /** Gefüllte Ellipse; (cx,cy) in Pixelkoordinaten (Pixel i deckt [i,i+1) ab). */
  ell(cx: number, cy: number, rx: number, ry: number, c: number): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) this.set(x, y, c);
      }
    return this;
  }
  /** Schattierte Kugel/Ellipse: Licht von oben links, harte Bänder aus der Rampe. */
  ball(cx: number, cy: number, rx: number, ry: number, r: Ramp, lo = 0, hi = r.length - 1, bias = 0): this {
    const n = hi - lo + 1;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, rr = nx * nx + ny * ny;
        if (rr > 1) continue;
        let t = 0.56 - (nx * 0.42 + ny * 0.58) * 0.62 - rr * 0.12 + bias;
        t = Math.max(0, Math.min(0.999, t));
        this.set(x, y, r[lo + Math.floor(t * n)]);
      }
    return this;
  }
  poly(pts: ReadonlyArray<Pt>, c: number): this {
    let y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const yc = y + 0.5, xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2)
        for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) this.set(x, y, c);
    }
    return this;
  }
  /** Fügt eine 1px-Outline um alle deckenden Pixel hinzu (getönt nach Nachbarfarbe, wenn c fehlt). */
  outline(c?: number): this {
    const { w, h, d } = this, src = d.slice();
    const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < w && y < h ? src[y * w + x] : 0);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (src[y * w + x] >>> 24 >= 128) continue;
        const n = at(x, y + 1) >>> 24 >= 128 ? at(x, y + 1) : at(x + 1, y) >>> 24 >= 128 ? at(x + 1, y)
          : at(x - 1, y) >>> 24 >= 128 ? at(x - 1, y) : at(x, y - 1) >>> 24 >= 128 ? at(x, y - 1) : 0;
        if (n) d[y * w + x] = c ?? outlineOf(n);
      }
    return this;
  }
  /** Automatisches Kantenlicht: obere/linke Innenkanten heller, untere/rechte dunkler (nur Palettenfarben). */
  rim(light = true, dark = true): this {
    const { w, h, d } = this, src = d.slice();
    const op = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && src[y * w + x] >>> 24 >= 128;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const c = src[y * w + x];
        if (c >>> 24 < 128) continue;
        if (dark && (!op(x + 1, y) || !op(x, y + 1))) d[y * w + x] = darker(c);
        else if (light && (!op(x - 1, y) || !op(x, y - 1))) d[y * w + x] = lighter(c);
      }
    return this;
  }
  /** Kopiert src hinein (src-over). */
  draw(src: Px, dx = 0, dy = 0, flip = false): this {
    dx = Math.round(dx); dy = Math.round(dy);
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const c = src.d[y * src.w + (flip ? src.w - 1 - x : x)];
        const a = c >>> 24;
        if (a === 0) continue;
        if (a === 255) this.set(x + dx, y + dy, c); else this.blend(x + dx, y + dy, c);
      }
    return this;
  }
  /** Zeichnet in eine eigene Ebene, umrandet sie und legt sie darüber. */
  layer(fn: (l: Px) => void, outline = true): this {
    const l = new Px(this.w, this.h);
    fn(l);
    if (outline) l.outline();
    return this.draw(l);
  }
  /** Mischt alle deckenden Pixel Richtung Farbe c. */
  tint(c: number, t: number, keepInk = false): this {
    for (let i = 0; i < this.d.length; i++) {
      const p = this.d[i];
      if (p >>> 24 === 0) continue;
      if (keepInk && p === INK) continue;
      this.d[i] = ((p & 0xff000000) | (mix(p, c, t) & 0xffffff)) >>> 0;
    }
    return this;
  }
  whiten(t = 0.65): this { return this.tint(WHITE, t); }
  alphaMul(a: number): this {
    for (let i = 0; i < this.d.length; i++) {
      const p = this.d[i];
      if (p >>> 24) this.d[i] = ((Math.round((p >>> 24) * a) << 24) | (p & 0xffffff)) >>> 0;
    }
    return this;
  }
  flipX(): Px {
    const o = new Px(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) o.d[y * this.w + x] = this.d[y * this.w + this.w - 1 - x];
    return o;
  }
  /** Skalierte/rotierte Abtastung (nearest): Ziel-Pixel → Quell-Pixel via fn. */
  static map(w: number, h: number, src: Px, fn: (x: number, y: number) => Pt): Px {
    const o = new Px(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = fn(x, y); o.d[y * w + x] = src.get(Math.floor(p[0]), Math.floor(p[1])); }
    return o;
  }
  toCanvas(): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = this.w; cv.height = this.h;
    const ctx = cv.getContext('2d')!;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(this.d.buffer.slice(0) as ArrayBuffer), this.w, this.h), 0, 0);
    return cv;
  }
}

/** Raster-Sheet: n Frames gleicher Größe, Namen "0".."n-1". */
export function gridSheet(frames: Px[], cols: number): Sheet {
  const fw = frames[0].w, fh = frames[0].h, rows = Math.ceil(frames.length / cols);
  const all = new Px(fw * cols, fh * rows);
  const rects: Record<string, FrameRect> = {};
  frames.forEach((f, i) => {
    const x = (i % cols) * fw, y = Math.floor(i / cols) * fh;
    all.draw(f, x, y);
    rects[String(i)] = { x, y, w: fw, h: fh };
  });
  return { canvas: all.toCanvas(), frames: rects };
}

/** Atlas aus benannten Frames unterschiedlicher Größe (Regal-Packung, 1px Abstand). */
export function atlasSheet(items: Array<[string, Px]>, width = 512): Sheet {
  const order = items.map((it, i) => i).sort((a, b) => items[b][1].h - items[a][1].h || a - b);
  const pos: Array<[number, number]> = [];
  let x = 1, y = 1, rowH = 0;
  for (const i of order) {
    const p = items[i][1];
    if (x + p.w + 1 > width) { x = 1; y += rowH + 1; rowH = 0; }
    pos[i] = [x, y];
    x += p.w + 1; rowH = Math.max(rowH, p.h);
  }
  const all = new Px(width, y + rowH + 1);
  const rects: Record<string, FrameRect> = {};
  items.forEach(([name, p], i) => {
    all.draw(p, pos[i][0], pos[i][1]);
    rects[name] = { x: pos[i][0], y: pos[i][1], w: p.w, h: p.h };
  });
  return { canvas: all.toCanvas(), frames: rects };
}


/** Quadratische Bézier-Kurve als Punktliste. */
export function bez(a: Pt, b: Pt, c: Pt, n = 16): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]]);
  }
  return out;
}
/** Dichte Abtastung einer Polylinie (ca. 1 Punkt pro Pixel). */
export function resample(pts: ReadonlyArray<Pt>): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
    for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}
/** Schattierter Schlauch (Ranke, Wurmleib, Tentakel) entlang einer Punktliste; Radius r0 → r1. */
export function tube(l: Px, path: ReadonlyArray<Pt>, r0: number, r1: number, r: Ramp, lo = 1): Pt[] {
  const pts = resample(path), n = pts.length - 1 || 1;
  const rad = (i: number) => r0 + ((r1 - r0) * i) / n;
  pts.forEach((p, i) => l.ell(p[0], p[1], rad(i), rad(i), r[lo]));
  pts.forEach((p, i) => { const q = rad(i); if (q > 1.2) l.ell(p[0] - q * 0.22, p[1] - q * 0.25, q * 0.72, q * 0.72, r[lo + 1]); });
  pts.forEach((p, i) => { const q = rad(i); if (q > 2) l.ell(p[0] - q * 0.42, p[1] - q * 0.45, q * 0.32, q * 0.32, r[Math.min(r.length - 1, lo + 2)]); });
  return pts;
}
/** Kristallprisma: Basis (bx,by) mit halber Breite hw, Spitze (tx,ty). */
export function crystal(l: Px, bx: number, by: number, tx: number, ty: number, hw: number, r: Ramp): void {
  const sx = bx + (tx - bx) * 0.72, sy = by + (ty - by) * 0.72;
  l.poly([[bx - hw, by], [sx - hw, sy], [tx, ty], [sx + hw, sy], [bx + hw, by]], r[2]);
  l.poly([[bx - hw, by], [sx - hw, sy], [tx, ty], [(bx + tx) / 2 - hw * 0.15, (by + ty) / 2], [bx - hw * 0.2, by]], r[3]);
  l.line(bx - hw + 1, by - 1, sx - hw + 1, sy, r[4]);
  l.line(sx - hw + 1, sy, tx, ty + 1, r[4]);
  l.line(bx + hw - 1, by - 1, sx + hw - 1, sy + 1, r[1]);
  l.set(sx - hw + 1, sy + 1, WHITE);
}
