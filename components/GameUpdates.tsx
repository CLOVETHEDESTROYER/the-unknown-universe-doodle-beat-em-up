import { useEffect, useRef } from 'react';
import { GAME_UPDATES } from '../gameplay/gameUpdates';

interface Props {
  after: number | null;
  onClose: () => void;
}

export default function GameUpdates({ after, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    heading.current?.focus({ preventScroll: true });
    if (element) element.scrollTop = 0;
    return () => element?.close();
  }, []);

  const updates = GAME_UPDATES.filter(update => after === null || update.id > after);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="game-updates-title"
      onCancel={event => { event.preventDefault(); onClose(); }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-[2rem] border-4 border-slate-900 bg-white p-5 font-['Gochi_Hand'] text-slate-900 shadow-2xl backdrop:bg-slate-950/75 sm:p-7"
    >
      <h2 ref={heading} tabIndex={-1} id="game-updates-title" className="mb-3 text-3xl font-bold outline-none sm:text-4xl">What’s New</h2>
      {updates.map(update => (
        <section key={update.id} className="mb-4 rounded-xl border-2 border-violet-200 bg-violet-50 p-3 sm:p-4">
          <h3 className="mb-2 text-xl font-bold text-violet-950 sm:text-2xl">{update.title}</h3>
          <ul className="list-disc space-y-2 pl-5 text-base leading-snug text-slate-800 sm:text-lg">
            {update.changes.map(change => <li key={change}>{change}</li>)}
          </ul>
        </section>
      ))}
      <button type="button" onClick={onClose} className="min-h-11 rounded-full border-2 border-slate-900 bg-violet-700 px-5 py-2 text-lg font-bold text-white hover:bg-violet-800">
        Back to Title
      </button>
    </dialog>
  );
}
