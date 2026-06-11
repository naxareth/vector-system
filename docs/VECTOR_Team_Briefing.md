**VECTOR CAPSTONE**

*System Pivot & Revised Direction*

June 2026

# **1\. What This Document Is**

This document summarizes a full planning conversation that happened after reviewing the capstone defense feedback. The goal is to get everyone on the same page about what VECTOR actually is now, why we're making these changes, and what the thinking was behind each decision. Read this before we have our team meeting.

# **2\. What the Panel Actually Said**

The defense feedback form had 7 items. Here's the plain-English version of each:

## **Feedback 1 — Remove the Issuer/Registrar Partnership Model**

The original system required partnering with universities and institutions so they could issue credentials on-chain. The panel said this is too high-risk because forming those partnerships takes time and legal documentation we don't have. Their proposed fix: use an AI model to verify digital credentials submitted by students via email instead of relying on institutional minting.

## **Feedback 2 — Remove the Digital Wallet**

Since credentials are no longer being issued directly by institutions onto a blockchain, there's no reason to have a wallet to hold them. The wallet's whole purpose was to store blockchain-issued tokens. Remove it entirely.

## **Feedback 3 — Add a Credential Submission System**

Users still need to submit credentials and build resumes. Two options: (1) manual input where users fill out a form, and (2) PDF/document upload where AI extracts and structures the information automatically.

## **Feedback 4 — Add User Agreement for Gmail Integration**

Since the system accesses email data to trace credential sources, a Terms and Conditions page is legally required. Must explicitly state what data is accessed and how it's used.

## **Feedback 5 — UI/UX Fixes**

* Give the AI an original name (avoid trademark issues)  
* Use bar graphs for top in-demand skills visualization  
* Disable paste on the confirm password field  
* Implement OTP authentication with expiration timer  
* Duplicate credential detection with pop-up warning

## **Feedback 6 — Make the System Generic, Not IT-Specific**

The current design assumes users are IT people. Redesign using generic CV fields like Work Experience and Education. Use dropdowns for fields like Specialization or Industry Sector with an Others option.

## **Feedback 7 — Add Pre-Verification Workflow**

Employers, students, and alumni must go through a verification step before they can upload CVs or credentials. This ensures only legitimate users populate the database.

# **3\. The Big Question: Should We Keep Blockchain?**

**Short answer: No. Here's the thinking.**

Blockchain solves one very specific problem: multiple parties who don't trust each other need to agree on a record without a central authority. For that to apply here, we would need real independent institutions (universities, TESDA, PRC, bootcamps) all actively minting credentials on the same chain.

The original vision DID actually justify blockchain at that scale. The problem is that partnering with PRC, TESDA, and multiple universities is a years-long business and legal process. Not a capstone project. The panel recognized this and removed the issuer model, which also removed the entire justification for blockchain.

What we have after removing issuers is just a regular web application with a centralized database. Supabase is a perfectly legitimate way to build that. Blockchain on top of that adds complexity with zero user benefit.

*Also worth saying directly: blockchain is terrible UX for normal users. Expecting a fresh graduate to set up a MetaMask wallet, understand gas fees, and know what Polygon Amoy means just to submit a resume is disconnected from reality.*

**The best tech is invisible to the user. If you need to educate your user just to USE your product, your product has already failed.**

# **4\. The Critical Problem We Identified**

**This is the most important technical insight from our planning session.**

The panel said to use AI to verify credentials. But AI verification has a fundamental problem: AI has no ground truth to compare against.

If a student submits a PDF saying they graduated from UST, what does our AI compare it against? We don't have access to UST's actual records. Nobody does publicly. AI can detect visual inconsistencies, formatting anomalies, and suspicious patterns — but it cannot confirm a credential is genuinely real without a source of truth.

This is exactly why blockchain existed in the original design — the institution minting the credential ON-CHAIN was the source of truth. Remove that and you need to replace it with something else.

**Our proposed solution is a hybrid approach:**

1. AI scans submitted credentials for fraud signals — tampering, inconsistencies, fake formatting, suspicious patterns  
2. Email domain verification — did this credential come from an official institution email like registrar@phinma.edu.ph?  
3. QR code verification — if an institution generates a QR code linking to their own registrar portal, our system reads that response  
4. Manual registrar approval — a human registrar makes the final call before a Verified badge appears

*The key reframe: we don't say AI verifies credentials. We say AI assists in credential fraud detection by flagging suspicious submissions for human review. That's accurate, honest, and still impressive.*

Our partner institution for the source of truth is PHINMA-UP itself. We're already there. Our adviser is there. That's enough for a defensible capstone demo.

# **5\. The Revised System Direction**

One panelist pointed out that we shouldn't target registrars as our primary stakeholders — we should target employers and companies who post job listings. That redirected the whole system toward a job platform model.

The revised VECTOR is essentially a credential-verified job platform for the Philippine market. Think LinkedIn \+ JobStreet but with an AI verification layer. Here's the full picture:

* Students build verified digital resumes (manual input or PDF upload \+ AI extraction)  
* AI scans credentials for fraud signals and flags suspicious submissions  
* Human registrar gives final verification approval  
* Employers post job listings on the platform  
* AI matches verified candidates to relevant job listings  
* Skill decay analytics tells students which skills are becoming obsolete and what to learn next  
* OTP auth, duplicate detection, user agreement, generic CV fields

**Our differentiator from LinkedIn/Indeed/JobStreet: AI-assisted credential verification. Nobody in the Philippine job platform market is doing this. That's our value proposition.**

# **6\. What Changes in the Codebase**

## **Remove Entirely**

* packages/blockchain-core — the entire Hardhat/Solidity/Polygon package  
* Digital Wallet UI  
* Issuer/Registrar minting flow  
* RainbowKit, Wagmi, Viem libraries (all blockchain-specific)

## **Keep Mostly As-Is**

* AI career analytics and skill decay engine  
* Admin dashboard  
* Auth and RBAC structure

## **Build New**

* PDF upload \+ AI extraction for resume digitalization  
* AI credential fraud detection (flagging, not absolute verification)  
* Employer job posting system  
* Job matching / candidate discovery  
* OTP authentication  
* Duplicate credential detection  
* User agreement / Terms and Conditions page  
* Generic CV fields with dropdowns (not IT-specific)

# **7\. What Changes in the Manuscript**

The submitted Chapter 1 and 2 were written around blockchain. The pivot affects them significantly but it's revision work, not a full rewrite. Here's the breakdown:

## **Title**

Remove Decentralized. Suggested revision:

***VECTOR: An AI-Powered Micro-Credentialing System with Predictive Career Analytics and Skill Decay Detection***

## **Background of the Study**

About 80% of this survives. The problem it describes — 845,000 unemployed graduates, credential fraud, skills gap — is all still valid and still cited. The only part that changes is the solution section. Instead of saying blockchain is the answer, we pivot to: while blockchain has been proposed as a solution, implementation barriers such as institutional partnership requirements and technical complexity limit its feasibility in the Philippine context — therefore this study proposes an AI-driven approach. This actually makes the argument stronger because we're acknowledging limitations of existing approaches.

## **Scope and Delimitation**

Needs significant rewriting. References to Polygon Amoy testnet, PWA digital wallet, and blockchain-based record-keeping all need to be removed and replaced with the revised architecture.

## **Definition of Terms**

Remove these terms:

* Blockchain, Decentralized System, Digital Wallet, IPFS, Polygon Amoy Testnet, Off-Chain Storage

Micro-Credential stays but needs redefining without the blockchain context.

Add new terms relevant to the revised system: credential fraud detection, email domain verification, job matching, etc.

## **Tools and Technologies**

Remove all blockchain tools. Keep Next.js, Supabase, Prisma, TailwindCSS. Add the AI provider (TBD — see Section 8\) and any new libraries for PDF parsing, OTP, etc.

# **8\. The AI Provider Decision**

We were originally using Google Gemini but the free tier is now 10-20 requests per DAY. That's unusable even for light testing, let alone a demo.

Current options being considered:

* Groq (free tier, fast, generous limits, runs Llama 3/Gemma) — best for development and testing  
* Ollama local LLM — already set up and tested, good fallback for demo day since it doesn't depend on internet

This is not finalized yet. The plan is to abstract AI calls behind a single service layer so we can switch providers without changing the whole codebase. Final decision after adviser consultation.

# **9\. Panel Feedback Mapped to Revised System**

Every single piece of panel feedback maps to the revised system picture:

| Panel Feedback | How It's Addressed |
| :---- | :---- |
| **\#1 — Remove Issuer Partnership** | Employers post jobs instead. AI handles fraud detection. No institutional partnerships needed. |
| **\#2 — Remove Digital Wallet** | No blockchain, no wallet. Credentials stored in Supabase database. |
| **\#3 — Credential Submission** | Manual input \+ PDF upload. AI extracts and structures the data. |
| **\#4 — User Agreement** | Terms and Conditions page for Gmail/email data usage. |
| **\#5 — UI/UX Fixes** | Renamed AI, bar graphs, OTP auth, duplicate detection, disable paste on confirm password. |
| **\#6 — Generic Design** | Generic CV fields, dropdowns for specialization/industry, not IT-specific. |
| **\#7 — Pre-Verification Workflow** | Employer/student/alumni verification step before uploading credentials. |

# **10\. What Happens to the Original Vision**

The original VECTOR — blockchain credential issuance across universities, TESDA, PRC, and bootcamps — was actually a legitimate idea at that scale. The problem was scope, not concept.

That vision doesn't die. It becomes our Recommendations for Future Work in Chapter 5(?). The multi-institutional blockchain network, PRC/TESDA integration, government adoption — all of that gets documented as the long-term roadmap that a startup or government initiative could pursue after our MVP proves the concept.

*Think of the capstone as the proof of concept. The future work section is the pitch deck.*

# **11\. Immediate Priorities**

Nothing gets built until these happen first. In order:

1. Adviser consultation with Ma'am Canlas — bring the feedback form and specific questions about how much of Chapter 1 and 2 needs revision, whether the title changes officially, and her stance on removing blockchain  
2. R\&D on LinkedIn, Indeed, and JobStreet — document their user flows, core features, employer/candidate interaction patterns. Identify the overlapping minimum features for our MVP.  
3. Codebase audit — run the existing app, document what works and what doesn't, confirm that blockchain-core is cleanly isolated from the rest  
4. Full team alignment meeting — after adviser consultation, everyone agrees on the final direction before a single line of code changes

