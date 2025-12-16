import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox"; // ✅ Standard Ethers toolbox
import "dotenv/config";

// Safety check: Only throw error if we are trying to deploy to Amoy
// This allows local testing to run without these keys!
const AMOY_RPC = process.env.POLYGON_AMOY_RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

const config: HardhatUserConfig = {
  solidity: "0.8.20", // Matches your contract version
  networks: {
    hardhat: {
      chainId: 31337, // Standard Localhost Chain ID
    },
    amoy: {
      url: AMOY_RPC,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};

export default config;