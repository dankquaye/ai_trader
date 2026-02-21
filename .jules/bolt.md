## 2024-05-24 - [Duplicate Indicator Calculation]
**Learning:** Frequent recalculation of expensive indicators (RSI, SMA, etc.) on entire arrays inside loops (e.g., `extractSequence`) was causing O(N*steps) complexity.
**Action:** Lift indicator calculation out of loops and pass pre-calculated arrays down to feature extraction methods.
