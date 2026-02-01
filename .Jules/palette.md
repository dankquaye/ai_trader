## 2024-10-24 - Modal Accessibility & Overlay Interaction
**Learning:** Tailwind utility classes like `.pointer-events-none` might be missing from pre-built CSS artifacts, causing modal overlays to intercept clicks even when hidden (`opacity-0`). This blocks automation tools like Playwright and affects keyboard/mouse users.
**Action:** Always verify that critical utility classes are defined in the output CSS or manually add them to the styles if the build pipeline is not available.

## 2024-10-24 - Restoration of Core Logic
**Learning:** UX improvements are impossible to verify if the core event listeners are missing. Sometimes "UX work" involves restoring broken functionality to ensure the user can actually interact with the interface.
**Action:** Before optimizing micro-interactions, ensure the basic interaction layer (event listeners) is intact.
