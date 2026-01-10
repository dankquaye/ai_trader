## 2024-05-23 - [Accessibility in Broken States]
**Learning:** A "broken" app (missing event listeners) is the ultimate accessibility failure. While semantic HTML is crucial, verifying that the interactive logic actually exists is a prerequisite for any UX improvement. I discovered that `app.js` was calling `setupEventListeners()` but the function was missing from the file.
**Action:** Always verify the "Happy Path" functionality before applying micro-UX polish. If the basic interaction is broken, no amount of ARIA labels will help.
