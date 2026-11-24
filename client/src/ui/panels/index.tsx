/** Verteiler für die Fenster im Spiel. */
import type { Panel } from '../../state/store';
import { CharacterPanel } from './character';
import { InventoryPanel } from './inventory';
import { MapPanel } from './worldmap';
import { PartyPanel } from './party';
import { QuestPanel } from './quests';
import { SettingsPanel } from './settings';
import { SkillsPanel } from './skills';
import { HelpPanel, PausePanel } from './system';
import { RepPanel } from '../world';

export function PanelHost({ panel }: { panel: Panel }) {
  switch (panel) {
    case 'inventory': return <InventoryPanel />;
    case 'character': return <CharacterPanel />;
    case 'skills': return <SkillsPanel />;
    case 'quests': return <QuestPanel />;
    case 'map': return <MapPanel />;
    case 'party': return <PartyPanel />;
    case 'settings': return <SettingsPanel />;
    case 'menu': return <PausePanel />;
    case 'help': return <HelpPanel />;
    case 'ruf': return <RepPanel />;
  }
  return null;
}
