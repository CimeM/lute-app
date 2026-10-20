# Stack
- JavaScript ES modules and JSX.
- React for the application UI.
- Vite for development and production builds.
- Tailwind CSS 3 and PostCSS for styling; use the existing global CSS for app-wide behavior.
- Oxlint for linting. Use the scripts in `package.json` for project checks.
- IndexedDB for primary local persistence, with localStorage and in-memory fallbacks in `src/db/LocalDB.js`.
- Service Worker and Cache API for the installable PWA shell and same-origin assets.
- `lucide-react` for icons and `jszip` for local EPUB extraction.
- Browser Speech Synthesis API for word pronunciation; do not make speech a requirement for reading.

# UI Design Rules

- Match the existing React and Tailwind UI. Do not add a new design system or styling dependency.
- Support light and dark themes. Reuse `themeStyles` from `src/utils/theme.js`; use slate for light surfaces, zinc for dark surfaces, and amber for actions and highlights.
- Use Inter for interface text and Merriweather for book text. Keep reading content comfortable and adjustable.
- Design mobile-first for an installed PWA. Preserve compact screens, safe-area spacing, and working scroll regions.
- Use existing spacing, borders, and card treatments. Keep screens practical; do not add decorative panels or nested cards.
- Use `lucide-react` icons. Give icon-only controls accessible names; show clear focus, disabled, loading, and selected states.
- Preserve reader themes, word-status colors, and existing interaction patterns when changing the reader.
- Keep motion brief and respect `prefers-reduced-motion`.
- Before finishing UI changes, check narrow and wide layouts, both app themes, and the relevant project quality checks.
- micro animations are welcome 
- user feedback like icon change when pressing a button is desired
- make UI components so that code and concern is split

# System design rules

- Lute is a React single-page PWA. The core reading workflow must not require an account or application server.
- `App.jsx` owns screen selection and cross-screen state. Keep screen-specific behavior in its component; keep shared persistence in `src/db/LocalDB.js` and reusable transformations in `src/utils/`.
- Store books, vocabulary, reading progress, and settings on the device. IndexedDB is primary; retain the existing localStorage and in-memory fallback behavior.
- Treat browser storage as user data, not guaranteed permanent storage. Preserve database export and import compatibility; version backup formats when their structure changes.
- Treat word keys as normalized lowercase text. Preserve status, translation, and update metadata when changing vocabulary records.
- EPUB, Markdown, and text imports are parsed locally. Keep imported book content usable offline after it is saved.
- The built-in catalog is bundled. External catalogs and their book files require network access; validate URLs and handle fetch failures without breaking the library or reader.
- The service worker caches the app shell and same-origin GET assets. Do not assume it caches cross-origin catalogs or book files.
- Use the browser's Speech Synthesis API for pronunciation. Detect unsupported or unavailable voices and keep reading usable without speech.
- Keep offline behavior explicit: cached app assets and saved books work offline; remote catalog browsing and downloads do not.
- Keep storage and network failures recoverable. Do not silently discard user data or make a remote service mandatory for local reading.
- When changing database stores or record shapes, update migrations and test both existing data and fresh installs.
- Verify local import, reading progress, vocabulary updates, backup/restore, and offline startup for changes that affect those paths.
- No application server is required for the core reading workflow. Remote catalogs and book downloads use `fetch` and need network access.