# 🧠 VECTOR AI Career Engine: Design & Decision Logic

The **VECTOR** AI engine is the "Brain" of the platform, responsible for transforming raw institutional data and student achievements into actionable career insights.

---

## 🏗️ Decision Pipeline Flowchart

```text
[ Resume / Credential Input ]
      │ (Raw Text / PDF Data)
      ▼
[ Gemini Skill Extraction ]
      │ (Google Gemini 1.5 Flash - NLP Parsing)
      ▼
[ Skill Health Scoring ]
      │ (Skill Velocity Model - Decay Forecaster)
      ▼
[ Course Recommender ] 
      │ (Collaborative Filtering / Cosine Similarity)
      ▼
[ Student Dashboard Output ]
      │ (Visual Analytics & Verified Paths)
```

---

## 📈 3-Signal Velocity Model

The core predictive logic uses a weighted linear regression model to calculate a **Skill Health Score**. This score helps students understand if their skills are trending upward in the job market or becoming obsolete.

### Signal Breakdown:
1.  **Slope (40%):** The rate of change in job postings for this skill over the last 12 months.
2.  **Volume (30%):** The absolute number of job postings currently active.
3.  **Recency (30%):** How recently the skill appeared in high-paying job categories.

### 🔢 Worked Numeric Example (Skill: "React.js")
- **Slope:** +1.2 (Score 85/100) -> `85 * 0.40 = 34.0`
- **Volume:** 15,000 postings (Score 90/100) -> `90 * 0.30 = 27.0`
- **Recency:** Featured in 95% of new jobs (Score 95/100) -> `95 * 0.30 = 28.5`

**Final Health Score:** `34.0 + 27.0 + 28.5 = 89.5 (High Health)`

---

## 🔍 Interpretability & Explainability

We follow a "Glass Box" AI approach. Every recommendation provided by the system includes a justification so the student understands *why* a course was suggested.

### Recommendation Schema:
The system outputs a `CourseRecommendation` object with two critical fields for interpretability:
- **`reason`:** A human-readable string (e.g., *"Your 'Cloud Computing' skill has a high decay rate. This AWS course will update your certification."*)
- **`reasonType`:** A classification category used for filtering (e.g., `DECAY_MITIGATION`, `SKILL_EXPANSION`, or `PEER_PATH`).

---

## 🛡️ Validation & Reliability
- **NLP Engine:** Powered by Google Gemini 1.5 Flash for context-aware extraction.
- **Fail-safe:** If the AI confidence score falls below 0.70, the system flags the extraction for manual registrar review.

---

© 2026 VECTOR AI Team
