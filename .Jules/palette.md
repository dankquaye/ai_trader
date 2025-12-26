## 2024-05-22 - Missing Form Labels
**Learning:** The application relies heavily on visual layout for labeling inputs (e.g., proximity of text to input), but programmatically, many inputs are orphans. This makes the app nearly unusable for screen reader users, particularly critical inputs like API Token and Trading Stake.
**Action:** Systematically audit all form inputs for `id` and `label` association. Use `aria-label` where visual labels are implicit or hidden. Future components must strictly enforce `htmlFor` (React) or `for` (HTML) matching input `id`.
