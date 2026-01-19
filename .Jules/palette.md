## 2024-05-22 - Modal Accessibility & Build Artifacts
**Learning:** Build artifacts like `dist/output.css` may lack utility classes (e.g., `.pointer-events-none`) if they weren't used during the build, causing "hidden" overlays to block UI interaction. Also, using `div` for close icons is a persistent accessibility anti-pattern.
**Action:** Always check `index.html` style blocks for critical utility classes when relying on pre-built CSS. Refactor `div` click handlers to `<button>` with `aria-label` for keyboard accessibility.
