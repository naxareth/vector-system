// packages/blockchain-core/scripts/manage-registrars.js
const hre = require("hardhat");

async function main() {
  const [admin] = await hre.ethers.getSigners();
  console.log("🔑 Admin:", admin.address);
  
  // Load deployed contract
  const contractAddress = "PASTE_DEPLOYED_CONTRACT_ADDRESS_HERE";
  const VectorToken = await hre.ethers.getContractFactory("VectorToken");
  const contract = await VectorToken.attach(contractAddress);
  
  console.log("📋 Contract:", contractAddress);
  console.log("👑 Admin is admin:", await contract.hasRole(await contract.DEFAULT_ADMIN_ROLE(), admin.address));
  
  // Command line arguments
  const args = process.argv.slice(2);
  const action = args[0]; // "add" or "remove"
  const registrarAddress = args[1];
  
  if (!action || !registrarAddress) {
    console.log("Usage: npx hardhat run scripts/manage-registrars.js --network amoy <add|remove> <address>");
    console.log("Example: npx hardhat run scripts/manage-registrars.js --network amoy add 0x1234...");
    return;
  }
  
  if (action === "add") {
    console.log(`➕ Adding registrar: ${registrarAddress}`);
    const tx = await contract.addRegistrar(registrarAddress);
    await tx.wait();
    console.log("✅ Registrar added");
    console.log("📋 Is registrar now:", await contract.isRegistrar(registrarAddress));
  } else if (action === "remove") {
    console.log(`➖ Removing registrar: ${registrarAddress}`);
    const tx = await contract.removeRegistrar(registrarAddress);
    await tx.wait();
    console.log("✅ Registrar removed");
    console.log("📋 Is registrar now:", await contract.isRegistrar(registrarAddress));
  } else {
    console.log("Invalid action. Use 'add' or 'remove'");
  }
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});