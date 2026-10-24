# 🕌 Contributing to Quran Harness

Thank you for your interest in contributing to **Quran Harness**! Because Quran Harness deals with sacred Quranic text, scholarly sources, and deterministic cryptographic provenance, every contribution must strictly adhere to our **Four Iron Governance Gates** and **100% Isolated Layer Architecture**.

---

## 1. Iron Architectural & Governance Rules

Before opening a Pull Request, make sure your contribution satisfies every rule below:

1. **100% Upstream Core Isolation (`0` Core Files Modified):**
   - All changes must live inside `packages/quran/*`, `docs/*`, `scripts/*`, or `.devcontainer/*`.
   - **Never** modify any file in `packages/core`, `packages/client`, `packages/preset`, or `apps`. Gate 1 of our CI suite (`phase5-release-verification.spec.ts`) automatically fails any PR that touches those directories.
2. **Mandatory 3-Layer Governance Pipeline for New Capabilities:**
   - Every Quranic tool (`packages/quran/tool-*`) **must** wrap its output in a cryptographic `EvidenceEnvelope` (`createEnvelope` from `@deepseek-ai/dsh-quran-evidence`) with a `SHA-256` `contentHash`, an explicit `SourceDescriptor` (`id`, `name`, `url`, `trust`, `riwaya`), and an append-only audit entry (`appendAuditLog`).
   - Every tool **must** be registered in the browser `GovernanceCard` allow-list (`packages/quran/client-governance-card/src/client/GovernanceCard.tsx`).
   - Every tool **must** be mounted in `packages/quran/quran-bundle/cordis.patch.yml` using a portable relative path (`../tool-<slug>/lib/index.js`).
3. **Authoritative Source Provenance (`L1` / `L2`):**
   - **Quranic Text:** Must never be generated or altered by an LLM. The canonical default riwaya is **Hafs 'an 'Asim (`حفص عن عاصم`)** pinned via `quran-uthmani.txt` (`L1-official`).
   - **Local Datasets:** Any new local dataset placed in `packages/quran/quran-data/data/` must include a companion `.sha256` sidecar file and be verified via `verifyIntegrity` before every read.
   - **Tafsir, Translations & Sciences:** Must always cite a named scholarly edition or corpus (`L1-official` or `L2-verified-open`). Never emit unattributed commentary or autonomous fatwas.

---

## 2. Scaffolding a New Governed Capability (Recommended Workflow)

Use the built-in generator so all three governance layers (`EvidenceEnvelope` + `GovernanceCard` + `cordis.patch.yml`) and the Vitest test suite are wired automatically:

```bash
pnpm run quran:create-capability \
  --slug asbab-nuzul \
  --tool quran_get_asbab_nuzul \
  --title "Asbab al-Nuzul (Wahidi)" \
  --description "Retrieves verified Asbab al-Nuzul reports with chain of transmission and source attribution." \
  --source-id wahidi-asbab \
  --source-name "Al-Wahidi — Asbab al-Nuzul" \
  --source-url "https://altafsir.com" \
  --trust L2-verified-open
```

Then implement your domain logic inside `packages/quran/tool-<slug>/src/index.ts` and add thorough unit tests inside `packages/quran/tool-<slug>/tests/<slug>.spec.ts`.

---

## 3. Running Verification Checks Before Submitting a PR

Every Pull Request is automatically tested by **Quran Harness CI**. Run these commands locally before pushing:

```bash
# 1. Build the Quran UI & Host bundles
pnpm --filter @deepseek-ai/dsh-client-ui-quran-theme --filter @deepseek-ai/dsh-client-ui-quran-governance run bundle

# 2. Run the complete Quran Harness test suite (must pass 100%)
pnpm exec vitest run packages/quran

# 3. Verify Phase 5 Release & Red-Team Governance Gates specifically
pnpm exec vitest run packages/quran/quran-bundle/tests/phase5-release-verification.spec.ts
```

---

## 4. Pull Request Process

1. **Fork** the repository and create a descriptive feature branch (e.g., `feat/tool-quran-asbab-nuzul` or `docs/improve-riwayat-examples`).
2. Complete all items in the **Pull Request Checklist** (`.github/pull_request_template.md`).
3. Ensure **Quran Harness CI (`95+ Deterministic Tests`)** passes with a green checkmark ✅.
4. A maintainer will review the scholarly provenance, cryptographic governance wiring, and test coverage before merging into `main`.
