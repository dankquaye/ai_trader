## 2024-05-23 - Invisible Overlay Blocking
**Learning:** Modals using `opacity-0` must also have `pointer-events-none` or `visibility: hidden`. In Tailwind projects without a build step, verify utility classes exist in the output CSS.
**Action:** Always verify modal interactions with a click test, not just visual inspection, as invisible overlays can block the entire UI.
