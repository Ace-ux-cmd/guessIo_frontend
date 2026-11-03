/* Dev-time only. Generates src/styles/ui.css (plain CSS, committed).
   Not a runtime/build dependency of the app. See tools/README.md.
   Tokens come from the v3.8 mockup (theme.js). */
module.exports = {
  content: ['../src/**/*.{jsx,js}', '../index.html'],
  theme: { extend: {
    colors: {
      bg: '#05070F', s1: '#0E152A', s2: '#131B33', line: '#1C2740', edge: '#2A3858',
      ink: '#EDF5FF', mute: '#8290AD',
      g: '#8DFF39', gd: '#4B9A14', bad: '#FF506E', warn: '#FFBA37', info: '#00E5FF', vio: '#9C4DFF',
    },
    fontFamily: { sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'], display: ['"Space Grotesk"', 'system-ui', 'sans-serif'] },
    keyframes: {
      rise: { from: { transform: 'translateY(100%)' } },
      fade: { from: { opacity: 0 }, to: { opacity: 1 } },
      blink: { '50%': { opacity: 0 } },
      sweep: { to: { transform: 'rotate(360deg)' } },
      pop: { '0%': { transform: 'scale(.6)', opacity: 0 }, '70%': { transform: 'scale(1.08)' }, '100%': { transform: 'scale(1)', opacity: 1 } },
    },
    animation: {
      rise: 'rise .35s cubic-bezier(.2,.9,.3,1.1) both',
      fade: 'fade .2s ease-out both',
      blink: 'blink 1s steps(1) infinite',
      sweep: 'sweep 2.6s linear infinite',
      pop: 'pop .4s cubic-bezier(.2,.9,.3,1.2) both',
    },
  } },
  plugins: [],
};
