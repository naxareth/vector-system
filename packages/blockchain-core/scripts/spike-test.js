import hre from "hardhat";

async function main() {
  console.log("⛓️  Starting Hardhat v3 with Viem...");
  
  // Get test accounts with Viem (different from ethers!)
  const [adminClient, studentClient] = await hre.viem.getWalletClients();
  console.log(`👨‍🏫 Admin: ${adminClient.account.address}`);
  console.log(`👨‍🎓 Student: ${studentClient.account.address}`);
  
  // Deploy contract using Viem
  console.log("\n🚀 Deploying VectorToken...");
  const vectorToken = await hre.viem.deployContract("VectorToken");
  console.log(`✅ Contract deployed to: ${vectorToken.address}`);
  
  // Mint a test credential using Viem write function
  console.log("\n✍️  Minting React skill to student...");
  const txHash = await vectorToken.write.mintSkill([
    studentClient.account.address,
    1n, // skillId as bigint
    1n  // amount as bigint
  ]);
  
  // Wait for transaction receipt
  const publicClient = await hre.viem.getPublicClient();
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log("✅ Transaction confirmed!");
  
  // Verify ownership using Viem read function
  console.log("\n🔍 Checking student's balance...");
  const balance = await vectorToken.read.balanceOf([
    studentClient.account.address,
    1n
  ]);
  
  if (balance === 1n) {
    console.log("🎉 SUCCESS: Student owns the credential!");
    console.log("✅ Hardhat v3 + Viem works with your contract!");
  } else {
    console.log(`❌ FAIL: Balance is ${balance}, expected 1`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});