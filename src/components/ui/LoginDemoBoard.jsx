import { useEffect, useState } from "react";
import Wordmark from "./Wordmark";
import Tile from "./Tile";

// Mirrors guessIo's EASY tier: 4-digit code, 10 guess limit (see
// game/matchConfig.js ROUND_TIER_CONFIG.EASY on the backend). This is a
// purely cosmetic, client-side simulation for the login screen - it plays
// against itself and never talks to the server.
const CODE_LENGTH = 4;
const GUESS_LIMIT = 10;

const FLIP_DELAY_MS = 220; // pause after the guess appears, before reveal starts
const FLIP_STAGGER_MS = 110; // gap between each cell's color reveal
const FLIP_DURATION_MS = 150;
const ROW_PAUSE_MS = 1000; // pause between rows so each guess is readable
const PHRASE_HOLD_MS = 2000;
const PHRASE_EXIT_MS = 400;
const BOARD_FADE_MS = 350;

const PHRASES = [
  { text: "ANALYSE" },
  { text: "OUTSMART" },
  { text: "CRACK THE CODE" },
  { wordmark: true },
];

const STATE_CLASS = { correct: "c", present: "p", wrong: "w" };

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("aborted", "AbortError"));
    });
  });
}

// Sample without replacement from 0-9 so every code/guess has unique
// digits (no repeats) - matches guessIo's actual code generation.
function randomDigits(len) {
  const pool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  let out = "";
  for (let i = 0; i < len; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out += pool[idx];
    pool.splice(idx, 1);
  }
  return out;
}

// Standard Mastermind rules: exact position matches first (correct), then
// remaining digits matched by value regardless of position (present),
// else wrong.
function evaluateGuess(secret, guess) {
  const secretArr = secret.split("");
  const guessArr = guess.split("");
  const result = new Array(guessArr.length).fill("wrong");
  const used = new Array(secretArr.length).fill(false);

  for (let i = 0; i < guessArr.length; i++) {
    if (guessArr[i] === secretArr[i]) {
      result[i] = "correct";
      used[i] = true;
    }
  }
  for (let j = 0; j < guessArr.length; j++) {
    if (result[j] === "correct") continue;
    for (let k = 0; k < secretArr.length; k++) {
      if (!used[k] && secretArr[k] === guessArr[j]) {
        result[j] = "present";
        used[k] = true;
        break;
      }
    }
  }
  return result;
}

/**
 * Self-playing Mastermind "call sign" demo shown on the login screen.
 * Renders one guess row at a time, flips each tile to reveal
 * correct/present/wrong feedback, then on the final guess (which always
 * solves the code) fades into the phrase sequence ANALYSE / OUTSMART /
 * CRACK THE CODE / wordmark before looping.
 *
 * Timing, sequence and state logic are unchanged from the previous
 * version; only the markup/styling was moved to the redesign's tiles,
 * surface card and type. Rows stack from the bottom like a terminal so the
 * stage stays a fixed height on small phones.
 */
export default function LoginDemoBoard() {
  const [rows, setRows] = useState([]);
  const [guessCount, setGuessCount] = useState(0);
  const [scanStatus, setScanStatus] = useState("Awaiting first guess");
  const [boardFading, setBoardFading] = useState(false);
  const [phraseActive, setPhraseActive] = useState(false);
  const [phrase, setPhrase] = useState(null); // { text, wordmark, anim: 'in' | 'out' }

  useEffect(() => {
    let controller = null;

    function reset() {
      setRows([]);
      setGuessCount(0);
      setScanStatus("Awaiting first guess");
      setBoardFading(false);
      setPhraseActive(false);
      setPhrase(null);
    }

    function start() {
      controller = new AbortController();
      reset();
      runDemoLoop(controller.signal).catch((err) => {
        if (err?.name !== "AbortError") throw err;
      });
    }

    function stop() {
      if (controller) controller.abort();
      controller = null;
    }

    async function renderRow(guessNum, guess, feedback, signal) {
      const cells = guess.split("").map((digit) => ({ digit, state: null }));
      setRows((prev) => [...prev, { guessNum, cells }]);

      await sleep(FLIP_DELAY_MS, signal);
      for (let i = 0; i < feedback.length; i++) {
        setRows((prev) => {
          const next = prev.slice();
          const row = next[next.length - 1];
          const nextCells = row.cells.slice();
          nextCells[i] = { ...nextCells[i], flipping: true, state: feedback[i] };
          next[next.length - 1] = { ...row, cells: nextCells };
          return next;
        });
        // eslint-disable-next-line no-await-in-loop
        await sleep(FLIP_STAGGER_MS, signal);
      }
      await sleep(FLIP_DURATION_MS, signal);
    }

    async function playPhraseSequence(signal) {
      setScanStatus("Compiling result");
      setPhraseActive(true);

      for (const p of PHRASES) {
        setPhrase({ ...p, anim: "in" });
        // eslint-disable-next-line no-await-in-loop
        await sleep(PHRASE_HOLD_MS, signal);
        setPhrase((prev) => (prev ? { ...prev, anim: "out" } : prev));
        // eslint-disable-next-line no-await-in-loop
        await sleep(PHRASE_EXIT_MS, signal);
      }

      setPhraseActive(false);
      setPhrase(null);
    }

    async function runDemoLoop(signal) {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const secret = randomDigits(CODE_LENGTH);

        for (let g = 1; g <= GUESS_LIMIT; g++) {
          const guess = g === GUESS_LIMIT ? secret : randomDigits(CODE_LENGTH);
          const feedback = evaluateGuess(secret, guess);

          setGuessCount(g);
          setScanStatus(g === GUESS_LIMIT ? "Code cracked" : "System is thinking…");

          // eslint-disable-next-line no-await-in-loop
          await renderRow(g, guess, feedback, signal);
          // eslint-disable-next-line no-await-in-loop
          await sleep(ROW_PAUSE_MS, signal);
        }

        await sleep(500, signal);

        setBoardFading(true);
        await sleep(BOARD_FADE_MS, signal);
        await playPhraseSequence(signal);

        // Clear the finished round while still faded out so the board
        // returns empty instead of flashing the previous guesses.
        setRows([]);
        setScanStatus("Awaiting first guess");
        setGuessCount(0);
        await sleep(50, signal);

        setBoardFading(false);
        await sleep(200, signal);
      }
    }

    // Pause when the tab is hidden; start a fresh loop on return.
    function handleVisibility() {
      if (document.hidden) stop();
      else if (!controller) start();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    start();

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <div className="card a-g w-full overflow-hidden" aria-hidden="true">
      <div className="flex items-center justify-between px-4 pt-3 text-[11px] font-semibold">
        <span className="inline-flex items-center gap-2 text-g">
          <span className="h-2 w-2 animate-pulse rounded-full bg-g" />
          Live simulation
        </span>
        <span className="text-mute tnum">Guess {guessCount}/{GUESS_LIMIT}</span>
      </div>

      <div className="relative h-[clamp(150px,26dvh,292px)]">
        <div
          className={`absolute inset-x-0 top-0 bottom-9 flex flex-col justify-end gap-1.5 px-4 pt-3 overflow-hidden transition-opacity duration-300 ${boardFading ? "opacity-0" : "opacity-100"}`}
        >
          {rows.map((row) => (
            <div className="flex items-center gap-3 animate-rise shrink-0" key={row.guessNum}>
              <div className="w-6 shrink-0 text-center text-[11px] text-mute tnum">#{row.guessNum}</div>
              <div className="flex gap-1.5">
                {row.cells.map((cell, i) => (
                  <Tile
                    key={i}
                    state={cell.state ? STATE_CLASS[cell.state] : "raw"}
                    className={cell.flipping ? "flip" : ""}
                    size="w-11 h-12 text-xl"
                    role="presentation"
                    aria-label={undefined}
                  >
                    {cell.digit}
                  </Tile>
                ))}
              </div>
              <div className="text-g text-sm animate-blink" aria-hidden="true">&gt;</div>
            </div>
          ))}
        </div>

        <div className={`phrase-stage absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${phraseActive ? "opacity-100" : "opacity-0"}`}>
          {phrase && (
            <span
              className={`phrase absolute font-display font-bold text-center text-white ${phrase.wordmark ? "" : "text-3xl tracking-wide"} ${phrase.anim === "in" ? "swipe-in" : "swipe-out"}`}
            >
              {phrase.wordmark ? <Wordmark className="h-14" /> : phrase.text}
            </span>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 flex h-9 items-center justify-center border-t-2 border-line text-[11px] font-bold text-mute">
          {scanStatus}
        </div>
      </div>
    </div>
  );
}
