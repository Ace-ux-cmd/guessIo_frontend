# tools/

`src/styles/ui.css` is **generated, plain CSS** (Tailwind v3 utility output) that the app loads
as an ordinary stylesheet. The app has no Tailwind runtime or build dependency.

Regenerate after adding new utility classes to JSX:

    cd tools
    npx tailwindcss@3 -c tailwind.config.cjs -i tailwind-input.css -o ../src/styles/ui.css --minify

Custom (non-utility) styles live in `src/styles/app.css` and are hand-written.
Class names must appear as complete literal strings in JSX (no `"w-"+n`) or the generator can't see them.
