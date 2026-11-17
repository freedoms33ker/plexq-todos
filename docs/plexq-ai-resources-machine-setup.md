# Customizing plexq-ai-resources for Joshua's MacBook

Status: **plan only.** Nothing in `~/Repositories/plexq-ai-resources` has been changed. Each step
below says exactly what to change and why. They are ordered so the earlier steps unblock the later
ones.

Facts this plan is based on (from the local clone, last commit `14c2456`, 2026-09-11):

- The clone lives at `/Users/joshuawheeler/Repositories/plexq-ai-resources`.
- The repo assumes it lives at `$HOME/work/personal/plexq-ai-resources` — hard-coded in 8 places.
- Several settings and hooks carry Alex Turner's machine details (`/Users/aturner`, `~/bin/ai-log`,
  Homebrew notifier binaries, a Notion MCP requirement, Airtable tickets).
- `agents/omf` is a symlink to `/Users/alex.turner.ce/work/omf/...`, which does not exist on this Mac.

---

## Step 0 — Check prerequisites on the Mac

Run these in Terminal. Install whatever is missing before going further.

| Check               | Needed for                                              | Required                                                                                               |
| :------------------ | :------------------------------------------------------ | :----------------------------------------------------------------------------------------------------- |
| `node -v`           | `scripts/`, the TODO app                                | **v24 or later** (`engines.node >=24`)                                                                 |
| `pnpm -v`           | `scripts/`, the TODO app                                | **v11 or later** (`corepack enable && corepack prepare pnpm@latest --activate`, or `npm i -g pnpm@11`) |
| `python3 --version` | `bin/validate-acceptance-contract.py`, plan-access hook | 3.10+ (your Anaconda install is fine)                                                                  |
| `docker info`       | PostgreSQL 18 for the TODO app                          | Docker Desktop (or OrbStack) running                                                                   |
| `rg --version`      | every command in `claude/commands/` uses ripgrep        | `brew install ripgrep`                                                                                 |
| `claude --version`  | slash commands and hooks                                | Claude Code CLI                                                                                        |

## Step 1 — Fix the hard-coded repo path (one command, no file edits)

These files expect the repo at `$HOME/work/personal/plexq-ai-resources`:

| File                                                                    | What breaks without the fix                                      |
| :---------------------------------------------------------------------- | :--------------------------------------------------------------- |
| `bin/link-ai.sh` (line 3)                                               | Every link it creates in a project points at a missing directory |
| `bin/link-home.sh` (line 35, overridable with `AI_HOME=`)               | Refuses to run: `AI_HOME does not exist`                         |
| `claude/hooks/block-release-ready-without-acceptance-contract.sh`       | Hook errors on **every** Edit/Write/Bash call                    |
| `claude/hooks/circleci-watch.sh`, `claude/commands/monitor-circleci.md` | CircleCI watching fails                                          |
| `claude/commands/execute-feature.md`, `execute-remaining-features.md`   | Worktree setup calls a missing `link-ai.sh`                      |
| `codex/config.toml` (2 hooks)                                           | Codex hooks fail                                                 |

**Recommended:** add a symlink at the expected location instead of editing 8 files. Your clone stays
identical to upstream, so `git pull` never conflicts.

```bash
mkdir -p /Users/joshuawheeler/work/personal
ln -s /Users/joshuawheeler/Repositories/plexq-ai-resources /Users/joshuawheeler/work/personal/plexq-ai-resources
ls /Users/joshuawheeler/work/personal/plexq-ai-resources/bin/link-ai.sh   # should print the path
```

_Alternative (only if you fork the repo):_ replace every `$HOME/work/personal/plexq-ai-resources`
with `${AI_HOME:-$HOME/Repositories/plexq-ai-resources}` in the files above and export
`AI_HOME=/Users/joshuawheeler/Repositories/plexq-ai-resources` in `~/.zshrc`.

## Step 2 — Write your own user-level `~/.claude/CLAUDE.md` (do not use Alex's as-is)

`bin/link-home.sh` copies `home/CLAUDE.md` into `~/.claude/CLAUDE.md` only when you don't already
have one. Alex's copy contains instructions that will misfire for you:

| Line in `home/CLAUDE.md`                                                               | Problem for you                                      | Change                                  |
| :------------------------------------------------------------------------------------- | :--------------------------------------------------- | :-------------------------------------- |
| "Ensure the Notion MCP is connected … do NOT do anything with planning if unavailable" | You don't plan in Notion; Claude will refuse to plan | **Delete**                              |
| "Terminal uses light text on a dark background"                                        | Only true if your terminal is dark                   | Keep or delete to match your terminal   |
| "All sub-agents used for research should use Sonnet 4"                                 | Outdated model name                                  | Delete, or name the model you want      |
| `/Users/alexturner/Library/...` example paths                                          | Wrong user                                           | Replace with `/Users/joshuawheeler/...` |
| Git staging exclusions, never change branches, repo-root check, `.claude/cache/`       | Generic and useful                                   | **Keep**                                |

Recommended: run `bin/link-home.sh --dry-run` first. If it reports `[done] CLAUDE.md -> copying`,
let it seed the file, then edit `~/.claude/CLAUDE.md` with the changes above. If it reports `[DRIFT]`,
you already have a `~/.claude/CLAUDE.md`; merge the "Keep" sections into it by hand.

## Step 3 — Fix the settings permission lists

Two settings files carry Alex's paths. `link-home.sh` seeds `home/settings.json` into
`~/.claude/settings.json`; `link-ai.sh` copies `claude/settings.local.json` into each project's
`.claude/settings.local.json`. Edit the copies (the real files they create), not the repo.

| Entry                                                                                   | File                          | Change                                                                    |
| :-------------------------------------------------------------------------------------- | :---------------------------- | :------------------------------------------------------------------------ |
| `"Bash(/Users/aturner/bin/ai-log:*)"`, `"Bash(ai-log:*)"`, `"Bash($HOME/bin/ai-log:*)"` | both                          | **Delete** — `ai-log` is Alex's private script, not in the repo           |
| `"additionalDirectories": ["/Users/aturner"]`                                           | `~/.claude/settings.json`     | Change to `["/Users/joshuawheeler/Repositories"]`                         |
| `"Edit(~/work/**)"`                                                                     | project `settings.local.json` | Change to `"Edit(~/Repositories/**)"` so edits in your repos don't prompt |
| `"Bash(bq:*)"`, `"Bash(duti:*)"`                                                        | both                          | Delete unless you use BigQuery / duti                                     |
| `"mcp__claude_ai_Linear__*"`, `"mcp__claude_ai_Notion__*"`                              | both                          | Harmless; delete if you don't use them                                    |
| `"model": "sonnet"`                                                                     | `~/.claude/settings.json`     | Set to the model you want by default, or delete                           |
| `"CLAUDE_AFK_TIMEOUT_MS"`                                                               | project `settings.local.json` | Keep (prevents idle timeouts)                                             |

Then fold the project defaults into your user settings once:
`bin/link-home.sh --merge-settings` (requires Step 0's Node 24 + pnpm 11; it runs
`pnpm exec tsx src/merge-settings.ts` inside `scripts/`, so run `pnpm install` in `scripts/` first).

## Step 4 — Decide which hooks to keep

`link-home.sh` symlinks **all** of `claude/hooks/*` into `~/.claude/hooks/`, but only the ones named
in `settings.json` actually run.

| Hook                                                                   | Registered by default?                                  | Keep?                                                                                      |
| :--------------------------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------------------------------------------- |
| `block-foreign-plan-access.sh`                                         | Yes                                                     | **Keep** — stops two sessions editing one plan                                             |
| `block-release-ready-without-acceptance-contract.sh`                   | Yes                                                     | **Keep** — needs Step 1                                                                    |
| `block-git-push-main.sh`, `block-git-concurrent-state.py`              | Yes (user `settings.json`)                              | **Keep**                                                                                   |
| `circleci-watch.sh`                                                    | Yes (project `settings.local.json`, PostToolUse, async) | Delete its entry from each project's `.claude/settings.local.json` unless you use CircleCI |
| `notify-on-stop.sh`, `notify-on-prompt.sh`                             | No                                                      | Optional. Needs `brew install terminal-notifier` (hard-coded to `/opt/homebrew/bin`)       |
| `alerter-tool-approval.sh`                                             | No                                                      | Optional. Needs `alerter` at `/opt/homebrew/bin/alerter`                                   |
| `log-ai-activity.sh`                                                   | No                                                      | **Don't enable** — calls Alex's missing `~/bin/ai-log`                                     |
| `say-question.sh`, `context-usage-monitor.sh`, `halt-on-compaction.sh` | No                                                      | Optional                                                                                   |

## Step 5 — Remove Alex-specific workflow assumptions from commands

These are behaviors, not paths. Override them in each project's `CLAUDE.md` (keeps the repo clean)
or edit `claude/commands/*.md` in a fork.

| Command / guidance                 | Assumption                                                               | Override                                                                                                                              |
| :--------------------------------- | :----------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| `/commit`                          | Every commit references an **Airtable** Story/Task ticket                | Add to project `CLAUDE.md`: "Commits reference the plan slug in `.agents/plans/` instead of a PM ticket; there is no Airtable."       |
| `/plan-feature`, `/plan-story`     | Also write the PM ticket to Airtable/Linear (`planning-artifacts.md` §6) | Same note: "No PM tool. Plan files are the only record; leave `ticket-id`, `pm-tool`, `pm-record` empty."                             |
| `/prime`, `/plan-story`            | Speak with macOS `say` when done                                         | Works on your Mac; delete the step if you find it annoying                                                                            |
| `agents/frameworks/react/react.md` | Default admin login `admin@fifthdimensionengineering.com`                | Use your own domain if you add auth                                                                                                   |
| `agents/omf`                       | Symlink to Alex's private OMF overrides                                  | `link-ai.sh` will create a dead `.agents/omf` link in each project. Harmless; delete it from a project's `.agents/` if it bothers you |

## Step 6 — Link the TODO app and verify

```bash
cd /Users/joshuawheeler/Repositories/todo-app
/Users/joshuawheeler/work/personal/plexq-ai-resources/bin/link-ai.sh
ls -la .claude/commands | head      # symlinks into plexq-ai-resources
ls -la .agents                      # general.md, guidance/, languages/ ... plus plans/ (a real dir)
git status --short                  # .claude/ and linked .agents/* must NOT appear; .agents/plans/ may
claude                              # then run: /prime
```

`link-ai.sh` exits non-zero and prints `[ERROR] … is a symlink` if `.agents`, `.agents/plans`,
`.claude`, or `CLAUDE.md` were created as links instead of real files/dirs — that's its self-check.

## Optional — Cursor and Codex

- **Cursor:** `bin/link-agents-to-cursor.sh` links `agents/` into Cursor's rules folder. No changes
  needed after Step 1.
- **Codex:** `link-ai.sh` links `codex/config.toml` into `.codex/`. Works after Step 1; Codex only
  loads project hooks after you trust the project when prompted.
