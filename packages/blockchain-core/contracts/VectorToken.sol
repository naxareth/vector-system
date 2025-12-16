// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VectorToken is ERC1155, Ownable {
    // Event: Lets your Frontend know a mint happened
    event SkillIssued(address indexed student, uint256 skillId);

    constructor() ERC1155("https://ipfs.io/ipfs/") Ownable(msg.sender) {}

    // The Function: Registrar calls this to issue a skill
    function issueSkill(address student, uint256 skillId) public onlyOwner {
        // Mint 1 copy of the skill ID to the student
        _mint(student, skillId, 1, "");
        emit SkillIssued(student, skillId);
    }
}