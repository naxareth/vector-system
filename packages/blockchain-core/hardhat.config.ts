import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import "dotenv/config";

if (!process.env.POLYGON_AMOY_RPC_URL) {
  throw new Error("Please set your POLYGON_AMOY_RPC_URL in a .env file");
}
if (!process.env.PRIVATE_KEY) {
  throw new Error("Please set your PRIVATE_KEY in a .env file");
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // For local Hardhat Network: must specify type as "edr-simulated"
    hardhat: {
      type: "edr-simulated",
      chainId: 31337,
    },
    // For connecting to real Polygon Amoy via HTTP: must specify type as "http"
    amoy: {
      type: "http",
      url: process.env.POLYGON_AMOY_RPC_URL as string,
      accounts: [process.env.PRIVATE_KEY as string],
    },
  },
};

export default config;