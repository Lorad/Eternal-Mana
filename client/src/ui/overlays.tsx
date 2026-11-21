/** Vollflächige Einblendungen: Niederlage, Geschichte, Schilder. */
import { useEffect, useState } from 'preact/hooks';
import { store, useStore } from '../state/store';
import { CFG } from '../../../shared/src/config';
import { Btn, send, sfx } from './common';

export function DeathOverlay() {
  const dead = useStore(s => s.dead);
  const inParty = useStore(s => s.party.length > 1);
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => setReady(true), 1200); return () => clearTimeout(t); }, []);
  if (!dead) return null;
  return (
    <div class="death" role="alertdialog" aria-label="Du wurdest besiegt">
      <div class="death-box">
        <div class="logo-orn"><span /><i /><span /></div>
        <h1>Du wurdest besiegt</h1>
        {dead.by && <p class="death-by">Bezwungen von: <b>{dead.by}</b></p>}
        <p class="note">
          {inParty ? 'Verbündete können dich wiederbeleben, wenn sie bei dir interagieren. ' : 'In einer Gruppe könnten Verbündete dich wiederbeleben. '}
          Beim Erwachen am Quellstein verlierst du {Math.round(CFG.player.deathGoldLoss * 100)} % deines Goldes.
        </p>
        {ready && <Btn kind="primary" class="death-btn" autofocus onClick={() => send({ t: 'respawn' })}>Am Quellstein erwachen</Btn>}
      </div>
    </div>
  );
}

export function StoryOverlay() {
  const story = useStore(s => s.story);
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [story]);
  if (!story) return null;
  const last = page >= story.lines.length - 1;
  const next = () => { sfx('dialog_blip'); if (last) store.set({ story: null }); else setPage(p => p + 1); };
  return (
    <div class="story" role="dialog" aria-label={story.title || 'Geschichte'}>
      <div class="story-bars" />
      <div class="story-box">
        {story.title && <><div class="logo-orn"><span /><i /><span /></div><h1>{story.title}</h1></>}
        <p key={page} class="story-line">{story.lines[page]}</p>
        <div class="story-foot">
          <span class="story-dots">{story.lines.map((_, i) => <i class={i === page ? 'on' : i < page ? 'past' : ''} />)}</span>
          {!last && <Btn kind="ghost" onClick={() => { sfx('ui_close'); store.set({ story: null }); }}>Überspringen</Btn>}
          <Btn kind="primary" autofocus onClick={next}>{last ? 'Schließen' : 'Weiter'}</Btn>
        </div>
      </div>
    </div>
  );
}

export function SignOverlay() {
  const sign = useStore(s => s.sign);
  useEffect(() => { sfx('ui_open'); }, []);
  if (sign === null) return null;
  const close = () => { sfx('ui_close'); store.set({ sign: null }); };
  return (
    <div class="backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
      <div class="sign" role="dialog" aria-label="Inschrift">
        <div class="sign-text">{sign.split('\n').map(l => <p>{l}</p>)}</div>
        <Btn class="sign-btn" autofocus onClick={close} sound={null}>Schließen</Btn>
      </div>
    </div>
  );
}
