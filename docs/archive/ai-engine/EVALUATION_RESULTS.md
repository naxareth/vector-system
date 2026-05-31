# 📊 VECTOR AI Engine: Evaluation Results

This document presents the quantitative evaluation of the **VECTOR** AI engine (powered by Gemini 1.5 Flash) for skill extraction and career analytics.

---

## 🔬 Evaluation Methodology

- **Metric:** F1-Score (The harmonic mean of Precision and Recall).
- **Matching Mode:** **Soft Match** (Allowing for synonyms or partial matches, e.g., "Fullstack Developer" matching "Full-Stack Web Dev").
- **Dataset:** A dedicated "Golden Dataset" of 20 manually curated real-world resumes and academic transcripts.
- **Hardware:** Evaluated on the Google Gemini 1.5 Flash API via Vertex AI.

---

## 📈 Performance Summary

| Metric | Score | Target |
| --- | --- | --- |
| **Precision** | **0.91** | > 0.85 |
| **Recall** | **0.83** | > 0.80 |
| **F1 Score** | **0.87** | > 0.83 |

---

## 📋 Results Table

| Case ID | Input Summary | Expected Skills | Precision | Recall | F1 | Status |
| --- | --- | --- | --- | --- | --- | --- |
| C-01 | Web Dev Junior | React, CSS, Node | 1.00 | 1.00 | 1.00 | ✅ PASS |
| C-02 | Data Scientist | Python, Pandas, SQL | 0.92 | 0.85 | 0.88 | ✅ PASS |
| C-03 | IT Support Agent | Networking, Windows | 0.88 | 0.76 | 0.81 | ✅ PASS |
| C-04 | Java Developer | Spring, Hibernate | 0.95 | 0.90 | 0.92 | ✅ PASS |
| C-05 | UI/UX Designer | Figma, Adobe XD | 0.89 | 0.82 | 0.85 | ✅ PASS |
| ... | *Total of 20 cases* | ... | ... | ... | ... | ... |

---

## 🛡️ Reliability & Ethics Note

- **Fixed Validation Set:** The golden dataset used in this evaluation was separated from the training/prompt-tuning set. This ensures that the results represent actual generalized performance on unseen data.
- **Bias Mitigation:** The dataset was balanced across gender and regional educational backgrounds to minimize extraction bias.
- **Data Confidentiality:** All personal identifiable information (PII) was scrubbed from the resumes before being processed by the Gemini engine in accordance with academic privacy standards.

---

**Last Benchmarked:** 2026-03-18
**Evaluation Status:** ✅ DEFENSE READY

---

© 2026 VECTOR AI Team
