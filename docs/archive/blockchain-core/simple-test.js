const hre = require("hardhat");

async function main() {
  console.log("🔧 SIMPLE TEST");
  
  // 1. Deploy fresh contract
  console.log("1. Deploying contract...");
  const VectorToken = await hre.ethers.getContractFactory("VectorToken");
  const contract = await VectorToken.deploy("https://api.vector.edu/token/");
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("   Contract:", address);
  
  // 2. Test basic functions
  console.log("2. Testing basic functions...");
  console.log("   Skill 1:", await contract.getSkillName(1));
  console.log("   Skill 2:", await contract.getSkillName(2));
  
  // 3. Mint to a test student
  console.log("3. Minting test tokens...");
  const student = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
  await contract.mintSkill(student, 2, 100);
  console.log("   Minted 100 Python to", student);
  
  // 4. Check balance
  console.log("4. Verifying...");
  const balance = await contract.balanceOf(student, 2);
  console.log("   Balance:", balance.toString());
  
  console.log("\n✅ DONE! Give this to your teammate:");
  console.log("Contract:", address);
  console.log("RPC: http://localhost:8545");
  console.log("Chain: 31337");
}

main().catch(console.error);