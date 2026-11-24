/** Einstiegspunkt der HTML-Oberfläche (Preact). Liegt als Overlay über dem Spiel-Canvas. */
import { render } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { onSettingsChange, settings } from '../state/settings';
import { useStore } from '../state/store';
import { TooltipLayer, clamp, cx, hideTip, uiScale } from './common';
import { CraftWindow } from './craft';
import { NpcDialog } from './dialog';
import { EndgameWindow } from './endgame';
import { Hud } from './hud';
import { DeathOverlay, SignOverlay, StoryOverlay } from './overlays';
import { PanelHost } from './panels';
import { CineOverlay, LoreOverlay } from './story';
import { SettingsPanel } from './panels/settings';
import { BootScreen, CharSelect, LoadingScreen, MainMenu } from './screens';
import './styles/base.css';
import './styles/screens.css';
import './styles/hud.css';
import './styles/panels.css';
import './styles/craft.css';
import './styles/endgame.css';

/** Berechnet den Maßstab: Die Oberfläche ist für rund 1280×720 entworfen und skaliert mit dem Fenster. */
function computeScale() {
  const w = window.innerWidth, h = window.innerHeight;
  const landscape = w >= h;
  const r = landscape ? Math.min(w / 1280, h / 720) : Math.min(w / 620, h / 1000);
  // Kleine Fenster: proportional verkleinern (mit Untergrenze für Lesbarkeit). Große Fenster: nur gedämpft mitwachsen.
  const auto = r < 1 ? Math.max(landscape ? 0.7 : 0.62, r) : Math.min(1.8, 1 + (r - 1) * 0.7);
  const s = Math.round(auto * clamp(settings.uiScale || 1, 0.8, 1.4) * 100) / 100;
  uiScale.s = s; uiScale.w = w / s; uiScale.h = h / s;
  return s;
}

function Root() {
  const ref = useRef<HTMLDivElement>(null);
  const [, bump] = useState(0);
  const screen = useStore(s => s.screen);
  const panel = useStore(s => s.panel);
  const hasDialog = useStore(s => !!s.dialog);
  const hasCraft = useStore(s => !!s.craft);
  const hasEndgame = useStore(s => !!s.endgame);
  const hasSign = useStore(s => s.sign !== null);
  const hasStory = useStore(s => !!s.story);
  const hasCine = useStore(s => !!s.cine);
  const hasLore = useStore(s => !!s.lore);
  const dead = useStore(s => !!s.dead);
  const s = computeScale();

  useEffect(() => {
    const f = () => bump(n => n + 1);
    window.addEventListener('resize', f);
    const off = onSettingsChange(f);
    return () => { window.removeEventListener('resize', f); off(); };
  }, []);
  useLayoutEffect(() => { hideTip(); }, [screen, panel, hasDialog, hasCraft, hasEndgame]);

  const narrow = uiScale.w < 860, short = uiScale.h < 600;
  return (
    <div ref={ref} class={cx('em-root', narrow && 'is-narrow', short && 'is-short', uiScale.w < uiScale.h && 'is-portrait', hasCine && 'is-cine')}
      style={{ width: uiScale.w + 'px', height: uiScale.h + 'px', transform: `scale(${s})` }}>
      {screen === 'boot' && <BootScreen />}
      {screen === 'menu' && <MainMenu />}
      {screen === 'chars' && <CharSelect />}
      {screen === 'loading' && <LoadingScreen />}
      {screen === 'game' && <Hud />}
      {screen === 'game' && panel && !dead && <PanelHost panel={panel} />}
      {screen !== 'game' && panel === 'settings' && <SettingsPanel />}
      {screen === 'game' && hasDialog && !dead && <NpcDialog />}
      {screen === 'game' && hasCraft && !dead && <CraftWindow />}
      {screen === 'game' && hasEndgame && !dead && <EndgameWindow />}
      {screen === 'game' && hasSign && <SignOverlay />}
      {screen === 'game' && dead && <DeathOverlay />}
      {hasStory && screen === 'game' && <StoryOverlay />}
      {hasLore && screen === 'game' && !dead && <LoreOverlay />}
      {hasCine && screen === 'game' && <CineOverlay />}
      <TooltipLayer root={() => ref.current} />
    </div>
  );
}

export function mountUi(root: HTMLElement): void {
  render(<Root />, root);
}
