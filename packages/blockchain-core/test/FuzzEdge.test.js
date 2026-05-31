// packages/blockchain-core/test/FuzzEdge.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("VectorToken Fuzz & Edge Tests", function () {
  async function deployTokenFixture() {
    const [owner, registrar, student1, unauthorized] = await ethers.getSigners();
    
    const VectorToken = await ethers.getContractFactory("VectorToken");
    const vectorToken = await VectorToken.deploy("https://api.vector.edu/token/");
    
    const REGISTRAR_ROLE = await vectorToken.REGISTRAR_ROLE();
    await vectorToken.grantRole(REGISTRAR_ROLE, registrar.address);
    
    return { vectorToken, owner, registrar, student1, unauthorized };
  }

  describe("Edge Case: Minting & Batching", function () {
    it("Should fail when minting to zero address", async function () {
      const { vectorToken, registrar } = await loadFixture(deployTokenFixture);
      const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
      
      await expect(
        vectorToken.connect(registrar).mintSkill(ZERO_ADDRESS, 1, 100)
      ).to.be.revertedWithCustomError(vectorToken, "ERC1155InvalidReceiver");
    });

    it("Should fail batch minting when student array is shorter", async function () {
      const { vectorToken, registrar, student1 } = await loadFixture(deployTokenFixture);
      
      const students = [student1.address];
      const ids = [1, 2];
      const amounts = [10, 20];
      
      await expect(
        vectorToken.connect(registrar).batchMintSkills(students, ids, amounts)
      ).to.be.revertedWith("Array length mismatch");
    });

    it("Should fail batch minting when ID array is shorter", async function () {
      const { vectorToken, registrar, student1 } = await loadFixture(deployTokenFixture);
      
      const students = [student1.address, student1.address];
      const ids = [1];
      const amounts = [10, 20];
      
      await expect(
        vectorToken.connect(registrar).batchMintSkills(students, ids, amounts)
      ).to.be.revertedWith("Array length mismatch");
    });
  });

  describe("Edge Case: Revocation", function () {
    it("Should fail to revoke more tokens than held", async function () {
      const { vectorToken, registrar, student1 } = await loadFixture(deployTokenFixture);
      
      await vectorToken.connect(registrar).mintSkill(student1.address, 1, 100);
      
      await expect(
        vectorToken.connect(registrar).revokeSkill(student1.address, 1, 101)
      ).to.be.revertedWithCustomError(vectorToken, "ERC1155InsufficientBalance");
    });

    it("Should fail to revoke from an address with zero balance", async function () {
      const { vectorToken, registrar, student1 } = await loadFixture(deployTokenFixture);
      
      await expect(
        vectorToken.connect(registrar).revokeSkill(student1.address, 1, 1)
      ).to.be.revertedWithCustomError(vectorToken, "ERC1155InsufficientBalance");
    });
  });

  describe("Edge Case: Admin Functions", function () {
    it("Should allow setting an empty base URI (edge case)", async function () {
      const { vectorToken, owner } = await loadFixture(deployTokenFixture);
      
      await vectorToken.connect(owner).setBaseURI("");
      expect(await vectorToken.uri(1)).to.equal("1");
    });

    it("Should handle adding a registrar that already has the role", async function () {
      const { vectorToken, owner, registrar } = await loadFixture(deployTokenFixture);
      
      // registrar already has the role from fixture
      await expect(vectorToken.connect(owner).addRegistrar(registrar.address))
        .to.not.be.reverted;
        
      expect(await vectorToken.isRegistrar(registrar.address)).to.be.true;
    });
  });

  describe("Security: Unauthorized Access", function () {
    it("Should prevent unauthorized calling of restricted functions", async function () {
      const { vectorToken, unauthorized, student1 } = await loadFixture(deployTokenFixture);
      
      // mintSkill
      await expect(vectorToken.connect(unauthorized).mintSkill(student1.address, 1, 1))
        .to.be.reverted;

      // batchMintSkills
      await expect(vectorToken.connect(unauthorized).batchMintSkills([student1.address], [1], [1]))
        .to.be.reverted;

      // revokeSkill
      await expect(vectorToken.connect(unauthorized).revokeSkill(student1.address, 1, 1))
        .to.be.reverted;

      // addRegistrar
      await expect(vectorToken.connect(unauthorized).addRegistrar(unauthorized.address))
        .to.be.reverted;

      // removeRegistrar
      await expect(vectorToken.connect(unauthorized).removeRegistrar(student1.address))
        .to.be.reverted;

      // setBaseURI
      await expect(vectorToken.connect(unauthorized).setBaseURI("hack"))
        .to.be.reverted;
    });
  });
});
