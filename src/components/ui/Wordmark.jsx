/** The guessIo logo. Height comes from the caller (default h-10); width follows the artwork. */
export default function Wordmark({ className = 'h-10', glitch = false }) {
  return <img src="/logo.png" alt="guessIo" className={`${glitch ? 'glitch' : ''} w-auto ${className}`.trim()} />;
}
