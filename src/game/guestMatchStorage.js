const STORAGE_KEY = 'guessio_guest_match';

/**
 * Guest matches persist to localStorage (not sessionStorage) specifically
 * so a refresh mid-game can resume - this is the one piece of guest state
 * that's meant to outlive a single tab/session, per product decision.
 */
export function saveGuestMatch(matchSnapshot) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matchSnapshot));
  } catch (err) {
    // localStorage can throw in private-browsing/quota-exceeded edge cases;
    // guest play still works in-memory for the current tab, it just won't
    // survive a refresh.
  }
}

export function loadGuestMatch() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * localStorage is user-editable and can hold a snapshot written by an older
 * version of the app, so a stored match is only restored if it has the shape
 * GuestMatch and the guest screens read. Anything else would throw while
 * rendering and keep doing so on every visit.
 */
export function hasValidGuestSnapshotShape(data) {
  if (!isObject(data)) return false;
  if (!['STANDARD', 'HARDCORE'].includes(data.difficulty)) return false;
  if (!['VS_COMPUTER', 'PASS_AND_PLAY'].includes(data.mode)) return false;
  if (!['ACTIVE', 'COMPLETED'].includes(data.status)) return false;
  if (!Number.isInteger(data.turnStartSeat)) return false;
  if (!Array.isArray(data.rounds)) return false;
  const playersValid = Array.isArray(data.players) && data.players.length === 2 && data.players.every((p) => (
    isObject(p) && typeof p.id === 'string' && typeof p.name === 'string'
    && typeof p.isBot === 'boolean' && Number.isInteger(p.roundsWon)
  ));
  if (!playersValid) return false;
  if (data.status !== 'ACTIVE') return true;

  const round = data.currentRound;
  return isObject(round)
    && typeof round.secretCode === 'string'
    && Number.isInteger(round.roundNumber)
    && Number.isInteger(round.codeLength)
    && Number.isInteger(round.guessLimit)
    && Array.isArray(round.turnOrder)
    && Number.isInteger(round.activeIndex)
    && round.activeIndex >= 0 && round.activeIndex < round.turnOrder.length
    && Array.isArray(round.guessLog)
    && round.guessLog.every((entry) => isObject(entry) && typeof entry.guess === 'string' && isObject(entry.feedback));
}

export function clearGuestMatch() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    // Ignore - nothing meaningful to recover from here.
  }
}
