packages\ai-engine
packages\ai-engine\src
packages\ai-engine\src\data
packages\ai-engine\src\data\jsearch-client.ts

import axios from 'axios';

export interface JobSearchResult {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_country: string;
  job_employment_type: string;
  job_apply_link: string;
}

export async function fetchJobMarketData(
  skill: string,
  location: string = 'PH',
  days: number = 30
): Promise<JobSearchResult[]> {
  try {
    const options = {
      method: 'GET',
      url: process.env.JOB_MARKET_API_URL,
      params: {
        query: `${skill} developer`,
        page: '1',
        num_pages: '1',
        date_posted: 'month'
      },
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
      }
    };
    
    const response = await axios.request(options);
    return response.data.data || [];
  } catch (error) {
    console.error(`Error fetching job data for ${skill}:`, error);
    return [];
  }
}

export function countJobsBySkill(skill: string, results: JobSearchResult[]): number {
  // Count jobs containing skill in title
  return results.filter(job => 
    job.job_title.toLowerCase().includes(skill.toLowerCase())
  ).length;
}

packages\ai-engine\src\nlp
packages\ai-engine\src\nlp\gemini-client.ts

import { GoogleGenerativeAI } from "@google/generative-ai";

import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const skillExtractionPrompt = `
You are a skill extraction expert. Extract and normalize technical skills from resume text.

Input: Raw resume text
Output: JSON array of normalized skill names

Rules:
1. Map variations to standard names:
   - "React.js", "ReactJS" → "React"
   - "Python 3", "Python3" → "Python"
   - "Node", "NodeJS" → "Node.js"
   - "Solidity" → "Solidity"
   - "AI/ML", "Machine Learning" → "AI/ML"
2. Only include technical skills from our taxonomy
3. Return JSON format: { "skills": ["React", "Python"] }

Taxonomy: React, Python, Solidity, Node.js, AI/ML
`;

packages\ai-engine\src\nlp\skill-extractor.ts

import { genAI, skillExtractionPrompt } from "./gemini-client";

export async function extractSkillsFromResume(resumeText: string): Promise<string[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  
  const result = await model.generateContent([
    skillExtractionPrompt,
    `Resume Text: ${resumeText}`
  ]);
  
  const response = result.response.text();
  // Parse JSON response
  const parsed = JSON.parse(response.replace(/```json|```/g, ''));
  return parsed.skills || [];
}

packages\ai-engine\src\predictions
packages\ai-engine\src\predictions\decay-forecaster.ts

import * as ss from 'simple-statistics';

export interface JobMarketData {
  date: string;  // YYYY-MM-DD
  jobCount: number;
}

export interface SkillHealth {
  skillName: string;
  currentDemand: number;
  trend: 'growing' | 'stable' | 'declining';
  healthScore: number; // 0-100
  decayRate: number; // slope from regression
}

export function calculateSkillDecay(
  skillName: string,
  historicalData: JobMarketData[]
): SkillHealth {
  if (historicalData.length < 3) {
    return {
      skillName,
      currentDemand: 0,
      trend: 'stable',
      healthScore: 50,
      decayRate: 0
    };
  }
  
  // Prepare data for linear regression
  const points = historicalData.map((data, index) => [index, data.jobCount]);
  
  // Calculate linear regression
  const regression = ss.linearRegression(points);
  const slope = regression.m;
  
  // Calculate current demand (latest job count)
  const currentDemand = historicalData[historicalData.length - 1].jobCount;
  
  // Determine trend
  let trend: 'growing' | 'stable' | 'declining';
  if (slope > 0.1) trend = 'growing';
  else if (slope < -0.1) trend = 'declining';
  else trend = 'stable';
  
  // Calculate health score (0-100)
  const maxDemand = Math.max(...historicalData.map(d => d.jobCount));
  const minDemand = Math.min(...historicalData.map(d => d.jobCount));
  const healthScore = maxDemand === minDemand 
    ? 50 
    : ((currentDemand - minDemand) / (maxDemand - minDemand)) * 100;
  
  return {
    skillName,
    currentDemand,
    trend,
    healthScore: Math.round(healthScore),
    decayRate: parseFloat(slope.toFixed(3))
  };
}

packages\ai-engine\src\recommendations
packages\ai-engine\src\recommendations\course-recommender.ts

// Define what a Course looks like in our catalog
interface Course {
  id: string;
  title: string;
  tags: string[];
}

// 1. THE CATALOG (Mock Database of Courses)
// In a real app, this would come from your 'courses' table in Supabase
const COURSE_CATALOG: Course[] = [
  { id: 'WEB301', title: 'Advanced React Patterns', tags: ['react', 'javascript', 'frontend'] },
  { id: 'BLOCK401', title: 'Solidity Smart Contracts', tags: ['blockchain', 'solidity', 'web3'] },
  { id: 'AI201', title: 'Machine Learning Fundamentals', tags: ['python', 'ai', 'data science'] },
  { id: 'NODE301', title: 'Backend Development with Node.js', tags: ['node.js', 'backend', 'javascript'] },
  { id: 'CS101', title: 'Intro to Computer Science', tags: ['basics', 'algorithms'] },
  { id: 'SEC501', title: 'Cybersecurity Essentials', tags: ['security', 'network', 'admin'] }
];

export function recommendCourses(student: { skills: string[] }) {
  

  // 🛡️ Defensive Check
  if (!student || !student.skills) {
    return [];
  }

  const mySkills = student.skills.map(s => s.toLowerCase());

  // 2. THE MATCHING ENGINE (Tag-Based)
  const recommendations = COURSE_CATALOG.map(course => {
    // Count how many tags match the student's skills
    const overlap = course.tags.filter(tag => mySkills.includes(tag)).length;
    
    let score = 0; 
    let reason = "General Recommendation";

    if (overlap > 0) {
      // High score if skills match
      score = 70 + (overlap * 10); 
      reason = `Matches your skills: ${course.tags.filter(t => mySkills.includes(t)).join(', ')}`;
    } else {
      // Low score, but suggest it as a new path
      score = 30;
      reason = "Expand your horizons";
    }

    return {
      courseCode: course.id,
      courseName: course.title,
      relevanceScore: Math.min(score, 100), // Max 100
      reason
    };
  });

  // 3. SORT & FILTER
  // Return top 3 highest scores
  return recommendations
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 3);
}

packages\ai-engine\src\index.ts

import { calculateSkillDecay } from './predictions/decay-forecaster';
import { recommendCourses } from './recommendations/course-recommender';
import { extractSkillsFromResume } from './nlp/skill-extractor';

interface AIInputParams {
  studentData: {
    id: string;
    name: string;
    skills: string[]; 
    credentials: any[];
  };
  marketData: any[]; // Raw Supabase rows
  resumeText?: string;
}

export async function analyzeStudentProfile(params: AIInputParams) {
  const { studentData, marketData, resumeText } = params;

  console.log("🔍 AI Engine: Processing profile for", studentData?.name);

  if (!studentData) {
    throw new Error("❌ AI Engine Error: 'studentData' is missing.");
  }

  // 1. NLP Extraction
  let extractedSkills: string[] = [];
  if (resumeText) {
    try {
      extractedSkills = await extractSkillsFromResume(resumeText);
      console.log("✅ NLP Extracted:", extractedSkills);
    } catch (e) {
      console.warn("⚠️ NLP extraction skipped:", e);
    }
  }

  const finalSkills = Array.from(new Set([...studentData.skills, ...extractedSkills]));
  
  // 2. PREDICTION (Skill Decay)
  // We process each skill one by one
  const skillHealth = finalSkills.map(skill => {
    // Find rows in 'marketData' that match this skill (case-insensitive)
    const rawHistory = marketData.filter(row => 
      row.skill_name.toLowerCase() === skill.toLowerCase()
    );

    // ✅ FIX 2: Map Supabase data (recorded_at/job_count) -> Predictor data (date/jobCount)
    const formattedHistory = rawHistory.map(row => ({
      date: row.recorded_at, 
      jobCount: row.job_count
    }));

    // Call the correct function
    return calculateSkillDecay(skill, formattedHistory); 
  });

  // 3. RECOMMENDATION
  const recommendations = recommendCourses({
    ...studentData,
    skills: finalSkills
  });

  return {
    studentId: studentData.id,
    skillHealth, // This now contains the calculated health/decay scores
    recommendations,
    gaps: []
  };
}

packages\ai-engine\test
packages\ai-engine\test\ai-test.ts

// packages/ai-engine/test/ai-test.ts
import { analyzeStudentProfile } from '../src/index';

async function testAIEngine() {
  console.log('🧪 Testing AI Engine...');
  
  const mockResume = `
    Experienced full-stack developer with 3 years in React and Node.js.
    Built decentralized applications using Solidity. 
    Python for data analysis and machine learning projects.
  `;
  
  const mockStudent: any = {
    id: 'test-123',
    skills: [1, 4], // React, Node.js
    coursesTaken: ['CS101']
  };
  
  try {
    const result = await analyzeStudentProfile(mockResume, mockStudent);
    
    console.log('\n📊 ANALYSIS RESULTS:');
    console.log('Extracted Skills:', result.extractedSkills);
    console.log('\nSkill Health:');
    result.skillHealth.forEach(skill => {
      console.log(`  ${skill.skillName}: ${skill.trend} (Score: ${skill.healthScore})`);
    });
    console.log('\nRecommendations:');
    result.recommendations.forEach(rec => {
      console.log(`  ${rec.courseCode}: ${rec.relevanceScore}% - ${rec.reason}`);
    });
    
    console.log('\n✅ AI Engine is working!');
  } catch (error) {
    console.error('❌ AI Engine test failed:', error);
  }
}

testAIEngine();

packages\ai-engine\.env

GEMINI_API_KEY=AIzaSyCna0SZhZBGIjeyg88DR1gMdQJa5_-mEz0
RAPIDAPI_KEY=443a347c48msh9408f647927deb4p12c55ejsnc2602fbf2c07
JOB_MARKET_API_URL=https://jsearch.p.rapidapi.com/search

packages\ai-engine\tsconfig.json
packages\blockchain-core
packages\blockchain-core\artifacts
packages\blockchain-core\cache
packages\blockchain-core\contracts
packages\blockchain-core\contracts\VectorToken.sol

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

packages\blockchain-core\deployments
packages\blockchain-core\node_modules
packages\blockchain-core\scripts
packages\blockchain-core\scripts\deploy.js

// packages/blockchain-core/scripts/deploy.js
const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying VectorToken to Amoy...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deployer:", deployer.address);
  
  // Deploy contract
  const VectorToken = await hre.ethers.getContractFactory("VectorToken");
  const contract = await VectorToken.deploy("https://api.vector.edu/token/");
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log("✅ Contract deployed to:", address);
  
  // Verify roles
  console.log("👑 Deployer is admin:", await contract.hasRole(await contract.DEFAULT_ADMIN_ROLE(), deployer.address));
  console.log("📋 Deployer is registrar:", await contract.isRegistrar(deployer.address));
  
  // Get network info
  const network = await hre.ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name, "(Chain ID:", network.chainId + ")");
  
  // Save deployment info
  const fs = require("fs");
  const deploymentsDir = "./deployments";
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId,
    contract: "VectorToken",
    address: address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    baseURI: "https://api.vector.edu/token/",
    skills: {
      1: "React Development",
      2: "Python Programming",
      3: "Solidity Smart Contracts",
      4: "Node.js Backend Development",
      5: "AI/ML Fundamentals"
    }
  };
  
  fs.writeFileSync(
    `${deploymentsDir}/deployment-${network.chainId}.json`,
    JSON.stringify(deploymentInfo, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value
    , 2)
  );
  
  console.log("💾 Deployment info saved to:", `${deploymentsDir}/deployment-${network.chainId}.json`);
  console.log("🔗 Polygonscan: https://amoy.polygonscan.com/address/" + address);
  
  // For verification (run separately)
  console.log("\n🔍 To verify on Polygonscan, run:");
  console.log(`npx hardhat verify --network amoy ${address} "https://api.vector.edu/token/"`);
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});

packages\blockchain-core\scripts\manage-registrars.js

// packages/blockchain-core/scripts/manage-registrars.js
const hre = require("hardhat");

async function main() {
  const [admin] = await hre.ethers.getSigners();
  console.log("🔑 Admin:", admin.address);
  
  // Load deployed contract
  const contractAddress = "PASTE_DEPLOYED_CONTRACT_ADDRESS_HERE";
  const VectorToken = await hre.ethers.getContractFactory("VectorToken");
  const contract = await VectorToken.attach(contractAddress);
  
  console.log("📋 Contract:", contractAddress);
  console.log("👑 Admin is admin:", await contract.hasRole(await contract.DEFAULT_ADMIN_ROLE(), admin.address));
  
  // Command line arguments
  const args = process.argv.slice(2);
  const action = args[0]; // "add" or "remove"
  const registrarAddress = args[1];
  
  if (!action || !registrarAddress) {
    console.log("Usage: npx hardhat run scripts/manage-registrars.js --network amoy <add|remove> <address>");
    console.log("Example: npx hardhat run scripts/manage-registrars.js --network amoy add 0x1234...");
    return;
  }
  
  if (action === "add") {
    console.log(`➕ Adding registrar: ${registrarAddress}`);
    const tx = await contract.addRegistrar(registrarAddress);
    await tx.wait();
    console.log("✅ Registrar added");
    console.log("📋 Is registrar now:", await contract.isRegistrar(registrarAddress));
  } else if (action === "remove") {
    console.log(`➖ Removing registrar: ${registrarAddress}`);
    const tx = await contract.removeRegistrar(registrarAddress);
    await tx.wait();
    console.log("✅ Registrar removed");
    console.log("📋 Is registrar now:", await contract.isRegistrar(registrarAddress));
  } else {
    console.log("Invalid action. Use 'add' or 'remove'");
  }
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});

packages\blockchain-core\scripts\mint-skill.js

// packages/blockchain-core/scripts/mint-skill.js
const hre = require("hardhat");
const fs = require("fs");
const csv = require("csv-parser");

async function singleMint() {
  const [registrar] = await hre.ethers.getSigners();
  console.log("👤 Registrar:", registrar.address);
  
  const contractAddress = "PASTE_DEPLOYED_CONTRACT_ADDRESS_HERE";
  const VectorToken = await hre.ethers.getContractFactory("VectorToken");
  const contract = await VectorToken.attach(contractAddress);
  
  // Check if sender is registrar
  const isRegistrar = await contract.isRegistrar(registrar.address);
  if (!isRegistrar) {
    console.log("❌ Sender is not authorized as registrar");
    return;
  }
  
  // Get minting details from command line
  const args = process.argv.slice(2);
  const studentAddress = args[0];
  const skillId = parseInt(args[1]);
  const amount = parseInt(args[2]) || 1;
  
  if (!studentAddress || !skillId) {
    console.log("Usage: npx hardhat run scripts/mint-skill.js --network amoy <studentAddress> <skillId> [amount]");
    console.log("Skill IDs: 1=React, 2=Python, 3=Solidity, 4=Node.js, 5=AI/ML");
    return;
  }
  
  console.log(`🎓 Minting to: ${studentAddress}`);
  console.log(`📚 Skill ID: ${skillId}`);
  console.log(`🔢 Amount: ${amount}`);
  
  const tx = await contract.mintSkill(studentAddress, skillId, amount);
  await tx.wait();
  
  console.log("✅ Skill minted successfully!");
  console.log("📋 Transaction hash:", tx.hash);
  
  // Verify mint
  const balance = await contract.balanceOf(studentAddress, skillId);
  console.log(`📊 New balance: ${balance} tokens`);
}

async function batchMintFromCSV() {
  const [registrar] = await hre.ethers.getSigners();
  console.log("👤 Registrar:", registrar.address);
  
  const contractAddress = "PASTE_DEPLOYED_CONTRACT_ADDRESS_HERE";
  const VectorToken = await hre.ethers.getContractFactory("VectorToken");
  const contract = await VectorToken.attach(contractAddress);
  
  // Check if sender is registrar
  const isRegistrar = await contract.isRegistrar(registrar.address);
  if (!isRegistrar) {
    console.log("❌ Sender is not authorized as registrar");
    return;
  }
  
  const csvFilePath = process.argv[2];
  if (!csvFilePath) {
    console.log("Usage: npx hardhat run scripts/mint-skill.js --network amoy <path/to/students.csv>");
    console.log("CSV format: address,skillId,amount");
    return;
  }
  
  const students = [];
  const skillIds = [];
  const amounts = [];
  
  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (row) => {
      students.push(row.address);
      skillIds.push(parseInt(row.skillId));
      amounts.push(parseInt(row.amount) || 1);
    })
    .on('end', async () => {
      console.log(`📋 Processing ${students.length} records...`);
      
      // Batch mint
      const tx = await contract.batchMintSkills(students, skillIds, amounts);
      await tx.wait();
      
      console.log("✅ Batch minting complete!");
      console.log("📋 Transaction hash:", tx.hash);
      
      // Verify a sample
      if (students.length > 0) {
        const sampleBalance = await contract.balanceOf(students[0], skillIds[0]);
        console.log(`📊 Sample balance for ${students[0]}: ${sampleBalance} tokens`);
      }
    });
}

// Choose which function to run based on arguments
if (process.argv.length === 5 || process.argv.length === 6) {
  singleMint();
} else if (process.argv.length === 4) {
  batchMintFromCSV();
} else {
  console.log("Invalid arguments");
  console.log("For single mint: npx hardhat run scripts/mint-skill.js --network amoy <studentAddress> <skillId> [amount]");
  console.log("For batch mint: npx hardhat run scripts/mint-skill.js --network amoy <path/to/students.csv>");
}

packages\blockchain-core\scripts\query.js

const hre = require("hardhat");

async function main() {
  const contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const VectorToken = await hre.ethers.getContractFactory("VectorToken");
  const contract = await VectorToken.attach(contractAddress);
  
  // Get action from environment or use default
  const action = process.argv[2] || "help";
  
  switch(action) {
    case "balance":
      if (process.argv[3] && process.argv[4]) {
        const balance = await contract.balanceOf(process.argv[3], parseInt(process.argv[4]));
        console.log(`📊 Balance: ${balance}`);
      } else {
        console.log("Usage: npx hardhat run scripts/query.js --network local balance <address> <skillId>");
      }
      break;
      
    case "skill":
      if (process.argv[3]) {
        const skillName = await contract.getSkillName(parseInt(process.argv[3]));
        console.log(`📚 Skill: ${skillName}`);
      }
      break;
      
    default:
      console.log("Available commands:");
      console.log("  balance <address> <skillId>  - Check token balance");
      console.log("  skill <skillId>              - Get skill name");
      console.log("\nExample:");
      console.log("  npx hardhat run scripts/query.js --network local balance 0x123... 1");
  }
}

main().catch(console.error);

packages\blockchain-core\test
packages\blockchain-core\test\VectorToken.test.js
packages\blockchain-core\.env
packages\blockchain-core\.gitignore
packages\blockchain-core\hardhat.config.js
packages\blockchain-core\package.json
packages\blockchain-core\README.md
packages\blockchain-core\simple-test.js
packages\blockchain-core\tsconfig.json
packages\shared
packages\web-portal
packages\web-portal\vector-web
packages\web-portal\vector-web\.next
packages\web-portal\vector-web\node_modules
packages\web-portal\vector-web\prisma
packages\web-portal\vector-web\prisma\schema.prisma
packages\web-portal\vector-web\public
packages\web-portal\vector-web\src
packages\web-portal\vector-web\src\app
packages\web-portal\vector-web\src\app\(auth)\login
packages\web-portal\vector-web\src\app\(auth)\login\page.tsx

'use client';
import { useState } from 'react';
import ConnectWalletModal from '@/components/shared/ConnectWalletModal';
import RegistrarLoginModal from '@/components/shared/RegistrarLoginModal';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false); // Student Wallet Modal
  const [isRegistrarModalOpen, setIsRegistrarModalOpen] = useState(false); // Legacy Modal (Unused for auth now)
  
  // Shared Email Login State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Check role to redirect correctly
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      if (userData?.role === 'registrar') {
        // ✅ FIXED: Correct path for registrar dashboard
        router.push('/registrar/dashboard');
      } else {
        router.push('/student/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-gray-50 flex items-center justify-center p-4 md:p-6 relative">
      <div className="max-w-5xl w-full mx-auto">
        {/* Header Section */}
        <div className="text-center mb-10 md:mb-14 space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-xl shadow-sm mb-4">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Welcome to VECTOR
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto font-medium">
            The secure blockchain-based micro-credential platform for verified
            academic achievements.
          </p>
        </div>

        {/* Split Options Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
          {/* Option A: Student Access */}
          <div className="group relative bg-white rounded-2xl p-8 md:p-10 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col items-center text-center h-full">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Student Access
            </h2>
            <p className="text-gray-600 mb-8 flex-grow">
              Connect your digital wallet to view, manage, and share your
              verified credentials securely on the blockchain.
            </p>

            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:translate-y-[-2px] active:translate-y-[0px] transition-all duration-200 flex items-center justify-center gap-2 group-hover:gap-3"
              aria-label="Connect Wallet for Student Access"
            >
              Connect Wallet
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
            
            {/* Student Email Login Trigger */}
            <button 
              onClick={() => setIsEmailModalOpen(true)} 
              className="mt-4 text-sm text-purple-600 hover:text-purple-800 font-medium underline"
            >
              Or sign in with Email
            </button>
          </div>

          {/* Option B: Registrar Access */}
          <div className="group relative bg-white rounded-2xl p-8 md:p-10 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col items-center text-center h-full">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-400 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Registrar Access
            </h2>
            <p className="text-gray-600 mb-8 flex-grow">
              Login with your institutional credentials to issue, revoke, and
              manage student micro-credentials.
            </p>

            <button
              onClick={() => setIsEmailModalOpen(true)} /* ✅ Use Unified Modal for Real Auth */
              className="w-full py-4 px-6 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2"
              aria-label="Login with Email for Registrar Access"
            >
              Login with Email
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-400 font-medium">
            Secured by Blockchain Technology • 256-bit Encryption
          </p>
        </div>
      </div>

      {/* Connect Wallet Modal */}
      <ConnectWalletModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      {/* Registrar Login Modal (Kept for compatibility, but unused for main flow now) */}
      <RegistrarLoginModal
        isOpen={isRegistrarModalOpen}
        onClose={() => setIsRegistrarModalOpen(false)}
      />

      {/* Unified Email Login Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 relative shadow-2xl">
            <button 
              onClick={() => setIsEmailModalOpen(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            {/* ✅ Generic Title for both roles */}
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Sign In</h2>
            
            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
            
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none" 
                  placeholder="Enter email" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none" 
                  placeholder="Enter password" 
                  required 
                />
              </div>
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            
            <div className="mt-4 text-center">
              <Link href="/register" className="text-sm text-purple-600 hover:underline">
                Create an account
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

packages\web-portal\vector-web\src\app\api
packages\web-portal\vector-web\src\app\api\analyze
packages\web-portal\vector-web\src\app\api\analyze\route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { analyzeStudentProfile } from '../../../../../../ai-engine/src/index'; 

export async function POST(req: Request) {
  try {
    // 1. Validation
    const text = await req.text();
    if (!text) return NextResponse.json({ status: 'error', message: 'Empty request' }, { status: 400 });
    
    const body = JSON.parse(text);
    const { studentId, resumeText } = body;

    if (!studentId) {
      return NextResponse.json({ status: 'error', message: 'Student ID required' }, { status: 400 });
    }

    // 2. Fetch Student Data (Raw DB Format)
    const student = await prisma.users.findUnique({
      where: { student_id: studentId },
      include: {
        verified_credentials: true, // DB Field 1
        self_reported_skills: true  // DB Field 2
      }
    });

    if (!student) {
      return NextResponse.json({ status: 'error', message: 'Student not found' }, { status: 404 });
    }

    // 3. Fetch Market History
    const marketHistory = await prisma.market_snapshots.findMany({
      orderBy: { recorded_at: 'asc' }
    });

    // ============================================================
    // 🛠️ Transform DB Data -> AI Data
    // We combine Verified Credentials + Self-Reported Skills into one list
    // ============================================================
    
    // Extract skill names from verified credentials
    const verifiedNames = student.verified_credentials.map(c => c.skill_name);
    
    // Extract skill names from self-reported skills
    const selfReportedNames = student.self_reported_skills.map(s => s.skill_name);

    // Combine them into a single array for the AI
    const allSkills = [...verifiedNames, ...selfReportedNames];

    // Create a clean object that matches what the AI expects
    const aiInput = {
      id: student.student_id || "unknown",
      name: student.full_name || "Student",
      skills: allSkills, // <--- The AI Engine is looking for THIS
      credentials: student.verified_credentials
    };

    // 4. Call AI Engine with the CLEAN object
    const analysisResult = await analyzeStudentProfile({
      studentData: aiInput, 
      marketData: marketHistory,
      resumeText: resumeText || "" 
    });

    // 5. Return Intelligence + RAW CREDENTIALS
    return NextResponse.json({
      status: 'success',
      data: {
        ...analysisResult,
        // ✅ CRITICAL ADDITION: Pass the raw DB credentials to the frontend
        credentials: student.verified_credentials 
      }
    });

  } catch (error) {
    console.error('AI Analysis Failed:', error);
    return NextResponse.json({ status: 'error', message: String(error) }, { status: 500 });
  }
}

packages\web-portal\vector-web\src\app\api\chat
packages\web-portal\vector-web\src\app\api\chat\route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { message, studentId } = await req.json();

    // 1. Fetch Student Context
    const student = await prisma.users.findUnique({
      where: { student_id: studentId },
      include: {
        verified_credentials: true,
        self_reported_skills: true
      }
    });

    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    // 2. Construct System Prompt
    const skillsList = [
      ...student.verified_credentials.map(c => c.skill_name + " (Verified)"),
      ...student.self_reported_skills.map(s => s.skill_name + " (Self-Reported)")
    ].join(', ');

    const systemContext = `
      You are 'Vector', an AI Career Coach for a student named ${student.full_name}.
      
      THE STUDENT'S PROFILE:
      - Skills: ${skillsList}
      
      YOUR GOAL:
      The student is looking at their Career Intelligence Report.
      Help them interpret the data. If they ask about skill trends, explain why certain tech (like React/Python) is rising while others (PHP/jQuery) are falling.
      Keep answers concise, encouraging, and action-oriented.
    `;

    // 3. Call Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemContext }] },
        { role: "model", parts: [{ text: "I am ready to coach the student." }] },
      ],
    });

    const result = await chat.sendMessage(message);
    const response = result.response.text();

    return NextResponse.json({ reply: response });

  } catch (error) {
    console.error('Chat Error:', error);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}

packages\web-portal\vector-web\src\app\api\mint
packages\web-portal\vector-web\src\app\api\mint\route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { students, batchName, registrarId } = body;

    // 1. Create the Batch Record
    const batch = await prisma.minting_batches.create({
      data: {
        batch_name: batchName,
        total_students: students.length,
        // In a real app, use the actual logged-in Registrar ID
        // For MVP, we can leave it null or use a seed ID
      }
    });

    // 2. Loop through students and save them to DB
    // (In production, we would loop to Mint on Blockchain here too)
    const results = [];
    
    for (const student of students) {
      // A. Create/Find User
      const user = await prisma.users.upsert({
        where: { wallet_address: student.wallet_address },
        update: {},
        create: {
          full_name: student.full_name,
          student_id: student.student_id,
          wallet_address: student.wallet_address,
          role: 'student'
        }
      });

      // B. Create "Verified Credential" Record
      const credential = await prisma.verified_credentials.create({
        data: {
          user_id: user.id,
          batch_id: batch.id,
          skill_name: student.skill_name,
          token_id: Math.floor(Math.random() * 1000).toString(), // Mock Token ID for now
          transaction_hash: "0xMockHash..." + Date.now(), // Mock Hash
          issuer_did: "PHINMA-Registrar-01"
        }
      });
      
      results.push(credential);
    }

    return NextResponse.json({ 
      status: 'success', 
      message: `Successfully processed batch: ${batchName}`,
      mintedCount: results.length
    });

  } catch (error) {
    console.error('Minting Error:', error);
    return NextResponse.json({ status: 'error', message: String(error) }, { status: 500 });
  }
}

packages\web-portal\vector-web\src\app\api\student
packages\web-portal\vector-web\src\app\api\student\credentials

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    // 1. Get the wallet address from the URL (e.g., ?wallet=0x123...)
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json({ status: 'error', message: 'Wallet address required' }, { status: 400 });
    }

    // 2. Find the user and their credentials
    const user = await prisma.users.findUnique({
      where: { wallet_address: wallet },
      include: {
        verified_credentials: true // <--- This JOINs the tables automatically
      }
    });

    if (!user) {
      return NextResponse.json({ status: 'success', credentials: [] });
    }

    // 3. Return the data
    return NextResponse.json({ 
      status: 'success', 
      credentials: user.verified_credentials 
    });

  } catch (error) {
    console.error('Fetch Creds Error:', error);
    return NextResponse.json({ status: 'error', message: String(error) }, { status: 500 });
  }
}

packages\web-portal\vector-web\src\app\api\student\temp.txt
packages\web-portal\vector-web\src\app\register
packages\web-portal\vector-web\src\app\register\page.tsx

'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Role = 'student' | 'registrar' | null;

export default function RegisterPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role>(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    
    // Strict Email Regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    setLoading(true);

    try {
      // 1. Create User in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: `${formData.firstName} ${formData.lastName}`,
            role: selectedRole,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No user created");

      // 2. Create Profile in Public Table (No Email Column)
      const placeholderWallet = `0x_pending_${authData.user.id.substring(0, 8)}`;
      const generatedStudentId = `03-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const { error: dbError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          student_id: generatedStudentId,
          full_name: `${formData.firstName} ${formData.lastName}`,
          role: selectedRole,
          wallet_address: placeholderWallet
        });

      if (dbError) throw dbError;

      // 3. Success -> Redirect
      if (selectedRole === 'registrar') {
        router.push('/registrar/dashboard');
      } else {
        router.push('/student/dashboard');
      }

    } catch (err: any) {
      console.error('Registration Error:', err);
      setErrors({ form: err.message || 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center px-6 py-12">
        <div className="max-w-4xl w-full">
          {/* Header */}
          <div className="text-center mb-12">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">VECTOR</span>
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Create Your Account</h1>
            <p className="text-gray-600">Choose your role to get started</p>
          </div>

          {/* Role Selection */}
          <div className="grid md:grid-cols-2 gap-6">
            <button
              onClick={() => setSelectedRole('student')}
              className="group bg-white p-8 rounded-2xl border-2 border-gray-200 hover:border-purple-600 hover:shadow-xl transition-all text-left"
            >
              <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-600 transition-colors">
                <svg className="w-8 h-8 text-purple-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Student</h2>
              <p className="text-gray-600 mb-4">
                Access your verified credentials, track skill proficiency, and get AI-powered career recommendations.
              </p>
              <div className="flex items-center text-purple-600 font-medium">
                Continue as Student
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </button>

            <button
              onClick={() => setSelectedRole('registrar')}
              className="group bg-white p-8 rounded-2xl border-2 border-gray-200 hover:border-purple-600 hover:shadow-xl transition-all text-left"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-600 transition-colors">
                <svg className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Registrar</h2>
              <p className="text-gray-600 mb-4">
                Issue and manage verified micro-credentials for students, track institutional analytics.
              </p>
              <div className="flex items-center text-purple-600 font-medium">
                Continue as Registrar
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </button>
          </div>

          <div className="text-center mt-8">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-purple-600 hover:text-purple-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">VECTOR</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create {selectedRole === 'student' ? 'Student' : 'Registrar'} Account
          </h1>
          <p className="text-gray-600">Fill in your details to get started</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          
          {errors.form && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {errors.form}
            </div>
          )}

          {/* Role Badge */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              selectedRole === 'student' 
                ? 'bg-purple-100 text-purple-700' 
                : 'bg-blue-100 text-blue-700'
            }`}>
              {selectedRole === 'student' ? 'Student' : 'Registrar'}
            </div>
            <button
              onClick={() => setSelectedRole(null)}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Change role
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border ${
                  errors.firstName ? 'border-red-500' : 'border-gray-300'
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                placeholder="John"
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border ${
                  errors.lastName ? 'border-red-500' : 'border-gray-300'
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                placeholder="Doe"
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                placeholder="john.doe@university.edu"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                placeholder="••••••••"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Terms */}
          <p className="text-xs text-gray-500 text-center mt-6">
            By creating an account, you agree to our{' '}
            <a href="#" className="text-purple-600 hover:text-purple-700">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-purple-600 hover:text-purple-700">Privacy Policy</a>
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-purple-600 hover:text-purple-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

packages\web-portal\vector-web\src\app\registrar
packages\web-portal\vector-web\src\app\registrar\dashboard
packages\web-portal\vector-web\src\app\registrar\dashboard\page.tsx

'use client';
import { useState } from 'react';
import RegistrarLayout from '@/components/dashboard/RegistrarLayout';
import { ethers } from 'ethers'; // ✅ Import Ethers
import { CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, SKILL_MAP } from '@/lib/blockchain'; // ✅ Import Blockchain Config

interface PDFUploadState {
  files: File[];
  dragActive: boolean;
}

interface MintingProgress {
  isOpen: boolean;
  progress: number;
  status: 'minting' | 'complete' | 'error';
  message: string;
  txHash?: string; // ✅ Added to show Transaction Hash
}

export default function RegistrarDashboard() {
  const [pdfUpload, setPdfUpload] = useState<PDFUploadState>({
    files: [],
    dragActive: false,
  });

  const [mintingProgress, setMintingProgress] = useState<MintingProgress>({
    isOpen: false,
    progress: 0,
    status: 'minting',
    message: '',
  });

  const [singleCredential, setSingleCredential] = useState({
    walletAddress: '',
    credentialType: 'Machine Learning',
    courseCode: '',
    issuanceDate: '',
    metadata: '',
  });

  // ⚡⚡⚡ HELPER: Safe Contract Connection ⚡⚡⚡
  const getContract = async () => {
    if (typeof window === 'undefined') return null;

    // 1. Safe access to Ethereum provider
    const { ethereum } = window as any;
    if (!ethereum) {
      alert("MetaMask is not installed!");
      throw new Error("No crypto wallet found");
    }

    // 👇👇👇 CHANGE THIS LINE 👇👇👇
    // We add "any" to allow the network to switch (e.g. from Mainnet to Localhost) without crashing
    const provider = new ethers.BrowserProvider(ethereum, "any"); 
    
    const signer = await provider.getSigner();

    // 2. Check Network (Allow Hardhat Localhost)
    const network = await provider.getNetwork();
    if (network.chainId !== 31337n && network.chainId !== 1337n) {
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x7A69' }], // 31337
        });
      } catch (error) {
        alert("Please switch MetaMask to Localhost 8545");
      }
    }

    return new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, signer);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setPdfUpload(prev => ({ ...prev, dragActive: true }));
    } else if (e.type === 'dragleave') {
      setPdfUpload(prev => ({ ...prev, dragActive: false }));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPdfUpload(prev => ({ ...prev, dragActive: false }));

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setPdfUpload(prev => ({ ...prev, files: [...prev.files, file] }));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfUpload(prev => ({ ...prev, files: [...prev.files, e.target.files![0]] }));
    }
  };

  const removeFile = (index: number) => {
    setPdfUpload(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSingleCredential(prev => ({ ...prev, [name]: value }));
  };

  // ⚡ REAL BATCH MINTING LOGIC
  const handleBatchMint = async () => {
    if (pdfUpload.files.length === 0) {
      alert('Please upload at least one PDF file');
      return;
    }

    try {
      setMintingProgress({
        isOpen: true,
        progress: 10,
        status: 'minting',
        message: 'Analyzing PDF files...',
      });

      const contract = await getContract();
      if (!contract) return;

      setMintingProgress(prev => ({ ...prev, progress: 30, message: 'Preparing batch transaction...' }));

      // Demo: Minting to the connected wallet for demonstration
      const { ethereum } = window as any;
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      const students: string[] = [];
      const skillIds: number[] = [];
      const amounts: number[] = [];

      // Create entries for each file
      for (let i = 0; i < pdfUpload.files.length; i++) {
        students.push(signerAddress); 
        skillIds.push(2); // Defaulting to Python (ID 2) for demo
        amounts.push(1);
      }

      setMintingProgress(prev => ({ ...prev, progress: 50, message: 'Please sign in MetaMask...' }));

      // Call Contract
      const tx = await contract.batchMintSkills(students, skillIds, amounts);
      
      setMintingProgress(prev => ({ ...prev, progress: 75, message: 'Mining transaction...' }));
      
      await tx.wait(); // Wait for confirmation

      setMintingProgress({
        isOpen: true,
        progress: 100,
        status: 'complete',
        message: 'Batch Minting Successful!',
        txHash: tx.hash
      });

    } catch (error: any) {
      console.error(error);
      setMintingProgress({
        isOpen: true,
        progress: 0,
        status: 'error',
        message: error.reason || error.message || 'Transaction failed',
      });
    }
  };

  // ⚡ REAL SINGLE MINTING LOGIC
  const handleMintToken = async () => {
    if (!singleCredential.walletAddress || !singleCredential.courseCode || !singleCredential.issuanceDate) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setMintingProgress({
        isOpen: true,
        progress: 10,
        status: 'minting',
        message: 'Connecting to wallet...',
      });

      const contract = await getContract();
      if (!contract) throw new Error("Contract connection failed");

      // Get Skill ID from mapping
      const skillId = SKILL_MAP[singleCredential.credentialType] || 1;

      setMintingProgress(prev => ({ ...prev, progress: 40, message: 'Please sign transaction...' }));

      // Call Contract
      const tx = await contract.mintSkill(
        singleCredential.walletAddress,
        skillId,
        1
      );

      setMintingProgress(prev => ({ ...prev, progress: 70, message: 'Waiting for confirmation...' }));

      await tx.wait();

      setMintingProgress({
        isOpen: true,
        progress: 100,
        status: 'complete',
        message: 'Credential successfully issued on-chain!',
        txHash: tx.hash
      });

    } catch (error: any) {
      console.error(error);
      setMintingProgress({
        isOpen: true,
        progress: 0,
        status: 'error',
        message: error.reason || error.message || "Minting failed",
      });
    }
  };

  const closeMintingModal = () => {
    setMintingProgress({
      isOpen: false,
      progress: 0,
      status: 'minting',
      message: '',
    });
    if (mintingProgress.status === 'complete') {
      // Reset form on success
      setSingleCredential({
        walletAddress: '',
        credentialType: 'Machine Learning',
        courseCode: '',
        issuanceDate: '',
        metadata: '',
      });
      setPdfUpload({ files: [], dragActive: false });
    }
  };

  return (
    <RegistrarLayout>
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Batch Issue Micro-Credentials</h1>
        </div>

        {/* PDF Upload Section */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-300 p-6 md:p-12 mb-6 md:mb-8 text-center">
          <div
            className={`${pdfUpload.dragActive ? 'bg-purple-50' : ''} transition-colors`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 md:w-24 md:h-24 mb-4 md:mb-6">
                <svg className="w-full h-full text-red-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                  <path d="M14 2v6h6M12 18v-6m-3 3l3-3 3 3" stroke="white" strokeWidth="2" fill="none" />
                </svg>
              </div>
              
              <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-2">Upload PDF File</h3>
              <p className="text-sm md:text-base text-gray-600 mb-2 md:mb-3 font-medium">Drag and drop or click to upload</p>
              <p className="text-xs md:text-sm text-gray-600 mb-2 font-medium">
                Format: Last Name, First Name, Middle Name
              </p>
              <p className="text-xs text-gray-500 max-w-xl mb-4 md:mb-6 leading-relaxed px-4">
                Document must include: Student full name, professional title, email address, phone number, portfolio website (optional), professional summary, and skills
              </p>

              <input
                type="file"
                id="pdf-upload"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="pdf-upload"
                className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 cursor-pointer transition-colors"
              >
                {pdfUpload.files.length > 0 ? 'Add More Files' : 'Choose File'}
              </label>

              {pdfUpload.files.length > 0 && (
                <div className="mt-6 w-full max-w-md space-y-3">
                  {pdfUpload.files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-700 font-medium">{file.name}</span>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Remove file"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Single Credential Form */}
        {pdfUpload.files.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Or Issue Single Credential</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Student Wallet Address */}
            <div>
              <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-700 mb-2">
                Student Wallet Address
              </label>
              <input
                type="text"
                id="walletAddress"
                name="walletAddress"
                value={singleCredential.walletAddress}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900 font-medium"
                placeholder="0x..."
              />
            </div>

            {/* Credential Type */}
            <div>
              <label htmlFor="credentialType" className="block text-sm font-medium text-gray-700 mb-2">
                Credential Type
              </label>
              <select
                id="credentialType"
                name="credentialType"
                value={singleCredential.credentialType}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900 font-medium"
              >
                <option value="Web Development">Web Development (React)</option>
                <option value="Python Programming">Python Programming</option>
                <option value="Solidity Smart Contracts">Solidity Smart Contracts</option>
                <option value="Node.js Backend Development">Node.js Backend</option>
                <option value="AI/ML Fundamentals">AI/ML Fundamentals</option>
              </select>
            </div>

            {/* Course Code */}
            <div>
              <label htmlFor="courseCode" className="block text-sm font-medium text-gray-700 mb-2">
                Course Code
              </label>
              <input
                type="text"
                id="courseCode"
                name="courseCode"
                value={singleCredential.courseCode}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 font-medium placeholder:text-gray-400"
                placeholder="CS401"
              />
            </div>

            {/* Issuance Date */}
            <div>
              <label htmlFor="issuanceDate" className="block text-sm font-medium text-gray-700 mb-2">
                Issuance Date
              </label>
              <input
                type="date"
                id="issuanceDate"
                name="issuanceDate"
                value={singleCredential.issuanceDate}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 font-medium"
              />
            </div>
          </div>

          {/* Metadata */}
          <div className="mb-6">
            <label htmlFor="metadata" className="block text-sm font-medium text-gray-700 mb-2">
              Metadata (IPFS)
            </label>
            <textarea
              id="metadata"
              name="metadata"
              value={singleCredential.metadata}
              onChange={handleInputChange}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm text-gray-900 font-medium placeholder:text-gray-400"
              placeholder='{"instructor": "Dr. Smith", "grade": "A", "project_links": [...]}'
            />
          </div>

          {/* Mint Button */}
          <button
            onClick={handleMintToken}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold rounded-xl hover:shadow-lg hover:from-purple-700 hover:to-purple-800 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Mint ERC-1155 Token
          </button>
          </div>
        )}

        {/* Mint Button for PDF Upload */}
        {pdfUpload.files.length > 0 && (
          <button
            onClick={handleBatchMint}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold rounded-xl hover:shadow-lg hover:from-purple-700 hover:to-purple-800 transition-all flex items-center justify-center gap-2 mb-8"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Batch Mint ERC-1155 Tokens
          </button>
        )}

        {/* Minting Progress Modal */}
        {mintingProgress.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  {mintingProgress.status === 'complete' ? (
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : mintingProgress.status === 'error' ? (
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {mintingProgress.status === 'complete' ? 'Minting Complete!' : mintingProgress.status === 'error' ? 'Minting Failed' : 'Minting Progress'}
                </h2>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm font-bold text-purple-600">{mintingProgress.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ease-out ${mintingProgress.status === 'error' ? 'bg-red-500' : 'bg-gradient-to-r from-purple-600 to-purple-700'}`}
                    style={{ width: `${mintingProgress.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Status Message */}
              <div className="flex items-start gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
                <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-700 font-medium break-all">{mintingProgress.message}</p>
                  {mintingProgress.txHash && (
                    <p className="text-xs text-purple-600 mt-1 truncate">Tx: {mintingProgress.txHash}</p>
                  )}
                </div>
              </div>

              {/* Close Button (only show when complete or error) */}
              {(mintingProgress.status === 'complete' || mintingProgress.status === 'error') && (
                <button
                  onClick={closeMintingModal}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </RegistrarLayout>
  );
}

packages\web-portal\vector-web\src\app\registrar\manage
packages\web-portal\vector-web\src\app\registrar\manage\page.tsx
packages\web-portal\vector-web\src\app\registrar\students
packages\web-portal\vector-web\src\app\registrar\students\page.tsx
packages\web-portal\vector-web\src\app\student
packages\web-portal\vector-web\src\app\student\coach
packages\web-portal\vector-web\src\app\student\coach\page.tsx

'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ExportCVRModal from '@/components/dashboard/ExportCVRModal';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

export default function CoachPage() {
  const router = useRouter();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [studentId, setStudentId] = useState<string>('03-2023-001');
  
  // ⚡ CHAT STATE
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: "👋 Hi! I'm analyzing your Career Intelligence Report..." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch User Logic
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('full_name, student_id')
        .eq('id', session.user.id)
        .maybeSingle();

      const name = profile?.full_name?.split(' ')[0] || "Student";
      const id = profile?.student_id || "03-2026-2861"; 

      setStudentId(id);
      
      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs[0] = { 
          role: 'ai', 
          text: `👋 Hi ${name}! I've analyzed your Career Intelligence Report.\n\nYour **Python** growth is fantastic, but we should watch the market trends. \n\nI can help you pivot to a Modern Stack. What would you like to do?` 
        };
        return newMsgs;
      });
    };

    fetchUser();
  }, [router]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, message: textToSend })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: "I'm having trouble connecting to the server." }]);
    } finally {
      setLoading(false);
    }
  };

  // Quick Action Chips
  const quickPrompts = [
    "📉 Fix PHP drop",
    "💼 Job matches",
    "📝 Draft cover letter",
    "🚀 Learning path"
  ];

  // Static Visual Data
  const trendData = [
    { month: 'Jan', value: 35 }, { month: 'Feb', value: 42 }, { month: 'Mar', value: 48 },
    { month: 'Apr', value: 52 }, { month: 'May', value: 51 }, { month: 'Jun', value: 58 },
    { month: 'Jul', value: 65 }, { month: 'Aug', value: 72 }, { month: 'Sep', value: 78 },
    { month: 'Oct', value: 75 }, { month: 'Nov', value: 82 }, { month: 'Dec', value: 85 },
  ];
  const maxValue = Math.max(...trendData.map(d => d.value));

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-4 md:mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-6 h-6 md:w-7 md:h-7 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Career Intelligence Report</h1>
            </div>
            <p className="text-sm md:text-base text-gray-500">AI-powered analysis of your skill portfolio against real-time market data.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 text-sm">
            <span className="text-gray-500 text-xs md:text-sm flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Live Analysis
            </span>
            <button onClick={() => setIsExportModalOpen(true)} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-xs md:text-sm transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
        
        {/* LEFT COLUMN: THE VISUAL REPORT (Static Data) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Skill Relevance Trends Chart */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Skill Relevance Trends</h2>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-xs bg-purple-100 text-purple-700 border border-purple-300 rounded">1 Year</button>
              </div>
            </div>
            <div className="mb-8 overflow-x-auto">
              <div className="flex items-end justify-between h-56 md:h-64 gap-2 min-w-[300px]">
                {trendData.map((data, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-purple-600 rounded-t hover:bg-purple-700 transition-all duration-300 group relative" 
                         style={{ height: `${(data.value / maxValue) * 100}%` }}>
                       <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                         {data.value}%
                       </div>
                    </div>
                    <span className="text-xs text-gray-500">{data.month}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4 md:gap-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <div className="text-xs md:text-sm text-gray-600 mb-1">Portfolio Score</div>
                <div className="text-2xl md:text-3xl font-bold text-purple-600">88/100</div>
              </div>
              <div className="text-center">
                <div className="text-xs md:text-sm text-gray-600 mb-1">Market Alignment</div>
                <div className="text-2xl md:text-3xl font-bold text-teal-500">High</div>
              </div>
              <div className="text-center">
                <div className="text-xs md:text-sm text-gray-600 mb-1">Projected Growth</div>
                <div className="text-2xl md:text-3xl font-bold text-purple-600">+12%</div>
              </div>
            </div>
          </div>

          {/* Skills Analysis Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rising Skills */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                Rising Skills
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div><div className="font-medium text-gray-900">Python</div><div className="text-xs text-gray-500">Data Science</div></div>
                    <div className="text-green-600 font-semibold">+20%</div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: '80%' }}></div></div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div><div className="font-medium text-gray-900">React</div><div className="text-xs text-gray-500">Frontend</div></div>
                    <div className="text-green-600 font-semibold">+15%</div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: '70%' }}></div></div>
                </div>
              </div>
            </div>

            {/* Declining Skills */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                Declining Skills
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div><div className="font-medium text-gray-900">PHP (Legacy)</div><div className="text-xs text-gray-500">Web Dev</div></div>
                    <div className="text-red-600 font-semibold">-15%</div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-red-500 h-2 rounded-full" style={{ width: '60%' }}></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: THE AI CO-PILOT */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 h-[calc(100vh-theme(spacing.32))] min-h-[500px] flex flex-col">
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg flex flex-col h-full overflow-hidden ring-1 ring-black/5">
              <div className="p-4 bg-gradient-to-r from-purple-700 to-purple-600 text-white flex items-center gap-3 shadow-md z-10">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-purple-700 rounded-full"></div>
                </div>
                <div>
                  <h2 className="font-bold text-lg leading-tight">Vector Co-Pilot</h2>
                  <p className="text-purple-100 text-xs font-medium">Analyzing your chart...</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-purple-600 text-white rounded-br-none' 
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none whitespace-pre-wrap'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start animate-pulse">
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                      <div className="flex space-x-1.5 items-center h-5">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 bg-white border-t border-gray-200 z-10">
                <div className="flex gap-2 overflow-x-auto pb-3 mb-1 no-scrollbar">
                  {quickPrompts.map((prompt, i) => (
                    <button key={i} onClick={() => handleSend(prompt)} disabled={loading} className="whitespace-nowrap px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-full text-xs font-medium hover:bg-purple-100 hover:border-purple-200 transition-colors">
                      {prompt}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 relative">
                  <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask Vector anything..." className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pl-4" />
                  <button onClick={() => handleSend()} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm">
                    <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <ExportCVRModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
    </DashboardLayout>
  );
}

packages\web-portal\vector-web\src\app\student\cvr
packages\web-portal\vector-web\src\app\student\cvr\page.tsx

'use client';
import { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ExportCVRModal from '@/components/dashboard/ExportCVRModal';
import CVRSuccessModal from '@/components/dashboard/CVRSuccessModal';

export default function CVRPage() {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('professional');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [isGenerated, setIsGenerated] = useState(false);
  const [generatedData, setGeneratedData] = useState<any>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    portfolio: '',
    title: '',
    summary: '',
  });

  // Available verified skills
  const availableSkills = [
    { id: '1', name: 'Advanced SQL Querying' },
    { id: '2', name: 'React Application Development' },
    { id: '3', name: 'Data Structures & Algorithms' },
    { id: '4', name: 'Java OOP' },
  ];

  const handleSkillToggle = (skillId: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  const handleAddCustomSkill = () => {
    if (customSkill.trim()) {
      setSelectedSkills(prev => [...prev, `custom-${customSkill}`]);
      setCustomSkill('');
    }
  };

  const handleGenerateCVR = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Store CVR data as sample
    const cvrData = {
      ...formData,
      template: selectedTemplate,
      skills: selectedSkills,
      generatedAt: new Date().toISOString(),
    };
    
    // Save to localStorage as sample
    localStorage.setItem('sampleCVRData', JSON.stringify(cvrData));
    console.log('CVR Sample Saved:', cvrData);
    
    // Set pending CVR flag in localStorage
    localStorage.setItem('pendingCVR', 'true');
    
    // Update state to show generated CVR
    setGeneratedData(cvrData);
    setIsGenerated(true);
    
    // Show success modal
    setIsSuccessModalOpen(true);
  };

  const handleCreateNew = () => {
    setIsGenerated(false);
    setGeneratedData(null);
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      portfolio: '',
      title: '',
      summary: '',
    });
    setSelectedSkills([]);
    setSelectedTemplate('professional');
  };

  const handleDownload = () => {
    setIsSuccessModalOpen(false);
    setIsExportModalOpen(true);
  };

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          {isGenerated ? 'Credential Verified Resume (CVR)' : 'Generate CVR'}
        </h1>
        <p className="text-sm md:text-base text-gray-500">
          {isGenerated 
            ? 'Your blockchain-verified resume preview' 
            : 'Create your blockchain-verified resume with verified skills'}
        </p>
      </div>

      {!isGenerated ? (
      <form onSubmit={handleGenerateCVR} className="max-w-4xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 space-y-6">
          {/* Personal Details Section */}
          <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Professional Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Full-Stack Developer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="+63 912 345 6789"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Portfolio/Website
                </label>
                <input
                  type="url"
                  value={formData.portfolio}
                  onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://portfolio.com"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Professional Summary
                </label>
                <textarea
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Brief professional summary..."
                />
              </div>
            </div>
          </div>

          {/* Skills Selection Section */}
          <div className="pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Skills</h2>
            
            {/* Verified Skills */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">Your Verified Skills</p>
              <div className="space-y-2">
                {availableSkills.map((skill) => (
                  <label key={skill.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSkills.includes(skill.id)}
                      onChange={() => handleSkillToggle(skill.id)}
                      className="mr-3 w-4 h-4 text-purple-600"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">{skill.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Add Custom Skill */}
            <div>
              <p className="text-sm text-gray-600 mb-3">Add Custom Skill</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSkill())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter skill name"
                />
                <button
                  type="button"
                  onClick={handleAddCustomSkill}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium"
                >
                  Add
                </button>
              </div>
              {selectedSkills.filter(s => s.startsWith('custom-')).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedSkills
                    .filter(s => s.startsWith('custom-'))
                    .map((skill, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {skill.replace('custom-', '')}
                        <button
                          type="button"
                          onClick={() => setSelectedSkills(prev => prev.filter(s => s !== skill))}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Template Selection Section */}
          <div className="pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose Template</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['professional', 'modern', 'minimal'].map((template) => (
                <label
                  key={template}
                  className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedTemplate === template
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="template"
                    value={template}
                    checked={selectedTemplate === template}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 capitalize">{template}</span>
                    {selectedTemplate === template && (
                      <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {template === 'professional' && 'Classic layout for corporate roles'}
                    {template === 'modern' && 'Creative design for tech positions'}
                    {template === 'minimal' && 'Clean and simple format'}
                  </p>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              className="w-full md:w-auto px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Generate CVR
            </button>
          </div>
        </div>
      </form>
      ) : (
        /* Generated CVR Display */
        <div className="w-full">
      <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 space-y-6">
            {/* Header Section */}
            <div className="text-center border-b border-gray-200 pb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{generatedData.fullName}</h2>
              <p className="text-xl text-purple-600 font-medium mb-4">{generatedData.title}</p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {generatedData.email}
                </div>
                {generatedData.phone && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {generatedData.phone}
                  </div>
                )}
                {generatedData.portfolio && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <a href={generatedData.portfolio} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                      Portfolio
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Professional Summary */}
            {generatedData.summary && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Professional Summary</h3>
                <p className="text-gray-700 leading-relaxed">{generatedData.summary}</p>
              </div>
            )}

            {/* Verified Skills Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Skills</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {generatedData.skills.map((skillId: string, index: number) => {
                  const verifiedSkill = availableSkills.find(s => s.id === skillId);
                  const isVerified = !!verifiedSkill;
                  const skillName = verifiedSkill?.name || skillId.replace('custom-', '');
                  
                  return (
                    <div key={index} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                      {isVerified ? (
                        <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      <span className="font-medium text-gray-900">{skillName}</span>
                      {isVerified && (
                        <span className="ml-auto text-xs text-green-600 font-medium">Verified</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Blockchain Verification Details */}
            <div className="pt-6 border-t border-gray-200 bg-gradient-to-br from-purple-50 to-blue-50 -mx-6 md:-mx-8 px-6 md:px-8 py-6 rounded-lg">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900">Blockchain Verification</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 font-medium mb-1">Issuer</p>
                      <p className="text-gray-900 font-semibold">University of the Philippines</p>
                    </div>
                    <div>
                      <p className="text-gray-600 font-medium mb-1">Issue Date</p>
                      <p className="text-gray-900 font-semibold">January 15, 2024</p>
                    </div>
                    <div>
                      <p className="text-gray-600 font-medium mb-1">Token Standard</p>
                      <p className="text-gray-900 font-semibold font-mono">ERC-1155</p>
                    </div>
                    <div>
                      <p className="text-gray-600 font-medium mb-1">Token ID</p>
                      <p className="text-gray-900 font-semibold font-mono">r4592</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-gray-600 font-medium mb-1">Blockchain TX</p>
                      <p className="text-gray-900 font-mono text-xs break-all">
                        0x8a7f2c3e9b1a5d4f6c8e2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-gray-600 font-medium mb-1">IPFS Metadata</p>
                      <p className="text-gray-900 font-mono text-xs break-all">
                        QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco
                      </p>
                    </div>
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex-shrink-0">
                  <div className="bg-white p-3 rounded-lg shadow-md">
                    <div className="w-32 h-32 bg-gray-900 relative flex items-center justify-center">
                      {/* Simple QR code representation */}
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        <rect width="100" height="100" fill="white"/>
                        
                        {/* Corner markers */}
                        <rect x="5" y="5" width="25" height="25" fill="none" stroke="black" strokeWidth="3"/>
                        <rect x="10" y="10" width="15" height="15" fill="black"/>
                        
                        <rect x="70" y="5" width="25" height="25" fill="none" stroke="black" strokeWidth="3"/>
                        <rect x="75" y="10" width="15" height="15" fill="black"/>
                        
                        <rect x="5" y="70" width="25" height="25" fill="none" stroke="black" strokeWidth="3"/>
                        <rect x="10" y="75" width="15" height="15" fill="black"/>
                        
                        {/* Data pattern */}
                        <rect x="40" y="15" width="5" height="5" fill="black"/>
                        <rect x="50" y="15" width="5" height="5" fill="black"/>
                        <rect x="60" y="15" width="5" height="5" fill="black"/>
                        <rect x="35" y="25" width="5" height="5" fill="black"/>
                        <rect x="45" y="25" width="5" height="5" fill="black"/>
                        <rect x="55" y="25" width="5" height="5" fill="black"/>
                        <rect x="65" y="25" width="5" height="5" fill="black"/>
                        
                        <rect x="40" y="35" width="5" height="5" fill="black"/>
                        <rect x="50" y="35" width="5" height="5" fill="black"/>
                        <rect x="60" y="35" width="5" height="5" fill="black"/>
                        <rect x="70" y="35" width="5" height="5" fill="black"/>
                        <rect x="80" y="35" width="5" height="5" fill="black"/>
                        
                        <rect x="35" y="45" width="5" height="5" fill="black"/>
                        <rect x="45" y="45" width="5" height="5" fill="black"/>
                        <rect x="55" y="45" width="5" height="5" fill="black"/>
                        <rect x="65" y="45" width="5" height="5" fill="black"/>
                        <rect x="75" y="45" width="5" height="5" fill="black"/>
                        <rect x="85" y="45" width="5" height="5" fill="black"/>
                        
                        <rect x="40" y="55" width="5" height="5" fill="black"/>
                        <rect x="50" y="55" width="5" height="5" fill="black"/>
                        <rect x="60" y="55" width="5" height="5" fill="black"/>
                        <rect x="70" y="55" width="5" height="5" fill="black"/>
                        <rect x="80" y="55" width="5" height="5" fill="black"/>
                        <rect x="90" y="55" width="5" height="5" fill="black"/>
                        
                        <rect x="35" y="65" width="5" height="5" fill="black"/>
                        <rect x="45" y="65" width="5" height="5" fill="black"/>
                        <rect x="55" y="65" width="5" height="5" fill="black"/>
                        <rect x="65" y="65" width="5" height="5" fill="black"/>
                        <rect x="75" y="65" width="5" height="5" fill="black"/>
                        
                        <rect x="40" y="75" width="5" height="5" fill="black"/>
                        <rect x="50" y="75" width="5" height="5" fill="black"/>
                        <rect x="60" y="75" width="5" height="5" fill="black"/>
                        <rect x="70" y="75" width="5" height="5" fill="black"/>
                        <rect x="80" y="75" width="5" height="5" fill="black"/>
                        
                        <rect x="35" y="85" width="5" height="5" fill="black"/>
                        <rect x="45" y="85" width="5" height="5" fill="black"/>
                        <rect x="55" y="85" width="5" height="5" fill="black"/>
                        <rect x="65" y="85" width="5" height="5" fill="black"/>
                        <rect x="75" y="85" width="5" height="5" fill="black"/>
                        <rect x="85" y="85" width="5" height="5" fill="black"/>
                      </svg>
                    </div>
                    <p className="text-xs text-center text-gray-600 mt-2 font-medium">Scan to Verify</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-sm text-gray-700 bg-white/50 px-4 py-2 rounded-lg">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="font-medium">This credential is verified and stored on Polygon Amoy Testnet blockchain</span>
              </div>
            </div>

            {/* Template & Generated Date */}
            <div className="pt-4">
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  <span>Template: <span className="capitalize font-medium">{generatedData.template}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Generated: {new Date(generatedData.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4">
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CVR
              </button>
              <button
                onClick={handleCreateNew}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New CVR
              </button>
            </div>
          </div>
        </div>
      )}
      <CVRSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        onDownload={handleDownload}
      />

      {/* Export CVR Modal */}
      <ExportCVRModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
      />
    </DashboardLayout>
  );
}


packages\web-portal\vector-web\src\app\student\dashboard
packages\web-portal\vector-web\src\app\student\dashboard\page.tsx

'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient'; 
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import CredentialCard from '@/components/dashboard/CredentialCard';
import RecentActivity from '@/components/dashboard/RecentActivity';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, SKILL_MAP } from '@/lib/blockchain';

interface AIAnalysisData {
  skillHealth: {
    skillName: string;
    trend: 'growing' | 'stable' | 'declining';
    healthScore: number;
    decayRate: number;
    currentDemand: number;
  }[];
  recommendations: {
    courseName: string;
    relevanceScore: number;
    reason: string;
    courseCode: string;
  }[];
  credentials: {
    id: string;
    skill_name: string;
    issued_at: string;
    token_id: string;
  }[];
}

interface UserProfile {
  id: string; // Needed for update
  full_name: string;
  student_id: string;
  role: string;
  wallet_address?: string;
}

interface BlockchainCredential {
  category: string;
  title: string;
  issueDate: string;
  marketRelevance: number;
  verified: boolean;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [hasPendingCVR, setHasPendingCVR] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [aiData, setAiData] = useState<AIAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockchainCredentials, setBlockchainCredentials] = useState<BlockchainCredential[]>([]);
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);

  // ⚡ Helper: Fetch Blockchain Data
  const fetchBlockchainCredentials = async (walletAddress: string) => {
    // Only proceed if ethereum object exists
    if (typeof window === 'undefined' || !(window as any).ethereum || !walletAddress) return;

    try {
      // Use "any" to prevent network change errors
      const provider = new ethers.BrowserProvider((window as any).ethereum, "any");
      
      // We check network just to be safe, but we don't block reading
      const network = await provider.getNetwork();
      if (network.chainId !== 31337n && network.chainId !== 1337n) {
        console.warn("Wrong network for reading credentials. Switch to Localhost.");
        // Optional: Could prompt switch here
      }

      const contract = new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, provider);
      const foundCredentials: BlockchainCredential[] = [];

      for (const [skillName, skillId] of Object.entries(SKILL_MAP)) {
        if (typeof skillId !== 'number') continue; 
        
        try {
          const balance = await contract.balanceOf(walletAddress, skillId);
          if (balance > 0n) {
            foundCredentials.push({
              category: 'Blockchain Verified',
              title: skillName,
              issueDate: 'Verified On-Chain',
              marketRelevance: 95,
              verified: true,
            });
          }
        } catch (readError) {
          console.error(`Failed to read balance for ${skillName}`, readError);
        }
      }
      setBlockchainCredentials(foundCredentials);
    } catch (error) {
      console.error("Error fetching blockchain credentials:", error);
    }
  };

  // ⚡ Helper: Connect Wallet & Save to DB
  const connectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert("Please install MetaMask to connect your wallet.");
      return;
    }

    setIsWalletConnecting(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      // Request access
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];

      // Save to Supabase
      if (user?.id) {
        const { error } = await supabase
          .from('users')
          .update({ wallet_address: address })
          .eq('id', user.id);

        if (error) throw error;
        
        // Update Local State
        setUser(prev => prev ? ({ ...prev, wallet_address: address }) : null);
        
        // Fetch Credentials immediately
        await fetchBlockchainCredentials(address);
      }
    } catch (error: any) {
      console.error("Wallet connection failed:", error);
      alert("Failed to connect wallet: " + error.message);
    } finally {
      setIsWalletConnecting(false);
    }
  };

  useEffect(() => {
    const initDashboard = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/login');
          return;
        }

        // 1. Try to fetch profile
        let { data: profile } = await supabase
          .from('users')
          .select('id, full_name, student_id, role, wallet_address') // Requested ID for updates
          .eq('id', session.user.id)
          .maybeSingle();

        // 2. Safe Fallback
        if (!profile) {
          console.warn("⚠️ Using Virtual Profile Fallback.");
          profile = {
            id: session.user.id,
            full_name: session.user.email?.split('@')[0] || "Student", 
            student_id: "03-2026-PENDING",
            role: "student",
            wallet_address: "" 
          };
        }

        setUser(profile);

        // 3. Fetch Blockchain Credentials
        if (profile.wallet_address && !profile.wallet_address.includes("pending")) {
           await fetchBlockchainCredentials(profile.wallet_address);
        }

        // 4. Load AI Data
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            studentId: profile.student_id, 
            resumeText: "" 
          })
        });
        
        const json = await res.json();
        if (json.status === 'success') {
          setAiData(json.data);
        }

      } catch (error) {
        console.error("Dashboard Error:", error);
      } finally {
        setLoading(false);
      }
    };

    initDashboard();
  }, [router]);

  const handleClosePendingCard = () => {
    setHasPendingCVR(false);
    localStorage.removeItem('pendingCVR');
  };

  const decayingSkill = aiData?.skillHealth.find(s => s.healthScore < 60) || 
                        aiData?.skillHealth.sort((a, b) => a.healthScore - b.healthScore)[0];

  const recommendedCourses = aiData?.recommendations
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 2) || [];

  const dbCredentials = aiData?.credentials?.map(cred => {
    const analysis = aiData.skillHealth.find(
      s => s.skillName.toLowerCase() === cred.skill_name.toLowerCase()
    );
    return {
      category: 'Database Credential',
      title: cred.skill_name,
      issueDate: new Date(cred.issued_at).toLocaleDateString(),
      marketRelevance: analysis ? analysis.healthScore : 50,
      verified: true,
    };
  }) || [];

  const allCredentials = [...blockchainCredentials, ...dbCredentials];

  return (
    <DashboardLayout>
      <div className="mb-4 md:mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.full_name || 'Student'}! 👋
          </h1>
          <p className="text-sm md:text-base text-gray-500">
            Overview of your credentials and market standing
          </p>
        </div>
        
        {/* Wallet Connection Status */}
        <div className="flex items-center gap-3">
          {loading ? (
             <span className="text-sm text-purple-600 animate-pulse bg-purple-50 px-3 py-1 rounded-full">⚡ Loading...</span>
          ) : user?.wallet_address && !user.wallet_address.includes("pending") ? (
             <span className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
               <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
               Wallet Connected: {user.wallet_address.slice(0,6)}...{user.wallet_address.slice(-4)}
             </span>
          ) : (
             <button 
               onClick={connectWallet}
               disabled={isWalletConnecting}
               className="flex items-center gap-2 text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-all shadow-sm"
             >
               {isWalletConnecting ? (
                 <>Connecting...</>
               ) : (
                 <>
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                   Connect Wallet
                 </>
               )}
             </button>
          )}
        </div>
      </div>

      {hasPendingCVR && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 md:mb-8 animate-fade-in">
           <div className="flex items-start gap-3">
            <div className="text-blue-500 mt-0.5">
              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">Pending Credential Verification</h3>
              <p className="text-blue-700 text-sm">Your CVR is currently being verified by the registrar.</p>
            </div>
            <button onClick={handleClosePendingCard} className="text-blue-400 hover:text-blue-600">×</button>
          </div>
        </div>
      )}

      {/* Insight Section */}
      {!loading && aiData && decayingSkill && (
        <div className={`border rounded-xl p-4 mb-6 md:mb-8 transition-all duration-500 ${
          decayingSkill.trend === 'growing' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 ${decayingSkill.trend === 'growing' ? 'text-green-500' : 'text-orange-500'}`}>
              {decayingSkill.trend === 'growing' ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              )}
            </div>
            
            <div className="flex-1">
              <h3 className={`font-semibold mb-1 ${decayingSkill.trend === 'growing' ? 'text-green-900' : 'text-orange-900'}`}>
                {decayingSkill.trend === 'growing' ? 'Market Opportunity Detected' : 'Skill Decay Detected'}
              </h3>
              <p className={`text-sm ${decayingSkill.trend === 'growing' ? 'text-green-700' : 'text-orange-700'}`}>
                {decayingSkill.trend === 'growing' 
                  ? `Great news! Demand for ${decayingSkill.skillName} is skyrocketing (Market Demand: ${decayingSkill.currentDemand} jobs).`
                  : `Your ${decayingSkill.skillName} proficiency relevance has dropped due to market shifts.`
                }
              </p>
              
              {recommendedCourses.length > 0 && (
                <div className="mt-3 bg-white/50 rounded-lg p-3">
                  <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">AI Recommendation:</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{recommendedCourses[0].courseName}</span>
                    <span className="text-xs bg-white px-2 py-1 rounded border shadow-sm">
                      {recommendedCourses[0].relevanceScore}% Match
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Verified Micro-Credentials Section */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">Verified Credentials</h2>
          <button onClick={() => router.push('/student/skills')} className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-1">
            View All <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        
        {/* Credentials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {allCredentials.length > 0 ? (
            allCredentials.map((credential, index) => (
              <CredentialCard key={index} {...credential} />
            ))
          ) : (
            <div className="col-span-1 md:col-span-2 p-8 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                 <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <div>
                <p className="text-gray-600 font-medium">No verified credentials found.</p>
                <p className="text-gray-400 text-sm mt-1">Connect your wallet to see blockchain credentials.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <RecentActivity />
    </DashboardLayout>
  );
}

packages\web-portal\vector-web\src\app\student\profile
packages\web-portal\vector-web\src\app\student\profile\page.tsx

'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();
  
  const [formData, setFormData] = useState({
    // User Table Fields
    firstName: '',
    lastName: '',
    email: '',
    walletAddress: '',
    // Profile Table Fields
    phone: '',
    bio: '',
    university: '',
    major: '',
    graduationYear: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        // ⚡ JOIN QUERY: Fetch User + Profile in one go
        const { data, error } = await supabase
          .from('users')
          .select(`
            full_name, wallet_address,
            profiles ( phone, bio, university, major, graduation_year )
          `)
          .eq('id', session.user.id)
          .single();

        if (data) {
          const nameParts = (data.full_name || '').split(' ');
          // Safely access the joined profile data (it comes as an array or object depending on relationship)
          const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;

          setFormData({
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            email: session.user.email || '',
            walletAddress: data.wallet_address || '',
            
            // Load from separate Profile table (with fallbacks)
            phone: profile?.phone || '',
            bio: profile?.bio || '',
            university: profile?.university || 'PHINMA University',
            major: profile?.major || '',
            graduationYear: profile?.graduation_year || '',
          });
        }
      } catch (error) {
        console.error("Error loading profile", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Update 'users' table (Core Identity)
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: `${formData.firstName} ${formData.lastName}`
        })
        .eq('id', session.user.id);

      if (userError) throw userError;

      // 2. Update 'profiles' table (Extended Info)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ 
          id: session.user.id, // Ensure we link to correct user
          phone: formData.phone,
          bio: formData.bio,
          university: formData.university,
          major: formData.major,
          graduation_year: formData.graduationYear
        });

      if (profileError) throw profileError;
      
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => setIsEditing(false);

  if (loading && !formData.email) {
    return (
        <DashboardLayout>
            <div className="flex items-center justify-center h-full">
                <span className="text-purple-600 animate-pulse">Loading profile...</span>
            </div>
        </DashboardLayout>
    );
  }

  // ... (Return JSX - NO CHANGES NEEDED to the UI part below this line) ...
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-0">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Profile Settings</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Manage your account information and preferences</p>
            </div>
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="w-full sm:w-auto px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                <span className="sm:inline">Edit Profile</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl sm:text-3xl flex-shrink-0">
              {formData.firstName?.[0]}{formData.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">{formData.firstName} {formData.lastName}</h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 font-mono truncate">{formData.walletAddress}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} disabled={!isEditing} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none disabled:bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} disabled={!isEditing} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none disabled:bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={true} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} disabled={!isEditing} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none disabled:bg-gray-50" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                <textarea name="bio" value={formData.bio} onChange={handleChange} rows={4} disabled={!isEditing} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none disabled:bg-gray-50" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Wallet Address</label>
                <input type="text" name="walletAddress" value={formData.walletAddress} disabled={true} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 font-mono text-sm cursor-not-allowed" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Education</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">University</label>
                <input type="text" name="university" value={formData.university} onChange={handleChange} disabled={!isEditing} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none disabled:bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Major</label>
                <input type="text" name="major" value={formData.major} onChange={handleChange} disabled={!isEditing} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none disabled:bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expected Graduation Year</label>
                <input type="text" name="graduationYear" value={formData.graduationYear} onChange={handleChange} disabled={!isEditing} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none disabled:bg-gray-50" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Appearance</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Theme Preference</label>
              <div className="flex items-center gap-4">
                <button type="button" onClick={toggleTheme} className={`flex-1 sm:flex-none px-6 py-3 rounded-lg border-2 transition-all ${theme === 'light' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'}`}>
                  <span className="font-medium">Light Mode</span>
                </button>
                <button type="button" onClick={toggleTheme} className={`flex-1 sm:flex-none px-6 py-3 rounded-lg border-2 transition-all ${theme === 'dark' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'}`}>
                  <span className="font-medium">Dark Mode</span>
                </button>
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button type="button" onClick={handleCancel} className="w-full sm:w-auto px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
              <button type="submit" className="w-full sm:w-auto px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">Save Changes</button>
            </div>
          )}
        </form>
      </div>
    </DashboardLayout>
  );
}

packages\web-portal\vector-web\src\app\student\skills
packages\web-portal\vector-web\src\app\student\skills\page.tsx

'use client';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function SkillsPage() {
  const skills = [
    {
      name: 'Advanced SQL',
      category: 'Database',
      marketDemand: 'High',
      lastUpdated: '2 weeks ago',
      trend: 'up',
    },
    {
      name: 'React Development',
      category: 'Frontend',
      marketDemand: 'Very High',
      lastUpdated: '1 month ago',
      trend: 'up',
    },
    {
      name: 'Java OOP',
      category: 'Backend',
      marketDemand: 'Medium',
      lastUpdated: '3 months ago',
      trend: 'down',
    },
    {
      name: 'Data Structures',
      category: 'Computer Science',
      marketDemand: 'Very High',
      lastUpdated: '1 week ago',
      trend: 'stable',
    },
  ];

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Skills</h1>
        <p className="text-sm md:text-base text-gray-500">Track and manage your verified skills</p>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {skills.map((skill, index) => (
          <div key={index} className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{skill.name}</h3>
                <span className="text-xs text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                  {skill.category}
                </span>
              </div>
              <div className={`flex items-center gap-1 text-sm ${
                skill.trend === 'up' ? 'text-green-600' : 
                skill.trend === 'down' ? 'text-red-600' : 
                'text-gray-400'
              }`}>
                {skill.trend === 'up' && '↗'}
                {skill.trend === 'down' && '↘'}
                {skill.trend === 'stable' && '→'}
              </div>
            </div>

            {/* Market Demand */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Market Demand:</span>
              <span className={`font-medium ${
                skill.marketDemand === 'Very High' ? 'text-green-600' :
                skill.marketDemand === 'High' ? 'text-blue-600' :
                'text-orange-600'
              }`}>
                {skill.marketDemand}
              </span>
            </div>

            <div className="text-xs text-gray-400 mt-3">
              Last updated: {skill.lastUpdated}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}


packages\web-portal\vector-web\src\app\globals.css
packages\web-portal\vector-web\src\app\layout.tsx
packages\web-portal\vector-web\src\app\page.tsx
packages\web-portal\vector-web\src\components
packages\web-portal\vector-web\src\components\dashboard
packages\web-portal\vector-web\src\components\dashboard\CredentialCard.tsx
packages\web-portal\vector-web\src\components\dashboard\CVRSuccessModal.tsx
packages\web-portal\vector-web\src\components\dashboard\DashboardLayout.tsx
packages\web-portal\vector-web\src\components\dashboard\ExportCVRModal.tsx
packages\web-portal\vector-web\src\components\dashboard\MetricCards.tsx
packages\web-portal\vector-web\src\components\dashboard\RecentActivity.tsx
packages\web-portal\vector-web\src\components\dashboard\RegistrarLayout.tsx

'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient';

interface RegistrarLayoutProps {
  children: React.ReactNode;
}

interface UserProfile {
  full_name: string;
  email: string;
  role: string;
}

export default function RegistrarLayout({ children }: RegistrarLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  
  // ⚡ LOADING STATE: Default to true to prevent premature redirects
  const [isLoading, setIsLoading] = useState(true);
  
  // ⚡ USER STATE: Default to null
  const [user, setUser] = useState<UserProfile | null>(null);
  
  const pathname = usePathname();
  const router = useRouter();

  // ✅ 1. Fetch Dynamic User Data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        // A. Get Session (Contains Email & Auth ID)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.replace('/login');
          return;
        }

        // B. Get Profile (Contains Name & Role)
        const { data: profile } = await supabase
          .from('users')
          .select('full_name, role')
          .eq('id', session.user.id)
          .maybeSingle();

        // C. Set User State (Combine Session + DB)
        setUser({
          full_name: profile?.full_name || 'Registrar Admin',
          email: session.user.email || 'admin@vector.edu',
          role: profile?.role || 'registrar'
        });

      } catch (error) {
        console.error("Error loading registrar profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  // ✅ 2. Logout Logic
  const confirmLogout = async () => {
    await supabase.auth.signOut();
    setIsLogoutDialogOpen(false);
    router.push('/login');
  };

  const getInitials = (name: string) => {
    if (!name) return 'R';
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // ⚡ Render Loading Spinner while fetching
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 text-sm font-medium">Loading Registrar Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <aside className={`
          fixed top-0 left-0 z-40 h-screen w-64 bg-white border-r border-gray-200
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 border-b border-gray-200">
              <Link href="/registrar/dashboard" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">V</span>
                </div>
                <div>
                  <span className="text-xl font-bold text-gray-900">VECTOR</span>
                  <p className="text-xs text-gray-500">Registrar Portal</p>
                </div>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
              <Link
                href="/registrar/dashboard"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium ${
                  pathname === '/registrar/dashboard'
                    ? 'text-purple-700 bg-purple-50'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Issue Credentials
              </Link>
              
              <Link
                href="/registrar/manage"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium ${
                  pathname === '/registrar/manage'
                    ? 'text-purple-700 bg-purple-50'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                Manage Credentials
              </Link>

              <Link
                href="/registrar/students"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium ${
                  pathname === '/registrar/students'
                    ? 'text-purple-700 bg-purple-50'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                Students
              </Link>
            </nav>

            {/* ✅ Dynamic User Footer */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg justify-between group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-xs">
                    {getInitials(user?.full_name || '')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.full_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>

                {/* Logout Button */}
                <button 
                  onClick={() => setIsLogoutDialogOpen(true)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                  title="Logout"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:ml-64">
          <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <div className="lg:hidden flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">V</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">VECTOR</span>
                </div>
              </div>
              <div className="flex items-center gap-4 ml-auto">
                <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
                <span className="text-sm font-medium text-gray-500 hidden sm:block">
                  {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Logout Confirmation Modal */}
        {isLogoutDialogOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirm Logout</h3>
                  <p className="text-sm text-gray-600">Are you sure you want to log out?</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsLogoutDialogOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700">Cancel</button>
                <button onClick={confirmLogout} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">Logout</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}

packages\web-portal\vector-web\src\components\dashboard\Sidebar.tsx
packages\web-portal\vector-web\src\components\dashboard\TopBar.tsx

'use client';
import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient'; // ✅ Import Supabase

interface UserProfile {
  full_name: string;
  role: string;
  email?: string;
}

export default function TopBar() {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null); // ✅ User State
  
  const router = useRouter();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Theme Logic
  let theme: 'light' | 'dark' = 'light';
  let toggleTheme = () => {};
  try {
    const themeContext = useTheme();
    theme = themeContext.theme;
    toggleTheme = themeContext.toggleTheme;
  } catch (error) {}

  // ✅ 1. Fetch User Data
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Fetch profile details
        const { data: profile } = await supabase
          .from('users')
          .select('full_name, role')
          .eq('id', session.user.id)
          .maybeSingle();

        setUser({
          full_name: profile?.full_name || session.user.email?.split('@')[0] || 'User',
          role: profile?.role || 'student',
          email: session.user.email
        });
      }
    };
    getUser();
  }, []);

  const notifications = [
    { id: 1, title: 'New Course Recommendation', message: 'Advanced Kotlin course added', time: '5 min ago', unread: true },
    { id: 2, title: 'Skill Badge Earned', message: 'You earned the Python Mastery badge!', time: '2 hours ago', unread: true },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsProfileMenuOpen(false);
    setIsLogoutDialogOpen(true);
  };

  const confirmLogout = async () => {
    await supabase.auth.signOut(); // ✅ Real Signout
    setIsLogoutDialogOpen(false);
    router.push('/login');
  };

  const handleViewProfile = () => {
    setIsProfileMenuOpen(false);
    router.push('/student/profile');
  };

  // Helper for Initials
  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  return (
    <>
      <div className="w-full h-16 bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 flex-shrink-0">
        <div className="h-full flex items-center justify-end gap-4">
        {/* Theme Toggle */}
        <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          {theme === 'dark' ? (
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          ) : (
            <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
          )}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 max-h-96 overflow-y-auto z-50">
              <div className="px-4 py-2 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div key={notification.id} className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${notification.unread ? 'bg-purple-50' : ''}`}>
                    <div className="flex items-start gap-3">
                      {notification.unread && <span className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></span>}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{notification.title}</p>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ✅ Dynamic Profile Section */}
        <div className="relative" ref={profileMenuRef}>
          <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center gap-3 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 font-semibold text-lg">
                {user ? getInitials(user.full_name) : '...'}
              </span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-gray-900">{user?.full_name || 'Loading...'}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role || 'student'}</p>
            </div>
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
          </button>

          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <button onClick={handleViewProfile} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                View Profile
              </button>
              <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Logout Modal */}
    {isLogoutDialogOpen && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Logout</h3>
          <p className="text-sm text-gray-600 mb-4">Are you sure you want to log out?</p>
          <div className="flex gap-3">
            <button onClick={() => setIsLogoutDialogOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={confirmLogout} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">Logout</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

packages\web-portal\vector-web\src\components\features
packages\web-portal\vector-web\src\components\features\CTASection.tsx
packages\web-portal\vector-web\src\components\features\FeaturesSection.tsx
packages\web-portal\vector-web\src\components\features\HeroSection.tsx
packages\web-portal\vector-web\src\components\features\WorkflowSection.tsx
packages\web-portal\vector-web\src\components\pages
packages\web-portal\vector-web\src\components\pages\LandingPage.tsx
packages\web-portal\vector-web\src\components\pages\LoginPage.tsx
packages\web-portal\vector-web\src\components\shared
packages\web-portal\vector-web\src\components\shared\ConnectWalletModal.tsx
packages\web-portal\vector-web\src\components\shared\Footer.tsx
packages\web-portal\vector-web\src\components\shared\Navbar.tsx
packages\web-portal\vector-web\src\components\shared\RegistrarLoginModal.tsx
packages\web-portal\vector-web\src\contexts
packages\web-portal\vector-web\src\contexts\ThemeContext.tsx
packages\web-portal\vector-web\src\lib
packages\web-portal\vector-web\src\lib\blockchain.ts

export const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Your deployed address

export const VECTOR_TOKEN_ABI = [
  // ✅ Minting
  "function mintSkill(address student, uint256 skillId, uint256 amount) public returns (bool)",
  "function batchMintSkills(address[] calldata students, uint256[] calldata skillIds, uint256[] calldata amounts) public returns (bool)",
  
  // ✅ Reading Data (Add these!)
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function uri(uint256 id) view returns (string)",
  
  // ✅ Roles
  "function isRegistrar(address account) public view returns (bool)",
  "event SkillMinted(address indexed student, uint256 skillId, uint256 amount)"
];

export const SKILL_MAP: Record<string, number> = {
  "React Development": 1,
  "Python Programming": 2,
  "Solidity Smart Contracts": 3,
  "Node.js Backend Development": 4,
  "AI/ML Fundamentals": 5,
  "Web Development": 1, 
  "Data Science": 2,
  "Cybersecurity": 3,
  "Cloud Computing": 4,
  "Database Management": 4,
  "Mobile Development": 1,
  "Machine Learning": 5
};

packages\web-portal\vector-web\src\lib\db.ts

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

// 1. Prisma Client (For Server-Side Logic & API Routes)
const prismaClientSingleton = () => {
  return new PrismaClient();
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// 2. Supabase Client (For Client-Side Auth)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

packages\web-portal\vector-web\src\lib\supabaseClient.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

packages\web-portal\vector-web\src\lib\utils.ts

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

packages\web-portal\vector-web\src\lib\wagmi.ts

import { http, createConfig } from 'wagmi'
import { polygonAmoy } from 'wagmi/chains'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'

export const config = getDefaultConfig({
  appName: 'Vector System',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Get this from Cloud.WalletConnect
  chains: [polygonAmoy],
  transports: {
    [polygonAmoy.id]: http(),
  },
  ssr: true, // Server Side Rendering enabled
})

packages\web-portal\vector-web\.env

# Frontend Keys
NEXT_PUBLIC_SUPABASE_URL="https://jpipnqcnsornqwxbyvge.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwaXBucWNuc29ybnF3eGJ5dmdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTY3NTQsImV4cCI6MjA4MTQ3Mjc1NH0.O9-dzTQ-mZduqEShPSxdiwTtFqDl7zp9u9-GWnoEdNE"

# ✅ ACTIVE CONNECTION (Using Session Mode - Port 5432)
# We moved the 5432 URL up here so Prisma uses it by default.
DATABASE_URL="postgresql://postgres.jpipnqcnsornqwxbyvge:oy0jlNR8GlWs1eww@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

# ⚠️ BACKUP / DIRECT CONNECTION
DIRECT_URL="postgresql://postgres.jpipnqcnsornqwxbyvge:oy0jlNR8GlWs1eww@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

# AI Engine Key:
GEMINI_API_KEY=AIzaSyCna0SZhZBGIjeyg88DR1gMdQJa5_-mEz0

packages\web-portal\vector-web\.gitignore
packages\web-portal\vector-web\eslint.config.mjs
packages\web-portal\vector-web\next-env.d.ts
packages\web-portal\vector-web\next.config.ts
packages\web-portal\vector-web\package-lock.json
packages\web-portal\vector-web\package.json
packages\web-portal\vector-web\postcss.config.mjs
packages\web-portal\vector-web\README.md
packages\web-portal\vector-web\tsconfig.json
packages\web-portal\.gitkeep