# 📊 VECTOR Blockchain Gas Report

This report analyzes the gas efficiency of various minting operations in the `VectorToken` smart contract.

---

## 📈 Minting Performance Comparison

| Operation Type | Quantity | Total Gas Cost | Avg. Gas Per Mint | Savings % |
| --- | --- | --- | --- | --- |
| `mintSkill()` | 1 | ~67,600 | ~67,600 | 0% |
| `mintSkill()` | 10 | 676,336 | 67,633 | 0% |
| `mintSkill()` | 50 | 2,851,628 | 57,032 | 0% |
| **`batchMintSkills()`** | **10** | **331,366** | **33,136** | **51.0%** |
| **`batchMintSkills()`** | **50** | **787,271** | **15,745** | **72.4%** |

---

## 💡 Efficiency Analysis

### Why is Batching More Efficient?

1.  **Single Call Overhead:** Every Ethereum/EVM transaction has a base cost of 21,000 gas. In `mintSkill()`, this 21,000 is paid for every single credential. In `batchMintSkills()`, it is paid only once for the entire bulk operation.
2.  **Event Emissions:** Emitting events is expensive. While both functions emit events, `batchMintSkills` emits a single `BatchSkillsMinted` event instead of multiple individual `SkillMinted` events (which also include a DID string calculation), reducing log storage costs.
3.  **Storage Slot Reuse:** The EVM charges less for updating a storage slot that has already been modified in the same transaction. Batching allows for more efficient access patterns to the underlying ERC-1155 balance mappings.
4.  **DID Computation:** Individual mints compute the `addressToDID` string on-chain to emit it. Batch minting skips this per-student calculation in favor of a simpler bulk event, offloading the DID generation to the indexing layer or the frontend.

---

## 🛠️ Benchmark Methodology

- **Network:** Hardhat Network (EVM version: London)
- **Tooling:** `hardhat-gas-reporter`
- **Assumptions:** Estimates based on standard Polygon Amoy conditions. Actual gas may vary slightly based on storage state (warm/cold slots).

---

© 2026 VECTOR Blockchain Team
