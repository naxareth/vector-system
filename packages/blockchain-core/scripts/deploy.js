// packages/blockchain-core/scripts/deploy.js
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Starting Official Deployment...");

  // 1. Get the Registrar/Deployer (Account #0)
  // This is the account that will have the power to MINT.
  const [registrar] = await hre.ethers.getSigners();
  console.log("👮 Registrar Wallet (Account #0):", registrar.address);

  // 2. Deploy the Smart Contract
  const VectorToken = await hre.ethers.getContractFactory("VectorToken");
  // Ensure the base URL matches your IPFS gateway or API
  const contract = await VectorToken.deploy("https://api.vector.edu/token/");
  
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("✅ VectorToken Deployed to:", address);

  // 3. Verify Permissions
  // The contract should automatically give the deployer the REGISTRAR_ROLE.
  // We check this just to be 100% sure.
  const REGISTRAR_ROLE = await contract.REGISTRAR_ROLE();
  const hasRole = await contract.hasRole(REGISTRAR_ROLE, registrar.address);

  if (hasRole) {
    console.log("✅ Permissions Verified: Registrar Wallet can mint tokens.");
  } else {
    console.log("⚠️ Notice: Deployer missing role. Granting now...");
    const tx = await contract.grantRole(REGISTRAR_ROLE, registrar.address);
    await tx.wait();
    console.log("✅ Role Granted.");
  }

  // 4. Save Deployment Info for the Frontend
  const network = await hre.ethers.provider.getNetwork();
  const deploymentsDir = "./deployments";
  
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),
    contract: "VectorToken",
    address: address,
    registrar: registrar.address, // We save this so you know who to log in as
    timestamp: new Date().toISOString(),
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
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log(`💾 Saved to: ${deploymentsDir}/deployment-${network.chainId}.json`);
  console.log("\n👇 NEXT STEPS FOR YOU:");
  console.log("1. Copy the address above.");
  console.log("2. Paste it into packages/web-portal/vector-web/src/lib/blockchain.ts");
  console.log("3. Switch MetaMask to Account #0 to mint.");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});