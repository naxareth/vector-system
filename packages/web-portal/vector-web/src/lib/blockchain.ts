export const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Your deployed address

export const VECTOR_TOKEN_ABI = [
  // ✅ Minting
  "function mintSkill(address student, uint256 skillId, uint256 amount) public returns (bool)",
  "function batchMintSkills(address[] calldata students, uint256[] calldata skillIds, uint256[] calldata amounts) public returns (bool)",
  
  // ✅ Reading Data
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function uri(uint256 id) view returns (string)",
  
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