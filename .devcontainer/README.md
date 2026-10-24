# 🕌 Quran Harness in GitHub Codespaces

1. **Wait for the one-time setup** (first creation only, several minutes): dependencies, build, and the Python `.venv`.
2. **The Web GUI starts automatically** in the terminal. When the line with the URL appears, **Ctrl+Click** it.
   - The URL contains a one-time launch token — do not share it.
   - The forwarded port `3080` is **private** by default (only you, signed in to GitHub, can open it).
3. **First launch:** enter your **DeepSeek API key** or **sign in / create a DSH account** when prompted.
   - Optional: add `DEEPSEEK_API_KEY` as a [Codespaces secret](https://github.com/settings/codespaces) to skip this step.
4. **Settings → Agent Presets:** make sure **Quran Harness** (`quran`) is selected as the default for new tasks.
5. **Settings → Models:** choose any LLM model/provider you prefer.

Restart the GUI at any time:

```bash
bash .devcontainer/start-quran-harness.sh
```

Run the test suite:

```bash
pnpm exec vitest run packages/quran
```

> Codespaces stops automatically after 30 minutes of inactivity. Stop or delete it from <https://github.com/codespaces> to save your free monthly hours.
