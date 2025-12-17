// hardhat.config.js - FIXED VERSION
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Helper: Clean private key (remove 0x if present)
function getPrivateKey() {
  const key = process.env.PRIVATE_KEY || "";
  // Remove the '0x' prefix if it exists
  return key.startsWith('0x') ? key.slice(2) : key;
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    hardhat: {},
    amoy: {
      url: "https://polygon-amoy.g.alchemy.com/v2/07CTrFdrN7AFWl2LzcgXW",
      accounts: [getPrivateKey()], // Pass WITHOUT 0x prefix
      chainId: 80002,
    }
  }
};