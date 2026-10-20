---
name: quran-verified-research
description: إعداد بحث قرآني موثق بالأدلة · Conduct rigorous, evidence-governed Quranic research across search, morphology, thematic topics, named Tafsir, and translations.
---

# إعداد بحث قرآني موثق بالأدلة · Evidence-Governed Quranic Research

Use this skill when assisting researchers or scholars with thematic studies, linguistic/morphological analysis, comparative Tafsir, or multi-translation inquiries.

## 1. Research Methodology & Provenance Discipline

1. **Discovery vs. Citation**:
   - Use `quran_search` (default `skeleton` mode matches modern Arabic spelling against the pinned Tanzil Imla'ei corpus while returning untouched Uthmani text) and `quran_search_topics` (pinned Quranpedia 6,100-topic catalog) to discover relevant verses.
   - Before quoting any verse as a primary citation in the research output, call `quran_get_verse` so the verse undergoes mandatory two-source cross-verification (Tanzil × Quran.com API v4).
2. **Morphological & Root Grounding (`quran_get_ayah_morphology`)**:
   - Extract exact word segments, POS tags (`N`, `V`, `P`, `PN`), trilateral/quadrilateral roots (`ROOT`), and lemmas (`LEM`) from the pinned Quranic Arabic Corpus v0.4 (`130k+` segments). Never guess an Arabic root without checking the morphology artifact.
3. **Named Tafsir & Translation Attribution (`quran_get_tafsir`, `quran_get_translation`)**:
   - Always cite the exact Tafsir edition (`ar-tafsir-ibn-kathir`, `ar-tafsir-al-tabari`, `ar-tafsir-al-qurtubi`, `ar-tafsir-al-muyassar`, `en-tafisr-ibn-kathir`) or translator (`Abdel Haleem`, `Saheeh International`, etc.).
   - **No Autonomous Fatwa**: Never derive independent legal rulings (فتوى) or personal theological opinions. Present what the named scholarly sources state and defer legal judgments to qualified scholars.

## 2. Structured Research Output Template

Every research report must conclude with an **Evidence Ledger (سجل الأدلة)** table listing:
- Verse / Resource Reference (`surah:ayah` or edition ID)
- Primary Source & Trust Level (`L1-official`, `L2-verified-open`, `L3-community`)
- SHA-256 Content Digest (`contentHash` prefix)
- Cross-Verification Verdict (`MATCH` / `N/A`)
