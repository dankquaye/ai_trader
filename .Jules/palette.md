## 2024-05-23 - Modal Overlay & Icon Buttons
**Learning:** Utility classes like `.pointer-events-none` are critical for "fade-out" modals. If missing (e.g., due to build issues), the overlay remains interactive even when invisible, blocking the entire UI.
**Action:** Always verify that "hidden" elements are truly non-interactive, especially when using opacity transitions. Check `pointer-events` in devtools.

**Learning:** Icon-only buttons (like 'X' close icons) implemented as `<div>` are inaccessible and often lack focus states.
**Action:** Replace `<div>` with `<button>` and add `aria-label` for screen readers. Ensure click handlers are attached to the button, not just the icon.
