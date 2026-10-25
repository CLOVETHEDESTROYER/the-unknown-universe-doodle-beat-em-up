import opening from '../public/cutscenes/prologue-v2/scenes.json';
import scratchEnding from '../public/cutscenes/level1-v1/scenes.json';
import graveyardEnding from '../public/cutscenes/level2-v1/scenes.json';
import furnaceEnding from '../public/cutscenes/level3-v1/scenes.json';
import witchwoodEnding from '../public/cutscenes/level4-v1/scenes.json';
import starbreakEnding from '../public/cutscenes/level5-v1/scenes.json';
import finale from '../public/cutscenes/level6-v1/scenes.json';

export type StoryChapterId = 'prologue' | 'level1' | 'level2' | 'level3' | 'level4' | 'level5' | 'level6';
export interface StoryScene {
  id: string;
  title: string;
  image: string;
  speaker: string;
  caption: string[];
  alt: string;
}
export interface StoryChapter {
  id: StoryChapterId;
  title: string;
  continueLabel: string;
  musicLevel: number;
  scenes: StoryScene[];
}

// Import caption data only. Artwork loads when its screen is displayed.
const delivery = (scenes: StoryScene[]): StoryScene[] => scenes.map(scene => ({
  ...scene, image: scene.image.replace(/\.png$/, '.webp')
}));

export const STORY_CHAPTERS: Record<StoryChapterId, StoryChapter> = {
  prologue: {id:'prologue', title:'Earthior to the Unknown', continueLabel:'Begin Level 1', musicLevel:1, scenes:delivery(opening)},
  level1: {id:'level1', title:'After The Scratch', continueLabel:'Enter the Graveyard', musicLevel:1, scenes:delivery(scratchEnding)},
  level2: {id:'level2', title:'After the Graveyard', continueLabel:'Enter the Furnace', musicLevel:2, scenes:delivery(graveyardEnding)},
  level3: {id:'level3', title:'After the Furnace', continueLabel:'Enter Witchwood', musicLevel:3, scenes:delivery(furnaceEnding)},
  level4: {id:'level4', title:'After Witchwood', continueLabel:'Begin Starbreak Run', musicLevel:4, scenes:delivery(witchwoodEnding)},
  level5: {id:'level5', title:'After Starbreak Run', continueLabel:'Enter Dread Planet', musicLevel:5, scenes:delivery(starbreakEnding)},
  level6: {id:'level6', title:'What Remains', continueLabel:'View victory', musicLevel:6, scenes:delivery(finale)}
};

// Final victory has its own boundary: it reports isVictory rather than level 7.
export const LEVEL_EXIT_STORIES: Partial<Record<number, StoryChapterId>> = {1:'level1', 2:'level2', 3:'level3', 4:'level4', 5:'level5'};
