import Icon from './Icon';

const TONE = {
  warn: 'bg-warn/25 text-warn',
  bad: 'bg-bad/25 text-bad',
  info: 'bg-info/25 text-info',
  mute: 'bg-s2 text-mute',
  danger: 'bg-s2 text-bad',
};

/** Shared full-screen state (15.x): icon, headline, line of copy, optional note, actions. */
export default function ErrorScreen({ tone = 'warn', icon, title, body, note, detail, actions }) {
  return (
    <main className="mx-auto w-full max-w-[430px] min-h-screen flex flex-col pb-6">
      <section className="flex-1 flex flex-col px-6 pt-24 text-center items-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${TONE[tone]}`}>
          <Icon name={icon} className="w-8 h-8" />
        </div>
        <h1 className="mt-6 text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-mute max-w-[30ch]">{body}</p>
        {detail && <p className="mt-5 text-sm text-mute max-w-[32ch]" role="status">{detail}</p>}
        {note && <p className="mt-4 text-xs text-mute">{note}</p>}
      </section>
      <div className="px-5 pb-8 space-y-2.5 pt-6">{actions}</div>
    </main>
  );
}

