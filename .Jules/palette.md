## 2026-01-04 - Accessible Modal Pattern
**Learning:** Modals implemented with `div` elements for close buttons are keyboard inaccessible and lack semantic meaning.
**Action:** Always use `<button>` for close actions, ensure `type="button"`, and add `aria-label="Close modal"`. Also, ensure Escape key support is wired up for better keyboard accessibility.

## 2026-01-04 - Broken Event Listeners
**Learning:** A critical function `setupEventListeners` was missing from `app.js` despite being called.
**Action:** When implementing micro-UX fixes in a broken codebase, isolate the fix to the specific interaction (e.g., modal close) rather than attempting to fix the entire app, to avoid scope creep and risk.
