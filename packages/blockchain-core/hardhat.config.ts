import { defineConfig } from "hardhat/config";
import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";

export default defineConfig({
  plugins: [hardhatToolboxViem],
  solidity: "0.8.28",
  networks: {
    hardhat: {
      type: "http",  // Required for Hardhat v3 + Viem
      url: "http://127.0.0.1:8545", // Local network URL
    },
    amoy: {
      type: "http",  // Required for Hardhat v3 + Viem
      url: "https://rpc-amoy.polygon.technology",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80002,
    }
  }
});