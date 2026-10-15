/* Dev-time only. Generates src/styles/ui.css (plain CSS, committed).
   Not a runtime/build dependency of the app. See tools/README.md. */
module.exports = {
  content: ['../src/**/*.{jsx,js}', '../index.html'],
  theme: { extend: {
    colors: { bg:'#050807', s1:'#0C1210', s2:'#121B17', line:'#1E2B25', ink:'#EEF3F0', mute:'#8C9C95',
              g:'#12E060', gd:'#0B9C45', bad:'#FF3D4A', warn:'#FFB01F', info:'#2BBBF0' },
    fontFamily: { sans:['Barlow','system-ui','sans-serif'], display:['Orbitron','Barlow','sans-serif'] },
    keyframes: { rise:{ from:{opacity:0,transform:'translateY(8px)'}, to:{opacity:1,transform:'none'} },
                 blink:{ '50%':{opacity:0} }, sweep:{ to:{transform:'rotate(360deg)'} },
                 pop:{ '0%':{transform:'scale(.6)',opacity:0}, '70%':{transform:'scale(1.08)'}, '100%':{transform:'scale(1)',opacity:1} },
                 count:{ from:{opacity:0}, to:{opacity:1} } },
    animation: { rise:'rise .45s ease-out both', blink:'blink 1s steps(1) infinite', sweep:'sweep 2.6s linear infinite', pop:'pop .5s cubic-bezier(.2,.9,.3,1.2) both' }
  } },
  plugins: [],
};
