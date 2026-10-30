/** The four in-match skills: names, one-line effects and display order. Shared by the pick lobby, How to play and the intro banner. */
const SKILL_NAMES = {
  REVEAL_POSITION: 'Reveal Position',
  EXTRA_TURN: 'Extra Turn',
  FREEZE: 'Freeze',
  XRAY_VISION: 'X-Ray Vision',
};

export const SKILL_INFO = {
  REVEAL_POSITION: 'Shows one digit of the code in its place. The position is picked at random.',
  EXTRA_TURN: 'Take one more guess right after this one.',
  FREEZE: 'An opponent loses their next turn.',
  XRAY_VISION: 'See the feedback on an opponent\u2019s guesses for this round.',
};

export const SKILL_ORDER = ['REVEAL_POSITION', 'EXTRA_TURN', 'FREEZE', 'XRAY_VISION'];

export const skillName = (skill) => SKILL_NAMES[skill] || 'Skill';
