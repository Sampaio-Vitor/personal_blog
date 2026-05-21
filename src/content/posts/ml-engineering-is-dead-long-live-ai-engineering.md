---
title: ML engineering is dead, long live AI engineering
date: 2026-05-21
tags: [machine-learning, ai, careers]
description: Four months of scraped international AI/ML job postings, and what I noticed in the data.
---

For the last four months I've had a small service running on my VPS that scrapes international ML and AI job postings from LinkedIn. It classifies them, dumps them in SQLite, and pings me on Telegram three times a day with the ones that match what I'd actually apply to.

Repo: [jobposting_AI](https://github.com/Sampaio-Vitor/jobposting_AI).

I built it because LinkedIn sucks ass and I can't stand that for more than a few minutes a week. After a while the database got big enough that I figured I (an agent) would take a look at it. I exported it, ran it through a few analysis agents on DeepSeek V4 Pro, and asked for a summary of what's in there.

---

After filtering down to jobs flagged as relevant and open to international candidates, I had 1,055 postings. I also dropped the obvious body shops and reposting farms (EPAM subsidiaries, Joveo duplicates, BairesDev, etc.). That left 798.

---

## Titles

| Role | Count | Share |
| :--- | ---: | ---: |
| AI Engineer | 417 | 52% |
| Data Scientist | 182 | 23% |
| ML Engineer | 98 | 12% |
| MLOps | 67 | 8% |
| Other (CV, LLM Eng, misc) | 34 | 4% |

About half the postings say AI Engineer. Only 12% say ML Engineer. Reading through the descriptions, the actual work doesn't look that different from what an ML Engineer post would have asked for two years ago: Python, deployment, pipelines, cloud, owning something in production. The title is what changed -- the hype changed too. 

---

## Seniority. Juniors are cooked on the international market

| Level | Count | Share |
| :--- | ---: | ---: |
| Senior | 476 | 60% |
| Mid | 158 | 20% |
| Lead | 141 | 18% |
| Junior | 22 | 3% |

22 junior roles out of 798. Most postings cluster around 5 years of experience.

---

## Keywords

I had the agents pull keywords from the summaries. I could have done it with classical NLP. Whatever Deepseek is cheap.

| Term | % of postings |
| :--- | ---: |
| Python | 58% |
| LLM / LLMs | 27% |
| RAG | 19% |
| agentic workflows | 16% |
| MLOps | 15% |
| LangChain | 11% |
| PyTorch | 11% |
| TensorFlow | 11% |
| AWS | 10% |
| vector databases | 9% |
| prompt engineering | 6% |

PyTorch, TensorFlow, Scikit-learn and the rest of the classical stack are still there, just not on top. The frequent terms are LLMs, RAG, LangChain, vector DBs, agents, and AWS.


---

## What I took from this

The "AI Engineer" posts are mostly asking for what ML Engineers have always done, Python, deployment, pipelines, monitoring, with an LLM somewhere in the middle and RAG/agents in the description. The label moved faster than the work did. Hype is real

If you're an ML engineer looking for international roles, the small concrete thing I'd change is the headline on the resume. "AI Engineer" or "AI/ML Engineer" matches what recruiters are typing into the search box. Keep the Python and the production ML experience, add whatever LLM/RAG work you've done, and be specific about it.

That's it. If I run this again in a few months I'll post an update.
