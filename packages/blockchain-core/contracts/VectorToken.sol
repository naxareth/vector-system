// packages/blockchain-core/contracts/VectorToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract VectorToken is ERC1155, AccessControl {
    using Strings for uint256;
    
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    
    // Skill definitions (expandable)
    uint256 public constant REACT_SKILL = 1;
    uint256 public constant PYTHON_SKILL = 2;
    uint256 public constant SOLIDITY_SKILL = 3;
    uint256 public constant NODEJS_SKILL = 4;
    uint256 public constant AI_ML_SKILL = 5;
    
    string private _baseURI;
    mapping(uint256 => string) private _skillNames;
    
    event SkillMinted(address indexed student, uint256 skillId, uint256 amount);
    event BatchSkillsMinted(address[] students, uint256[] skillIds, uint256[] amounts);
    event RegistrarAdded(address indexed registrar);
    event RegistrarRemoved(address indexed registrar);
    
    constructor(string memory baseURI_) 
        ERC1155(string(abi.encodePacked(baseURI_, "{id}.json")))
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, msg.sender);
        _baseURI = baseURI_;
        
        // Initialize skill metadata
        _skillNames[REACT_SKILL] = "React Development";
        _skillNames[PYTHON_SKILL] = "Python Programming";
        _skillNames[SOLIDITY_SKILL] = "Solidity Smart Contracts";
        _skillNames[NODEJS_SKILL] = "Node.js Backend Development";
        _skillNames[AI_ML_SKILL] = "AI/ML Fundamentals";
    }
    
    // ========== MINTING FUNCTIONS ==========
    function mintSkill(address student, uint256 skillId, uint256 amount) 
        public 
        onlyRole(REGISTRAR_ROLE) 
        returns (bool)
    {
        require(skillId >= 1 && skillId <= 5, "Invalid skill ID");
        _mint(student, skillId, amount, "");
        emit SkillMinted(student, skillId, amount);
        return true;
    }
    
    function batchMintSkills(
        address[] calldata students,
        uint256[] calldata skillIds,
        uint256[] calldata amounts
    ) public onlyRole(REGISTRAR_ROLE) returns (bool) {
        require(
            students.length == skillIds.length && 
            skillIds.length == amounts.length,
            "Array length mismatch"
        );
        
        for (uint256 i = 0; i < students.length; i++) {
            require(skillIds[i] >= 1 && skillIds[i] <= 5, "Invalid skill ID");
            _mint(students[i], skillIds[i], amounts[i], "");
        }
        
        emit BatchSkillsMinted(students, skillIds, amounts);
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
    
    // ========== METADATA & UTILITIES ==========
    function uri(uint256 tokenId) public view override returns (string memory) {
        return string(abi.encodePacked(_baseURI, tokenId.toString(), ".json"));
    }
    
    function getSkillName(uint256 skillId) public view returns (string memory) {
        return _skillNames[skillId];
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