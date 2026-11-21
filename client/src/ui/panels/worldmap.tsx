/** Weltkarte (stilisierte Pergamentkarte mit Schnellreise) und Karte der aktuellen Zone. */
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { useStore } from '../../state/store';
import { WORLD_LINKS, ZONES, ZONE_LIST } from '../../../../shared/src/data/zones';
import type { ZoneDef } from '../../../../shared/src/data/zones';
import { Btn, Tabs, Window, closePanel, cx, send, sfx } from '../common';
import { ZoneMapCanvas } from '../mapview';

const VW = 400, VH = 300;
const P = (z: ZoneDef) => [z.mapPos[0] * (VW / 100), z.mapPos[1] * (VH / 100)] as const;
const rnd = (i: number, n: number) => { const x = Math.sin(i * 91.7 + n * 47.3) * 43758.5453; return x - Math.floor(x); };

/** Kleine Federzeichnungen rund um die Regionen */
function glyph(biome: string, x: number, y: number, k: number): ComponentChildren {
  const t = `translate(${x.toFixed(1)} ${y.toFixed(1)})`;
  switch (biome) {
    case 'gruenwald': return <g transform={t} key={k}><path d="M0 -6 L4 1 H1.2 V4 H-1.2 V1 H-4 Z" fill="#6f8f4e" stroke="#4a3a22" stroke-width=".6" stroke-linejoin="round" /></g>;
    case 'kristall': return <g transform={t} key={k}><path d="M0 -6 L3 -1 L0 4 L-3 -1 Z M-5 2 L-3 -1 M5 2 L3 -1" fill="#a99ad8" stroke="#4a3a22" stroke-width=".6" stroke-linejoin="round" /></g>;
    case 'glut': return <g transform={t} key={k}><path d="M-7 4 L-2 -5 H2 L7 4 Z" fill="#a8674a" stroke="#4a3a22" stroke-width=".6" stroke-linejoin="round" /><path d="M-2 -5 Q0 -9 2 -5" fill="none" stroke="#c0452a" stroke-width="1" /></g>;
    case 'frost': return <g transform={t} key={k}><path d="M-8 4 L-1 -7 L3 -1 L5 -3 L9 4 Z" fill="#c9d3dc" stroke="#4a3a22" stroke-width=".6" stroke-linejoin="round" /><path d="M-1 -7 L-3.4 -3 L-1 -4 L1 -2.6 L1.6 -3.2 Z" fill="#fff" /></g>;
    case 'ruinen': return <g transform={t} key={k}><path d="M-4 4 V-4 H-2 V4 M2 4 V-2 H4 V4 M-5 -4 H-1 M-6 4 H6" fill="none" stroke="#4a3a22" stroke-width=".9" /></g>;
    default: return <g transform={t} key={k}><path d="M-5 0 Q-2 -6 2 -2 Q5 1 1 3 Q-2 4 -2 1" fill="none" stroke="#5a3a7a" stroke-width=".9" stroke-linecap="round" /></g>;
  }
}
const SPOTS = [[-34, -10], [-24, 13], [26, -15], [33, 9], [-12, -23], [12, 22], [-40, 6], [40, -4]];

function WorldMap({ sel, onSel }: { sel: string; onSel: (z: string) => void }) {
  const flags = useStore(s => s.char?.flags);
  const zone = useStore(s => s.zone);
  const known = (id: string) => id === zone || !!flags?.['z:' + id];
  return (
    <div class="wmap">
      <svg class="wmap-art" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <filter id="wm-paper" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="4" seed="7" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 .42  0 0 0 0 .32  0 0 0 0 .18  0 0 0 .55 -.12" />
          </filter>
          <filter id="wm-ink"><feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="2" seed="3" /><feDisplacementMap in="SourceGraphic" scale="2.6" /></filter>
          <radialGradient id="wm-vig" cx="50%" cy="50%" r="72%"><stop offset="60%" stop-color="#5a4020" stop-opacity="0" /><stop offset="100%" stop-color="#3a2810" stop-opacity=".6" /></radialGradient>
        </defs>
        <rect width={VW} height={VH} fill="#e4d3ac" />
        <rect width={VW} height={VH} filter="url(#wm-paper)" />
        <g filter="url(#wm-ink)">
          {/* Land */}
          <path d="M70 60 Q110 20 180 30 Q250 8 310 28 Q390 50 386 120 Q394 200 370 250 Q330 290 260 276 Q200 292 150 268 Q80 272 62 220 Q30 170 52 120 Q48 80 70 60 Z" fill="#ead9b4" stroke="#5a4630" stroke-width="1.6" />
          <path d="M70 60 Q110 20 180 30 Q250 8 310 28 Q390 50 386 120 Q394 200 370 250 Q330 290 260 276 Q200 292 150 268 Q80 272 62 220 Q30 170 52 120 Q48 80 70 60 Z" fill="none" stroke="#5a4630" stroke-width=".5" stroke-dasharray="1 3" transform="translate(200 150) scale(1.05) translate(-200 -150)" opacity=".6" />
          {/* Wellen */}
          {[[18, 40], [30, 250], [20, 150], [352, 286], [120, 12], [300, 8]].map(([x, y], i) => <path key={i} d={`M${x} ${y} q4 -4 8 0 t8 0`} fill="none" stroke="#6a84a0" stroke-width=".9" opacity=".7" />)}
          {/* Fluss von der Quelle */}
          <path d="M152 186 Q130 210 138 236 Q146 256 128 270" fill="none" stroke="#5f8fc0" stroke-width="2.2" stroke-linecap="round" opacity=".75" />
          {ZONE_LIST.filter(z => z.kind === 'overworld').map((z, zi) => {
            const [x, y] = P(z);
            return <g key={z.id} opacity={known(z.id) ? 0.95 : 0.3}>{SPOTS.map(([dx, dy], i) => rnd(zi, i) > 0.22 ? glyph(known(z.id) ? z.biome : 'ruinen', x + dx + (rnd(zi, i + 9) - 0.5) * 8, y + dy + (rnd(i, zi + 5) - 0.5) * 6, i) : null)}</g>;
          })}
          {WORLD_LINKS.map(([a, b], i) => {
            const za = ZONES[a], zb = ZONES[b];
            if (!za || !zb) return null;
            const [x1, y1] = P(za), [x2, y2] = P(zb);
            const mx = (x1 + x2) / 2 + (y2 - y1) * 0.14, my = (y1 + y2) / 2 - (x2 - x1) * 0.14;
            const on = known(a) && known(b);
            return <path key={i} d={`M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`} fill="none" stroke={on ? '#7a2e1c' : '#7a6a50'} stroke-width={on ? 1.7 : 1.1} stroke-dasharray={on ? '5 3' : '1.5 4'} stroke-linecap="round" opacity={on ? 0.9 : 0.55} />;
          })}
          {/* Kompassrose */}
          <g transform="translate(350 252)" stroke="#5a4630" stroke-width=".8" fill="#e4d3ac">
            <circle r="15" fill="none" /><circle r="11" fill="none" stroke-dasharray="1 2" />
            <path d="M0 -19 L3.5 0 L0 19 L-3.5 0 Z" /><path d="M-19 0 L0 -3.5 L19 0 L0 3.5 Z" /><path d="M0 -19 L3.5 0 L0 0 Z M0 19 L-3.5 0 L0 0 Z" fill="#7a2e1c" />
          </g>
        </g>
        <text x="350" y="228" text-anchor="middle" font-family="Georgia, serif" font-size="8" font-weight="700" fill="#5a4630">N</text>
        <text x="64" y="284" font-family="Georgia, serif" font-size="9" font-style="italic" fill="#5a4630" opacity=".8">Die Lande der Ewigen Quelle</text>
        <rect width={VW} height={VH} fill="url(#wm-vig)" />
      </svg>
      {ZONE_LIST.map(z => {
        const k = known(z.id);
        return (
          <button type="button" class={cx('wnode', z.kind, 'b-' + z.biome, !k && 'unknown', z.id === zone && 'here', z.id === sel && 'sel', !!flags?.['t:' + z.id] && 'stone')}
            style={{ left: z.mapPos[0] + '%', top: z.mapPos[1] + '%' }} aria-label={k ? z.name : 'Unentdeckter Ort'} onClick={() => { sfx('ui_click'); onSel(z.id); }}>
            <i class="wnode-dot" />
            <span class="wnode-label"><b>{k ? z.name : '???'}</b>{k && <small>St. {z.level[0]}–{z.level[1]}</small>}</span>
          </button>
        );
      })}
    </div>
  );
}

function ZoneInfo({ id }: { id: string }) {
  const flags = useStore(s => s.char?.flags);
  const zone = useStore(s => s.zone);
  const nearStone = useStore(s => s.nearStone);
  const level = useStore(s => s.char?.level ?? 1);
  const z = ZONES[id];
  if (!z) return null;
  const known = id === zone || !!flags?.['z:' + id];
  const stone = !!flags?.['t:' + id];
  const here = id === zone;
  const travel = () => { send({ t: 'teleport', zone: id }); closePanel(); };
  const parent = z.parent ? ZONES[z.parent] : null;
  return (
    <div class="winfo card">
      {known ? (
        <>
          <div class="qp-type">{z.kind === 'dungeon' ? 'Dungeon' : 'Region'} · Stufe {z.level[0]}–{z.level[1]}</div>
          <h3 class="qp-name">{z.name}</h3>
          <p class="winfo-sub">{z.subtitle}</p>
          {here && <div class="pill gold-pill">Du bist hier</div>}
          {z.kind === 'dungeon' && <p class="note">{parent ? `Eingang in: ${parent.name}. ` : ''}Dungeons setzen sich zurück, sobald sie leer sind. Am Ende wartet ein Boss.</p>}
          {level < z.level[0] - 2 && <p class="note bad">Die Gegner hier sind deutlich stärker als du.</p>}
          {z.kind === 'overworld' && (
            <div class="winfo-travel">
              <div class={cx('ts-status', stone ? 'ok' : 'off')}><i /><span>{stone ? 'Quellstein aktiviert.' : 'Hier hast du noch keinen Quellstein berührt.'}</span></div>
              {stone && !here && <Btn kind="primary" class="block" disabled={!nearStone} onClick={travel} sound="teleport">Reisen</Btn>}
            </div>
          )}
        </>
      ) : (
        <>
          <div class="qp-type">Unentdeckt</div>
          <h3 class="qp-name">???</h3>
          <p class="note">Diesen Ort hast du noch nicht betreten. Folge den Wegen auf der Karte.</p>
        </>
      )}
      <p class={cx('note', 'winfo-hint', nearStone && 'on')}>
        {nearStone ? 'Du stehst an einem Quellstein: Wähle eine Region mit aktiviertem Quellstein und reise sofort dorthin.' : 'Schnellreise: Stelle dich an einen Quellstein und öffne die Karte. Reisen kannst du zu jedem Quellstein, den du schon berührt hast.'}
      </p>
    </div>
  );
}

export function MapPanel() {
  const zone = useStore(s => s.zone);
  const [tab, setTab] = useState<'world' | 'zone'>('world');
  const [sel, setSel] = useState(zone);
  const z = ZONES[zone];
  return (
    <Window title="Karte" onClose={closePanel} class="win-map"
      head={<Tabs tabs={[['world', 'Weltkarte'], ['zone', z?.name ?? 'Umgebung']]} value={tab} onChange={setTab} />}>
      {tab === 'world' ? (
        <div class="mapp">
          <WorldMap sel={sel} onSel={setSel} />
          <ZoneInfo id={sel} />
        </div>
      ) : (
        <div class="mapp zone">
          <ZoneMapCanvas zone={zone} />
          <ul class="legend card">
            <li><i class="lg-self" />Du</li>
            <li><i class="lg-dot" style={{ background: '#7bdc7b' }} />Gruppenmitglied</li>
            <li><i class="lg-dot" style={{ background: '#6fb7ff' }} />Anderer Spieler</li>
            <li><i class="lg-dot" style={{ background: '#ffe9a8' }} />Dorfbewohner</li>
            <li><b class="lg-q">!</b>Quest verfügbar</li>
            <li><b class="lg-q">?</b>Quest abgeben</li>
            <li><i class="lg-dia" />Quellstein</li>
            <li><i class="lg-sq" />Ausgang</li>
            <li><i class="lg-sq" style={{ background: '#e3b75c' }} />Truhe (in Sichtweite)</li>
          </ul>
        </div>
      )}
    </Window>
  );
}
