// debug-signers.js
const hre = require("hardhat");

async function main() {
  console.log("🔍 Debugging getSigners() on", hre.network.name);
  
  try {
    const signers = await hre.ethers.getSigners();
    console.log("getSigners() returned array length:", signers.length);
    
    if (signers.length > 0) {
      console.log("First signer address:", signers[0].address);
      const balance = await signers[0].provider.getBalance(signers[0].address);
      console.log("First signer balance:", hre.ethers.formatEther(balance), "POL");
    } else {
      console.log("❌ No signers found!");
      console.log("Checking if PRIVATE_KEY is loaded...");
      
      // Manually check provider
      const provider = hre.ethers.provider;
      const network = await provider.getNetwork();
      console.log("Connected to network ID:", network.chainId);
      
      // Try to get the first account from config
      const accounts = await provider.send("eth_accounts", []);
      console.log("eth_accounts result:", accounts);
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();