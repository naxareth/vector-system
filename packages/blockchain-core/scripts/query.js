const hre = require("hardhat");

async function main() {
  const contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const VectorToken = await hre.ethers.getContractFactory("VectorToken");
  const contract = await VectorToken.attach(contractAddress);
  
  // Get action from environment or use default
  const action = process.argv[2] || "help";
  
  switch(action) {
    case "balance":
      if (process.argv[3] && process.argv[4]) {
        const balance = await contract.balanceOf(process.argv[3], parseInt(process.argv[4]));
        console.log(`📊 Balance: ${balance}`);
      } else {
        console.log("Usage: npx hardhat run scripts/query.js --network local balance <address> <skillId>");
      }
      break;
      
    case "skill":
      if (process.argv[3]) {
        const skillName = await contract.getSkillName(parseInt(process.argv[3]));
        console.log(`📚 Skill: ${skillName}`);
      }
      break;
      
    default:
      console.log("Available commands:");
      console.log("  balance <address> <skillId>  - Check token balance");
      console.log("  skill <skillId>              - Get skill name");
      console.log("\nExample:");
      console.log("  npx hardhat run scripts/query.js --network local balance 0x123... 1");
  }
}

main().catch(console.error);