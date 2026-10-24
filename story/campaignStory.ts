import opening from '../public/cutscenes/prologue-v2/scenes.json';
import scratchEnding from '../public/cutscenes/level1-v1/scenes.json';
import graveyardEnding from '../public/cutscenes/level2-v1/scenes.json';

export type StoryChapterId = 'prologue' | 'level1' | 'level2';
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
  scenes: StoryScene[];
}

// Import caption data only. Artwork loads when its screen is displayed.
const delivery = (scenes: StoryScene[]): StoryScene[] => scenes.map(scene => ({
  ...scene, image: scene.image.replace(/\.png$/, '.webp')
}));

export const STORY_CHAPTERS: Record<StoryChapterId, StoryChapter> = {
  prologue: {id:'prologue', title:'Earthior to the Unknown', continueLabel:'Begin Level 1', scenes:delivery(opening)},
  level1: {id:'level1', title:'After The Scratch', continueLabel:'Enter the Graveyard', scenes:delivery(scratchEnding)},
  level2: {id:'level2', title:'After the Graveyard', continueLabel:'Enter the Furnace', scenes:delivery(graveyardEnding)}
};

// Later chapters use the existing campaign transition until their art is ready.
export const LEVEL_EXIT_STORIES: Partial<Record<number, StoryChapterId>> = {1:'level1', 2:'level2'};
