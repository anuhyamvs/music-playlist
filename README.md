# Music Playlist Visualizer

A lightweight, client-side music playlist visualizer with search, filters, playback controls, thumbnails, drag-and-drop reordering, and undo toasts.

Features implemented
- Responsive visual baseline with CSS variables and a centered container
- Now playing bar with `<audio>` playback, progress bar and seeking
- Playback controls (play/pause/next/prev) and keyboard shortcuts (Space, Enter, ArrowUp/Down, Ctrl/Cmd+S)
- SVG icon sprite for crisp icons
- Add songs with optional album art URL; thumbnails are lazy-loaded with placeholders
- Drag-and-drop reordering with undo support (history)
- Export/import JSON with validation and safe import
- Debounced search and filter counts
- Accessibility improvements: roles, button `aria-pressed`, focus styles
- Non-blocking toast messages replace alerts

How to run
1. Open `index.html` in a modern browser (no build step required).
2. Add songs via the form. For playback, supply a valid audio `src` in the song objects (e.g., edit `script.js` initial list) or extend the UI later to include audio URLs.
3. Use search, filters and drag to reorder.

Development notes
- Playlist state is persisted in `localStorage` under key `playlist:v1`.
- Tests, bundling, and CI are TODO (see project TODOs in code).

Next recommended steps
- Convert rendering to use HTML templates consistently (partially added)
- Modularize JavaScript for maintainability
- Add unit tests and a small build script
- Add compact favicon and social preview images

Enjoy — tell me which task to implement next from the remaining TODOs.
