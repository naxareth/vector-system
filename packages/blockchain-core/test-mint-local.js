// test-mint-local.js - FREE local test
const hre = require("hardhat");

async function main() {
  console.log("🔧 Testing Mint Fix Locally (FREE)");
  console.log("==================================");
  
  // Deploy fresh on local network (no cost)
  const [deployer, student] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Student:", student.address);
  
  // Deploy new contract (instant & free)
  console.log("\n🚀 Deploying fresh VectorToken (local)...");
  const VectorToken = await hre.ethers.getContractFactory("VectorToken");
  const contract = await VectorToken.deploy();
  await contract.waitForDeployment();
  
  console.log("✅ Contract:", await contract.getAddress());
  
  // Test minting with correct skill ID (1 instead of 101)
  console.log("\n🎫 Testing mintSkill(student, 1, 1)...");
  try {
    const tx = await contract.mintSkill(student.address, 1, 1); // SKILL ID 1
    await tx.wait();
    console.log("✅ Mint SUCCESS on local network!");
    
    // Verify
    const balance = await contract.balanceOf(student.address, 1);
    console.log("🔍 Student balance:", balance.toString());
    
    if (balance === 1n) {
      console.log("\n🎉 MINT FIX CONFIRMED! Logic is correct.");
      console.log("The only issue was skill ID: 101 → 1");
    }
  } catch (error) {
    console.error("❌ Mint failed:", error.message);
    console.log("\nNeed to debug contract logic...");
  }
}

main().catch(console.error);