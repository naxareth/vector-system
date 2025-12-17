// check-simple.js - No Hardhat dependency
const { ethers } = require("ethers");

async function main() {
  const RPC_URL = "https://rpc-amoy.polygon.technology";
  const YOUR_ADDRESS = "0xfFbC9d5430CF327b46978b773ec44b21d67692f3";
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  console.log("🔍 Direct Amoy Balance Check");
  console.log("Address:", YOUR_ADDRESS);
  
  const balance = await provider.getBalance(YOUR_ADDRESS);
  const balancePOL = ethers.formatEther(balance);
  
  console.log("Balance:", balancePOL, "POL");
  console.log("Enough for deployment?", parseFloat(balancePOL) > 0.01 ? "✅ YES" : "❌ NO");
}

main().catch(console.error);