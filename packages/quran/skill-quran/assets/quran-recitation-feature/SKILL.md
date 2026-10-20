---
name: quran-recitation-feature
description: بناء ميزة تلاوة وتزمين وتجويد · Build Quran audio playback, millisecond ayah timing synchronization, algorithmic Tajweed highlighting, and phonetic transcription.
---

# بناء ميزة تلاوة وتزمين وتجويد · Recitation, Timing & Tajweed Feature

Use this skill when building Quran audio players, verse-synchronized highlighting, Tajweed color-coding, or phonetic recitation guides.

## 1. Per-Ayah Audio & Millisecond Timing

1. **Verified Audio Links (`quran_get_audio`)**:
   - Never construct unverified audio URLs by hand without probing. Use `quran_get_audio` (which runs a live HTTP `HEAD` availability probe and records `httpStatus` inside the `EvidenceEnvelope`) or `sdk.getAyahTiming(surah, ayah)`.
2. **Husary Murattal Timing Synchronization (`quran_get_ayah_timing` / `sdk.getAyahTiming`)**:
   - Returns `{ startMs, endMs, durationMs }` from the SHA-256 pinned EveryAyah Husary timing artifact alongside the matching `Husary_128kbps` MP3 URL.
   - **Documented Intro-Segment Convention**: In 113 surahs (all except Surah 1), the raw EveryAyah timing file carries a leading Basmalah/Isti'adha segment that is stripped so `ayahEndMs[0]` corresponds to Ayah 1. Surface this transform from `evidence.transforms` in your developer documentation.

## 2. Algorithmic Tajweed & Phonetics (No Unverified ML)

1. **Character-Level Tajweed (`quran_analyze_tajweed`)**:
   - Uses deterministic algorithmic rules (`tajweed-embeddings` 2.0.0) over the pinned Uthmani text — never hallucinate Tajweed rules from memory.
   - Map each returned character annotation (`hamzat_wasl`, `lam_shamsiyyah`, `madd_2`, `madd_246`, `ghunnah`, `qalqalah`, `ikhfaa`, `idgham_*`, `iqlab`) to accessible color tokens in the UI.
2. **Phonetic Transcription (`quran_phonetize`)**:
   - Uses `quran-transcript` over the pinned Uthmani verse text to produce deterministic Hafs phonetic script showing elongation (مدود), nasalization (غنة), assimilation (إدغام), and echoing (قلقلة).
3. **Cloud ASR / Recitation Correction**:
   - Per project policy (Decision #5), never download heavy acoustic models (`quran-muaalem`, `whisper`) locally; integrate cloud endpoints only when the user supplies API credentials, and tag experimental model outputs as `L4-experimental`.
