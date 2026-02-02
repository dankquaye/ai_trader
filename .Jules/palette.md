## 2024-05-23 - Modal Overlay Interaction Blocking
**Learning:** Tailwind's `.opacity-0` class visually hides elements but does not remove them from the flow or disable pointer events. This causes overlay elements (like modals) to intercept clicks even when "hidden".
**Action:** Always pair `.opacity-0` with `.pointer-events-none` (or `.hidden`/display:none if transitions aren't needed) for modal overlays to prevent interaction blocking. Use `pointer-events-auto` when showing the modal.

## 2024-05-23 - Dynamic ARIA Labels for Toggle Buttons
**Learning:** Icon-only toggle buttons (like Pause/Play) require dynamic updates to `aria-label` alongside icon changes to ensure screen reader users know the current state and action.
**Action:** In the click handler, update `aria-label` to "Resume Bot" when paused and "Pause Bot" when active, mirroring the visual icon change.
