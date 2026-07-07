# ⁜ Claude Code OS — Operator

A local "agentic OS" dashboard for your Claude Code agents, styled as a retro
Greek terminal. Home console with a live Hermes-Agent chat, session stats,
Mission Control goals, and a force-directed memory knowledge graph.

![Hermes-Agent](https://img.shields.io/badge/HERMES--AGENT-ONLINE-f0b23e?style=flat-square)

## Quick start

```bash
cd claude-code-os
npm install
npm start           # → http://localhost:8083
```

That's it. With no configuration it boots in **demo mode** with a realistic
simulated dataset, so the whole UI works out of the box.

## Going live

| Env var | Effect |
| --- | --- |
| `ANTHROPIC_API_KEY` | Chat, council, dreams and automations run on real Claude (streaming, with prompt caching on the system prompt). |
| `OPENROUTER_API_KEY` | Routes GPT-5.5 / GLM-5.2 / DeepSeek (and the non-Anthropic Ministry seats) through OpenRouter — one endpoint for every provider. |
| `OBSIDIAN_VAULT` | Path to your Obsidian vault. Its markdown notes are indexed into the Documents page. |
| `CLAUDE_HOME` | Data directory to read (default `~/.claude`). Sessions, skills, and memory found here replace the demo data automatically. |
| `PORT` | Server port (default `8083`, same as the original). |

```bash
ANTHROPIC_API_KEY=sk-ant-... OPENROUTER_API_KEY=sk-or-... OBSIDIAN_VAULT=~/vault npm start
```

## The 5 levels of the Agentic OS

| Level | Concept | Where it lives |
| --- | --- | --- |
| 1 | **Strongest model as the brain** | Chat defaults to `claude-fable-5`; the Ministry core seat is the orchestrator that decides and finalizes. |
| 2 | **One shared memory** | The Memory / Knowledge Graph pages index every session, file, decision and skill into one core graph read from `~/.claude`. |
| 3 | **Ministry of Experts (MoE)** | Click an agent in the sidebar → Ministry of Experts. Build a council (core + 3 experts) from the ranked bench, save the preset, then toggle **⚖ Ministry** in chat: experts propose in parallel, the core writes the verdict. |
| 4 | **AI dreams while you sleep** | The Dreams page. A scheduler runs nightly at 03:00 (while the server is up) and Hermes writes an overnight report — noticed / opportunities / tomorrow's plan — from your goals, sessions and memory. `RUN DREAM NOW` triggers one on demand. |
| 5 | **Voice everywhere** | 🎙 VOICE dictates into the chat (Web Speech API), 🔊 SPEAK reads Hermes' replies aloud. |

Honesty note: a seat only answers for real when a key can reach it (Anthropic
seats via `ANTHROPIC_API_KEY`, everything else via `OPENROUTER_API_KEY`).
Unreachable seats are reported as "not connected" instead of fabricating output.

## Full component map

| Component | Where |
| --- | --- |
| Model Selector | Chat pill — Anthropic models, OpenRouter models, and `⚖ ministry of agents` as a selectable "model" |
| Ministry of Agents | `#/ministry` (click an agent in the sidebar) + ⚖ toggle in chat |
| Unified Memory | Memory / Knowledge Graph pages, fed by sessions + files + decisions + skills |
| Obsidian | Documents page (`OBSIDIAN_VAULT`), searchable with inline preview |
| Skills + ROI | Skills page — runs, hours saved, and $ ROI at your hourly rate |
| Dreaming | Dreams page, nightly at 03:00 + run-now |
| Automations | Automations page — schedule any prompt at any hour, run-now, delete |
| AI Spend | Spend page — per-day chart, per-model table, token totals, return-on-spend |
| Chat Logs | Chat Logs page — searchable local history with transcript preview |
| Voice | Floating mic widget: "open memory", "run a dream", "show spend", or any question (falls through to Hermes chat); 🔊 SPEAK reads replies |
| Integrations | Integrations page — live status of every connection |
| Onboarding | First-boot wizard: name, hourly rate, focus → personalizes ROI and the operator chip |
| Prompt caching | `cache_control: ephemeral` on stable system prompts for Anthropic calls |

## What reads what

- **Sessions / messages / models / last-active** — parsed from
  `~/.claude/projects/*/*.jsonl` transcripts.
- **Skills page** — `~/.claude/skills/*/SKILL.md` (name + frontmatter description).
- **Knowledge graph** — built from sessions (blue), workspaces (white), files
  touched by tools (amber), memory decisions from `CLAUDE.md` bullets (purple),
  and skills (pink), all orbiting the green Memory Core. Layout modes:
  MACRO / MID / MICRO / FULL, plus Pause, Flow pulses, LITE/FULL render
  quality, and a LINKS density slider. Drag to pan, scroll to zoom.
- **Mission Control goals** — persisted to `claude-code-os-goals.json` in the
  data dir.
- **Agents** — sidebar switches between HERMES-AGENT (gold) and OPENCLAW (red).

## Stack

Node 18+ / Express, vanilla JS, one canvas, zero build step. All artwork is
inline SVG — no external assets, works fully offline.
