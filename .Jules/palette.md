## 2024-05-23 - Modal Accessibility & Build Artifacts
**Learning:** Reliance on 'pointer-events-none' for modal visibility management failed because the utility class was missing from the build. Also, using 'div' for interactive elements like close buttons excluded keyboard users.
**Action:** Always verify that critical utility classes exist in the final CSS, and enforce semantic HTML ('<button>') for all interactive elements to ensure accessibility and robustness.
