## 🕌 Summary of Contribution

<!-- Briefly describe what this Pull Request adds, improves, or fixes in Quran Harness. -->

- **Type of Contribution:**
  - [ ] 🛠️ New Evidence-Governed Quran Capability (`packages/quran/tool-*`)
  - [ ] 📜 New or Updated Quran Skill (`packages/quran/skill-quran/assets/*`)
  - [ ] 🎨 UI / Islamic Theme / Governance Card Enhancement (`packages/quran/client-*`)
  - [ ] 📚 Documentation / Research Guide / Tests

---

## 🔐 Quran Harness Governance & Provenance Checklist

- [ ] **100% Isolated Layer:** Zero files modified in `packages/core`, `packages/client`, `packages/preset`, or `apps` (verified by Gate 1 in `phase5-release-verification.spec.ts`).
- [ ] **Portable Paths Only:** Uses relative paths (`./` or `../`) — no hardcoded absolute machine paths.
- [ ] **3-Layer Governance Wiring** *(for new tools/capabilities)*:
  - [ ] Wraps output in `createEnvelope` (`@deepseek-ai/dsh-quran-evidence`) with `SHA-256` `contentHash` and `appendAuditLog`.
  - [ ] Registered in `GovernanceCard.tsx` (`QURAN_GOVERNED_TOOLS`).
  - [ ] Mounted in `packages/quran/quran-bundle/cordis.patch.yml`.
- [ ] **Scholarly & Data Provenance:**
  - **Source Name & URL:** `<!-- e.g., Tanzil.net / Quran.com v4 / Quranic Arabic Corpus -->`
  - **Trust Tier:** `<!-- L1-official / L2-verified-open / L3-community -->`
  - **Riwaya (if applicable):** `<!-- Default: Hafs 'an 'Asim -->`
  - **Pinned `.sha256` Sidecar Included (if adding local data):** `<!-- Yes / N/A -->`

---

## 🧪 Verification & Test Results

- [ ] `pnpm exec vitest run packages/quran` passes locally with 0 failures.
- [ ] Added or updated unit tests in `packages/quran/<package>/tests/*.spec.ts`.
