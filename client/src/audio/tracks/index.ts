import type { TrackDef } from '../sequencer';
import type { MusicId } from '../spec';
import { boss } from './boss';
import { dungeon } from './dungeon';
import { final_boss } from './final_boss';
import { frost } from './frost';
import { glut } from './glut';
import { gruenwald } from './gruenwald';
import { kristall } from './kristall';
import { menu } from './menu';
import { ruinen } from './ruinen';
import { schatten } from './schatten';

export const TRACKS: Record<MusicId, TrackDef> = { menu, gruenwald, kristall, glut, frost, ruinen, schatten, dungeon, boss, final_boss };
