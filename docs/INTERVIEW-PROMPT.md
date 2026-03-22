# Interview Prompt System — Design & Editing Guide

## Overview

The interview is split into **two tracks** designed for different people:

| Track | Target | Focus | Duration | Personality |
|-------|--------|-------|----------|-------------|
| **Executive** | VP/Director/C-level | Business context, strategy, users, guardrails | ~5 min | Peer-level strategic partner |
| **Technical** | Analyst/Engineer/Ops | Schemas, columns, calculations, query patterns, edge cases | ~7 min | Fellow data person |

Both produce facts using the **same key namespace**. When merged, executive provides the WHY (business context) and technical provides the HOW (data specifics).

The prompt system lives in `server/interview-prompt.js` and is built from composable pieces:

- `TOPICS_EXECUTIVE` / `TOPICS_TECHNICAL` — Topic definitions per track
- `FACTS_EXECUTIVE` / `FACTS_TECHNICAL` — Fact schemas per track
- `buildExecutiveSystemPrompt()` / `buildTechnicalSystemPrompt()` — Prompt generators
- `ALL_FACT_KEYS` — Merged union of both schemas (for packet generation)

## How the Prompts Work

### Executive Personality

Modeled as a "sharp solutions architect who's sat across from dozens of VPs":
- Uses executive-friendly language: "What's driving the timeline?" not "What are your requirements?"
- Talks about outcomes, not implementation
- NEVER asks about column names, SQL, or data types
- Efficient — respects senior people's time

### Technical Personality

Modeled as a "senior analytics engineer onboarding onto their data":
- Uses precise technical language: "grain" not "what a row represents"
- Gets specific fast: "Is that one row per impression event, or pre-aggregated?"
- Pushes for precision: "What's the actual column name?"
- NEVER asks about business strategy or org structure

### Shared Behaviors (both tracks)

- **Curious, not interrogative** — "Oh interesting, so when you say lift..." not "Define lift."
- **Reflects back** — Paraphrases before moving on
- **Follows threads** — Goes where the conversation leads naturally
- **Concise** — 1-3 sentences, spoken language, contractions
- **No filler** — Never says "Great question"

### Adaptive Depth (both tracks)

| User Type | Behavior | AI Response |
|-----------|----------|-------------|
| Verbose | Long, detailed answers | Extract multiple facts, skip probes, move faster |
| Terse | Short/vague answers | Use ONE probe, then move on. Circle back later. |
| Tangent | Goes off-topic | Let short tangents play out; gently redirect long ones |
| "I don't know" | Can't answer | Mark fact as null, move on, no pressure |
| Asks questions | Reverses the interview | Answer briefly, redirect back |

### Fact Extraction

Both tracks extract facts into a strict schema (not freeform). Each fact has:

- **key** — Stable identifier (e.g., `company_name`, `key_metrics`)
- **type** — `string`, `string[]`, or `record[]`
- **priority** — `required` (must have) or `nice` (ask if time allows)

Facts from both tracks share the same key namespace, so they merge cleanly.

## How to Edit

### Adding a New Topic

1. Choose the track: `TOPICS_EXECUTIVE` or `TOPICS_TECHNICAL`
2. Add the topic definition:
```js
{
  id: "security",
  label: "Security & Compliance",
  opener: "Let's talk about security — any specific requirements?",
  probes: ["Data residency requirements?", "Who manages access control?"],
  minFacts: 2,
}
```

3. Add facts to the corresponding schema (`FACTS_EXECUTIVE` or `FACTS_TECHNICAL`):
```js
security: [
  { key: "data_residency", label: "Data residency requirements", type: "string", priority: "required" },
  { key: "access_control", label: "Who manages access", type: "string", priority: "required" },
]
```

4. Add to client `TOPICS` in `src/App.jsx` under the correct track:
```js
{ id: "security", label: "Security" },
```

5. Add the new fact keys to the `categoryMap` in `buildPacketPrompt()` so they land in the right section of the output.

That's it — the prompt auto-regenerates.

### Changing the AI Personality

Each track has its own personality in `buildExecutiveSystemPrompt()` or `buildTechnicalSystemPrompt()`. Traits are written as behavioral examples:

```
Good:  "You say 'Got it' not 'Understood'"
Bad:   "Be casual"
```

### Changing Conversation Dynamics

The dynamics (verbose, terse, tangent, etc.) are shared between both tracks via the `CONVERSATION_DYNAMICS` constant. Edit it once, both tracks get the update.

### Changing the Response Format

The JSON response schema is in the shared `RESPONSE_FORMAT` constant. If you add/remove fields, also update:
- `proxy.js` — the parsing logic in `/api/interview`
- `App.jsx` — the `sendMessage` handler that reads the response

### Changing the Context Packet Format

Edit `buildPacketPrompt()` in `interview-prompt.js`. It merges facts from both tracks by semantic category (not by interview track) and generates a unified 12-section system prompt.

## Response JSON Schema

```json
{
  "reply": "string — spoken response, 1-3 sentences",
  "topics_covered": ["string — cumulative list of covered topic IDs"],
  "facts_extracted": {
    "fact_key": "value — string, string[], or record[] per schema"
  },
  "confidence": {
    "topic_id": "high | partial"
  },
  "interview_complete": "boolean — true only after wrap-up"
}
```

## All Fact Keys Reference

### EXECUTIVE TRACK

#### business
| Key | Type | Priority | Description |
|-----|------|----------|-------------|
| company_name | string | required | Company name |
| industry | string | required | Industry / vertical |
| company_description | string | required | What the company does |
| customers | string | required | Who their customers are |
| markets | string | nice | Markets / geographies |
| team_culture | string | nice | Team culture or working style |

#### strategy
| Key | Type | Priority | Description |
|-----|------|----------|-------------|
| deployment_driver | string | required | Why they're deploying Akkio now |
| current_pain_points | string[] | required | Pain points with current data workflows |
| six_month_goals | string | nice | What success looks like in 6 months |

#### users
| Key | Type | Priority | Description |
|-----|------|----------|-------------|
| primary_users | string | required | Main user roles |
| personas | record[] | required | User personas (role, needs, skill level) |
| typical_workflow | string | nice | Typical user workflow today |
| permission_levels | string | nice | Different access levels needed |

#### questions
| Key | Type | Priority | Description |
|-----|------|----------|-------------|
| example_user_questions | string[] | required | Top questions users will ask the AI |
| primary_use_cases | string[] | required | Main use cases |
| external_stakeholder_needs | string | nice | What external stakeholders need |

#### guardrails
| Key | Type | Priority | Description |
|-----|------|----------|-------------|
| guardrails | string[] | required | Things AI must never do |
| tone | string | required | Desired AI tone |
| compliance_constraints | string | nice | Legal/compliance rules |
| data_visibility_rules | string | nice | What different teams can/can't see |

#### success
| Key | Type | Priority | Description |
|-----|------|----------|-------------|
| success_criteria | string | required | How they'll measure success |
| workflows_to_replace | string[] | required | Workflows to speed up or replace |
| time_savings_target | string | nice | Expected time savings |

#### language_exec
| Key | Type | Priority | Description |
|-----|------|----------|-------------|
| terminology | record[] | required | Industry terms and definitions |
| acronyms | string | nice | Acronyms the team uses |

---

### TECHNICAL TRACK

#### data_sources
| Key | Type | Priority | Description |
|-----|------|----------|-------------|
| data_sources | string[] | required | Connected data sources / databases |
| data_pipeline | string | required | How data flows from source to queryable state |
| source_system_count | string | nice | Single DB vs. multi-source |

#### schema
| Key | Type | Priority | Description |
|-----|------|----------|-------------|
| main_dataset_description | string | required | What each row represents (grain) |
| table_descriptions | record[] | required | Description of each key table |
| key_columns | string[] | required | Most important columns across datasets |
| primary_foreign_keys | record[] | required | Primary and foreign key relationships |
| confusing_fields | string | nice | Fields that look similar but differ |

#### data_quality
| Key | Type | Priority | Description |
|-----|------|----------|-------------|
| update_frequency | string | required | Data refresh cadence and timing |
| data_quality_issues | string | required | Known quality issues, nulls, gaps |
| default_filters | string | required | Rows/records that should always be filtered out |
| historical_coverage | string | nice | How far back data goes and any gaps |

#### metrics
| Key | Type | Priority | Description |
|-----|------|----------|-------------|
| key_metrics | string[] | required | Most important metrics |
| custom_calculations | record[] | required | Custom metrics with exact formulas |
| multi_table_metrics | record[] | nice | Metrics requiring cross-table joins |
| calculation_pitfalls | string | required | Common calculation mistakes |
| missing_metric_handling | string | nice | What to do when metric can't be computed |

#### query_patterns
| Key | Type | Priority | Description |
|-----|------|----------|-------------|
| common_joins | record[] | required | Joins that are almost always needed |
| default_date_range | string | required | Default date range or time scoping |
| performance_considerations | string | nice | Large tables, query scoping rules |
| data_volume | string | nice | Typical row counts and data volume |

#### edge_cases
| Key | Type | Priority | Description |
|-----|------|----------|-------------|
| new_analyst_mistakes | string[] | required | Common mistakes a new person would make |
| misleading_columns | string | nice | Columns where the name is misleading |
| timezone_date_gotchas | string | nice | Time zone, date format, null handling rules |
| false_positive_scenarios | string | nice | When data looks right but answer is wrong |
| seasonality | string | nice | Seasonal patterns affecting queries |

#### sensitive_data
| Key | Type | Priority | Description |
|-----|------|----------|-------------|
| sensitive_fields | string[] | required | Fields that should never be exposed |
| pii_fields | string[] | nice | PII or personally identifiable fields |
| internal_only_data | string | nice | Data that's internal-only |

#### visuals
| Key | Type | Priority | Description |
|-----|------|----------|-------------|
| chart_preferences | string[] | required | Preferred chart types |
| default_dashboard | string | nice | Default dashboard view |
| branding_guidelines | string | nice | Brand colors, fonts, style |

#### language_tech
| Key | Type | Priority | Description |
|-----|------|----------|-------------|
| column_name_glossary | record[] | required | Non-obvious column name meanings |
| enum_lookups | record[] | nice | Codes/enums that need decoding |
| context_specific_terms | string | nice | Terms with special meaning in their data |
