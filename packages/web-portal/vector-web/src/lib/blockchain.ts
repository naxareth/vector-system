export const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // Your deployed address

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