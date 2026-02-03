## 2026-02-03 - Modal Interaction Blockers
**Learning:** The modal overlay used `opacity-0` and `pointer-events-none` classes, but these utility classes were missing from the CSS (Tailwind wasn't generating them or they were expected in the `<style>` block). This caused the invisible overlay to intercept clicks, breaking the UI.
**Action:** Always verify that utility classes used for state management (like `.hidden`, `.pointer-events-none`) are actually defined in the CSS, especially when working with hybrid Tailwind/inline setups.

## 2026-02-03 - Missing Core Logic
**Learning:** The core event handler `setupEventListeners` was completely missing from `app.js`, rendering the UI non-functional.
**Action:** When a UI seems unresponsive, verify the existence of the event binding logic before assuming it's a CSS or Z-index issue.
