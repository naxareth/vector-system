// packages/blockchain-core/contracts/VectorToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract VectorToken is ERC1155, AccessControl {
    using Strings for uint256;

    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    
    string private _baseURI;
    
    event SkillMinted(address indexed student, uint256 tokenId, uint256 amount, string studentDID);
    event BatchSkillsMinted(address[] students, uint256[] tokenIds, uint256[] amounts);
    event RegistrarAdded(address indexed registrar);
    event RegistrarRemoved(address indexed registrar);
    
    constructor(string memory baseURI_) 
        // Base URI should be the Next.js API endpoint (e.g., https://yourdomain.com/api/credentials/)
        ERC1155(baseURI_)
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, msg.sender);
        _baseURI = baseURI_;
    }
    
    // ========== DYNAMIC MINTING FUNCTIONS ==========
    function mintSkill(address student, uint256 tokenId, uint256 amount) 
        public 
        onlyRole(REGISTRAR_ROLE) 
        returns (bool)
    {
        _mint(student, tokenId, amount, "");
        
        // Emitting the DID in the event for off-chain indexing
        emit SkillMinted(student, tokenId, amount, addressToDID(student));
        return true;
    }
    
    function batchMintSkills(
        address[] calldata students,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts
    ) public onlyRole(REGISTRAR_ROLE) returns (bool) {
        require(
            students.length == tokenIds.length && 
            tokenIds.length == amounts.length,
            "Array length mismatch"
        );
        
        for (uint256 i = 0; i < students.length; i++) {
            _mint(students[i], tokenIds[i], amounts[i], "");
        }
        
        emit BatchSkillsMinted(students, tokenIds, amounts);
        return true;
    }
    
    // ========== REGISTRAR MANAGEMENT ==========
    function addRegistrar(address registrar) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(REGISTRAR_ROLE, registrar);
        emit RegistrarAdded(registrar);
    }
    
    function removeRegistrar(address registrar) public onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(REGISTRAR_ROLE, registrar);
        emit RegistrarRemoved(registrar);
    }
    
    function isRegistrar(address account) public view returns (bool) {
        return hasRole(REGISTRAR_ROLE, account);
    }
    
    // ========== REVOCATION / BURNING ==========
    event SkillRevoked(address indexed student, uint256 tokenId, uint256 amount);

    /**
     * @dev Revokes a credential by burning the token. Only callable by a registrar.
     * Emits a SkillRevoked event for off-chain indexing.
     */
    function revokeSkill(address student, uint256 tokenId, uint256 amount) 
        public 
        onlyRole(REGISTRAR_ROLE) 
    {
        _burn(student, tokenId, amount);
        emit SkillRevoked(student, tokenId, amount);
    }

    // ========== W3C METADATA & UTILITIES ==========
    
    /**
     * @dev Formats a standard wallet address into a Polygon Amoy W3C DID.
     */
    function addressToDID(address wallet) public pure returns (string memory) {
        return string(abi.encodePacked("did:polygon:amoy:", Strings.toHexString(uint160(wallet), 20)));
    }

    /**
     * @dev Overrides the standard ERC1155 uri function. 
     * Points directly to the backend W3C JSON-LD registry without appending ".json".
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        return string(abi.encodePacked(_baseURI, tokenId.toString()));
    }
    
    function setBaseURI(string memory newBaseURI) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseURI = newBaseURI;
    }
    
    // ========== OVERRIDES ==========
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}