## 2024-05-22 - [Repeated Full History Indicator Calculation]
**Learning:** The `extractFeatures` method recalculates all technical indicators for the entire candle history on every call. `extractSequence` calls this 10 times per tick. This creates an $O(10 \times K \times N)$ complexity per tick where $N$ is candle history length (up to 500).
**Action:** Always check if a function called in a loop performs heavy, redundant calculations that can be hoisted out. Pre-calculating indicators once per sequence reduced execution time by ~92% (from ~7ms to ~0.5ms per sequence extraction).
