# The Art of Vibe Coding: How to Prompt Engineer a Major Overhaul

**What this is:** A practical guide to using AI coding assistants effectively for complex, multi-phase system changes. Not theory — actual techniques that work.

---

## The Golden Rule of AI-Assisted Development

> **The AI is a senior pair programmer, not an autonomous contractor.**

You don't hand a contractor the keys and say "renovate my house, I'll be back in a week." You'd come back to find the bathroom where the kitchen was.

Instead, you sit next to them and say:
- "Let's start with the kitchen plumbing"
- "Okay that looks right, now let's do the electrical"
- "Wait, stop — that wire goes to the wrong breaker"

Same principle. You drive the direction. The AI drives the keyboard.

---

## Rule 1: One Task Per Prompt — The Most Important Rule

### ❌ The prompt that ruins everything:
```
Remove all blockchain code from the project, swap Gemini for Groq, 
add PDF upload with AI extraction, build the employer dashboard, 
update the database schema, and fix any lint errors
```

What happens: The AI tries to do everything at once. It makes 40 file changes in a single response. Half of them conflict with each other. The build breaks. You can't tell which change caused the break. You spend 2 hours untangling it and end up reverting everything.

### ✅ The prompt that actually works:
```
In src/app/student/dashboard/page.tsx, remove the MetaMask wallet 
connection button and the fetchWalletSkillNames import. Replace the 
wallet connection UI section (around lines 416-430) with a simple 
"Profile Completion" status card. Keep everything else exactly as-is.
```

**Why this works:**
- One file
- One concern
- Clear boundaries ("keep everything else")
- Specific line references (so the AI knows exactly where to look)
- Verifiable outcome (you can check the one file)

### The Rhythm:
```
You: [Specific single-file task]
AI:  [Makes the change]
You: [Review the diff, run build]
You: [Next specific single-file task]
AI:  [Makes the change]
You: [Review, build, commit]
```

Each cycle is 2-5 minutes. You make 10-20 of these per hour. By the end of the hour, you've made 15 surgical changes and the build still passes. That's faster than the "do everything" prompt that takes 30 minutes and then breaks.

---

## Rule 2: Feed Context, Not Instructions

The biggest mistake in prompt engineering is over-instructing and under-contextualizing.

### ❌ Over-instructing:
```
Create a new file called ai-provider.ts. It should export a function 
called generateText that takes a prompt string and returns a string. 
Use an interface called AIProvider with methods for generateText and 
generateJSON. Create adapters for Groq and Ollama. The Groq adapter 
should use the groq-sdk package. The Ollama adapter should use fetch 
to localhost:11434. Add error handling with try-catch blocks. Add 
retry logic with exponential backoff. Add logging. Export everything.
```

You're micromanaging. The AI knows how to write TypeScript. What it DOESN'T know is your specific codebase conventions, your existing patterns, and your constraints.

### ✅ Context-first prompting:
```
Here's my current centralized AI module (src/lib/gemini.ts):
[paste the file or let the AI read it]

I need to abstract this into a provider-agnostic layer that can 
switch between Gemini, Groq, and Ollama via an environment variable. 

Follow the same patterns you see in gemini.ts:
- Single source of truth for the model string
- Centralized client export
- Fail-fast with requireEnv() for missing keys

The three route files that import from this module are:
- src/app/api/chat/route.ts
- src/app/api/cvr/analyze/route.ts  
- src/app/api/registrar/credentials/route.ts
```

**Why this works:** You gave the AI:
- The existing code (so it matches your style)
- The goal (what you want)
- The constraints (follow existing patterns)
- The scope (which files are affected)

You did NOT give it:
- Step-by-step implementation instructions (it's smart enough)
- Variable names to use (it'll match your conventions)
- Every edge case to handle (it'll figure those out)

---

## Rule 3: The "Show Me First" Technique

Before letting the AI make changes to critical files, ask it to EXPLAIN what it would do first.

### The prompt:
```
Before making any changes, analyze src/app/registrar/users/page.tsx 
and tell me:
1. Which lines are blockchain-specific?
2. Which lines are reusable after the pivot?
3. What's your plan for removing the blockchain parts without 
   breaking the rest of the component?

Don't edit anything yet. Just show me the plan.
```

**Why this works:**
- You catch misunderstandings BEFORE they become wrong code
- The AI sometimes spots things you missed
- You can redirect before any damage is done
- It's free to ask — a bad edit costs time to revert

### When to use "Show Me First":
- Files over 200 lines
- Files with complex interleaved concerns (blockchain + non-blockchain)
- Files you're not intimately familiar with
- Any change you can't easily revert

### When to skip it and just let the AI edit:
- Small, isolated files
- Changes you fully understand
- Files where you've already mapped the blast radius
- Additions (new files) rather than modifications

---

## Rule 4: The Reference File Technique

When you want the AI to build something that matches your existing patterns, point it at a reference file.

### The prompt:
```
Create a new API route at src/app/api/employer/jobs/route.ts 
for job posting CRUD.

Use src/app/api/registrar/credentials/route.ts as a reference 
for the patterns:
- Same Supabase auth check pattern
- Same error handling structure  
- Same response format
- Same RBAC validation approach

The route should handle POST (create job) and GET (list jobs).
```

**Why this works:**
- The AI produces code that looks like YOUR code, not generic boilerplate
- Consistency across the codebase without writing a style guide
- The AI picks up subtle patterns (error message format, HTTP status codes, variable naming) that you'd forget to specify

> [!TIP]
> **The reference file technique is the single most effective prompt engineering pattern for codebases.** It replaces pages of instructions with "make it look like this."

---

## Rule 5: Scope Locks — Protecting What Shouldn't Change

When editing a large file, explicitly tell the AI what NOT to touch.

### The prompt:
```
In src/app/student/dashboard/page.tsx:

ONLY modify the wallet connection section (approximately lines 410-435).
Replace it with a profile completion card.

DO NOT modify:
- The credential cards section
- The skill analytics section  
- The sidebar or layout
- Any imports except removing ethers-related ones
- Any state variables except wallet-related ones

Show me the diff when done.
```

**Why "DO NOT" lists matter:**

AI models have a tendency to "improve" things they weren't asked to touch. They'll rename a variable because it's "more descriptive," refactor a function because it's "cleaner," or add error handling to an unrelated block because it's "safer." All well-intentioned. All unwanted.

The "DO NOT modify" list creates explicit guardrails.

---

## Rule 6: The Incremental Verification Loop

This is the most important workflow pattern. It turns a risky 30-file overhaul into 10 safe 3-file batches.

```
┌─────────────────────────────────────┐
│                                     │
│   Prompt AI (1-3 files)             │
│         │                           │
│         ▼                           │
│   Review the diff                   │
│         │                           │
│         ▼                           │
│   Run: npm run lint && next build   │
│         │                           │
│    ┌────┴────┐                      │
│    │         │                      │
│  Green?    Red?                     │
│    │         │                      │
│    ▼         ▼                      │
│  Commit   Fix with AI              │
│    │      (show it the error)       │
│    │         │                      │
│    ▼         ▼                      │
│  Next batch  Re-verify              │
│                                     │
└─────────────────────────────────────┘
```

### The fix prompt when build breaks:
```
The build is failing after your last change. Here's the error:

[paste the exact error message]

Fix only this error. Don't change anything else.
```

Short. Specific. The AI gets the exact error, fixes the exact thing, and doesn't wander off "improving" other code.

---

## Rule 7: The Conversation Awareness Strategy

AI assistants have limited context windows. In a long session, the AI starts "forgetting" what you did 30 messages ago. Here's how to manage that:

### Start each session with a briefing:
```
We're working on the VECTOR system pivot. Current status:

✅ DONE: AI provider abstraction (merged to main)
✅ DONE: Removed blockchain from student/dashboard 
🔄 IN PROGRESS: Removing blockchain from registrar/users/page.tsx
⬚ TODO: Remove blockchain from verify routes
⬚ TODO: Remove blockchain from CVR routes

The branch is feat/blockchain-extraction.
The extraction checklist is in [document path].

Today we're continuing with registrar/users/page.tsx.
```

**Why this works:** You're re-establishing context at the start of each session. The AI knows exactly where you left off, what's done, and what's next. No wasted time re-explaining the project.

### When context is getting long, start a new conversation:
```
Signs it's time to start fresh:
- The AI starts repeating suggestions you already rejected
- Edits start conflicting with changes made earlier in the session
- The AI "forgets" a file you edited 20 messages ago
- Responses get slower and less precise

When you start fresh, paste the briefing above. Clean slate, full context.
```

---

## Rule 8: The Prompt Templates

Here are copy-paste-ready templates for each type of task in the overhaul:

### Template: Surgical File Edit
```
In [FILE_PATH]:

Remove [SPECIFIC THING] from lines [APPROXIMATE RANGE].
Replace it with [WHAT YOU WANT INSTEAD].

Keep all other code exactly as-is.
DO NOT modify [THINGS TO PROTECT].

Run lint/build verification after.
```

### Template: New Feature (Walking Skeleton)
```
Create a minimal working version of [FEATURE NAME].

Reference file for patterns: [EXISTING_SIMILAR_FILE]

Requirements (skeleton only — no polish):
1. [Core requirement 1]
2. [Core requirement 2]
3. [Core requirement 3]

Skip for now:
- Error handling edge cases
- Loading states
- Responsive design
- Animations

I want to see it work end-to-end first.
```

### Template: Blast Radius Analysis
```
Before making any changes, analyze [FILE_PATH] and tell me:

1. Which parts are related to [THING BEING REMOVED]?
2. Which parts are independent and should be preserved?
3. What's your recommended approach for the extraction?
4. Are there any hidden dependencies I should know about?

Don't edit anything yet.
```

### Template: Debug a Build Failure
```
After [WHAT YOU JUST CHANGED], the build is failing:

[PASTE EXACT ERROR]

This error is in [FILE]. Fix only this specific error.
Don't refactor or improve anything else.
```

### Template: Provider/Dependency Swap
```
I need to replace [OLD DEPENDENCY] with [NEW DEPENDENCY] 
in [FILE_PATH].

Current usage of [OLD DEPENDENCY]:
[PASTE THE RELEVANT LINES]

The new version should:
- Keep the same function signatures
- Keep the same return types
- Follow the same error handling pattern
- Be a drop-in replacement

Other files that import from this module: [LIST THEM]
They should NOT need changes if you get the interface right.
```

---

## Rule 9: Anti-Patterns That Waste Your Time

### ❌ "Make it perfect"
```
Build a complete, production-ready employer dashboard with full CRUD, 
role-based access, real-time notifications, responsive design, 
accessibility, error boundaries, loading states, empty states, 
and comprehensive test coverage.
```
You'll get a 500-line response that looks impressive but has subtle bugs everywhere because the AI tried to juggle too many concerns at once.

### ❌ "Fix everything"
```
Here are 47 lint errors. Fix all of them.
```
The AI will fix 40 correctly and introduce 3 new bugs fixing the other 7. Better to batch them: "Fix the 8 `no-explicit-any` errors in these API routes. Don't touch the component files."

### ❌ Vague instructions
```
Make the dashboard better.
Clean up the code.
Improve the architecture.
```
"Better" according to whose standards? The AI will make changes that look "better" to it but might break your patterns, remove code you intended to keep, or restructure things in ways that conflict with your plans.

### ❌ Contradicting yourself
```
Remove all blockchain code... but keep the wallet display 
just in case... but also remove ethers... but we might need 
the contract ABI later...
```
Make a decision. The AI works best with clear direction. Ambiguity produces ambiguous code.

### ✅ The pattern that always works:
```
[CONTEXT: what exists now]
[GOAL: what I want after]
[SCOPE: exactly which files/lines]
[CONSTRAINTS: what to protect/avoid]
```

Four lines. That's it. Every good prompt follows this structure whether it's 2 sentences or 2 paragraphs.

---

## Rule 10: The Meta-Strategy — Your Role vs. The AI's Role

Think of it as a division of labor:

### You decide:
- **What** to build (architecture, features, priorities)
- **When** to build it (ordering, phases, what's next)
- **Whether** the output is correct (review every diff)
- **Where** it goes (which file, which function, which line)

### The AI does:
- **How** to implement it (syntax, patterns, boilerplate)
- **What** you might have missed (edge cases, imports, types)
- **The tedious parts** (repetitive edits across files, type definitions, test scaffolding)
- **Research** (API docs, library usage, error messages)

### The 80/20 Split:
```
YOUR time:    Deciding, reviewing, verifying, committing
AI's time:    Writing, refactoring, searching, explaining
```

You should be spending 80% of your time READING the AI's output and 20% of your time writing prompts. If that ratio flips — if you're spending more time writing elaborate prompts than reviewing output — your prompts are too complex. Break them down.

---

## Putting It All Together: A Day in the Overhaul

Here's what an actual productive day looks like:

```
9:00 AM — Session start briefing
  "We're on feat/blockchain-extraction. Yesterday we finished 
   dashboard. Today: registrar/users/page.tsx"

9:05 AM — Blast radius analysis
  "Analyze registrar/users/page.tsx. Show me what's blockchain vs. 
   what's reusable. Don't edit yet."

9:10 AM — Review plan, adjust if needed
  "Good analysis. But keep the revoke button — just change it 
   from on-chain burn to database status update."

9:15 AM — First surgical edit
  "Remove the ethers import and the contract interaction from 
   the handleRevoke function. Replace with a fetch to 
   /api/registrar/revoke-credential with just the credential ID."

9:20 AM — Review diff, run build. Green. Commit.

9:25 AM — Second edit, same file
  "Now remove the MetaMask chain ID check and the wallet_address 
   display. Replace wallet column in the user table with 
   verification status column."

9:30 AM — Review diff, run build. Green. Commit.

9:35 AM — Move to next file
  "Now let's do the server side. Open 
   api/registrar/revoke-credential/route.ts..."

...

5:00 PM — End of day
  8 files cleaned. All builds pass. All committed. 
  Update the changelog. Push the branch.
```

That's 30-40 surgical edits in a day, each verified independently. The codebase was never broken. Every commit is deployable. You made more progress than a week of "let me just refactor the whole thing."

---

## The Final Word

Vibe coding isn't about typing less. It's about **thinking more and typing smarter.**

The AI doesn't replace your engineering judgment — it amplifies it. You make the decisions. You catch the mistakes. You set the direction. The AI handles the boilerplate, the syntax, the tedious search-and-replace across 30 files.

The developers who get the most out of AI aren't the ones with the fanciest prompts. They're the ones who:

1. **Know what they want** before they ask for it
2. **Review everything** the AI produces
3. **Keep scope small** per request
4. **Verify constantly** (build, lint, test)
5. **Course-correct early** when something looks wrong

That's it. That's the whole secret.

Now go build something.
