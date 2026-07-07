/*
 * Claude Code OS — local operator server.
 *   npm install && npm start   →   http://localhost:8083
 *
 * Env:
 *   ANTHROPIC_API_KEY  enables real chat (otherwise chat runs in simulated mode)
 *   CLAUDE_HOME        override the data dir (default ~/.claude)
 *   PORT               override port (default 8083)
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const data = require('./lib/data');

const PORT = process.env.PORT || 8083;
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const GOALS_FILE = path.join(data.DATA_DIR, 'claude-code-os-goals.json');
const MINISTRY_FILE = path.join(data.DATA_DIR, 'claude-code-os-ministry.json');
const DREAMS_FILE = path.join(data.DATA_DIR, 'claude-code-os-dreams.json');

const readJSON = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
};
const writeJSON = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
};

const DEFAULT_MINISTRY = {
  core: { name: 'Claude Opus 4.8', provider: 'claude', api: 'claude-opus-4-8' },
  experts: [
    { name: 'GPT-5.5', provider: 'openai', api: null },
    { name: 'GLM-5.2', provider: 'glm', api: null },
    { name: 'DeepSeek V4 Pro', provider: 'deepseek', api: null },
  ],
  maxTokens: 4096,
};

async function callAnthropic(model, system, userText, maxTokens) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: userText }] }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  return (json.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
}

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/summary', (req, res) => {
  const summary = data.summarize();
  summary.chatLive = Boolean(API_KEY);
  res.json(summary);
});

app.get('/api/sessions', (req, res) => res.json(data.listSessions(20)));
app.get('/api/skills', (req, res) => res.json(data.listSkills()));
app.get('/api/activity', (req, res) => res.json(data.activityFeed()));
app.get('/api/graph', (req, res) => res.json(data.buildGraph()));

app.get('/api/session/:id', (req, res) => {
  const transcript = data.getSessionTranscript(req.params.id);
  if (!transcript) return res.status(404).json({ error: 'not found' });
  res.json(transcript);
});

app.get('/api/goals', (req, res) => {
  try { res.json(JSON.parse(fs.readFileSync(GOALS_FILE, 'utf8'))); }
  catch { res.json([]); }
});

app.post('/api/goals', (req, res) => {
  const goals = Array.isArray(req.body) ? req.body.slice(0, 50) : [];
  try {
    fs.mkdirSync(path.dirname(GOALS_FILE), { recursive: true });
    fs.writeFileSync(GOALS_FILE, JSON.stringify(goals, null, 2));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/* ----------------------------- ministry (MoE) ----------------------------- */

app.get('/api/ministry', (req, res) => res.json(readJSON(MINISTRY_FILE, DEFAULT_MINISTRY)));

app.post('/api/ministry', (req, res) => {
  const { core, experts, maxTokens } = req.body || {};
  if (!core || !Array.isArray(experts)) return res.status(400).json({ error: 'bad preset' });
  const preset = { core, experts: experts.slice(0, 3), maxTokens: Math.min(16384, Math.max(256, maxTokens | 0 || 4096)) };
  try { writeJSON(MINISTRY_FILE, preset); res.json({ ok: true, file: MINISTRY_FILE }); }
  catch (err) { res.status(500).json({ error: String(err) }); }
});

/*
 * Council run: each expert proposes in parallel, then the core aggregates.
 * Only Anthropic-backed seats can answer for real; other providers are
 * reported as unconnected rather than fabricating their output.
 */
app.post('/api/council', async (req, res) => {
  const { question = '' } = req.body || {};
  const preset = readJSON(MINISTRY_FILE, DEFAULT_MINISTRY);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  const send = (event, payload) => res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);

  const answers = [];
  const askExpert = async (expert) => {
    if (API_KEY && expert.api) {
      try {
        const text = await callAnthropic(expert.api,
          `You are ${expert.name}, one expert seat on a council. Give your single best answer, concisely. No preamble.`,
          question, Math.min(preset.maxTokens, 1024));
        return { name: expert.name, text, real: true };
      } catch (err) {
        return { name: expert.name, text: '⚠ ' + err.message, real: false };
      }
    }
    if (!API_KEY) {
      return { name: expert.name, text: `[simulated] ${expert.name} would propose an answer here. Set ANTHROPIC_API_KEY to make Anthropic seats real.`, real: false };
    }
    return { name: expert.name, text: `⚠ No connected provider for ${expert.name} in this build — seat an Anthropic model on this chair, or skip it. The core will decide from the seats that answered.`, real: false };
  };

  const results = await Promise.all(preset.experts.map(askExpert));
  for (const r of results) { answers.push(r); send('expert', r); }

  const usable = answers.filter((a) => a.real);
  if (API_KEY && preset.core.api) {
    try {
      const digest = (usable.length ? usable : answers)
        .map((a) => `--- ${a.name} proposed ---\n${a.text}`).join('\n\n');
      const verdict = await callAnthropic(preset.core.api,
        'You are the CORE ORCHESTRATOR of a council of expert models. Compare the expert proposals, weigh them, and write the single best final answer. Briefly note where experts agreed or diverged.',
        `QUESTION:\n${question}\n\nEXPERT PROPOSALS:\n${digest}`, preset.maxTokens);
      send('verdict', { name: preset.core.name, text: verdict });
    } catch (err) {
      send('error', { message: err.message });
    }
  } else {
    send('verdict', {
      name: preset.core.name,
      text: `[simulated verdict] With ANTHROPIC_API_KEY set, ${preset.core.name} reads every expert proposal above and writes the final, consensus-weighted answer here.`,
    });
  }
  send('done', {});
  res.end();
});

/* ------------------------------ dreams (L4) ------------------------------ */

async function runDream(trigger) {
  const summary = data.summarize();
  const goals = readJSON(GOALS_FILE, []);
  const activity = data.activityFeed().slice(0, 15);
  const openGoals = goals.filter((g) => !g.done).map((g) => '- ' + g.text).join('\n') || '- (no goals set)';
  const recentWork = activity.map((a) => `- [${a.type}] ${a.label} (${a.detail})`).join('\n');
  let body, model;

  if (API_KEY) {
    model = 'claude-fable-5';
    body = await callAnthropic(model,
      'You are Hermes, the operator\'s agent, running your nightly "dream" — an overnight review while the operator sleeps. Write a concise report in plain text with exactly these sections: WHAT I NOTICED, OPPORTUNITIES, TOMORROW\'S PLAN. Be specific and actionable, no fluff.',
      `Operator stats: ${summary.stats.sessions} sessions, ${summary.stats.messages} messages, last active ${new Date(summary.stats.lastActiveTs).toISOString()}.\n\nOpen goals:\n${openGoals}\n\nRecent activity:\n${recentWork}`,
      2048);
  } else {
    model = 'simulated';
    body = [
      'WHAT I NOTICED',
      `- ${summary.stats.sessions} sessions on disk, ${summary.stats.messages} messages total. Memory at ${summary.memory.percentFull}% of quota.`,
      `- Most recent work: ${activity[0] ? activity[0].label : '(none)'}.`,
      '',
      'OPPORTUNITIES',
      '- Set ANTHROPIC_API_KEY and this dream becomes a real overnight analysis of your goals, sessions and memory.',
      openGoals !== '- (no goals set)' ? '- Open goals detected — I would break these into next actions here.' : '- No goals set in Mission Control yet. Give me a mission, operator.',
      '',
      "TOMORROW'S PLAN",
      '- Review the knowledge graph Stale panel and refresh anything older than 30 days.',
      '- One focused session on the top open goal.',
    ].join('\n');
  }

  const dreams = readJSON(DREAMS_FILE, []);
  const dream = { ts: Date.now(), trigger, model, body };
  dreams.unshift(dream);
  writeJSON(DREAMS_FILE, dreams.slice(0, 30));
  return dream;
}

app.get('/api/dreams', (req, res) => res.json(readJSON(DREAMS_FILE, [])));

app.post('/api/dreams/run', async (req, res) => {
  try { res.json(await runDream('manual')); }
  catch (err) { res.status(500).json({ error: String(err && err.message || err) }); }
});

// Nightly scheduler: dream at ~03:00 local, at most once per 20h.
setInterval(() => {
  const hour = new Date().getHours();
  if (hour !== 3) return;
  const dreams = readJSON(DREAMS_FILE, []);
  if (dreams[0] && Date.now() - dreams[0].ts < 20 * 3600 * 1000) return;
  runDream('scheduled').catch((err) => console.error('dream failed:', err.message));
}, 30 * 60 * 1000);

/* ------------------------------- chat (SSE) ------------------------------- */

const EFFORT_TOKENS = { low: 1024, medium: 4096, high: 16384 };

const SYSTEM_PROMPT = [
  'You are Hermes, the operator\'s personal agent inside Claude Code OS — a local',
  'dashboard styled like a retro Greek terminal. Be direct, capable, and brief.',
  'You help the operator run their missions: research, content, finance, memory.',
].join(' ');

app.post('/api/chat', async (req, res) => {
  const { messages = [], model = 'claude-fable-5', effort = 'medium' } = req.body || {};
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const send = (event, payload) => res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);

  if (!API_KEY) {
    // Simulated mode — stream a canned Hermes response word by word.
    const last = messages.length ? String(messages[messages.length - 1].content || '') : '';
    const reply = [
      `Simulated mode — set ANTHROPIC_API_KEY to bring me fully online, operator.`,
      ``,
      `You said: "${last.slice(0, 140)}"`,
      ``,
      `When live, I answer with ${model} at ${effort} effort, with your memory core in context.`,
    ].join('\n');
    for (const word of reply.split(/(?<=\s)/)) {
      send('delta', { text: word });
      await new Promise((r) => setTimeout(r, 24));
    }
    send('done', { model: model + ' (simulated)' });
    return res.end();
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: EFFORT_TOKENS[effort] || 4096,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: messages.map((m) => ({ role: m.role, content: String(m.content || '') })).slice(-40),
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      send('error', { message: `API ${upstream.status}: ${detail.slice(0, 300)}` });
      return res.end();
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop();
      for (const chunk of chunks) {
        const dataLine = chunk.split('\n').find((l) => l.startsWith('data: '));
        if (!dataLine) continue;
        let event;
        try { event = JSON.parse(dataLine.slice(6)); } catch { continue; }
        if (event.type === 'content_block_delta' && event.delta && event.delta.text) {
          send('delta', { text: event.delta.text });
        } else if (event.type === 'error') {
          send('error', { message: event.error ? event.error.message : 'stream error' });
        }
      }
    }
    send('done', { model });
  } catch (err) {
    send('error', { message: String(err && err.message || err) });
  }
  res.end();
});

app.get(/.*/, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  const mode = API_KEY ? 'LIVE (ANTHROPIC_API_KEY set)' : 'SIMULATED (no ANTHROPIC_API_KEY)';
  console.log(`\n  ⁜ Claude Code OS · Operator`);
  console.log(`  ▸ http://localhost:${PORT}`);
  console.log(`  ▸ data dir: ${data.DATA_DIR}`);
  console.log(`  ▸ chat: ${mode}\n`);
});
