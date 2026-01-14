// packages/blockchain-core/scripts/mint-skill.js
const hre = require("hardhat");
const fs = require("fs");
const csv = require("csv-parser");

async function singleMint() {
  const [registrar] = await hre.ethers.getSigners();
  console.log("👤 Registrar:", registrar.address);
  
  const contractAddress = "PASTE_DEPLOYED_CONTRACT_ADDRESS_HERE";
  const VectorToken = await hre.ethers.getContractFactory("VectorToken");
  const contract = await VectorToken.attach(contractAddress);
  
  // Check if sender is registrar
  const isRegistrar = await contract.isRegistrar(registrar.address);
  if (!isRegistrar) {
    console.log("❌ Sender is not authorized as registrar");
    return;
  }
  
  // Get minting details from command line
  const args = process.argv.slice(2);
  const studentAddress = args[0];
  const skillId = parseInt(args[1]);
  const amount = parseInt(args[2]) || 1;
  
  if (!studentAddress || !skillId) {
    console.log("Usage: npx hardhat run scripts/mint-skill.js --network amoy <studentAddress> <skillId> [amount]");
    console.log("Skill IDs: 1=React, 2=Python, 3=Solidity, 4=Node.js, 5=AI/ML");
    return;
  }
  
  console.log(`🎓 Minting to: ${studentAddress}`);
  console.log(`📚 Skill ID: ${skillId}`);
  console.log(`🔢 Amount: ${amount}`);
  
  const tx = await contract.mintSkill(studentAddress, skillId, amount);
  await tx.wait();
  
  console.log("✅ Skill minted successfully!");
  console.log("📋 Transaction hash:", tx.hash);
  
  // Verify mint
  const balance = await contract.balanceOf(studentAddress, skillId);
  console.log(`📊 New balance: ${balance} tokens`);
}

async function batchMintFromCSV() {
  const [registrar] = await hre.ethers.getSigners();
  console.log("👤 Registrar:", registrar.address);
  
  const contractAddress = "PASTE_DEPLOYED_CONTRACT_ADDRESS_HERE";
  const VectorToken = await hre.ethers.getContractFactory("VectorToken");
  const contract = await VectorToken.attach(contractAddress);
  
  // Check if sender is registrar
  const isRegistrar = await contract.isRegistrar(registrar.address);
  if (!isRegistrar) {
    console.log("❌ Sender is not authorized as registrar");
    return;
  }
  
  const csvFilePath = process.argv[2];
  if (!csvFilePath) {
    console.log("Usage: npx hardhat run scripts/mint-skill.js --network amoy <path/to/students.csv>");
    console.log("CSV format: address,skillId,amount");
    return;
  }
  
  const students = [];
  const skillIds = [];
  const amounts = [];
  
  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (row) => {
      students.push(row.address);
      skillIds.push(parseInt(row.skillId));
      amounts.push(parseInt(row.amount) || 1);
    })
    .on('end', async () => {
      console.log(`📋 Processing ${students.length} records...`);
      
      // Batch mint
      const tx = await contract.batchMintSkills(students, skillIds, amounts);
      await tx.wait();
      
      console.log("✅ Batch minting complete!");
      console.log("📋 Transaction hash:", tx.hash);
      
      // Verify a sample
      if (students.length > 0) {
        const sampleBalance = await contract.balanceOf(students[0], skillIds[0]);
        console.log(`📊 Sample balance for ${students[0]}: ${sampleBalance} tokens`);
      }
    });
}

// Choose which function to run based on arguments
if (process.argv.length === 5 || process.argv.length === 6) {
  singleMint();
} else if (process.argv.length === 4) {
  batchMintFromCSV();
} else {
  console.log("Invalid arguments");
  console.log("For single mint: npx hardhat run scripts/mint-skill.js --network amoy <studentAddress> <skillId> [amount]");
  console.log("For batch mint: npx hardhat run scripts/mint-skill.js --network amoy <path/to/students.csv>");
}