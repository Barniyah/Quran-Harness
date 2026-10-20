---
name: quran-compare-riwayat
description: مقارنة الروايات وتحويل عدّ الآيات · Compare structural differences and convert verse coordinates across the 8 canonical Quranic riwayat from verified data.
---

# مقارنة الروايات وتحويل عدّ الآيات · Riwayat Comparison & Coordinate Conversion

Use this skill when comparing ayah counts, page/juz positioning, or converting verse references across the eight canonical riwayat supported by `quran-meta`:
`Hafs`, `Warsh`, `Qalun`, `Shuba`, `Douri`, `Sousi`, `Bazzi`, `Qunbul`.

## 1. Core Rules for Multi-Riwaya Work

1. **Declare the Active Riwaya**:
   - The default riwaya of Quran Harness is **Hafs 'an 'Asim (حفص عن عاصم — 6,236 verses)**. Always state this explicitly when comparing with other riwayat.
2. **Never Assume Identical Verse Numbering**:
   - Different riwayat divide verses differently (for example, Kufan numbering in Hafs counts `1:1` as the Basmalah in Al-Fatihah and `2:1` `الم` as a separate verse, whereas Medinan/Warsh numbering differs, making **Hafs `2:255` (Ayat al-Kursi) = Warsh `2:253`**).
   - Always call `quran_convert_ayah` (or `sdk.convertAyah(surah, ayah, from, to)`) before looking up or equating verse numbers across riwayat.
3. **Structural Comparison via Data (`quran_compare_riwayat`)**:
   - Call `quran_compare_riwayat` (or `sdk.compareRiwayat(surah, ayah)`) to obtain the exact total verse count (`6236`, `6214`, `6217`, `6221`, etc.), surah verse count, `globalAyahId`, `page`, and `juz` across all 8 riwayat, along with `differFromHafs`.
   - Present the comparison table with its `EvidenceEnvelope` (`quran-meta-riwayat`, `L2-verified-open`).
