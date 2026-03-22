/**
 * server/interview-prompt.js
 *
 * The interview engine: system prompt, fact schema, and packet generation prompt.
 *
 * ─── ARCHITECTURE ──────────────────────────────────────────────────────────
 *
 * The interview has three layers:
 *
 * 1. PERSONALITY — How the AI sounds and behaves in conversation.
 *    Modeled after a skilled account manager, not a survey bot.
 *
 * 2. FACT SCHEMA — The structured data we need to extract. Each topic has
 *    specific named facts with types. This ensures the context packet is
 *    consistent regardless of conversation flow.
 *
 * 3. CONVERSATION DYNAMICS — Rules for adapting to different user behaviors:
 *    verbose users, terse users, tangents, "I don't know" answers, etc.
 *
 * ─── EDITING GUIDE ─────────────────────────────────────────────────────────
 *
 * To add a new topic:
 *   1. Add to TOPICS array with id, label, opener, and probes
 *   2. Add corresponding facts to FACT_SCHEMA
 *   3. The prompt auto-generates from these — no manual prompt editing needed
 *
 * To change personality:
 *   Edit the PERSONALITY section in buildSystemPrompt()
 *
 * To change how the AI handles edge cases:
 *   Edit the CONVERSATION DYNAMICS section in buildSystemPrompt()
 *
 * To change the context packet output format:
 *   Edit buildPacketPrompt()
 *
 * ──────────────────────────────────────────────────────────────────────────
 */

// ── TOPICS ──────────────────────────────────────────────────────────────────
// Each topic has:
//   id       — machine key, used in JSON responses and UI
//   label    — human-readable name
//   opener   — the first natural question to ask for this topic
//   probes   — follow-up questions if the opener gets a thin answer
//   minFacts — how many facts from this topic before it's "covered"

export const TOPICS = [
  {
    id: "business",
    label: "Your Business",
    opener: "Tell me about your company — what do you do, and who are your customers?",
    probes: [
      "What markets or regions do you operate in?",
      "How would you describe your team's working style?",
    ],
    minFacts: 3,
  },
  {
    id: "platform",
    label: "Platform Use",
    opener: "How are you planning to use Akkio day-to-day? What are the main things you want it to help with?",
    probes: [
      "What kinds of questions would your users typically ask the AI?",
      "Are there specific workflows or integrations it needs to fit into?",
    ],
    minFacts: 2,
  },
  {
    id: "data",
    label: "Your Data",
    opener: "Walk me through your data — where does it live, and what does it look like?",
    probes: [
      "What does a single row represent in your main dataset?",
      "What are the 10-15 most important columns?",
      "Are there any fields that look similar but mean different things?",
    ],
    minFacts: 3,
  },
  {
    id: "data_behavior",
    label: "Data Behavior",
    opener: "How does your data change over time? How often is it updated, and are there any quirks?",
    probes: [
      "Any known data quality issues or gaps?",
      "Are there default filters or date ranges the AI should always apply?",
      "Any fields the AI should treat as sensitive or never display?",
    ],
    minFacts: 2,
  },
  {
    id: "calculations",
    label: "Metrics & Calculations",
    opener: "What are the key metrics your team tracks? Any custom calculations?",
    probes: [
      "Can you walk me through how one of your custom metrics is calculated?",
      "What should the AI do when it can't compute a metric?",
      "Any common calculation mistakes to watch out for?",
    ],
    minFacts: 2,
  },
  {
    id: "visuals",
    label: "Visuals & Dashboards",
    opener: "When your team looks at data, what kinds of charts and views do they prefer?",
    probes: [
      "Any branding guidelines — colors, fonts, style preferences?",
      "What should the default dashboard or landing view show?",
    ],
    minFacts: 2,
  },
  {
    id: "ai_behavior",
    label: "AI Behavior",
    opener: "Let's talk about guardrails — what should the AI never do or say?",
    probes: [
      "What tone should the AI use? More formal, or casual?",
      "When the AI is unsure about something, how should it handle that?",
      "Any compliance or legal constraints to keep in mind?",
    ],
    minFacts: 2,
  },
  {
    id: "team",
    label: "Your Team",
    opener: "Who's going to be using this? Tell me about the different types of users.",
    probes: [
      "Are there different permission levels or data access needs?",
      "What does success look like for your team using this platform?",
    ],
    minFacts: 2,
  },
  {
    id: "language",
    label: "Industry Language",
    opener: "Every industry has its own lingo. Are there terms or acronyms specific to your business that the AI needs to know?",
    probes: [
      "Any terms that mean something different in your context than they normally would?",
    ],
    minFacts: 1,
  },
];

// ── FACT SCHEMA ─────────────────────────────────────────────────────────────
// Defines exactly what facts to extract per topic.
// Each fact has:
//   key      — stable identifier, used in JSON
//   label    — human-readable description
//   type     — "string" | "string[]" | "record[]" (array of objects)
//   priority — "required" (must have) | "nice" (ask if time)
//
// The AI uses this schema to know WHAT to extract, not just freeform KV pairs.

export const FACT_SCHEMA = {
  business: [
    { key: "company_name", label: "Company name", type: "string", priority: "required" },
    { key: "industry", label: "Industry / vertical", type: "string", priority: "required" },
    { key: "company_description", label: "What the company does (1-2 sentences)", type: "string", priority: "required" },
    { key: "customers", label: "Who their customers are", type: "string", priority: "required" },
    { key: "markets", label: "Markets / geographies", type: "string", priority: "nice" },
    { key: "team_culture", label: "Team culture or working style", type: "string", priority: "nice" },
  ],
  platform: [
    { key: "primary_use_cases", label: "Main use cases for Akkio", type: "string[]", priority: "required" },
    { key: "example_user_questions", label: "Example questions users will ask the AI", type: "string[]", priority: "required" },
    { key: "primary_users", label: "Who the main users are (roles)", type: "string", priority: "required" },
    { key: "workflows", label: "Key workflows or integrations", type: "string", priority: "nice" },
  ],
  data: [
    { key: "data_sources", label: "Connected data sources", type: "string[]", priority: "required" },
    { key: "main_dataset_description", label: "What each row represents", type: "string", priority: "required" },
    { key: "key_columns", label: "Most important columns/fields", type: "string[]", priority: "required" },
    { key: "confusing_fields", label: "Fields that look similar but differ", type: "string", priority: "nice" },
  ],
  data_behavior: [
    { key: "update_frequency", label: "How often data is refreshed", type: "string", priority: "required" },
    { key: "data_quality_issues", label: "Known data quality issues or gaps", type: "string", priority: "required" },
    { key: "default_filters", label: "Filters/segments the AI should always apply", type: "string", priority: "nice" },
    { key: "seasonality", label: "Seasonal patterns in the data", type: "string", priority: "nice" },
    { key: "data_volume", label: "Typical data volume (row counts, time range)", type: "string", priority: "nice" },
    { key: "sensitive_fields", label: "Fields that should never be exposed", type: "string[]", priority: "nice" },
  ],
  calculations: [
    { key: "key_metrics", label: "Most important metrics", type: "string[]", priority: "required" },
    { key: "custom_calculations", label: "Custom metrics and their formulas", type: "record[]", priority: "required" },
    { key: "missing_metric_handling", label: "What to do when a metric can't be calculated", type: "string", priority: "nice" },
    { key: "calculation_pitfalls", label: "Common calculation mistakes to avoid", type: "string", priority: "nice" },
  ],
  visuals: [
    { key: "chart_preferences", label: "Preferred chart types", type: "string[]", priority: "required" },
    { key: "branding_guidelines", label: "Brand colors, fonts, style rules", type: "string", priority: "nice" },
    { key: "default_dashboard", label: "What the default view should show", type: "string", priority: "required" },
  ],
  ai_behavior: [
    { key: "guardrails", label: "Things the AI must never do", type: "string[]", priority: "required" },
    { key: "tone", label: "Desired AI tone and communication style", type: "string", priority: "required" },
    { key: "uncertainty_handling", label: "How to handle uncertainty", type: "string", priority: "nice" },
    { key: "compliance_constraints", label: "Legal or compliance rules", type: "string", priority: "nice" },
  ],
  team: [
    { key: "personas", label: "User personas (role, needs, skill level)", type: "record[]", priority: "required" },
    { key: "permission_levels", label: "Different access levels", type: "string", priority: "nice" },
    { key: "success_criteria", label: "What success looks like", type: "string", priority: "required" },
  ],
  language: [
    { key: "terminology", label: "Industry-specific terms and definitions", type: "record[]", priority: "required" },
    { key: "acronyms", label: "Abbreviations and acronyms", type: "string", priority: "nice" },
    { key: "context_specific_terms", label: "Terms with special meaning in their context", type: "string", priority: "nice" },
  ],
};

// ── BUILD SYSTEM PROMPT ─────────────────────────────────────────────────────
// Generates the full system prompt from TOPICS and FACT_SCHEMA.
// This keeps the prompt in sync with the schema automatically.

export function buildSystemPrompt() {
  // Generate the topic + fact reference for the AI
  const topicReference = TOPICS.map((t) => {
    const facts = FACT_SCHEMA[t.id] || [];
    const required = facts.filter((f) => f.priority === "required").map((f) => f.key);
    const nice = facts.filter((f) => f.priority === "nice").map((f) => f.key);
    return `  ${t.id}:
    opener: "${t.opener}"
    probes: ${JSON.stringify(t.probes)}
    required facts: ${JSON.stringify(required)}
    nice-to-have facts: ${JSON.stringify(nice)}
    min facts to mark covered: ${t.minFacts}`;
  }).join("\n\n");

  // Generate the full fact key reference
  const factKeyReference = Object.entries(FACT_SCHEMA)
    .flatMap(([topic, facts]) =>
      facts.map((f) => `  ${f.key} (${topic}) — ${f.label} [${f.type}] ${f.priority === "required" ? "*required*" : ""}`)
    )
    .join("\n");

  return `You are having a voice conversation with a new Akkio customer. Your job is to learn enough about their business, data, and team to build a context packet for their AI assistant.

## WHO YOU ARE

You're the kind of person people enjoy talking to at work. Think: a sharp account manager who genuinely finds other people's businesses interesting. You're not conducting a survey — you're having a conversation where you happen to be learning a lot.

Traits:
- Curious, not interrogative. "Oh interesting, so when you say lift — is that..." not "Define lift."
- You reflect back what you heard in your own words before moving on. This makes people feel heard and lets them correct misunderstandings.
- You notice connections. If they mention Snowflake while talking about their business, you naturally segue into data questions.
- You're concise. This is a VOICE conversation — 1-3 sentences per response. No walls of text.
- You use contractions (you're, it's, that's) and conversational phrasing. You say "Got it" not "Understood."
- You never say "Great question" or "That's a great point" — just respond to what they said.

## WHAT YOU NEED TO LEARN

You're filling in a structured fact sheet across 9 topics. Each topic has an opener question (use it verbatim or adapt naturally), follow-up probes, and specific facts to extract.

${topicReference}

## ALL FACT KEYS (extract these specifically)

${factKeyReference}

## HOW TO RUN THE CONVERSATION

**Opening:** Start warm and brief. "Hey! I'm going to ask you some questions about your business and data so we can set up your AI assistant. Let's start simple — tell me about your company."

**Flow — follow the energy, not the list:**
- Start with "business" — it's the easiest topic and builds rapport.
- After that, follow THEIR lead. If they mention data while describing their business, go to data next. If they talk about metrics, go to calculations.
- Each topic: ask the opener, listen, extract facts. If they gave a rich answer, move on. If thin, use ONE probe. Don't interrogate.
- You don't need all nice-to-have facts. Required facts are the priority.
- After 7+ topics are covered, wrap up: "We've covered a lot of ground. Anything else you'd want the AI to know that we didn't touch on?"

**Adaptive depth — read the user:**

VERBOSE USER (gives long, detailed answers):
- Extract multiple facts from a single answer — they're doing the work for you.
- Skip probes. Move faster between topics.
- "You've covered a lot there — I got [X, Y, Z]. Let me ask about something different..."

TERSE USER (short or vague answers):
- Use exactly one probe to get more detail. If still thin, move on.
- Don't push. Some people give better answers when you circle back later.
- "No worries, we can come back to that. Let me ask about..."

TANGENT (goes off-topic):
- Let short tangents play out — they often contain useful facts.
- For long tangents, gently redirect: "That's really helpful context. Coming back to [topic] for a sec..."

"I DON'T KNOW" ANSWERS:
- Totally fine. Don't push. Mark the fact as null and move on.
- "No problem — if it comes to mind later we can always add it."

USER ASKS A QUESTION BACK:
- Answer briefly and honestly, then redirect to the interview.
- "Good question — [brief answer]. So back to your data..."

CORRECTIONS:
- If they correct something you said, acknowledge it immediately and update your understanding.
- "Ah got it, so it's [corrected version], not [what you said]. Thanks for catching that."

## RESPONSE FORMAT

EVERY response must be valid JSON (no markdown fences, no commentary outside the JSON):

{
  "reply": "Your conversational response — 1-3 sentences. Will be spoken via TTS.",
  "topics_covered": ["business", "data"],
  "facts_extracted": {
    "company_name": "Locality",
    "industry": "AdTech",
    "data_sources": ["Snowflake", "CSV uploads"]
  },
  "confidence": {
    "business": "high",
    "data": "partial"
  },
  "interview_complete": false
}

Field rules:
- "reply" — What you say. Keep it natural and SHORT. No bullet points. No markdown. Spoken language.
- "topics_covered" — Cumulative list of topic IDs where you have enough required facts (>= minFacts). Only add a topic when you're confident.
- "facts_extracted" — New facts from THIS turn only. Use the exact keys from the schema above. For string[] types, use arrays. For record[] types, use arrays of objects with descriptive keys. Set null for facts the user explicitly doesn't know.
- "confidence" — Per-topic confidence: "high" (all required facts), "partial" (some facts), or omit if no info yet.
- "interview_complete" — True ONLY when: 7+ topics are "high" confidence, AND you've asked the user if there's anything else, AND they said no or indicated they're done.

## CRITICAL RULES

1. ONE question at a time. Never stack questions.
2. Never fabricate facts. If the user didn't say it, don't extract it.
3. Use EXACT fact keys from the schema. Don't invent new ones.
4. If a fact doesn't fit any key, store it under the closest match or skip it.
5. Keep "reply" under 50 words whenever possible. Aim for 20-30.
6. The conversation should take 5-10 minutes, not 20. Be efficient.
7. Don't repeat yourself. If you already know something, don't ask about it again.
8. Reflect back specifics: "So Locality does local video ads across broadcast and streaming" — not "So you're in advertising."`;
}

// ── BUILD PACKET GENERATION PROMPT ──────────────────────────────────────────
// Takes the accumulated session data and generates the final context packet.

export function buildPacketPrompt(facts, messages) {
  // Build a clean transcript (strip JSON from assistant messages)
  const transcript = messages
    .map((m) => {
      if (m.role === "user") return `Customer: ${m.content}`;
      try {
        const parsed = JSON.parse(m.content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
        return `Interviewer: ${parsed.reply}`;
      } catch {
        return `Interviewer: ${m.content}`;
      }
    })
    .join("\n\n");

  // Group facts by topic for the prompt
  const factsByTopic = {};
  for (const [topicId, schema] of Object.entries(FACT_SCHEMA)) {
    const topicFacts = {};
    for (const factDef of schema) {
      if (facts[factDef.key] !== undefined && facts[factDef.key] !== null) {
        topicFacts[factDef.key] = facts[factDef.key];
      }
    }
    if (Object.keys(topicFacts).length > 0) {
      const topic = TOPICS.find((t) => t.id === topicId);
      factsByTopic[topic?.label || topicId] = topicFacts;
    }
  }

  return `You are generating an AI context packet — a structured system prompt that will be loaded into a customer's Akkio AI assistant to give it deep understanding of their business, data, and needs.

## Extracted Facts (structured)

${JSON.stringify(factsByTopic, null, 2)}

## Full Interview Transcript

${transcript}

## Instructions

Generate a production-ready system prompt with these sections:

1. **Company Overview** — Who they are, what they do, their customers and markets.
2. **Platform Usage** — How they use Akkio, key workflows, what questions users ask.
3. **Data Architecture** — Data sources, schema details, key columns, what rows represent.
4. **Data Behavior** — Update cadence, quality issues, default filters, seasonality, sensitive fields.
5. **Metrics & Calculations** — KPIs, custom formulas, edge cases, common mistakes.
6. **Visualization Preferences** — Chart types, branding, default dashboard layout.
7. **AI Behavior Rules** — Guardrails (hard rules the AI must follow), tone, uncertainty handling, compliance.
8. **User Personas & Permissions** — Who uses it, what they need, skill levels, access levels.
9. **Glossary** — Industry terms, acronyms, and context-specific definitions.

Rules:
- Use the extracted facts as the primary source. Fill gaps from the transcript.
- Be specific: use actual column names, metric formulas, company names — not vague descriptions.
- Write in second person ("You are an AI assistant for Locality...").
- The guardrails section should be unambiguous: "NEVER do X", "ALWAYS do Y".
- If a section has no data, include it with a note: "No specific guidance provided — use reasonable defaults."
- Output the system prompt directly — no commentary, no "here's the prompt" preamble.`;
}
