/* Dev-time only. Generates public/doc.css for public/doc.html, which used the
   Tailwind Play CDN script (development-only) with this same theme inline. */
module.exports = {
  content: ['../public/doc.html'],
  theme: {
    extend: {
      colors: {
        black: '#000000',
        panel: '#0A0F0D',
        panel2: '#0D1512',
        line: '#1E2A26',
        green: { DEFAULT: '#12E060', dim: '#1B7A45' },
        cyan: '#2FD8E8',
        purple: '#A855F7',
        orange: '#FF9A3C',
        red: '#E8434F',
        yellow: '#F2C94C',
        ink: '#F2F5F4',
        gray: '#596969',
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['Barlow', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
