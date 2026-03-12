// Gas Benchmark Test — Module 10 Performance & Scalability
// Compares gas cost: N × mintSkill() vs 1 × batchMintSkills(N)
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Gas Benchmark: Individual vs Batch Minting", function () {
  async function deployFixture() {
    const signers = await ethers.getSigners();
    const owner = signers[0];
    // Use signers as "student" addresses
    const students = signers.slice(1, 51); // 50 student addresses

    const VectorToken = await ethers.getContractFactory("VectorToken");
    const token = await VectorToken.deploy("https://api.vector.edu/token/");

    return { token, owner, students };
  }

  it("should measure gas for 10× individual mintSkill()", async function () {
    const { token, owner, students } = await loadFixture(deployFixture);
    
    let totalGas = 0n;
    for (let i = 0; i < 10; i++) {
      const tx = await token.connect(owner).mintSkill(students[i].address, 1, 1);
      const receipt = await tx.wait();
      totalGas += receipt.gasUsed;
    }
    
    console.log(`\n  ⛽ 10× individual mintSkill() total gas: ${totalGas.toString()}`);
    console.log(`     Average per call: ${(totalGas / 10n).toString()}`);
  });

  it("should measure gas for 1× batchMintSkills(10)", async function () {
    const { token, owner, students } = await loadFixture(deployFixture);
    
    const addrs = students.slice(0, 10).map(s => s.address);
    const skillIds = Array(10).fill(1);
    const amounts = Array(10).fill(1);
    
    const tx = await token.connect(owner).batchMintSkills(addrs, skillIds, amounts);
    const receipt = await tx.wait();
    
    console.log(`  ⛽ 1× batchMintSkills(10) gas: ${receipt.gasUsed.toString()}`);
  });

  it("should measure gas for 50× individual mintSkill()", async function () {
    const { token, owner, students } = await loadFixture(deployFixture);
    
    let totalGas = 0n;
    for (let i = 0; i < 50; i++) {
      const tx = await token.connect(owner).mintSkill(students[i % students.length].address, 1, 1);
      const receipt = await tx.wait();
      totalGas += receipt.gasUsed;
    }
    
    console.log(`\n  ⛽ 50× individual mintSkill() total gas: ${totalGas.toString()}`);
    console.log(`     Average per call: ${(totalGas / 50n).toString()}`);
  });

  it("should measure gas for 1× batchMintSkills(50)", async function () {
    const { token, owner, students } = await loadFixture(deployFixture);
    
    const addrs = [];
    const skillIds = [];
    const amounts = [];
    for (let i = 0; i < 50; i++) {
      addrs.push(students[i % students.length].address);
      skillIds.push(1);
      amounts.push(1);
    }
    
    const tx = await token.connect(owner).batchMintSkills(addrs, skillIds, amounts);
    const receipt = await tx.wait();
    
    console.log(`  ⛽ 1× batchMintSkills(50) gas: ${receipt.gasUsed.toString()}`);
  });

  it("should print comparison summary", async function () {
    const { token, owner, students } = await loadFixture(deployFixture);
    
    // Individual 50x
    let individualTotal = 0n;
    for (let i = 0; i < 50; i++) {
      const tx = await token.connect(owner).mintSkill(students[i % students.length].address, 1, 1);
      const receipt = await tx.wait();
      individualTotal += receipt.gasUsed;
    }
    
    // Batch 50
    const { token: token2, owner: owner2, students: students2 } = await loadFixture(deployFixture);
    const addrs = [];
    const skillIds = [];
    const amounts = [];
    for (let i = 0; i < 50; i++) {
      addrs.push(students2[i % students2.length].address);
      skillIds.push(1);
      amounts.push(1);
    }
    const batchTx = await token2.connect(owner2).batchMintSkills(addrs, skillIds, amounts);
    const batchReceipt = await batchTx.wait();
    const batchGas = batchReceipt.gasUsed;
    
    const savings = ((individualTotal - batchGas) * 100n) / individualTotal;
    const batchPct = (batchGas * 100n) / individualTotal;
    
    console.log(`\n  ═══════════════════════════════════════════════`);
    console.log(`    GAS COMPARISON SUMMARY (50 credentials)`);
    console.log(`  ═══════════════════════════════════════════════`);
    console.log(`    50× mintSkill() total:     ${individualTotal.toString()} gas`);
    console.log(`    1× batchMintSkills(50):    ${batchGas.toString()} gas`);
    console.log(`    Batch is ${batchPct.toString()}% of individual cost`);
    console.log(`    Gas savings:               ${savings.toString()}%`);
    console.log(`  ═══════════════════════════════════════════════\n`);
  });
});
