import hre from "hardhat";

async function main() {
  console.log("⛓️  Starting Blockchain Simulation...");

  // 1. Setup Actors
   const [registrar, student] = await hre.ethers.getSigners();
  console.log(`👨‍🏫 Registrar: ${registrar.address}`);
  console.log(`👨‍🎓 Student:   ${student.address}`);

  console.log("\n🚀 Deploying Smart Contract...");
  const VectorToken = await hre.ethers.getContractFactory("VectorToken");
  const contract = await VectorToken.deploy();
  await contract.waitForDeployment();
  
  console.log(`✅ Contract deployed to: ${await contract.getAddress()}`);

  const SKILL_ID_REACT = 101; 
  console.log(`\n✍️  Registrar issuing 'Skill #${SKILL_ID_REACT}' to Student...`);
  const tx = await contract.issueSkill(student.address, SKILL_ID_REACT);
  await tx.wait();

  console.log("✅ Transaction Confirmed on-chain!");

  console.log("\n🔍 Checking Student's Wallet...");
  const balance = await contract.balanceOf(student.address, SKILL_ID_REACT);

  if (balance.toString() === "1") {
    console.log("🎉 SUCCESS: Student owns the token! Blockchain Logic is verified.");
  } else {
    console.log("❌ FAIL: Balance is 0.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});