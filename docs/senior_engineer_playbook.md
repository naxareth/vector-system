# The Senior Engineer's Playbook for a Major System Overhaul

**Context:** You have a working production codebase that needs a fundamental architectural pivot — removing a core subsystem (blockchain), swapping a critical dependency (AI provider), and adding new features (job platform) — all without breaking the app or losing existing work.

This is how experienced engineers handle it.

---

## Table of Contents

1. [Step 0: Don't Touch Code Yet](#step-0-dont-touch-code-yet)
2. [Step 1: Freeze the Current State](#step-1-freeze-the-current-state)
3. [Step 2: Map the Blast Radius](#step-2-map-the-blast-radius-before-you-cut)
4. [Step 3: Branch Per Concern](#step-3-work-in-branches-one-concern-per-branch)
5. [Step 4: The Strangler Fig Pattern](#step-4-the-strangler-fig-pattern--dont-delete-replace)
6. [Step 5: Write Tests Before You Delete](#step-5-write-tests-before-you-delete)
7. [Step 6: Build Check Per File Group](#step-6-one-build-check-per-file-group)
8. [Step 7: Keep a Living Changelog](#step-7-keep-a-living-changelog)
9. [Step 8: Walking Skeleton for New Features](#step-8-the-walking-skeleton-approach-for-new-features)
10. [Step 9: The Decision Log](#step-9-the-decision-log)
11. [Monday Morning Checklist](#the-actual-order-of-operations-for-monday-morning)
12. [The Golden Rule](#the-one-principle-that-ties-it-all-together)

---

## Step 0: Don't Touch Code Yet

This is the hardest discipline and the most important one.

The instinct when you get feedback like "remove blockchain" is to immediately start deleting files. **Resist that.**

Every senior who's been burned by a rushed refactor has the same scar: they started ripping things out, broke something they didn't expect, spent 3 days debugging a cascade of failures, and ended up further behind than when they started.

What you do instead is **plan in writing, get alignment, then execute.** The order is always:

```
1. Understand what needs to change (read the feedback)
2. Map the impact (what code is affected?)
3. Write the plan (what's the order of operations?)
4. Get alignment (does the team/adviser agree?)
5. THEN execute (finally, touch code)
```

> [!IMPORTANT]
> The ratio should be roughly 30% planning, 70% execution. Most juniors do 5% planning, 95% execution. They feel productive because they're typing. But they're typing the wrong things and then rewriting them.

---

## Step 1: Freeze the Current State

Before changing anything, create a clean, working, tagged snapshot you can always return to.

```bash
git checkout main
git pull origin main
git tag v1.0-pre-pivot
git push origin v1.0-pre-pivot
```

**Why this matters:**

This is your safety net. If anything goes catastrophically wrong during the overhaul — corrupted database migration, accidentally deleted the wrong file, cascade of import errors you can't untangle — you run `git checkout v1.0-pre-pivot` and you're back to a known-good state in seconds.

Seniors do this religiously. It costs nothing and saves everything.

> [!TIP]
> **Think of it like a save point in a video game.** You always save before the boss fight, not during it.

**Extended version for critical systems:**

```bash
# Tag the current state
git tag v1.0-pre-pivot -m "Last stable state before system pivot"
git push origin v1.0-pre-pivot

# Also export your database (if applicable)
pg_dump your_database > backups/pre-pivot-$(date +%Y%m%d).sql

# Screenshot your current CI/CD passing
# (you'll want proof it was green before you started)
```

---

## Step 2: Map the Blast Radius Before You Cut

Before removing **anything**, answer this question:

> "If I delete this one file, what else breaks?"

**How to do it:**

### 1. Grep for imports
```bash
# Who imports blockchain.ts?
grep -rn "from.*blockchain" --include="*.ts" --include="*.tsx" src/
```

### 2. Grep for usage
```bash
# Who uses the functions this module exports?
grep -rn "fetchWalletSkillNames\|CONTRACT_ADDRESS\|VECTOR_TOKEN_ABI" --include="*.ts" --include="*.tsx" src/
```

### 3. Build the dependency graph
```
blockchain.ts ← imported by dashboard/page.tsx
blockchain.ts ← imported by registrar/users/page.tsx  
blockchain.ts ← imported by api/verify/[id]/route.ts
ethers ← imported by 8 files
```

So deleting `blockchain.ts` breaks at least 3 pages and 2 API routes.

### 4. Write it down as a checklist
```markdown
## Blockchain Extraction Checklist
- [ ] src/lib/blockchain.ts (DELETE entirely)
- [ ] src/app/student/dashboard/page.tsx (EDIT: remove wallet connect, keep credentials)
- [ ] src/app/registrar/users/page.tsx (EDIT: replace on-chain revoke with DB update)
- [ ] src/app/api/verify/[id]/route.ts (REWRITE: database-only verification)
...
```

**The professional move:** Know every file that will be affected before you touch the first one. No surprises.

> [!WARNING]
> **The most dangerous files** are the ones with blockchain code *interleaved* with non-blockchain code. You can't delete them — you have to surgically edit them. These take 5x longer than full deletions and are where most bugs are introduced.

---

## Step 3: Work in Branches, One Concern Per Branch

Never do a major overhaul on `main`. Never even do it on one big branch. Break it into isolated, reviewable chunks:

```
main (always stable, always deployable)
  │
  ├── feat/ai-provider-abstraction      ← Phase 1
  │     └── merged to main when stable
  │
  ├── feat/blockchain-extraction         ← Phase 2 (branches from updated main)
  │     └── merged to main when stable
  │
  ├── feat/credential-verification       ← Phase 3 (branches from updated main)
  │     └── merged to main when stable
  │
  └── feat/job-platform-mvp             ← Phase 4 (branches from updated main)
        └── merged to main when stable
```

**Each branch follows these rules:**
- Does **one thing** (single responsibility)
- Has a **working build** at every commit (`npm run lint && next build` passes)
- Can be **reviewed independently** (someone can understand it without context of other branches)
- Gets **merged to main** when stable, before starting the next phase

**Why this matters:**

If Phase 3 goes sideways, Phases 1 and 2 are already safely in `main`. You never lose progress. You never have a week where "nothing works because we're in the middle of refactoring."

> [!TIP]
> **The naming convention matters.** Use prefixes like `feat/`, `fix/`, `chore/`, `refactor/` — they tell your future self and your team what KIND of change the branch contains without opening it.

---

## Step 4: The Strangler Fig Pattern — Don't Delete, Replace

This is a real software architecture pattern named after a real plant. A strangler fig grows around a host tree, slowly replacing it, until the original tree is gone but the structure stands.

### The Wrong Way (Big Bang Replacement):
```
1. Delete blockchain.ts
2. Delete all ethers imports
3. 8 files break immediately
4. Spend 3 days fixing cascading errors
5. Nothing works for a week
6. Teammates can't test anything
7. Panic
```

### The Right Way (Strangler Fig):
```
1. Create new database-verification.ts
   (the NEW way to verify credentials — DB only, no blockchain)

2. In verify/[id]/route.ts:
   - Add the NEW database verification call
   - Keep the OLD blockchain call (commented out or behind a flag)
   - Test the new path works
   
3. Confirm the new path works? 
   → NOW delete the old blockchain call from this file
   
4. Repeat for the next file

5. When ALL files are migrated off blockchain.ts
   → THEN delete blockchain.ts itself
   → THEN uninstall ethers
```

**The key insight:** The app works at **every step**. You can demo it at any point during the migration. There is never a moment where "it's broken because we're refactoring."

> [!NOTE]
> This is exactly how Netflix migrated from a monolith to microservices over several years. They never had a day where the site was down for "refactoring." Old and new systems ran side by side until the new one was proven, then the old one was retired.

### Practical Example for VECTOR:

```typescript
// BEFORE (blockchain verification)
const provider = getReadOnlyProvider();
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
const balance = await contract.balanceOf(walletAddress, tokenId);
const isVerified = balance > 0;

// AFTER (database verification)
const credential = await prisma.verified_credentials.findFirst({
  where: { id: credentialId },
  select: { status: true, verified_at: true }
});
const isVerified = credential?.status === 'verified';
```

Both produce a boolean `isVerified`. The rest of the page doesn't care where it came from. Swap the implementation, keep the interface.

---

## Step 5: Write Tests Before You Delete

Before removing the blockchain verification path, write a test for the **new** database verification path.

```typescript
// tests/verification.test.ts
test('credential with verified status returns verified badge', async () => {
  // Arrange: create a credential with status 'verified'
  // Act: call the verification endpoint
  // Assert: response includes verified: true
});

test('credential with pending status returns pending badge', async () => {
  // ...
});

test('non-existent credential returns 404', async () => {
  // ...
});
```

**Why this ordering matters:**
- You know the new path works **before** you remove the old one
- If someone accidentally breaks the new path later, the test catches it
- You can show the panel: *"We have test coverage for our verification system"*
- During the extraction, if a test suddenly fails, you know you broke something

You don't need 100% coverage. You need tests for the **critical paths**: credential verification, fraud detection, user authentication, AI provider switching.

> [!TIP]
> **The minimum viable test suite:** One test per API route that handles credentials. One test for the AI provider abstraction (can it switch between Groq and Ollama?). One test for authentication. That's maybe 10-15 tests. It takes an afternoon and saves weeks of debugging.

---

## Step 6: One Build Check Per File Group

After every batch of changes (usually 3-5 related files), run:

```bash
npm run lint && npx next build
```

If it fails, you know exactly which files caused it because you only changed 3-5 things. If you change 30 files and then build, good luck figuring out which change broke it.

### The Rhythm:

```
Edit 3-5 files → Build → Green? → Commit → Next batch
                        → Red?  → Fix immediately (you know exactly where)
```

### The Anti-Pattern:

```
Edit 30 files → Build → Red → Which file caused it? → Debug for 2 hours
→ Fix one thing → Build → Still red → Different error → Debug more
→ Eventually give up and git stash → Start over
```

> [!IMPORTANT]
> **This is the single biggest productivity difference between junior and senior developers.** Juniors make big changes and debug for hours. Seniors make small changes and verify constantly. The senior's approach FEELS slower but finishes faster because there's never a multi-hour debugging session.

---

## Step 7: Keep a Living Changelog

As you work through the overhaul, maintain a simple document that tracks what changed and what's left:

```markdown
## VECTOR Overhaul — Development Log

### June 3 — AI Provider Abstraction
- ✅ Created src/lib/ai-provider.ts with strategy pattern
- ✅ Integrated Groq adapter (groq-adapter.ts)
- ✅ Tested chat route against Groq — works
- ⚠️ CVR analysis prompt needs adjustment for Llama 3 output format
- TODO: Test course generation route

### June 4 — AI Provider (continued)
- ✅ Fixed CVR analysis prompt — added explicit JSON format instruction
- ✅ All 4 AI routes work on Groq
- ✅ Added Ollama adapter for local fallback
- ✅ Merged feat/ai-provider-abstraction → main

### June 5 — Blockchain Extraction (started)
- ✅ Removed ethers from student/dashboard/page.tsx
- ✅ Replaced wallet connect button with profile completion widget
- ✅ Build passes
- TODO: student/profile/page.tsx (wallet section)
```

**This serves three purposes:**
1. **You** can see what you did yesterday and what's next without re-reading code
2. **Your team** can see progress without asking "hey, what's the status?"
3. **Your manuscript** has a ready-made development log for the methodology chapter

---

## Step 8: The Walking Skeleton Approach for New Features

When building new features (fraud detection, job posting, PDF upload), don't build the full thing and then integrate it. Build the **thinnest possible version** that works end-to-end first.

### Example: AI Credential Fraud Detection

```
Week 1 (Skeleton):
  → User uploads a PDF
  → Server sends it to AI with a basic prompt
  → AI returns "suspicious" or "clean"
  → Result shown on screen as plain text
  
  (Ugly UI. No edge cases. Hardcoded prompts. But it WORKS end-to-end.)

Week 2 (Muscle):
  → Add proper UI with confidence scores and visual indicators
  → Add error handling for bad PDFs
  → Add loading states and progress indicators

Week 3 (Organs):  
  → Add email domain verification layer
  → Add QR code scanning
  → Add duplicate credential detection

Week 4 (Skin):
  → Polish UI, animations, responsive design
  → Edge cases, error states, empty states
  → Help tooltips and user guidance
```

**The skeleton is ugly but functional on Day 1.** Every day after that makes it better.

**Why this works:**
- If the defense is moved up by two weeks, you can demo the skeleton
- If you spent those two weeks on "designing the perfect fraud detection architecture" you'd have nothing to show
- The skeleton often reveals problems with your assumptions early, when they're cheap to fix
- Your team can start testing and giving feedback from Day 1

> [!CAUTION]
> **The enemy of the walking skeleton is perfectionism.** You will feel the urge to "just make it look nice first" or "add proper error handling before showing anyone." Resist. Ship the ugly thing. Polish later. A working ugly demo beats a beautiful broken one every single time.

---

## Step 9: The Decision Log

For every non-obvious technical decision, write down **what** you decided, **why** you decided it, and **what alternatives** you considered. 

```markdown
## Decision: Use Groq instead of Gemini as primary AI provider
**Date:** June 3, 2026  
**Context:** Gemini free tier reduced to 15-20 RPD, unusable for development  
**Options considered:**
  1. Gemini paid tier — monthly cost, requires billing setup
  2. Groq free tier — 14,400 RPD, runs Llama 3, fast inference  
  3. Ollama local — unlimited, no internet, requires local hardware  
  4. OpenAI — industry standard but paid only  
**Decision:** Groq primary + Ollama demo fallback  
**Rationale:** Groq's free tier gives enough headroom for active development.
Ollama guarantees demo works even if campus internet fails during defense.
Provider abstraction layer means we can switch later if needed.
```

**Why this matters:**
- These go directly into your manuscript's **methodology section** — panelists love structured decision-making
- Six months from now, someone (probably you) will ask "why didn't we use Gemini?" and the answer is documented
- It forces you to think through alternatives instead of going with your first instinct
- It creates a paper trail that shows professional engineering judgment

---

## The Actual Order of Operations for Monday Morning

Here's literally what to do when you sit down at the keyboard:

```
□ 1. Merge chore/cleaning-code → main (PR or direct merge)
□ 2. Tag it: git tag v1.0-pre-pivot
□ 3. Push the tag: git push origin v1.0-pre-pivot
□ 4. Create branch: git checkout -b feat/ai-provider-abstraction
□ 5. Build the provider abstraction layer (ai-provider.ts)
□ 6. Integrate Groq adapter
□ 7. Integrate Ollama adapter  
□ 8. Test all 4 AI routes against new provider
□ 9. Build passes? Merge to main.
□ 10. Create branch: git checkout -b feat/blockchain-extraction
□ 11. Follow the extraction map file-by-file (strangler fig)
□ 12. Build check every 3-5 files
□ 13. All blockchain removed? Build passes? Merge to main.
□ 14. Now you have a clean, blockchain-free, AI-flexible codebase.
□ 15. Every new feature is built on solid ground from here.
```

---

## The One Principle That Ties It All Together

> **Make it work. Make it right. Make it fast. In that order.**

- **"Make it work"** = walking skeleton, ugly but functional, end-to-end proof of concept
- **"Make it right"** = proper architecture, tests, clean code, error handling
- **"Make it fast"** = optimization, caching, performance tuning

Most projects die trying to "make it right" before they've even "made it work." 

Ship the ugly thing. Polish it later. Move forward.

---

## Quick Reference: Senior vs. Junior Patterns

| Situation | Junior Does | Senior Does |
|---|---|---|
| "Remove blockchain" | Starts deleting files | Maps blast radius first |
| Big refactor | One giant branch, merges in 2 weeks | Small branches, merge daily |
| Something breaks | Debug for hours | `git stash`, isolate, reproduce, fix |
| New feature needed | Builds the perfect version for 3 weeks | Walking skeleton in 2 days, iterate |
| Technical decision | Goes with first instinct | Writes down alternatives + rationale |
| Progress tracking | "It's almost done" | Living changelog with checkboxes |
| Build breaks | Changes 10 more things, hopes it fixes itself | Reverts last change, investigates |
| Teammate asks status | "I'll show you when it's ready" | Points to changelog + working branch |

---

*Remember: The goal isn't to write perfect code. The goal is to always have working code that gets progressively better. Every commit should leave the codebase in a deployable state.*
