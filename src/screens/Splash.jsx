import Wordmark from '../components/ui/Wordmark';

export default function Splash({ status = 'Initializing…' }) {
  return (
    <main className="mx-auto w-full max-w-[430px] min-h-screen flex flex-col items-center justify-center px-6">
      <Wordmark className="text-4xl animate-rise" />
      <div className="mt-6 w-40 h-1 rounded-full bg-s2 overflow-hidden" aria-hidden="true">
        <div className="h-full w-1/3 rounded-full bg-g animate-pulse" />
      </div>
      <div className="mt-4 text-xs text-mute font-semibold" role="status">{status}</div>
    </main>
  );
}
