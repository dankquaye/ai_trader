## 2024-05-18 - [Trade History Empty State]
**Learning:** Tables displaying dynamic data, such as the Trade History table, should implement a helpful empty state with an icon and message when no data is present, rather than leaving the table body empty.
**Action:** Implemented an empty state rendering logic in `app.js` using `colspan="7"` to span the table width.

## 2026-05-28 - [Accessible Modals and Icon Buttons]
**Learning:** Interactive elements implemented as `div` (like modal close buttons) prevent screen readers from identifying them as actionable and miss out on native keyboard focus styling. Furthermore, icon-only buttons need an `aria-label` to be understandable by assistive tech.
**Action:** Migrated the modal close `div` to a semantic `<button type="button">` with `aria-label="Close modal"` and `focus-visible:ring-2` styling. Added `aria-label="Pause Bot"` to the icon-only bot control button.
