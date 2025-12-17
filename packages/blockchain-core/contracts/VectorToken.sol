// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VectorToken is ERC1155, Ownable {
    uint256 public constant REACT_SKILL = 1;
    uint256 public constant PYTHON_SKILL = 2;
    
    event SkillMinted(address indexed student, uint256 skillId, uint256 amount);
    
    constructor() ERC1155("https://api.example.com/token/{id}.json") Ownable(msg.sender) {}
    
    function mintSkill(address student, uint256 skillId, uint256 amount) public onlyOwner {
        _mint(student, skillId, amount, "");
        emit SkillMinted(student, skillId, amount);
    }
}