// packages/blockchain-core/scripts/deploy.js
const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying VectorToken to Amoy...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deployer:", deployer.address);
  
  // Deploy contract
  const VectorToken = await hre.ethers.getContractFactory("VectorToken");
  const contract = await VectorToken.deploy("https://api.vector.edu/token/");
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log("✅ Contract deployed to:", address);
  
  // Verify roles
  console.log("👑 Deployer is admin:", await contract.hasRole(await contract.DEFAULT_ADMIN_ROLE(), deployer.address));
  console.log("📋 Deployer is registrar:", await contract.isRegistrar(deployer.address));
  
  // Get network info
  const network = await hre.ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name, "(Chain ID:", network.chainId + ")");
  
  // Save deployment info
  const fs = require("fs");
  const deploymentsDir = "./deployments";
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId,
    contract: "VectorToken",
    address: address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    baseURI: "https://api.vector.edu/token/",
    skills: {
      1: "React Development",
      2: "Python Programming",
      3: "Solidity Smart Contracts",
      4: "Node.js Backend Development",
      5: "AI/ML Fundamentals"
    }
  };
  
  fs.writeFileSync(
    `${deploymentsDir}/deployment-${network.chainId}.json`,
    JSON.stringify(deploymentInfo, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value
    , 2)
  );
  
  console.log("💾 Deployment info saved to:", `${deploymentsDir}/deployment-${network.chainId}.json`);
  console.log("🔗 Polygonscan: https://amoy.polygonscan.com/address/" + address);
  
  // For verification (run separately)
  console.log("\n🔍 To verify on Polygonscan, run:");
  console.log(`npx hardhat verify --network amoy ${address} "https://api.vector.edu/token/"`);
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});