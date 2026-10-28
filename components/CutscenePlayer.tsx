import React, {useEffect, useRef, useState} from 'react';
import type {StoryChapter} from '../story/campaignStory';
import type {GameStats} from '../types';
import './CutscenePlayer.css';

interface Props {chapter: StoryChapter; resumeStats: GameStats; onComplete: () => void;}

/** X God's account of the campaign, also shown when playing a schoolmate. */
const CutscenePlayer: React.FC<Props> = ({chapter, resumeStats, onComplete}) => {
  const [index, setIndex] = useState(0);
  const [imageState, setImageState] = useState<'loading'|'ready'|'error'>('loading');
  const [retry, setRetry] = useState(0);
  const finished = useRef(false);
  const panel = useRef<HTMLElement>(null);
  const scene = chapter.scenes[index];
  const last = index === chapter.scenes.length - 1;

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onComplete();
  };
  const show = (next: number) => {
    setImageState('loading');
    setIndex(next);
  };
  const next = () => {if (last) finish(); else show(index + 1);};

  useEffect(() => {panel.current?.focus();}, []);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (!['ArrowRight','ArrowLeft','Enter',' ','Escape'].includes(event.key)) return;
      // Let a focused button handle Enter/Space once through its native click.
      if (event.target instanceof Element && event.target.closest('button') && ['Enter',' '].includes(event.key)) {
        if (event.repeat) event.preventDefault();
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.repeat) return;
      if (event.key === 'Escape') finish();
      else if (event.key === 'ArrowLeft') {if (index > 0) show(index - 1);}
      else next();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  useEffect(() => {
    const render = () => JSON.stringify({
      mode:'campaign-story', chapter:chapter.id, scene:scene.id,
      index, total:chapter.scenes.length, speaker:scene.speaker, caption:scene.caption,
      busy:imageState === 'loading', image:{src:scene.image, loaded:imageState === 'ready', error:imageState === 'error'},
      resume:resumeStats
    });
    const previous = window.render_game_to_text;
    window.render_game_to_text = render;
    return () => {if (window.render_game_to_text === render) window.render_game_to_text = previous;};
  }, [chapter.id, chapter.scenes.length, scene, index, imageState, resumeStats]);

  return <section ref={panel} tabIndex={-1} className="campaign-story" role="dialog" aria-modal="true"
    aria-label={`${chapter.title} story`} data-chapter={chapter.id} data-scene={scene.id} aria-busy={imageState === 'loading'}>
    <header className="campaign-story-header">
      <p><span>X GOD'S STORY</span>{chapter.title}</p>
      <button type="button" onClick={finish} aria-label="Skip story">Skip story</button>
    </header>
    <div className="campaign-story-art">
      <img key={`${scene.id}-${retry}`} src={scene.image} alt={scene.alt} draggable={false}
        onLoad={() => setImageState('ready')} onError={() => setImageState('error')} />
      {imageState === 'loading' && <p className="campaign-story-status" role="status">Opening story…</p>}
      {imageState === 'error' && <div className="campaign-story-status" role="status">
        <p>This illustration couldn't load. You can still read the story and continue.</p>
        <button type="button" onClick={() => {setImageState('loading');setRetry(n => n+1);}}>Retry image</button>
      </div>}
    </div>
    <footer className="campaign-story-dialogue">
      <div className="campaign-story-copy" aria-live="polite" aria-atomic="true">
        <p className="campaign-story-speaker">{scene.speaker}</p>
        <p className="campaign-story-caption">{scene.caption.map((line,i) => <span key={i}>{line}</span>)}</p>
      </div>
      <nav aria-label="Story navigation">
        <span className="campaign-story-counter">{index + 1} / {chapter.scenes.length}</span>
        <button type="button" disabled={index === 0} onClick={() => show(index - 1)} aria-label="Previous story image">◀</button>
        <button type="button" onClick={next} aria-label={last ? chapter.continueLabel : 'Next story image'}>
          {last ? chapter.continueLabel : 'Next ▶'}
        </button>
      </nav>
    </footer>
  </section>;
};

export default CutscenePlayer;
