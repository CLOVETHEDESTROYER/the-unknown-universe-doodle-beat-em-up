import type { GameStats, DifficultyMode } from '../types';
import { isCharacterId } from '../characters';
import { isPowerup, restoreLoadout } from './powerups';
import { STORY_CHAPTERS, type StoryChapterId } from '../story/campaignStory';

export const CAMPAIGN_SAVE_KEY = 'unknownUniverse.campaign.v1';
export interface CampaignSave { version: 1; savedAt: number; difficulty: DifficultyMode; stats: GameStats; story: StoryChapterId | null }
// Reject incomplete, corrupt and future saves instead of feeding untrusted data to physics.
export function readCampaignSave(defaults: GameStats): CampaignSave | null {
  try {
    const raw = localStorage.getItem(CAMPAIGN_SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw), s = save.stats;
    if (save.version !== 1 || !Number.isFinite(save.savedAt) || !['EASY','HARD','X-GOD'].includes(save.difficulty) || !s || !isCharacterId(s.selectedCharacterId)) return null;
    const stats = {...defaults};
    for (const key of Object.keys(defaults) as (keyof GameStats)[]) {
      if (typeof defaults[key] === 'boolean' && typeof s[key] !== 'boolean') return null;
      if (typeof defaults[key] === 'number' && (!Number.isFinite(s[key]) || s[key] < 0 || s[key] > 1e9)) return null;
      (stats as any)[key] = s[key];
    }
    if (!Number.isInteger(s.level) || s.level < 1 || s.level > 6 || s.health <= 0 || s.health > 100 || !Number.isInteger(s.lives) || s.lives < 1 || s.lives > s.maxLives || s.maxLives > 99 || s.isVictory || s.isGameOver || s.isDying) return null;
    if (!s.equipment || !isPowerup(s.equipment.active) || !Number.isFinite(s.equipment.hits) || !Array.isArray(s.equipment.unlocked)) return null;
    stats.equipment = restoreLoadout(s.equipment, 'hands');
    stats.isDying = false; stats.activeBossId = null;
    const cp = s.campaignCheckpoint;
    if (cp && cp.level === s.level && Number.isInteger(cp.index) && cp.index >= -1 && cp.index < 100) stats.campaignCheckpoint = {level:cp.level,index:cp.index};
    const f = s.flightSave;
    if (s.level === 5 && f) {
      if (![0,6000,11500,15300].includes(f.checkpoint) || !['twin','spread','lance','homing'].includes(f.weapon) || !Number.isInteger(f.hits) || f.hits < 0 || f.hits > 3 || !Number.isInteger(f.seed) || f.seed < 0 || f.seed > 4294967295 || !Array.isArray(f.collectedWeapons) || !f.collectedWeapons.every((n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<6) || !Array.isArray(f.collected) || !f.collected.every((n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<10)) return null;
      stats.flightSave = f;
    }
    if (save.story !== null && (typeof save.story !== 'string' || !Object.hasOwn(STORY_CHAPTERS,save.story) || save.story === 'level6')) return null;
    if (save.story && (save.story === 'prologue' ? s.level !== 1 : s.level !== Number(save.story.slice(5)) + 1)) return null;
    return {version:1,savedAt:save.savedAt,difficulty:save.difficulty,stats,story:save.story};
  } catch { return null; }
}
export function writeCampaignSave(save: CampaignSave): boolean {
  try { localStorage.setItem(CAMPAIGN_SAVE_KEY, JSON.stringify(save)); return true; }
  catch { return false; }
}
