import hre from "hardhat";

async function diagnose() {
  console.log("🔍 Diagnosing Viem Setup");
  console.log("========================");
  
  try {
    // Check what's available in hre.viem
    console.log("1. Checking hre.viem...");
    if (!hre.viem) {
      console.log("❌ hre.viem is undefined!");
      return;
    }
    
    console.log("Available methods:", Object.keys(hre.viem).join(', '));
    
    // Try to get public client
    console.log("\n2. Testing getPublicClient...");
    const publicClient = await hre.viem.getPublicClient();
    console.log("✅ getPublicClient works");
    console.log("   Chain ID:", await publicClient.getChainId());
    
    // Check network
    console.log("\n3. Checking network...");
    console.log("   Network name:", hre.network.name);
    
    // Try different ways to get accounts
    console.log("\n4. Testing account methods...");
    
    // Method A: getWalletClients
    if (hre.viem.getWalletClients) {
      console.log("   getWalletClients exists, testing...");
      const wallets = await hre.viem.getWalletClients();
      console.log(`   ✅ Found ${wallets.length} wallets`);
    } else {
      console.log("   ❌ getWalletClients not found");
    }
    
    // Method B: getWalletClient
    if (hre.viem.getWalletClient) {
      console.log("   getWalletClient exists, testing...");
      const wallet = await hre.viem.getWalletClient(0);
      console.log(`   ✅ Wallet 0: ${wallet.account.address}`);
    } else {
      console.log("   ❌ getWalletClient not found");
    }
    
    // Method C: getClients
    if (hre.viem.getClients) {
      console.log("   getClients exists, testing...");
      const clients = await hre.viem.getClients();
      console.log(`   ✅ Found ${clients.length} clients`);
    }
    
  } catch (error) {
    console.error("❌ Diagnostic failed:", error.message);
  }
}

diagnose();