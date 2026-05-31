# 🔗 VECTOR Blockchain Core

This package contains the smart contracts, deployment scripts, and test suites for the **VECTOR** decentralized credentialing platform.

---

## 📜 VectorToken (ERC-1155)

The `VectorToken` contract is a specialized implementation of the ERC-1155 standard, designed for soulbound-style academic and professional credentials.

### Key Features
- **Access Control:** Uses OpenZeppelin `AccessControl`. The `REGISTRAR_ROLE` is required for minting and revoking.
- **W3C DID Support:** Automatically generates Decentralized Identifiers (DIDs) for students (e.g., `did:polygon:amoy:0x...`).
- **Dynamic Minting:** Supports both individual (`mintSkill`) and optimized `batchMintSkills`.
- **Credential Revocation:** Allows registrars to invalidate tokens if a credential was issued in error or for disciplinary reasons.
- **Custom URI Logic:** Points to the VECTOR Web Portal API for dynamic metadata resolution.

---

## 🧪 Testing & Quality Assurance

### Unit Tests
The contract is covered by a comprehensive suite of Hardhat/Chai tests.
```bash
npx hardhat test
```
*Note: Includes tests for deployment, role management, minting (single/batch), URI accuracy, and revocation.*

### Fuzz & Edge Case Tests
Located in `test/FuzzEdge.test.js`, these tests ensure robustness against:
- Zero-address minting
- Array length mismatches in batch operations
- Unauthorized access attempts
- Revocation of non-existent balances

---

## 📊 Gas Benchmark

We prioritize gas efficiency on the Polygon network. Batch minting is significantly more cost-effective for institutional users.
- **Individual Mint:** ~52,000 gas
- **Batch Mint (10):** ~310,000 gas (vs ~520,000 if done individually)
- **Batch Mint (50):** ~1,350,000 gas (vs ~2,600,000 if done individually)

For a detailed analysis, see [GAS_REPORT.md](./GAS_REPORT.md).

---

## 🚀 Deployment

The contract is designed for the **Polygon Amoy Testnet**.

### Configuration
Ensure your `.env` contains:
- `PRIVATE_KEY`: Deployer's private key.
- `POLYGONSCAN_API_KEY`: For contract verification.
- `AMOY_RPC_URL`: Polygon Amoy RPC endpoint.

### Commands
```bash
# Compile contracts
npx hardhat compile

# Deploy to Amoy
npx hardhat run scripts/deploy.js --network amoy
```

---

## 📍 Contract Addresses (Amoy)
- **VectorToken:** `0xb7FEac8Bc7C8330768e1a65BAd15760888806950` (Sample Deployment)

---

© 2026 VECTOR Blockchain Team
