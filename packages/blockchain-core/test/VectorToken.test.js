// packages/blockchain-core/test/VectorToken.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("VectorToken", function () {
  async function deployTokenFixture() {
    const [owner, registrar, student1, student2, unauthorized] = await ethers.getSigners();
    
    const VectorToken = await ethers.getContractFactory("VectorToken");
    const vectorToken = await VectorToken.deploy("https://api.vector.edu/token/");
    
    // Add registrar role to the registrar account
    const REGISTRAR_ROLE = await vectorToken.REGISTRAR_ROLE();
    await vectorToken.grantRole(REGISTRAR_ROLE, registrar.address);
    
    return { vectorToken, owner, registrar, student1, student2, unauthorized };
  }

  describe("Deployment", function () {
    it("Should set the right owner as admin", async function () {
      const { vectorToken, owner } = await loadFixture(deployTokenFixture);
      expect(await vectorToken.hasRole(await vectorToken.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
    });

    it("Should set the initial registrar", async function () {
      const { vectorToken, owner } = await loadFixture(deployTokenFixture);
      expect(await vectorToken.isRegistrar(owner.address)).to.be.true;
    });
  });

  describe("Role Management", function () {
    it("Should allow admin to add registrars", async function () {
      const { vectorToken, owner, unauthorized } = await loadFixture(deployTokenFixture);
      
      await expect(vectorToken.connect(owner).addRegistrar(unauthorized.address))
        .to.emit(vectorToken, "RegistrarAdded")
        .withArgs(unauthorized.address);
      
      expect(await vectorToken.isRegistrar(unauthorized.address)).to.be.true;
    });

    it("Should prevent non-admin from adding registrars", async function () {
      const { vectorToken, unauthorized, registrar } = await loadFixture(deployTokenFixture);
      
      await expect(
        vectorToken.connect(unauthorized).addRegistrar(registrar.address)
      ).to.be.reverted;
    });

    it("Should allow admin to remove registrars", async function () {
      const { vectorToken, owner, registrar } = await loadFixture(deployTokenFixture);
      
      await expect(vectorToken.connect(owner).removeRegistrar(registrar.address))
        .to.emit(vectorToken, "RegistrarRemoved")
        .withArgs(registrar.address);
      
      expect(await vectorToken.isRegistrar(registrar.address)).to.be.false;
    });
  });

  describe("Minting", function () {
    it("Should allow registrar to mint skills", async function () {
      const { vectorToken, registrar, student1 } = await loadFixture(deployTokenFixture);
      
      await expect(vectorToken.connect(registrar).mintSkill(student1.address, 1, 100))
        .to.emit(vectorToken, "SkillMinted");
      
      expect(await vectorToken.balanceOf(student1.address, 1)).to.equal(100);
    });

    it("Should prevent unauthorized minting", async function () {
      const { vectorToken, unauthorized, student1 } = await loadFixture(deployTokenFixture);
      
      await expect(
        vectorToken.connect(unauthorized).mintSkill(student1.address, 1, 100)
      ).to.be.reverted;
    });

    it("Should batch mint skills", async function () {
      const { vectorToken, registrar, student1, student2 } = await loadFixture(deployTokenFixture);
      
      const students = [student1.address, student2.address];
      const skillIds = [1, 2];
      const amounts = [50, 75];
      
      await expect(vectorToken.connect(registrar).batchMintSkills(students, skillIds, amounts))
        .to.emit(vectorToken, "BatchSkillsMinted");
      
      expect(await vectorToken.balanceOf(student1.address, 1)).to.equal(50);
      expect(await vectorToken.balanceOf(student2.address, 2)).to.equal(75);
    });
  });

  describe("Revocation", function () {
    it("Should allow registrar to revoke skills", async function () {
      const { vectorToken, registrar, student1 } = await loadFixture(deployTokenFixture);
      
      await vectorToken.connect(registrar).mintSkill(student1.address, 1, 100);
      
      await expect(vectorToken.connect(registrar).revokeSkill(student1.address, 1, 40))
        .to.emit(vectorToken, "SkillRevoked")
        .withArgs(student1.address, 1, 40);
        
      expect(await vectorToken.balanceOf(student1.address, 1)).to.equal(60);
    });

    it("Should prevent unauthorized revocation", async function () {
      const { vectorToken, registrar, student1, unauthorized } = await loadFixture(deployTokenFixture);
      
      await vectorToken.connect(registrar).mintSkill(student1.address, 1, 100);
      
      await expect(
        vectorToken.connect(unauthorized).revokeSkill(student1.address, 1, 40)
      ).to.be.reverted;
    });
  });

  describe("Utilities", function () {
    it("Should return correct DID for an address", async function () {
      const { vectorToken, student1 } = await loadFixture(deployTokenFixture);
      
      const did = await vectorToken.addressToDID(student1.address);
      expect(did).to.equal(`did:polygon:amoy:${student1.address.toLowerCase()}`);
    });

    it("Should return correct token URI", async function () {
      const { vectorToken } = await loadFixture(deployTokenFixture);
      
      expect(await vectorToken.uri(1)).to.equal("https://api.vector.edu/token/1");
    });

    it("Should allow admin to update base URI", async function () {
      const { vectorToken, owner } = await loadFixture(deployTokenFixture);
      
      await vectorToken.connect(owner).setBaseURI("https://newapi.vector.edu/v2/");
      expect(await vectorToken.uri(1)).to.equal("https://newapi.vector.edu/v2/1");
    });
  });
});