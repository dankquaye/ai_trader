## 2025-02-12 - Missing Tailwind Utilities in Static Build
**Learning:** The project relies on `dist/output.css` but lacks a build step for new Tailwind classes. Utility classes like `.opacity-0` and `.pointer-events-none` were referenced in `app.js` and `index.html` but were missing from the compiled CSS, causing critical accessibility failures (overlay blocking interaction).
**Action:** Always verify custom utility classes exist in the static CSS or manually add them to `<style>` blocks when working in environments without a dynamic build pipeline.
