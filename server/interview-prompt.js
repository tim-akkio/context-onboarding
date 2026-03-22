/**
 * server/interview-prompt.js
 *
 * TWO INTERVIEW TRACKS — designed for different people in the same organization.
 *
 * ─── EXECUTIVE INTERVIEW ("executive") ──────────────────────────────────────
 * Target: VP/Director/C-level — someone who owns the business outcome.
 * Focuses on: business context, strategy, success criteria, user needs, guardrails.
 * Personality: Peer-level strategic partner. Talks about outcomes, not implementation.
 * Duration: ~5 minutes.
 *
 * ─── TECHNICAL INTERVIEW ("technical") ──────────────────────────────────────
 * Target: Data analyst/engineer/ops — someone who knows the data intimately.
 * Focuses on: schemas, columns, joins, calculations, data quality, edge cases.
 * Personality: Fellow technical person. Gets specific fast. Speaks their language.
 * Duration: ~7 minutes.
 *
 * ─── HOW THEY COMBINE ──────────────────────────────────────────────────────
 * Both interviews produce facts using the SAME key namespace. When merged:
 * - Executive provides the WHY (business context, strategy, guardrails)
 * - Technical provides the HOW (schemas, formulas, data quirks)
 * - Overlapping facts get merged (technical wins for data-specific, exec wins for strategy)
 * - The combined facts feed into a single context packet via buildPacketPrompt()
 *
 * ─── EDITING GUIDE ─────────────────────────────────────────────────────────
 *
 * Each interview track has its own:
 *   TOPICS_<TRACK>   — topic definitions with openers and probes
 *   FACTS_<TRACK>    — fact schema (subset of the full schema)
 *   build<Track>SystemPrompt() — generates the system prompt
 *
 * The combined fact schema (ALL_FACT_KEYS) is the union of both tracks.
 * buildPacketPrompt() works with facts from either or both interviews.
 *
 * To add a fact: add it to the relevant track's FACTS_* object.
 * To add a topic: add it to the relevant track's TOPICS_* array.
 * To change personality: edit the WHO YOU ARE section in the relevant builder.
 *
 * ──────────────────────────────────────────────────────────────────────────
 */

// ═══════════════════════════════════════════════════════════════════════════
//  EXECUTIVE INTERVIEW
// ═══════════════════════════════════════════════════════════════════════════

export const TOPICS_EXECUTIVE = [
  {
    id: "business",
    label: "Your Business",
    opener: "Give me the elevator pitch — what does your company do, and who do you serve?",
    probes: [
      "What markets or regions are you focused on?",
      "What sets you apart from competitors in this space?",
    ],
    minFacts: 3,
  },
  {
    id: "strategy",
    label: "Strategy & Goals",
    opener: "What's driving the decision to bring Akkio in now? What problem are you solving?",
    probes: [
      "What does success look like 6 months from now?",
      "Are there specific pain points with how your team handles data today?",
    ],
    minFacts: 2,
  },
  {
    id: "users",
    label: "Users & Workflows",
    opener: "Who on your team is going to be using this day-to-day, and what will they be doing with it?",
    probes: [
      "Walk me through a typical workflow — someone has a question, then what?",
      "Are there different types of users with different needs?",
    ],
    minFacts: 2,
  },
  {
    id: "questions",
    label: "Key Questions",
    opener: "If you could have the AI answer 5 questions for your team right now, what would they be?",
    probes: [
      "Are there questions your team asks repeatedly that take too long to answer today?",
      "What about questions for external stakeholders — clients, partners?",
    ],
    minFacts: 2,
  },
  {
    id: "guardrails",
    label: "Guardrails & Tone",
    opener: "Let's talk about boundaries — what should the AI absolutely never do or say?",
    probes: [
      "What tone do you want? More buttoned-up, or more conversational?",
      "Any compliance or legal lines it needs to stay inside?",
      "Are there things one team should see that another shouldn't?",
    ],
    minFacts: 2,
  },
  {
    id: "success",
    label: "Success & Outcomes",
    opener: "When this is working well, what changes for your team? What gets easier?",
    probes: [
      "How would you measure whether this deployment was a success?",
      "Is there a specific deliverable or workflow you want to replace or speed up?",
    ],
    minFacts: 2,
  },
  {
    id: "language_exec",
    label: "Your Language",
    opener: "Every business has its own vocabulary. What terms or phrases should the AI understand the way your team uses them?",
    probes: [
      "Any acronyms that are second nature to your team but wouldn't be obvious to an outsider?",
    ],
    minFacts: 1,
  },
];

export const FACTS_EXECUTIVE = {
  business: [
    { key: "company_name", label: "Company name", type: "string", priority: "required" },
    { key: "industry", label: "Industry / vertical", type: "string", priority: "required" },
    { key: "company_description", label: "What the company does", type: "string", priority: "required" },
    { key: "customers", label: "Who their customers are", type: "string", priority: "required" },
    { key: "markets", label: "Markets / geographies", type: "string", priority: "nice" },
    { key: "competitive_position", label: "What differentiates them", type: "string", priority: "nice" },
    { key: "team_culture", label: "Team culture or working style", type: "string", priority: "nice" },
  ],
  strategy: [
    { key: "deployment_driver", label: "Why they're deploying Akkio now", type: "string", priority: "required" },
    { key: "current_pain_points", label: "Pain points with current data workflows", type: "string[]", priority: "required" },
    { key: "six_month_goals", label: "What success looks like in 6 months", type: "string", priority: "nice" },
  ],
  users: [
    { key: "primary_users", label: "Main user roles", type: "string", priority: "required" },
    { key: "personas", label: "User personas (role, needs, skill level)", type: "record[]", priority: "required" },
    { key: "typical_workflow", label: "Typical user workflow today", type: "string", priority: "nice" },
    { key: "permission_levels", label: "Different access levels needed", type: "string", priority: "nice" },
  ],
  questions: [
    { key: "example_user_questions", label: "Top questions users will ask the AI", type: "string[]", priority: "required" },
    { key: "primary_use_cases", label: "Main use cases", type: "string[]", priority: "required" },
    { key: "external_stakeholder_needs", label: "What external stakeholders need", type: "string", priority: "nice" },
  ],
  guardrails: [
    { key: "guardrails", label: "Things the AI must never do", type: "string[]", priority: "required" },
    { key: "tone", label: "Desired AI tone", type: "string", priority: "required" },
    { key: "compliance_constraints", label: "Legal or compliance rules", type: "string", priority: "nice" },
    { key: "data_visibility_rules", label: "What different teams can/can't see", type: "string", priority: "nice" },
  ],
  success: [
    { key: "success_criteria", label: "How they'll measure success", type: "string", priority: "required" },
    { key: "workflows_to_replace", label: "Specific workflows to speed up or replace", type: "string[]", priority: "required" },
    { key: "time_savings_target", label: "Expected time savings", type: "string", priority: "nice" },
  ],
  language_exec: [
    { key: "terminology", label: "Industry terms and definitions", type: "record[]", priority: "required" },
    { key: "acronyms", label: "Acronyms the team uses", type: "string", priority: "nice" },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
//  TECHNICAL INTERVIEW
// ═══════════════════════════════════════════════════════════════════════════

export const TOPICS_TECHNICAL = [
  {
    id: "data_sources",
    label: "Data Sources",
    opener: "Let's start with your data stack — what systems and databases are connected, and how does data flow in?",
    probes: [
      "Is it a single database or multiple sources that need joining?",
      "How does data get from the source system into what Akkio will query?",
    ],
    minFacts: 2,
  },
  {
    id: "schema",
    label: "Schema & Structure",
    opener: "Walk me through the main tables — what does each one represent, and what's the grain?",
    probes: [
      "What are the primary keys and foreign keys that connect tables?",
      "What are the 10-15 most important columns across your datasets?",
      "Are there any fields that look similar but mean different things?",
    ],
    minFacts: 3,
  },
  {
    id: "data_quality",
    label: "Data Quality & Behavior",
    opener: "Every dataset has its quirks. What are the gotchas someone querying your data needs to know?",
    probes: [
      "How often is data refreshed, and when should someone expect fresh data?",
      "Any known gaps — columns with nulls, tables with incomplete historical data?",
      "Are there rows that should always be filtered out — test data, internal records?",
    ],
    minFacts: 3,
  },
  {
    id: "metrics",
    label: "Metrics & Calculations",
    opener: "What are the key metrics, and how are they actually calculated? Walk me through the formulas.",
    probes: [
      "Any metrics that seem straightforward but have a tricky calculation?",
      "Are there metrics that require data from multiple tables to compute?",
      "What are the most common mistakes someone makes when calculating these?",
    ],
    minFacts: 3,
  },
  {
    id: "query_patterns",
    label: "Query Patterns",
    opener: "When your team queries this data, what are the most common patterns? Any must-use filters or joins?",
    probes: [
      "Are there joins that are always needed — like a reference table for codes or names?",
      "What date ranges or segments should queries default to?",
      "Any performance considerations — tables that are huge, queries that need to be scoped carefully?",
    ],
    minFacts: 2,
  },
  {
    id: "edge_cases",
    label: "Edge Cases & Pitfalls",
    opener: "If a new analyst joined your team tomorrow and started querying, what mistakes would they make in the first week?",
    probes: [
      "Any columns where the name is misleading?",
      "Time zone issues, date format gotchas, null handling rules?",
      "Are there scenarios where the data looks right but the answer is wrong?",
    ],
    minFacts: 2,
  },
  {
    id: "sensitive_data",
    label: "Sensitive Data",
    opener: "Are there fields or tables that should be off-limits or handled carefully?",
    probes: [
      "Anything that should never show up in a report or be shared externally?",
      "PII, cost data, internal identifiers — what needs special treatment?",
    ],
    minFacts: 1,
  },
  {
    id: "visuals",
    label: "Dashboards & Visuals",
    opener: "When your team visualizes this data, what chart types and layouts work best?",
    probes: [
      "What should the default dashboard view show?",
      "Any branding or style rules for charts?",
    ],
    minFacts: 1,
  },
  {
    id: "language_tech",
    label: "Technical Terminology",
    opener: "Any field names, internal terms, or abbreviations that aren't obvious from the column names alone?",
    probes: [
      "Are there codes or enums in the data that need a lookup to understand?",
    ],
    minFacts: 1,
  },
];

export const FACTS_TECHNICAL = {
  data_sources: [
    { key: "data_sources", label: "Connected data sources / databases", type: "string[]", priority: "required" },
    { key: "data_pipeline", label: "How data flows from source to queryable state", type: "string", priority: "required" },
    { key: "source_system_count", label: "Single DB vs. multi-source", type: "string", priority: "nice" },
  ],
  schema: [
    { key: "main_dataset_description", label: "What each row represents (grain)", type: "string", priority: "required" },
    { key: "table_descriptions", label: "Description of each key table", type: "record[]", priority: "required" },
    { key: "key_columns", label: "Most important columns across datasets", type: "string[]", priority: "required" },
    { key: "primary_foreign_keys", label: "Primary and foreign key relationships", type: "record[]", priority: "required" },
    { key: "confusing_fields", label: "Fields that look similar but differ", type: "string", priority: "nice" },
  ],
  data_quality: [
    { key: "update_frequency", label: "Data refresh cadence and timing", type: "string", priority: "required" },
    { key: "data_quality_issues", label: "Known quality issues, nulls, gaps", type: "string", priority: "required" },
    { key: "default_filters", label: "Rows/records that should always be filtered out", type: "string", priority: "required" },
    { key: "historical_coverage", label: "How far back data goes and any gaps", type: "string", priority: "nice" },
  ],
  metrics: [
    { key: "key_metrics", label: "Most important metrics", type: "string[]", priority: "required" },
    { key: "custom_calculations", label: "Custom metrics with exact formulas", type: "record[]", priority: "required" },
    { key: "multi_table_metrics", label: "Metrics requiring cross-table joins", type: "record[]", priority: "nice" },
    { key: "calculation_pitfalls", label: "Common calculation mistakes", type: "string", priority: "required" },
    { key: "missing_metric_handling", label: "What to do when a metric can't be computed", type: "string", priority: "nice" },
  ],
  query_patterns: [
    { key: "common_joins", label: "Joins that are almost always needed", type: "record[]", priority: "required" },
    { key: "default_date_range", label: "Default date range or time scoping", type: "string", priority: "required" },
    { key: "performance_considerations", label: "Large tables, query scoping rules", type: "string", priority: "nice" },
    { key: "data_volume", label: "Typical row counts and data volume", type: "string", priority: "nice" },
  ],
  edge_cases: [
    { key: "new_analyst_mistakes", label: "Common mistakes a new person would make", type: "string[]", priority: "required" },
    { key: "misleading_columns", label: "Columns where the name is misleading", type: "string", priority: "nice" },
    { key: "timezone_date_gotchas", label: "Time zone, date format, or null handling rules", type: "string", priority: "nice" },
    { key: "false_positive_scenarios", label: "When data looks right but answer is wrong", type: "string", priority: "nice" },
    { key: "seasonality", label: "Seasonal patterns affecting queries", type: "string", priority: "nice" },
  ],
  sensitive_data: [
    { key: "sensitive_fields", label: "Fields that should never be exposed", type: "string[]", priority: "required" },
    { key: "pii_fields", label: "PII or personally identifiable fields", type: "string[]", priority: "nice" },
    { key: "internal_only_data", label: "Data that's internal-only (not for client reports)", type: "string", priority: "nice" },
  ],
  visuals: [
    { key: "chart_preferences", label: "Preferred chart types", type: "string[]", priority: "required" },
    { key: "default_dashboard", label: "What the default dashboard should show", type: "string", priority: "nice" },
    { key: "branding_guidelines", label: "Brand colors, fonts, style", type: "string", priority: "nice" },
  ],
  language_tech: [
    { key: "column_name_glossary", label: "Non-obvious column name meanings", type: "record[]", priority: "required" },
    { key: "enum_lookups", label: "Codes/enums that need decoding", type: "record[]", priority: "nice" },
    { key: "context_specific_terms", label: "Terms with special meaning in their data", type: "string", priority: "nice" },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
//  COMBINED FACT SCHEMA (union of both tracks)
// ═══════════════════════════════════════════════════════════════════════════

// Merges both schemas into one flat lookup for packet generation.
// If a key appears in both tracks, the definitions are compatible (same key = same meaning).
export const ALL_FACT_KEYS = {};
for (const schema of [FACTS_EXECUTIVE, FACTS_TECHNICAL]) {
  for (const [, facts] of Object.entries(schema)) {
    for (const fact of facts) {
      ALL_FACT_KEYS[fact.key] = fact;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  SHARED PROMPT BUILDER HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function buildTopicReference(topics, factSchema) {
  return topics.map((t) => {
    const facts = factSchema[t.id] || [];
    const required = facts.filter((f) => f.priority === "required").map((f) => f.key);
    const nice = facts.filter((f) => f.priority === "nice").map((f) => f.key);
    return `  ${t.id}:
    opener: "${t.opener}"
    probes: ${JSON.stringify(t.probes)}
    required facts: ${JSON.stringify(required)}
    nice-to-have facts: ${JSON.stringify(nice)}
    min facts to mark covered: ${t.minFacts}`;
  }).join("\n\n");
}

function buildFactKeyReference(factSchema) {
  return Object.entries(factSchema)
    .flatMap(([topic, facts]) =>
      facts.map((f) => `  ${f.key} (${topic}) — ${f.label} [${f.type}] ${f.priority === "required" ? "*required*" : ""}`)
    )
    .join("\n");
}

// Shared response format and conversation dynamics (used by both interviews)
const RESPONSE_FORMAT = `## RESPONSE FORMAT

EVERY response must be valid JSON (no markdown fences, no commentary outside the JSON):

{
  "reply": "Your conversational response — 1-3 sentences. Will be spoken via TTS.",
  "topics_covered": ["business", "data_sources"],
  "facts_extracted": {
    "company_name": "Locality",
    "data_sources": ["Snowflake"]
  },
  "confidence": {
    "business": "high",
    "data_sources": "partial"
  },
  "interview_complete": false
}

Field rules:
- "reply" — What you say. Keep it natural and SHORT. No bullet points. No markdown. Spoken language.
- "topics_covered" — Cumulative list of topic IDs where you have enough required facts (>= minFacts). Only add a topic when you're confident.
- "facts_extracted" — New facts from THIS turn only. Use the exact keys from the schema above. For string[] types, use arrays. For record[] types, use arrays of objects with descriptive keys. Set null for facts the user explicitly doesn't know.
- "confidence" — Per-topic confidence: "high" (all required facts), "partial" (some facts), or omit if no info yet.
- "interview_complete" — True ONLY when: 5+ topics are "high" confidence, AND you've asked the user if there's anything else, AND they said no or indicated they're done.`;

const CONVERSATION_DYNAMICS = `**Adaptive depth — read the user:**

VERBOSE USER (gives long, detailed answers):
- Extract multiple facts from a single answer — they're doing the work for you.
- Skip probes. Move faster between topics.
- "You've covered a lot there — I picked up [X, Y, Z]. Let me ask about something different..."

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
- "Good question — [brief answer]. So back to the data..."

CORRECTIONS:
- If they correct something you said, acknowledge it immediately.
- "Ah got it, so it's [corrected version], not [what I said]. Thanks for catching that."`;

const CRITICAL_RULES = `## CRITICAL RULES

1. ONE question at a time. Never stack questions.
2. Never fabricate facts. If the user didn't say it, don't extract it.
3. Use EXACT fact keys from the schema. Don't invent new ones.
4. If a fact doesn't fit any key, store it under the closest match or skip it.
5. Keep "reply" under 50 words whenever possible. Aim for 20-30.
6. Don't repeat yourself. If you already know something, don't ask about it again.
7. Reflect back specifics — not "So you're in advertising" but "So Locality does local video ads across broadcast and streaming."`;

// ═══════════════════════════════════════════════════════════════════════════
//  EXECUTIVE SYSTEM PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════════

export function buildExecutiveSystemPrompt() {
  const topicRef = buildTopicReference(TOPICS_EXECUTIVE, FACTS_EXECUTIVE);
  const factRef = buildFactKeyReference(FACTS_EXECUTIVE);

  return `You are having a voice conversation with a senior leader at a company that's deploying Akkio. Your job is to understand their business, their team, their goals, and how they want the AI to behave — the strategic context that shapes everything.

## WHO YOU ARE

You're a peer. Think: a sharp solutions architect who's sat across from dozens of VPs and understands their world. You don't talk about schemas or column names — you talk about outcomes, users, and business logic.

Traits:
- Executive-friendly language. "What's driving the timeline?" not "What are your requirements?"
- You're efficient with their time. Senior people are busy. Get to the point.
- You connect what they say to concrete outcomes. "So the goal is getting campaign reports from hours to minutes."
- You use their framing. If they say "lift analysis," you say "lift analysis" — not "incremental measurement."
- You're concise. 1-3 sentences max. Respect their time.
- Never say "Great question" or "That's really helpful." Just respond.
- You never ask about technical details (column names, SQL, data types). That's the other interview.

## WHAT YOU NEED TO LEARN

You're gathering the BUSINESS CONTEXT — the strategic layer that tells the AI WHO it's serving, WHY, and WHAT THE RULES ARE.

${topicRef}

## ALL FACT KEYS (extract these specifically)

${factRef}

## HOW TO RUN THE CONVERSATION

**Opening — set the stage warmly:**

Your FIRST message should be a welcome that does three things: (1) makes them feel comfortable, (2) tells them what you're after, and (3) sets expectations for time and tone. Say something like:

"Hey, welcome! So here's what we're doing — I'm going to ask you a few questions about your business, your team, and how you want your AI assistant to work. This is the big-picture stuff. Think of it like you're explaining your business to a really smart new hire over coffee. I'm not going to ask you about databases or column names — we've got a separate conversation for the data folks. This should take about 5 minutes. There are no wrong answers, and if you don't know something, totally fine, we'll skip it. Ready? Let's start simple — tell me about your company."

Key points about the opening:
- It should feel like a person, not a script. Vary the exact words, but hit those three beats.
- Explicitly say this is about the BUSINESS side, not the technical side. They'll relax knowing they won't be asked about schemas.
- "No wrong answers" and "we'll skip it" lowers the stakes immediately.
- End with the first real question so they can jump right in.

**Flow — follow the energy, not the list:**
- Start with "business" — it's natural and low friction.
- After that, follow THEIR lead. If they start talking about team structure, go to users. If they mention problems, go to strategy.
- The interview should feel like a strategic conversation, not a checklist.
- After 5+ topics are covered, wrap up: "That gives me a really solid picture. Anything else you'd want the AI to understand about your business that we didn't cover?"

**Duration:** This should take about 5 minutes. These are big-picture questions — don't drill into details. If they start going deep on data specifics, acknowledge it and let them know their data team will cover that: "That's really useful — your data team will walk us through the details on that side."

${CONVERSATION_DYNAMICS}

${RESPONSE_FORMAT}

${CRITICAL_RULES}

8. This is a BUSINESS conversation. If they volunteer technical details, extract them, but NEVER ask about column names, table structures, SQL, or data types. That's the technical interview.
9. The interview should take ~5 minutes. 7 topics, big-picture answers. Move briskly.`;
}

// ═══════════════════════════════════════════════════════════════════════════
//  TECHNICAL SYSTEM PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════════

export function buildTechnicalSystemPrompt() {
  const topicRef = buildTopicReference(TOPICS_TECHNICAL, FACTS_TECHNICAL);
  const factRef = buildFactKeyReference(FACTS_TECHNICAL);

  return `You are having a voice conversation with a technical person — a data analyst, data engineer, or someone who works directly with the data every day. Your job is to learn the specifics: schemas, columns, calculations, joins, edge cases, and all the data quirks that make the difference between a correct query and a wrong one.

## WHO YOU ARE

You're a fellow data person. Think: a senior analytics engineer who's onboarding onto their data — you need to know enough to write correct queries by the end of this conversation.

Traits:
- Technical and precise. You say "grain" not "what a row represents." You say "foreign key" not "how tables connect."
- You get specific fast. "So impressions is AKKIO_ID by campaign by timestamp — is that one row per impression event, or is it pre-aggregated?"
- You ask clarifying questions a good analyst would ask. "When you say frequency, is that per household or per campaign?"
- You validate your understanding by restating it precisely. "So the join is impressions.DMA_CODE to dma_ref.DMA_CODE, many-to-one."
- You're concise. 1-3 sentences. Technical people don't need hand-holding.
- You never say "Great question" or "That's helpful." Just respond and ask the next thing.
- You never ask about business strategy, org structure, or goals. That's the other interview.

## WHAT YOU NEED TO LEARN

You're building the DATA LAYER — the technical context that tells the AI HOW to query, calculate, and avoid mistakes.

${topicRef}

## ALL FACT KEYS (extract these specifically)

${factRef}

## HOW TO RUN THE CONVERSATION

**Opening — set the stage warmly:**

Your FIRST message should be a welcome that does three things: (1) makes them feel comfortable, (2) tells them exactly what kind of information you need, and (3) frames why the specifics matter. Say something like:

"Hey! Thanks for doing this. So here's what I'm after — I need to understand your data well enough that the AI can write correct queries on its own. That means I'm going to ask about your tables, columns, how things join together, how metrics are calculated, and the gotchas that trip people up. Basically, imagine you're onboarding a new analyst onto your data — that's the level of detail I need. This should take about 7 minutes. If I ask something you're not sure about, just say so, no worries. And don't worry about being too technical — the more specific, the better. Column names, formula details, edge cases — I want all of it. Let's dive in — what's your data stack? Where does the data live and how does it get there?"

Key points about the opening:
- Technical people appreciate knowing what you need and WHY. "So the AI can write correct queries" is the why.
- "Imagine onboarding a new analyst" gives them a mental model for the right level of detail.
- "Don't worry about being too technical" is permission to be precise — technical people often hold back thinking they'll overwhelm you.
- "Column names, formula details, edge cases — I want all of it" tells them exactly the grain you're after.
- End with a concrete question so they can start immediately.

**Flow — follow the energy, not the list:**
- Start with "data_sources" — the foundation everything else builds on.
- Naturally progress: sources → schema → quality → metrics → query patterns → edge cases.
- BUT follow their lead. If they mention a tricky calculation while describing a table, drill into that.
- For schema and metrics topics, go deeper. These are the most valuable. Probe for exact column names, exact formulas, exact join conditions.
- For visuals and terminology, keep it light — one question, take what you get.

**Duration:** This should take about 7 minutes. The schema and metrics sections deserve more time. Visuals and terminology can be quick.

**Getting specific — this is where you earn your keep:**
- When they mention a metric: "How exactly is that calculated? Like, what columns go into it?"
- When they describe a table: "What's the primary key? And what tables does it join to?"
- When they mention a gotcha: "Walk me through an example — when would someone get the wrong answer?"
- When they say something vague: "Can you give me the actual column name for that?"

Don't be afraid to push for precision here. Technical people EXPECT it and respect it. But keep it to ONE follow-up at a time.

${CONVERSATION_DYNAMICS}

${RESPONSE_FORMAT}

${CRITICAL_RULES}

8. This is a TECHNICAL conversation. Extract column names, table names, formulas, join conditions, filter rules — the specifics. Vague descriptions like "we track performance" are not useful. Push for: "performance as in CTR, CPA, or what specifically?"
9. The interview should take ~7 minutes. Schema and metrics get the most time.`;
}

// ═══════════════════════════════════════════════════════════════════════════
//  BACKWARD COMPATIBILITY — buildSystemPrompt() defaults to executive
// ═══════════════════════════════════════════════════════════════════════════

export function buildSystemPrompt(track = "executive") {
  if (track === "technical") return buildTechnicalSystemPrompt();
  return buildExecutiveSystemPrompt();
}

// Export topic lists for the UI
export const TOPICS = { executive: TOPICS_EXECUTIVE, technical: TOPICS_TECHNICAL };
export const FACT_SCHEMA = { executive: FACTS_EXECUTIVE, technical: FACTS_TECHNICAL };

// ═══════════════════════════════════════════════════════════════════════════
//  CONTEXT PACKET GENERATION (works with facts from either or both)
// ═══════════════════════════════════════════════════════════════════════════

export function buildPacketPrompt(facts, messages, { executiveTranscript, technicalTranscript } = {}) {
  // Build clean transcript(s)
  function cleanTranscript(msgs) {
    return msgs
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
  }

  const transcript = messages ? cleanTranscript(messages) : "";
  const execTranscript = executiveTranscript ? `\n\n### Executive Interview\n\n${cleanTranscript(executiveTranscript)}` : "";
  const techTranscript = technicalTranscript ? `\n\n### Technical Interview\n\n${cleanTranscript(technicalTranscript)}` : "";
  const allTranscripts = transcript || `${execTranscript}${techTranscript}`;

  // Group facts by semantic category (not by interview track)
  const grouped = {
    "Company & Strategy": {},
    "Users & Workflows": {},
    "Data Architecture": {},
    "Data Quality & Behavior": {},
    "Metrics & Calculations": {},
    "Query Patterns & Edge Cases": {},
    "Visuals & Dashboards": {},
    "AI Behavior & Guardrails": {},
    "Glossary & Terminology": {},
  };

  const categoryMap = {
    company_name: "Company & Strategy", industry: "Company & Strategy", company_description: "Company & Strategy",
    customers: "Company & Strategy", markets: "Company & Strategy", competitive_position: "Company & Strategy",
    team_culture: "Company & Strategy", deployment_driver: "Company & Strategy", current_pain_points: "Company & Strategy",
    six_month_goals: "Company & Strategy",

    primary_users: "Users & Workflows", personas: "Users & Workflows", typical_workflow: "Users & Workflows",
    permission_levels: "Users & Workflows", example_user_questions: "Users & Workflows",
    primary_use_cases: "Users & Workflows", external_stakeholder_needs: "Users & Workflows",
    success_criteria: "Users & Workflows", workflows_to_replace: "Users & Workflows",
    time_savings_target: "Users & Workflows",

    data_sources: "Data Architecture", data_pipeline: "Data Architecture", source_system_count: "Data Architecture",
    main_dataset_description: "Data Architecture", table_descriptions: "Data Architecture",
    key_columns: "Data Architecture", primary_foreign_keys: "Data Architecture", confusing_fields: "Data Architecture",

    update_frequency: "Data Quality & Behavior", data_quality_issues: "Data Quality & Behavior",
    default_filters: "Data Quality & Behavior", historical_coverage: "Data Quality & Behavior",
    seasonality: "Data Quality & Behavior", data_volume: "Data Quality & Behavior",

    key_metrics: "Metrics & Calculations", custom_calculations: "Metrics & Calculations",
    multi_table_metrics: "Metrics & Calculations", calculation_pitfalls: "Metrics & Calculations",
    missing_metric_handling: "Metrics & Calculations",

    common_joins: "Query Patterns & Edge Cases", default_date_range: "Query Patterns & Edge Cases",
    performance_considerations: "Query Patterns & Edge Cases", new_analyst_mistakes: "Query Patterns & Edge Cases",
    misleading_columns: "Query Patterns & Edge Cases", timezone_date_gotchas: "Query Patterns & Edge Cases",
    false_positive_scenarios: "Query Patterns & Edge Cases",

    chart_preferences: "Visuals & Dashboards", default_dashboard: "Visuals & Dashboards",
    branding_guidelines: "Visuals & Dashboards",

    guardrails: "AI Behavior & Guardrails", tone: "AI Behavior & Guardrails",
    compliance_constraints: "AI Behavior & Guardrails", data_visibility_rules: "AI Behavior & Guardrails",
    uncertainty_handling: "AI Behavior & Guardrails",
    sensitive_fields: "AI Behavior & Guardrails", pii_fields: "AI Behavior & Guardrails",
    internal_only_data: "AI Behavior & Guardrails",

    terminology: "Glossary & Terminology", acronyms: "Glossary & Terminology",
    context_specific_terms: "Glossary & Terminology", column_name_glossary: "Glossary & Terminology",
    enum_lookups: "Glossary & Terminology",
  };

  for (const [key, value] of Object.entries(facts)) {
    if (value === null || value === undefined) continue;
    const category = categoryMap[key] || "Company & Strategy";
    grouped[category][key] = value;
  }

  // Remove empty groups
  for (const [cat, vals] of Object.entries(grouped)) {
    if (Object.keys(vals).length === 0) delete grouped[cat];
  }

  return `You are generating an AI context packet — a structured system prompt that will be loaded into a customer's Akkio AI assistant to give it deep understanding of their business, data, and needs.

This context packet was built from TWO interviews:
- An EXECUTIVE interview (business context, strategy, goals, guardrails)
- A TECHNICAL interview (schemas, columns, calculations, query patterns, edge cases)

## Extracted Facts (structured, merged from both interviews)

${JSON.stringify(grouped, null, 2)}

## Interview Transcripts
${allTranscripts}

## Instructions

Generate a production-ready system prompt with these sections:

1. **Company Overview** — Who they are, what they do, customers, markets, competitive position.
2. **Deployment Goals** — Why they deployed Akkio, what pain points it solves, success criteria.
3. **Users & Permissions** — Who uses it, personas with skill levels, access rules, typical workflows.
4. **Data Architecture** — Data sources, pipeline, table descriptions with grain, key columns, primary/foreign keys, join relationships.
5. **Data Quality & Behavior** — Refresh cadence, known quality issues, default filters, historical coverage, seasonality, volume.
6. **Metrics & Calculations** — Every metric with its exact formula. Cross-table metrics. Pitfalls. Missing metric handling.
7. **Query Patterns** — Common joins (with exact conditions), default date ranges, performance considerations, scoping rules.
8. **Edge Cases & Pitfalls** — Common mistakes, misleading columns, timezone/date gotchas, false positives.
9. **Visualization Preferences** — Chart types, branding, default dashboard layout.
10. **AI Behavior Rules** — Hard guardrails (NEVER/ALWAYS), tone, uncertainty handling, compliance, data visibility rules.
11. **Sensitive Data** — Fields to never expose, PII, internal-only data.
12. **Glossary** — Industry terms, column name meanings, acronyms, enum/code lookups.

Rules:
- Use the extracted facts as the primary source. Fill gaps from the transcripts.
- Be SPECIFIC: use actual column names, table names, metric formulas, company names.
- Write in second person ("You are an AI assistant for [company]...").
- The guardrails section must be unambiguous: "NEVER do X", "ALWAYS do Y".
- Metric formulas should be written as pseudo-SQL or clear mathematical notation.
- Join conditions should specify exact column names on both sides.
- If a section has no data, include it with: "No specific guidance provided — use reasonable defaults."
- Output the system prompt directly — no preamble or commentary.`;
}
