# Interview Prompt System — Design & Editing Guide

## Overview

The interview prompt lives in `server/interview-prompt.js` and is built from three composable pieces:

1. **TOPICS** — The 9 areas of knowledge to cover
2. **FACT_SCHEMA** — The specific facts to extract per topic
3. **buildSystemPrompt()** — Generates the full Claude system prompt from the above

This design means you never edit the raw prompt text for structural changes — you edit the data structures and the prompt regenerates.

## How the Prompt Works

### Personality Layer

The AI is modeled as a "sharp account manager who genuinely finds other people's businesses interesting." Key behaviors:

- **Curious, not interrogative** — "Oh interesting, so when you say lift..." not "Define lift."
- **Reflects back** — Paraphrases what they heard before moving on
- **Notices connections** — Follows natural threads between topics
- **Concise** — 1-3 sentences, spoken language, contractions
- **No filler** — Never says "Great question" or "That's a great point"

### Topic Flow

The prompt does NOT enforce a rigid order. Instead:

1. Always starts with "business" (easiest, builds rapport)
2. After that, follows the user's lead (if they mention data, go to data)
3. Each topic has an **opener** (the main question) and **probes** (follow-ups for thin answers)
4. A topic is "covered" when it has >= `minFacts` required facts

### Adaptive Depth

The prompt includes explicit instructions for 5 user archetypes:

| User Type | Behavior | AI Response |
|-----------|----------|-------------|
| Verbose | Long, detailed answers | Extract multiple facts, skip probes, move faster |
| Terse | Short/vague answers | Use ONE probe, then move on. Circle back later. |
| Tangent | Goes off-topic | Let short tangents play out; gently redirect long ones |
| "I don't know" | Can't answer | Mark fact as null, move on, no pressure |
| Asks questions | Reverses the interview | Answer briefly, redirect back |

### Fact Extraction

The AI extracts facts into a strict schema (not freeform). Each fact has:

- **key** — Stable identifier (e.g., `company_name`, `key_metrics`)
- **type** — `string`, `string[]`, or `record[]`
- **priority** — `required` (must have) or `nice` (ask if time allows)

This ensures the context packet is consistent regardless of conversation flow.

## How to Edit

### Adding a New Topic

1. Add to `TOPICS` array:
```js
{
  id: "security",
  label: "Security & Compliance",
  opener: "Let's talk about security — any specific requirements for how data is handled?",
  probes: ["Are there data residency requirements?", "Who manages access control?"],
  minFacts: 2,
}
```

2. Add to `FACT_SCHEMA`:
```js
security: [
  { key: "data_residency", label: "Data residency requirements", type: "string", priority: "required" },
  { key: "access_control", label: "Who manages access", type: "string", priority: "required" },
  { key: "encryption_requirements", label: "Encryption requirements", type: "string", priority: "nice" },
]
```

3. Add to client `TOPICS` in `src/App.jsx`:
```js
{ id: "security", label: "Security" },
```

That's it — the prompt auto-regenerates.

### Changing the AI Personality

Edit the `WHO YOU ARE` section in `buildSystemPrompt()`. The personality traits are written as behavioral examples, not abstract adjectives. Keep that pattern:

```
Good:  "You say 'Got it' not 'Understood'"
Bad:   "Be casual"
```

### Changing Conversation Dynamics

Edit the `Adaptive depth` section. Each user archetype has:
- A label (e.g., "VERBOSE USER")
- Behavioral description (how to recognize them)
- Response strategy (what the AI should do)

### Changing the Response Format

The JSON response schema is defined in the `RESPONSE FORMAT` section. If you add/remove fields, also update:
- `proxy.js` — the parsing logic in `/api/interview`
- `App.jsx` — the `sendMessage` handler that reads the response

### Changing the Context Packet Format

Edit `buildPacketPrompt()` in `interview-prompt.js`. The packet generation prompt defines:
- What sections the output should have
- How to use extracted facts vs. transcript
- Writing style rules (second person, specific, unambiguous guardrails)

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

### business
| Key | Type | Priority | Description |
|-----|------|----------|-------------|
| company_name | string | required | Company name |
| industry | string | required | Industry / vertical |
| company_description | string | required | What the company does |
| customers | string | required | Who their customers are |
| markets | string | nice | Markets / geographies |
| team_culture | string | nice | Team culture or working style |

### platform
| Key | Type | Priority | Description |
|-----|------|----------|-------------|
| primary_use_cases | string[] | required | Main use cases for Akkio |
| example_user_questions | string[] | required | Example questions users will ask |
| primary_users | string | required | Main user roles |
| workflows | string | nice | Key workflows or integrations |

### data
| Key | Type | Priority | Description |
|-----|------|----------|-------------|
| data_sources | string[] | required | Connected data sources |
| main_dataset_description | string | required | What each row represents |
| key_columns | string[] | required | Most important columns/fields |
| confusing_fields | string | nice | Fields that look similar but differ |

### data_behavior
| Key | Type | Priority | Description |
|-----|------|----------|-------------|
| update_frequency | string | required | How often data is refreshed |
| data_quality_issues | string | required | Known quality issues or gaps |
| default_filters | string | nice | Default filters/segments |
| seasonality | string | nice | Seasonal patterns |
| data_volume | string | nice | Typical volume |
| sensitive_fields | string[] | nice | Fields to never expose |

### calculations
| Key | Type | Priority | Description |
|-----|------|----------|-------------|
| key_metrics | string[] | required | Most important metrics |
| custom_calculations | record[] | required | Custom metrics + formulas |
| missing_metric_handling | string | nice | What to do when metric unavailable |
| calculation_pitfalls | string | nice | Common mistakes to avoid |

### visuals
| Key | Type | Priority | Description |
|-----|------|----------|-------------|
| chart_preferences | string[] | required | Preferred chart types |
| branding_guidelines | string | nice | Brand colors, fonts, style |
| default_dashboard | string | required | Default view layout |

### ai_behavior
| Key | Type | Priority | Description |
|-----|------|----------|-------------|
| guardrails | string[] | required | Things AI must never do |
| tone | string | required | Communication style |
| uncertainty_handling | string | nice | How to handle uncertainty |
| compliance_constraints | string | nice | Legal/compliance rules |

### team
| Key | Type | Priority | Description |
|-----|------|----------|-------------|
| personas | record[] | required | User personas |
| permission_levels | string | nice | Access levels |
| success_criteria | string | required | Definition of success |

### language
| Key | Type | Priority | Description |
|-----|------|----------|-------------|
| terminology | record[] | required | Industry terms + definitions |
| acronyms | string | nice | Abbreviations |
| context_specific_terms | string | nice | Terms with special meaning |
