const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying VectorToken to Amoy...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const VectorToken = await hre.ethers.getContractFactory("VectorToken");
  const contract = await VectorToken.deploy();
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log("✅ Contract:", address);
  console.log("🔗 https://amoy.polygonscan.com/address/" + address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});