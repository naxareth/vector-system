const hre = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 VECTOR: FINAL AMOY DEPLOYMENT");
  console.log("================================");
  
  // 1. MANUALLY create signer from PRIVATE_KEY
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey || privateKey === "") {
    throw new Error("❌ PRIVATE_KEY not found in .env file");
  }
  
  // Create provider and wallet
  const provider = new hre.ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
  const deployer = new hre.ethers.Wallet(privateKey, provider);
  
  console.log("✅ Deployer:", deployer.address);
  
  // 2. CHECK BALANCE
  const balance = await provider.getBalance(deployer.address);
  const balancePOL = hre.ethers.formatEther(balance);
  console.log("💰 Balance:", balancePOL, "POL");
  
  if (balance === 0n) {
    throw new Error("Insufficient balance. Get test POL from: https://faucet.polygon.technology");
  }
  
  // 3. DEPLOY CONTRACT
  console.log("\n📦 Deploying VectorToken...");
  const VectorToken = await hre.ethers.getContractFactory("VectorToken", deployer);
  const contract = await VectorToken.deploy();
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log("✅ Contract deployed:", contractAddress);
  
  // 4. MINT A CREDENTIAL (to a test address)
  const studentAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Standard test address
  console.log("\n🎫 Minting to test student:", studentAddress);
  
const tx = await contract.mintSkill(studentAddress, 1, 1); // Use skill ID 1 (REACT_SKILL)
  const receipt = await tx.wait();
  console.log("✅ Mint confirmed! Block:", receipt.blockNumber);
  console.log("   Tx Hash:", receipt.hash);
  
  // 5. VERIFY
  const studentBalance = await contract.balanceOf(studentAddress, 101);
  console.log("\n🔍 Verification - Student balance:", studentBalance.toString());
  
  if (studentBalance === 1n) {
    console.log("\n" + "=".repeat(50));
    console.log("🎉🎉🎉 VECTOR BLOCKCHAIN VALIDATION COMPLETE!");
    console.log("=".repeat(50));
    console.log("✅ Contract live on Polygon Amoy");
    console.log("✅ ERC-1155 token issuance working");
    console.log("✅ 'Issuer → Holder → Verifier' loop proven");
    console.log("\n📋 Next: Build your Next.js application!");
    console.log("🔗 Contract:", contractAddress);
    console.log("🔍 Explorer: https://amoy.polygonscan.com/address/" + contractAddress);
  }
}

main().catch((error) => {
  console.error("\n❌ Error:", error.message);
  process.exitCode = 1;
});