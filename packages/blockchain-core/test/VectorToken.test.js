// packages/blockchain-core/test/VectorToken.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("VectorToken", function () {
  async function deployTokenFixture() {
    const [owner, registrar, student1, student2, unauthorized] = await ethers.getSigners();
    
    const VectorToken = await ethers.getContractFactory("VectorToken");
    const vectorToken = await VectorToken.deploy("https://api.vector.edu/token/");
    
    return { vectorToken, owner, registrar, student1, student2, unauthorized };
  }

  describe("Deployment", function () {
    it("Should set the right owner as admin", async function () {
      const { vectorToken, owner } = await loadFixture(deployTokenFixture);
      expect(await vectorToken.hasRole(await vectorToken.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
    });

    it("Should set the right skill names", async function () {
      const { vectorToken } = await loadFixture(deployTokenFixture);
      expect(await vectorToken.getSkillName(1)).to.equal("React Development");
      expect(await vectorToken.getSkillName(2)).to.equal("Python Programming");
    });
  });

  describe("Role Management", function () {
    it("Should allow admin to add registrars", async function () {
      const { vectorToken, owner, registrar } = await loadFixture(deployTokenFixture);
      
      await expect(vectorToken.connect(owner).addRegistrar(registrar.address))
        .to.emit(vectorToken, "RegistrarAdded")
        .withArgs(registrar.address);
      
      expect(await vectorToken.isRegistrar(registrar.address)).to.be.true;
    });

    it("Should prevent non-admin from adding registrars", async function () {
      const { vectorToken, unauthorized, registrar } = await loadFixture(deployTokenFixture);
      
      await expect(
        vectorToken.connect(unauthorized).addRegistrar(registrar.address)
      ).to.be.reverted;
    });
  });

  describe("Minting", function () {
    it("Should allow registrar to mint skills", async function () {
      const { vectorToken, owner, student1 } = await loadFixture(deployTokenFixture);
      
      await expect(vectorToken.connect(owner).mintSkill(student1.address, 1, 100))
        .to.emit(vectorToken, "SkillMinted")
        .withArgs(student1.address, 1, 100);
      
      expect(await vectorToken.balanceOf(student1.address, 1)).to.equal(100);
    });

    it("Should prevent unauthorized minting", async function () {
      const { vectorToken, unauthorized, student1 } = await loadFixture(deployTokenFixture);
      
      await expect(
        vectorToken.connect(unauthorized).mintSkill(student1.address, 1, 100)
      ).to.be.reverted;
    });

    it("Should batch mint skills", async function () {
      const { vectorToken, owner, student1, student2 } = await loadFixture(deployTokenFixture);
      
      const students = [student1.address, student2.address];
      const skillIds = [1, 2];
      const amounts = [50, 75];
      
      await expect(vectorToken.connect(owner).batchMintSkills(students, skillIds, amounts))
        .to.emit(vectorToken, "BatchSkillsMinted");
      
      expect(await vectorToken.balanceOf(student1.address, 1)).to.equal(50);
      expect(await vectorToken.balanceOf(student2.address, 2)).to.equal(75);
    });

    it("Should reject invalid skill IDs", async function () {
      const { vectorToken, owner, student1 } = await loadFixture(deployTokenFixture);
      
      await expect(
        vectorToken.connect(owner).mintSkill(student1.address, 99, 100)
      ).to.be.revertedWith("Invalid skill ID");
    });
  });

  describe("URI", function () {
    it("Should return correct token URI", async function () {
      const { vectorToken } = await loadFixture(deployTokenFixture);
      
      expect(await vectorToken.uri(1)).to.equal("https://api.vector.edu/token/1.json");
      expect(await vectorToken.uri(2)).to.equal("https://api.vector.edu/token/2.json");
    });

    it("Should allow admin to update base URI", async function () {
      const { vectorToken, owner } = await loadFixture(deployTokenFixture);
      
      await vectorToken.connect(owner).setBaseURI("https://newapi.vector.edu/token/");
      expect(await vectorToken.uri(1)).to.equal("https://newapi.vector.edu/token/1.json");
    });
  });
});