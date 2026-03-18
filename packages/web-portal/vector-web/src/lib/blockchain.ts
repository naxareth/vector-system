import { ethers } from 'ethers';

// ⚠️ For Local Testing (localhost:8545 / Chain 31337)
export const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// ⚠️ For Polygon Amoy (Testnet)
// export const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
export const POLYGON_AMOY_CHAIN_ID = 80002;
export const POLYGON_AMOY_RPC_URLS = [
  'https://rpc-amoy.polygon.technology/',
  'https://polygon-amoy-bor-rpc.publicnode.com',
];

export const VECTOR_TOKEN_ABI = [
  // ✅ Minting
  "function mintSkill(address student, uint256 skillId, uint256 amount) public returns (bool)",
  "function batchMintSkills(address[] calldata students, uint256[] calldata skillIds, uint256[] calldata amounts) public returns (bool)",
  
  // ✅ Reading Data
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) view returns (uint256[])",
  "function uri(uint256 id) view returns (string)",
  
  // ✅ Revoking / Burning
  "function revokeSkill(address student, uint256 tokenId, uint256 amount) public",
  "function burn(address account, uint256 id, uint256 value) public",
  
  // ✅ Transfers (ERC1155 standard)
  "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) public",
  "function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data) public",
  
  // ✅ Events
  "event SkillRevoked(address indexed student, uint256 tokenId, uint256 amount)",
  
  // ✅ Roles & Metadata
  "function isRegistrar(address account) public view returns (bool)",
  // We added this helper to the contract, let's use it if available, otherwise we rely on the map below
  "function getSkillName(uint256 skillId) view returns (string)" 
];

// 🛑 FIXED: Removed aliases to prevent duplicate cards. 
// Only ONE name per ID.
export const SKILL_MAP: Record<string, number> = {
  "React Development": 1,
  "Python Programming": 2,
  "Solidity Smart Contracts": 3,
  "Node.js Backend Development": 4,
  "AI/ML Fundamentals": 5
};

let readOnlyProvider: ethers.AbstractProvider | null = null;

export function getReadOnlyProvider(): ethers.AbstractProvider {
  if (readOnlyProvider) return readOnlyProvider;

  const network = ethers.Network.from(POLYGON_AMOY_CHAIN_ID);
  const providers = POLYGON_AMOY_RPC_URLS.map((url, index) => ({
    provider: new ethers.JsonRpcProvider(url, network, { staticNetwork: network }),
    priority: index + 1,
    stallTimeout: 1200,
    weight: 1,
  }));

  readOnlyProvider = providers.length === 1
    ? providers[0].provider
    : new ethers.FallbackProvider(providers);

  return readOnlyProvider;
}

export async function fetchWalletSkillNames(walletAddress: string): Promise<string[]> {
  if (!ethers.isAddress(walletAddress)) return [];

  try {
    const provider = getReadOnlyProvider();
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (!code || code === '0x') return [];

    const contract = new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, provider);
    const skillEntries = Object.entries(SKILL_MAP).filter(([, skillId]) => typeof skillId === 'number');
    if (skillEntries.length === 0) return [];

    const skillIds = skillEntries.map(([, skillId]) => skillId);
    const accounts = skillIds.map(() => walletAddress);
    const balances = await contract.balanceOfBatch(accounts, skillIds);

    return skillEntries
      .filter(([,], index) => BigInt(balances[index] ?? 0) > BigInt(0))
      .map(([skillName]) => skillName);
  } catch (error) {
    console.warn('Read-only blockchain scan failed:', error);
    return [];
  }
}