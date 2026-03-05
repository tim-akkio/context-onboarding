import { useState, useRef, useEffect } from "react";

// ── PALETTE & STYLES ──────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=DM+Mono:wght@400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0A0F1E; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1A2240; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #2A3460; }

  .app { font-family: 'DM Sans', sans-serif; background: #0A0F1E; min-height: 100vh; color: #E8EDF8; }

  /* ── Progress bar ── */
  .progress-bar { position: fixed; top: 0; left: 0; right: 0; height: 3px; background: #1A2240; z-index: 100; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, #1860DC, #00C4A0); transition: width 0.5s cubic-bezier(0.4,0,0.2,1); }

  /* ── Header ── */
  .header { position: fixed; top: 3px; left: 0; right: 0; background: rgba(10,15,30,0.95); backdrop-filter: blur(12px); border-bottom: 1px solid #1A2240; z-index: 99; padding: 0 32px; height: 56px; display: flex; align-items: center; justify-content: space-between; }
  .header-logo { font-size: 13px; font-weight: 600; color: #1860DC; letter-spacing: 0.08em; }
  .header-title { font-size: 13px; color: #8B9BB4; }
  .header-right { display: flex; align-items: center; gap: 16px; }
  .header-step { font-size: 12px; color: #8B9BB4; font-family: 'DM Mono', monospace; }
  .reset-btn { font-size: 12px; color: #F87171; border: 1px solid #F87171; background: transparent; border-radius: 6px; padding: 5px 14px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-weight: 500; transition: all 0.15s; }
  .reset-btn:hover { background: rgba(248,113,113,0.1); }

  /* ── Sidebar ── */
  .sidebar { width: 240px; flex-shrink: 0; position: fixed; top: 59px; bottom: 0; left: 0; background: #080D1A; border-right: 1px solid #1A2240; overflow-y: auto; padding: 24px 0; z-index: 50; }
  .sidebar-section { padding: 8px 20px; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.15s; font-size: 13px; color: #8B9BB4; border-left: 2px solid transparent; }
  .sidebar-section:hover { color: #E8EDF8; background: #0D1526; }
  .sidebar-section.active { color: #E8EDF8; border-left-color: #1860DC; background: #0D1526; }
  .sidebar-dot { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; background: #1A2240; color: #8B9BB4; font-family: 'DM Mono', monospace; line-height: 1; }
  .sidebar-dot.active { background: #1860DC; color: white; }
  .sidebar-dot.completed { background: #00C4A0; color: #080D1A; font-size: 12px; }

  /* ── Layout ── */
  .layout { display: flex; padding-top: 59px; min-height: 100vh; }
  .main { flex: 1; margin-left: 240px; padding: 40px 48px 120px 48px; max-width: 960px; }

  /* ── Section header ── */
  .section-label { font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #1860DC; margin-bottom: 8px; font-family: 'DM Mono', monospace; }
  .section-title { font-size: 32px; font-weight: 700; color: #E8EDF8; margin-bottom: 6px; }
  .section-desc { font-size: 14px; color: #8B9BB4; margin-bottom: 32px; }

  /* ── Question card ── */
  .q-card { background: #0F1629; border: 1px solid #1A2240; border-radius: 12px; padding: 28px; margin-bottom: 24px; }
  .q-header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px; }
  .q-num { font-size: 12px; font-weight: 600; color: #00C4A0; font-family: 'DM Mono', monospace; }
  .q-text { font-size: 15px; font-weight: 500; color: #E8EDF8; }
  .q-hint { font-size: 13px; color: #8B9BB4; font-style: italic; margin-bottom: 12px; padding-left: 42px; }

  /* ── Badges ── */
  .badge { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 4px; margin-bottom: 10px; margin-left: 0; }
  .badge-poc { background: rgba(0,196,160,0.12); color: #00C4A0; }
  .badge-transcript { background: rgba(123,94,167,0.15); color: #7B5EA7; }
  .badge-open { background: rgba(245,158,11,0.12); color: #F59E0B; }

  /* ── Textarea ── */
  .q-input { width: 100%; background: #0A0F1E; border: 1px solid #1A2240; border-radius: 8px; color: #E8EDF8; font-family: 'DM Sans', sans-serif; font-size: 14px; padding: 12px 16px; resize: vertical; line-height: 1.6; transition: border-color 0.2s; }
  .q-input:focus { outline: none; border-color: #1860DC; }
  .q-input.source-poc { border-color: rgba(0,196,160,0.35); }
  .q-input.source-transcript { border-color: rgba(123,94,167,0.4); }
  .q-input::placeholder { color: #3A4660; }

  /* ── Table input ── */
  .q-table-wrap { border-radius: 8px; overflow: hidden; border: 1px solid #1A2240; margin-top: 4px; }
  .q-table { width: 100%; border-collapse: collapse; }
  .q-table th { background: #141C32; color: #8B9BB4; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 14px; text-align: left; border-bottom: 1px solid #1A2240; border-right: 1px solid #1A2240; }
  .q-table th:last-child { border-right: none; }
  .q-table td { padding: 0; border-bottom: 1px solid #1A2240; border-right: 1px solid #1A2240; }
  .q-table td:last-child { border-right: none; }
  .q-table tr:last-child td { border-bottom: none; }
  .q-table input { width: 100%; background: transparent; border: none; color: #E8EDF8; font-family: 'DM Sans', sans-serif; font-size: 13px; padding: 10px 14px; outline: none; }
  .q-table input:focus { background: rgba(24,96,220,0.06); }
  .q-table input::placeholder { color: #3A4660; }

  /* ── Nav bar ── */
  .nav-bar { position: fixed; bottom: 0; left: 240px; right: 0; background: rgba(10,15,30,0.95); backdrop-filter: blur(12px); border-top: 1px solid #1A2240; padding: 16px 48px; display: flex; align-items: center; justify-content: space-between; z-index: 50; }
  .nav-status { font-size: 12px; color: #8B9BB4; font-family: 'DM Mono', monospace; display: flex; align-items: center; gap: 12px; }
  .nav-legend { display: flex; align-items: center; gap: 6px; }
  .nav-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
  .nav-dot.poc { background: #00C4A0; }
  .nav-dot.open { background: #F59E0B; }
  .nav-buttons { display: flex; gap: 12px; }
  .btn { font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; padding: 10px 24px; border-radius: 8px; cursor: pointer; transition: all 0.15s; border: none; }
  .btn-back { background: transparent; border: 1px solid #1A2240; color: #8B9BB4; }
  .btn-back:hover { border-color: #8B9BB4; color: #E8EDF8; }
  .btn-next { background: #1860DC; color: white; }
  .btn-next:hover { background: #1a6ef0; }

  /* ── Welcome screen ── */
  .welcome { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 40px; text-align: center; }
  .welcome-badge { font-size: 11px; font-weight: 600; color: #1860DC; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 16px; font-family: 'DM Mono', monospace; }
  .welcome-title { font-size: 36px; font-weight: 700; color: #E8EDF8; margin-bottom: 12px; }
  .welcome-sub { font-size: 15px; color: #8B9BB4; max-width: 520px; line-height: 1.6; margin-bottom: 40px; }
  .welcome-buttons { display: flex; gap: 16px; }
  .btn-welcome { font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; padding: 14px 28px; border-radius: 10px; cursor: pointer; transition: all 0.15s; border: none; }
  .btn-transcript { background: #7B5EA7; color: white; }
  .btn-transcript:hover { background: #8c6db8; }
  .btn-skip { background: transparent; border: 1px solid #1A2240; color: #8B9BB4; }
  .btn-skip:hover { border-color: #8B9BB4; color: #E8EDF8; }

  /* ── Transcript screen ── */
  .transcript-screen { max-width: 720px; margin: 0 auto; padding: 100px 24px 60px; }
  .transcript-label { font-size: 11px; font-weight: 600; color: #7B5EA7; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 8px; font-family: 'DM Mono', monospace; }
  .transcript-title { font-size: 28px; font-weight: 700; color: #E8EDF8; margin-bottom: 6px; }
  .transcript-desc { font-size: 14px; color: #8B9BB4; margin-bottom: 24px; line-height: 1.6; }
  .transcript-area { width: 100%; background: #0A0F1E; border: 1px solid #1A2240; border-radius: 10px; color: #E8EDF8; font-family: 'DM Sans', sans-serif; font-size: 14px; padding: 16px; resize: vertical; line-height: 1.6; min-height: 240px; }
  .transcript-area:focus { outline: none; border-color: #7B5EA7; }
  .transcript-actions { margin-top: 20px; display: flex; gap: 12px; align-items: center; }
  .btn-extract { background: #7B5EA7; color: white; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; padding: 10px 24px; border-radius: 8px; cursor: pointer; border: none; transition: all 0.15s; }
  .btn-extract:hover { background: #8c6db8; }
  .btn-extract:disabled { opacity: 0.5; cursor: not-allowed; }
  .extract-status { font-size: 13px; color: #8B9BB4; }
  .extract-status.success { color: #00C4A0; }
  .extract-status.error { color: #F87171; }
  .extracted-preview { margin-top: 24px; background: #0F1629; border: 1px solid #1A2240; border-radius: 10px; padding: 20px; }
  .extracted-preview h4 { font-size: 13px; font-weight: 600; color: #7B5EA7; margin-bottom: 12px; }
  .extracted-item { font-size: 12px; color: #8B9BB4; padding: 4px 0; display: flex; gap: 8px; }
  .extracted-item .field-name { color: #E8EDF8; font-weight: 500; min-width: 160px; flex-shrink: 0; }
  .extracted-item .field-value { color: #8B9BB4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .transcript-continue { margin-top: 24px; display: flex; gap: 12px; }

  /* ── Reset modal ── */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 200; display: flex; align-items: center; justify-content: center; }
  .modal { background: #0F1629; border: 1px solid #1A2240; border-radius: 14px; padding: 32px; max-width: 400px; width: 90%; }
  .modal h3 { font-size: 18px; font-weight: 600; color: #E8EDF8; margin-bottom: 8px; }
  .modal p { font-size: 14px; color: #8B9BB4; line-height: 1.5; margin-bottom: 24px; }
  .modal-buttons { display: flex; gap: 12px; justify-content: flex-end; }
  .btn-cancel { background: transparent; border: 1px solid #1A2240; color: #8B9BB4; font-family: 'DM Sans', sans-serif; font-size: 13px; padding: 8px 20px; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
  .btn-cancel:hover { border-color: #8B9BB4; color: #E8EDF8; }
  .btn-confirm-reset { background: #F87171; color: white; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; padding: 8px 20px; border-radius: 8px; cursor: pointer; border: none; transition: all 0.15s; }
  .btn-confirm-reset:hover { background: #f98080; }

  /* ── Generate / Output ── */
  .generate-section { margin-top: 32px; padding-top: 32px; border-top: 1px solid #1A2240; }
  .btn-generate { background: linear-gradient(135deg, #1860DC, #00C4A0); color: white; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; padding: 14px 32px; border-radius: 10px; cursor: pointer; border: none; transition: all 0.2s; }
  .btn-generate:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(24,96,220,0.3); }
  .btn-generate:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
  .output-panel { margin-top: 24px; background: #0A0F1E; border: 1px solid #1A2240; border-radius: 10px; padding: 24px; position: relative; }
  .output-panel pre { white-space: pre-wrap; font-family: 'DM Mono', monospace; font-size: 12px; color: #E8EDF8; line-height: 1.7; max-height: 600px; overflow-y: auto; }
  .btn-copy { position: absolute; top: 12px; right: 12px; background: #1A2240; color: #8B9BB4; border: none; font-family: 'DM Sans', sans-serif; font-size: 11px; padding: 5px 12px; border-radius: 6px; cursor: pointer; transition: all 0.15s; }
  .btn-copy:hover { color: #E8EDF8; }
  .btn-copy.copied { color: #00C4A0; }

  /* ── Spinner ── */
  @keyframes spin { to { transform: rotate(360deg); } }
  .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.2); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; vertical-align: middle; margin-right: 8px; }
`;

// ── SECTIONS DATA ─────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 1,
    label: "Your Business",
    color: "#1860DC",
    desc: "Help the AI understand who you are and what you care about.",
    questions: [
      { id: "q01", text: "How would you describe your company to someone who has never heard of it?", hint: "Industry, what you do, who your customers are.", rows: 3, prefill: "Locality is a local video advertising and AdTech company specializing in data-driven local video advertising across broadcast TV and streaming/CTV." },
      { id: "q02", text: "What markets or geographies do you primarily operate in?", hint: "e.g., national U.S., specific DMAs.", rows: 2, prefill: "National U.S. footprint across all DMAs. Combined broadcast TV and streaming/CTV inventory." },
      { id: "q03", text: "How would you describe the culture or working style of your team?", rows: 2, prefill: "Local-first and community-oriented. Data-driven and tech-forward. Emphasis on reliability, scalability, and operational efficiency." },
      { id: "q04", text: "Who are your primary customers or end users?", hint: "e.g., advertisers, agencies, internal teams.", rows: 2, prefill: "Local and national advertisers, media agencies, and political campaigns looking for targeted local TV and CTV ad placement." },
    ],
  },
  {
    id: 2,
    label: "Platform Use",
    color: "#1860DC",
    desc: "How your team uses the Akkio platform day-to-day.",
    questions: [
      { id: "q05", text: "What are the primary use cases for your Akkio deployment?", hint: "e.g., reporting dashboards, ad-hoc analysis, client-facing insights.", rows: 3, prefill: "Campaign performance reporting, incremental lift analysis, frequency and reach measurement, DMA-level heatmaps, and client-facing dashboards." },
      { id: "q06", text: "What kinds of questions do your users typically ask the AI?", hint: "List 3–5 example questions.", rows: 5, prefill: "What was the incremental lift for campaign X?\nHow does reach break down by DMA?\nWhat is the frequency distribution for this advertiser?\nWhich DMAs had the highest CTR last month?\nCompare CPA across campaigns for client Y." },
      { id: "q07", text: "Who are the primary users of the platform?", hint: "Roles, departments, technical skill level.", rows: 2, prefill: "Campaign managers, data analysts, and account executives. Mix of technical and non-technical users." },
      { id: "q08", text: "Are there any workflows or integrations the AI should be aware of?", rows: 2, prefill: "Data flows from LoopMe ad server → Snowflake → Akkio. Campaign reports are exported to PDF for client delivery." },
    ],
  },
  {
    id: 3,
    label: "Your Data",
    color: "#00C4A0",
    desc: "The datasets connected to the platform and what they contain.",
    questions: [
      { id: "q09", text: "What data sources are connected to your Akkio instance?", hint: "e.g., Snowflake tables, CSV uploads, API feeds.", rows: 3, prefill: "Snowflake data warehouse with campaign impression logs, conversion events, DMA reference tables, and advertiser metadata." },
      { id: "q10", text: "Describe the main dataset(s) — what does each row represent?", hint: "e.g., one row per transaction, per user, per day.", rows: 3, prefill: "Primary table: one row per impression event (AKKIO_ID × campaign × timestamp). Conversion table: one row per attributed conversion. DMA table: reference mapping of DMA codes to names and regions." },
      { id: "q11", text: "What are the key columns or fields the AI should know about?", hint: "List the most important 10–15 fields.", rows: 4, prefill: "AKKIO_ID (household identifier), CAMPAIGN_ID, CAMPAIGN_NAME, ADVERTISER, DMA_CODE, DMA_NAME, IMPRESSION_DATE, CREATIVE_ID, FREQUENCY, HAS_LOOPME_CONVERSION, EXPOSED_GROUP, COST, IMPRESSIONS." },
      { id: "q12", text: "Are there any columns that look similar but mean different things?", hint: "Common source of confusion for AI.", rows: 2, prefill: "HAS_LOOPME_CONVERSION is a boolean flag (not a count). FREQUENCY is per-household, not per-campaign. EXPOSED_GROUP distinguishes test vs. control for lift studies." },
    ],
  },
  {
    id: 4,
    label: "Data Behavior",
    color: "#00C4A0",
    desc: "How your data changes over time and any quirks to watch for.",
    questions: [
      { id: "q13", text: "How often is data updated or refreshed?", hint: "e.g., real-time, daily, weekly.", rows: 2, prefill: "Daily batch refresh from Snowflake, typically available by 9 AM ET. Some campaign metadata updates intraday." },
      { id: "q14", text: "Are there known data quality issues or gaps?", rows: 2, prefill: "Conversion data may lag by 24–48 hours. Some older campaigns have incomplete DMA mappings. Null values in CREATIVE_ID for pre-2024 records." },
      { id: "q15", text: "Are there any date ranges, filters, or segments the AI should always apply?", rows: 3, prefill: "Default to the current campaign flight dates. Exclude test campaigns (ADVERTISER = 'INTERNAL_TEST'). Always filter to EXPOSED_GROUP = 'exposed' for lift calculations unless comparing to control." },
      { id: "q16", text: "Does the data have seasonality or patterns the AI should understand?", rows: 2, prefill: "Political ad spending peaks in Q3/Q4 of election years. Holiday retail campaigns spike in November–December. Local sports seasons drive regional DMA volume." },
      { id: "q17", text: "What's the typical data volume the AI will be working with?", hint: "e.g., row counts, time range.", rows: 2, prefill: "~50M impression rows per month. Conversion table ~2M rows/month. Most queries should scope to a single campaign (10K–500K rows)." },
      { id: "q18", text: "Are there any fields the AI should never expose or should treat as sensitive?", rows: 2, prefill: "AKKIO_ID is a hashed household identifier — should not be displayed raw in client-facing reports. Internal cost data (COST column) should not be shown to external users without permission." },
    ],
  },
  {
    id: 5,
    label: "Calculations",
    color: "#00C4A0",
    desc: "Performance metrics your team tracks and how they're calculated.",
    questions: [
      { id: "q19", text: "What metrics does your team care most about?", rows: 3, prefill: "Reach, Frequency, Frequency Buckets, Incremental Lift, CPM, CPA, CPC, CVR, CTR, VTR, ROAS, Conversion Rate (HAS_LOOPME_CONVERSION). DMA-level performance metrics and heatmap indexes." },
      {
        id: "q20", text: "Any metrics specific to your business and how they're calculated?", type: "table",
        cols: ["Metric Name", "How It's Calculated", "Notes / Caveats"], tableRows: 4,
        prefill: [
          ["Incremental Lift", "(Exposed CVR – Unexposed CVR) / Unexposed CVR", "Core Locality use case"],
          ["Frequency Bucket", "Group AKKIO_IDs by impression count ranges (1, 2–3, 4–6, 7–10, 11+)", "Standard bucketing"],
          ["Reach", "COUNT(DISTINCT AKKIO_ID) exposed to campaign", "Unique household count"],
          ["", "", ""],
        ],
      },
      { id: "q21", text: "When a metric can't be calculated, how should the AI handle it?", rows: 2, prefill: "State clearly that the metric cannot be computed with available data. Suggest what additional data would be needed. Never fabricate or approximate values without flagging the assumption." },
      { id: "q22", text: "Are there any common calculation mistakes the AI should watch out for?", rows: 2, prefill: "Don't double-count impressions across overlapping flight dates. Frequency must be calculated per AKKIO_ID, not as a simple average. Lift requires both exposed and control groups — if control is missing, say so." },
    ],
  },
  {
    id: 6,
    label: "Visuals",
    color: "#7B5EA7",
    desc: "How charts, tables, and dashboards should look and behave.",
    questions: [
      { id: "q23", text: "What chart types does your team prefer?", hint: "e.g., bar charts, line charts, heatmaps, tables.", rows: 2, prefill: "DMA heatmaps (choropleth), bar charts for campaign comparison, line charts for time trends, and summary tables with KPI scorecards." },
      { id: "q24", text: "Are there any branding or style guidelines for visuals?", hint: "Colors, fonts, logos.", rows: 2, prefill: "Use Locality brand palette (navy, teal, coral). Clean, minimal design. No 3D effects. Always include axis labels and data source footnotes." },
      { id: "q25", text: "What should the default dashboard or landing view show?", rows: 3, prefill: "Campaign performance summary: total reach, frequency distribution, incremental lift, and top DMAs by impression volume. Filterable by advertiser, campaign, and date range." },
    ],
  },
  {
    id: 7,
    label: "AI Behavior",
    color: "#7B5EA7",
    desc: "Guardrails, tone, and boundaries for the AI assistant.",
    questions: [
      { id: "q26", text: "What should the AI never do or say?", hint: "Hard guardrails.", rows: 3, prefill: "Never invent data or statistics. Never share raw AKKIO_IDs. Never make claims about campaign ROI without underlying lift data. Never compare advertiser performance across clients without explicit permission." },
      { id: "q27", text: "What tone should the AI use?", hint: "e.g., formal, conversational, technical.", rows: 2, prefill: "Professional but approachable. Data-forward — lead with numbers. Avoid marketing jargon unless the user uses it first. Be concise." },
      { id: "q28", text: "When the AI is unsure, how should it respond?", rows: 2, prefill: "Acknowledge uncertainty explicitly. Offer to show the underlying data or methodology. Suggest the user consult the data team for edge cases." },
      { id: "q29", text: "Are there any compliance or legal constraints the AI should follow?", rows: 2, prefill: "Avoid making performance guarantees. Do not share one client's data or results with another. Follow standard advertising industry privacy guidelines." },
    ],
  },
  {
    id: 8,
    label: "Your Team",
    color: "#7B5EA7",
    desc: "Who will use this and what they need.",
    questions: [
      {
        id: "q30", text: "Describe the key personas who will interact with the AI.", type: "table",
        cols: ["Role / Persona", "What They Need", "Skill Level"], tableRows: 4,
        prefill: [
          ["Campaign Manager", "Quick campaign performance checks, client report data", "Non-technical"],
          ["Data Analyst", "Deep-dive queries, custom metric calculations, data validation", "Technical"],
          ["Account Executive", "High-level summaries for client meetings, talking points", "Non-technical"],
          ["", "", ""],
        ],
      },
      { id: "q31", text: "Are there different permission levels or data access needs?", rows: 2, prefill: "Account executives should not see internal cost data. Campaign managers see only their assigned advertisers. Analysts have full access." },
      { id: "q32", text: "What does success look like for your team using this platform?", rows: 2, prefill: "Faster campaign reporting (minutes instead of hours). Self-service answers for AEs without waiting on the data team. Consistent methodology across all client reports." },
    ],
  },
  {
    id: 9,
    label: "Language",
    color: "#5B8A3C",
    desc: "Industry terms, abbreviations, and vocabulary the AI should know.",
    questions: [
      { id: "q33", text: "What terminology or jargon is specific to your business?", type: "table", cols: ["Term", "Definition", "Context / Notes"], tableRows: 5 },
      { id: "q34", text: "Are there abbreviations or acronyms the AI should always understand?", rows: 3 },
      { id: "q35", text: "Are there any terms that mean something different in your context than they normally would?", rows: 2 },
    ],
  },
];

// Annotate sequential question numbers
let _qn = 0;
SECTIONS.forEach((s) => s.questions.forEach((q) => { _qn++; q.num = _qn; }));

// ── TRANSCRIPT EXTRACTION MAP ─────────────────────────────────────────────────
const EXTRACT_MAP = {
  business_overview: "q01",
  markets: "q02",
  primary_use_cases: "q05",
  user_questions: "q06",
  data_sources: "q09",
  key_columns: "q11",
  update_frequency: "q13",
  key_metrics: "q19",
  chart_preferences: "q23",
  ai_guardrails: "q26",
  team_roles: "q07",
  terminology: "q34",
};

const EXTRACT_PROMPT = (text) =>
  `You are analyzing a meeting transcript or notes to extract information for an AI context packet builder. Extract the following 12 categories from the text. Return valid JSON only — no markdown, no commentary. If a category is not mentioned, set its value to null.

{
  "business_overview": "What the company does, industry, customers",
  "markets": "Markets, geographies, regions they operate in",
  "primary_use_cases": "How they plan to use the analytics platform",
  "user_questions": "Example questions users would ask the AI",
  "data_sources": "Data sources, databases, tables mentioned",
  "key_columns": "Specific field names, columns, variables discussed",
  "update_frequency": "How often data is refreshed or updated",
  "key_metrics": "KPIs, metrics, performance indicators they track",
  "chart_preferences": "Visualization preferences, chart types, dashboards",
  "ai_guardrails": "Things the AI should never do, compliance constraints",
  "team_roles": "Team members, roles, who will use the platform",
  "terminology": "Industry-specific terms, acronyms, jargon explained"
}

--- TRANSCRIPT ---
${text}`;

// ── HELPERS ────────────────────────────────────────────────────────────────────
const initAnswers = () => {
  const init = {};
  SECTIONS.forEach((s) =>
    s.questions.forEach((q) => {
      if (q.type === "table") {
        init[q.id] = q.prefill
          ? q.prefill.map((r) => [...r])
          : Array.from({ length: q.tableRows }, () => Array(q.cols.length).fill(""));
      } else {
        init[q.id] = q.prefill || "";
      }
    })
  );
  return init;
};

const pad = (n) => String(n).padStart(2, "0");

// ── APP COMPONENT ─────────────────────────────────────────────────────────────
export default function App() {
  const [started, setStarted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractStatus, setExtractStatus] = useState(""); // "" | "extracting" | "success" | "error"
  const [extractedFields, setExtractedFields] = useState({});
  const [transcriptAnswers, setTranscriptAnswers] = useState({});
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState(initAnswers);
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [generating, setGenerating] = useState(false);
  const mainRef = useRef(null);

  // Scroll to top when section changes
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentSection]);

  // ── Transcript extraction ─────────────────────────────────────────────────
  const extractFromTranscript = async () => {
    if (!transcript.trim()) return;
    setExtracting(true);
    setExtractStatus("extracting");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
          messages: [{ role: "user", content: EXTRACT_PROMPT(transcript) }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const json = JSON.parse(text);

      const newTranscriptAnswers = {};
      const newExtracted = {};
      Object.entries(EXTRACT_MAP).forEach(([key, qId]) => {
        if (json[key] && json[key] !== null) {
          newTranscriptAnswers[qId] = json[key];
          newExtracted[key] = json[key];
        }
      });

      setExtractedFields(newExtracted);
      setTranscriptAnswers(newTranscriptAnswers);

      // Merge into answers — transcript overrides POC prefills
      setAnswers((prev) => {
        const merged = { ...prev };
        Object.entries(newTranscriptAnswers).forEach(([qId, val]) => {
          if (typeof merged[qId] === "string") merged[qId] = val;
        });
        return merged;
      });

      setExtractStatus("success");
    } catch (err) {
      console.error("Extraction error:", err);
      setExtractStatus("error");
    } finally {
      setExtracting(false);
    }
  };

  // ── Build prompt from all answers ─────────────────────────────────────────
  const buildPrompt = () => {
    let prompt =
      "Generate a comprehensive AI context packet based on the following customer input session data. " +
      "Format it as a structured system prompt that could be loaded into an AI assistant to give it " +
      "deep understanding of this customer's business, data, and needs.\n\n";

    SECTIONS.forEach((section) => {
      prompt += `## ${section.label}\n`;
      section.questions.forEach((q) => {
        const answer = answers[q.id];
        if (q.type === "table") {
          if (answer && answer.some((row) => row.some((c) => c.trim()))) {
            prompt += `### ${q.text}\n`;
            prompt += q.cols.join(" | ") + "\n";
            answer.forEach((row) => {
              if (row.some((c) => c.trim())) prompt += row.join(" | ") + "\n";
            });
            prompt += "\n";
          }
        } else if (answer && answer.trim()) {
          prompt += `### ${q.text}\n${answer}\n\n`;
        }
      });
    });
    return prompt;
  };

  // ── Generate context packet ───────────────────────────────────────────────
  const generate = async () => {
    setGenerating(true);
    setOutput("");
    setCopied(false);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          messages: [{ role: "user", content: buildPrompt() }],
        }),
      });
      const data = await res.json();
      if (data.content?.[0]?.text) {
        setOutput(data.content[0].text);
      } else {
        setOutput("Error: " + JSON.stringify(data));
      }
    } catch (err) {
      setOutput("Error generating context packet: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetAnswers = () => {
    setAnswers(initAnswers());
    setCurrentSection(0);
    setOutput("");
    setCopied(false);
    setTranscriptAnswers({});
    setExtractedFields({});
    setShowReset(false);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleTableChange = (qId, ri, ci, value) => {
    setAnswers((prev) => {
      const updated = prev[qId].map((r) => [...r]);
      updated[ri][ci] = value;
      return { ...prev, [qId]: updated };
    });
  };

  const sectionHasResponses = (idx) => {
    const sec = SECTIONS[idx];
    return sec.questions.some((q) => {
      const a = answers[q.id];
      if (q.type === "table") return a && a.some((r) => r.some((c) => c.trim()));
      return a && a.trim();
    });
  };

  const sectionsWithResponses = SECTIONS.filter((_, i) => sectionHasResponses(i)).length;
  const sec = SECTIONS[currentSection];
  const isLast = currentSection === SECTIONS.length - 1;

  const getBadge = (q) => {
    if (q.type === "table") return null;
    if (transcriptAnswers[q.id]) return <span className="badge badge-transcript">◆ Extracted from transcript</span>;
    if (q.prefill) return <span className="badge badge-poc">✓ Pre-filled from POC — confirm or edit</span>;
    return <span className="badge badge-open">✏ Your input needed</span>;
  };

  const getInputClass = (q) => {
    if (transcriptAnswers[q.id]) return "q-input source-transcript";
    if (q.prefill) return "q-input source-poc";
    return "q-input";
  };

  // ── RENDER: Welcome screen ────────────────────────────────────────────────
  if (!started && !showTranscript) {
    return (
      <div className="app">
        <style>{css}</style>
        <div className="welcome">
          <div className="welcome-badge">Akkio Context Builder</div>
          <h1 className="welcome-title">Locality · Production Context Input Session</h1>
          <p className="welcome-sub">
            Build a production-ready AI context packet by walking through 9 sections of questions.
            Pre-filled answers come from the POC engagement — confirm, edit, or add new information.
          </p>
          <div className="welcome-buttons">
            <button className="btn-welcome btn-transcript" onClick={() => setShowTranscript(true)}>
              ◆ Extract from Transcript
            </button>
            <button className="btn-welcome btn-skip" onClick={() => setStarted(true)}>
              Skip to Form →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: Transcript screen ─────────────────────────────────────────────
  if (!started && showTranscript) {
    return (
      <div className="app">
        <style>{css}</style>
        <div className="transcript-screen">
          <div className="transcript-label">Step 0 · Transcript Extraction</div>
          <h2 className="transcript-title">Extract Answers from a Transcript</h2>
          <p className="transcript-desc">
            Paste a Zoom transcript, meeting notes, or any text below. Claude will extract relevant
            answers and pre-fill them into the form (flagged purple). Existing POC data is preserved
            for any fields not mentioned in the transcript.
          </p>
          <textarea
            className="transcript-area"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste your transcript or meeting notes here…"
            rows={12}
          />
          <div className="transcript-actions">
            <button
              className="btn-extract"
              onClick={extractFromTranscript}
              disabled={extracting || !transcript.trim()}
            >
              {extracting ? <><span className="spinner" /> Extracting…</> : "Extract Answers"}
            </button>
            {extractStatus === "success" && (
              <span className="extract-status success">
                ✓ {Object.keys(extractedFields).length} fields extracted
              </span>
            )}
            {extractStatus === "error" && (
              <span className="extract-status error">✗ Extraction failed — check console</span>
            )}
          </div>

          {Object.keys(extractedFields).length > 0 && (
            <div className="extracted-preview">
              <h4>Extracted Fields Preview</h4>
              {Object.entries(extractedFields).map(([key, val]) => (
                <div className="extracted-item" key={key}>
                  <span className="field-name">{key.replace(/_/g, " ")}</span>
                  <span className="field-value">{String(val).slice(0, 120)}{String(val).length > 120 ? "…" : ""}</span>
                </div>
              ))}
            </div>
          )}

          <div className="transcript-continue">
            <button className="btn btn-next" onClick={() => setStarted(true)}>
              Continue to Form →
            </button>
            <button className="btn btn-back" onClick={() => setShowTranscript(false)}>
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: Main guided form ──────────────────────────────────────────────
  return (
    <div className="app">
      <style>{css}</style>

      {/* Progress bar */}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${((currentSection + 1) / SECTIONS.length) * 100}%` }} />
      </div>

      {/* Header */}
      <div className="header">
        <span className="header-logo">✦ Akkio · Context Builder</span>
        <span className="header-title">Locality · Production Context Input Session</span>
        <div className="header-right">
          <button className="reset-btn" onClick={() => setShowReset(true)}>↻ Reset</button>
          <span className="header-step">{currentSection + 1} / {SECTIONS.length}</span>
        </div>
      </div>

      {/* Reset modal */}
      {showReset && (
        <div className="modal-overlay" onClick={() => setShowReset(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Reset all answers?</h3>
            <p>This will restore all fields to their POC defaults and clear any transcript extractions or edits you've made.</p>
            <div className="modal-buttons">
              <button className="btn-cancel" onClick={() => setShowReset(false)}>Cancel</button>
              <button className="btn-confirm-reset" onClick={resetAnswers}>Reset Everything</button>
            </div>
          </div>
        </div>
      )}

      <div className="layout">
        {/* Sidebar */}
        <div className="sidebar">
          {SECTIONS.map((s, i) => (
            <div
              key={s.id}
              className={`sidebar-section${i === currentSection ? " active" : ""}`}
              onClick={() => setCurrentSection(i)}
            >
              <div className={`sidebar-dot${i === currentSection ? " active" : i < currentSection ? " completed" : ""}`}>
                {i < currentSection ? "✓" : s.id}
              </div>
              {s.label}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="main" ref={mainRef}>
          <div className="section-label">Section {sec.id} of {SECTIONS.length}</div>
          <h1 className="section-title">{sec.label}</h1>
          <p className="section-desc">{sec.desc}</p>

          {sec.questions.map((q) => (
            <div className="q-card" key={q.id}>
              <div className="q-header">
                <span className="q-num">Q{pad(q.num)}</span>
                <span className="q-text">{q.text}</span>
              </div>
              {q.hint && <div className="q-hint">{q.hint}</div>}

              {q.type === "table" ? (
                <div className="q-table-wrap">
                  <table className="q-table">
                    <thead>
                      <tr>{q.cols.map((col, ci) => <th key={ci}>{col}</th>)}</tr>
                    </thead>
                    <tbody>
                      {answers[q.id].map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td key={ci}>
                              <input
                                value={cell}
                                onChange={(e) => handleTableChange(q.id, ri, ci, e.target.value)}
                                placeholder=""
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <>
                  {getBadge(q)}
                  <textarea
                    className={getInputClass(q)}
                    rows={q.rows || 2}
                    value={answers[q.id]}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="Type your answer here…"
                  />
                </>
              )}
            </div>
          ))}

          {/* Generate section on last page */}
          {isLast && (
            <div className="generate-section">
              <button className="btn-generate" onClick={generate} disabled={generating}>
                {generating ? <><span className="spinner" /> Generating…</> : "Generate Context Packet"}
              </button>
              {output && (
                <div className="output-panel">
                  <button
                    className={`btn-copy${copied ? " copied" : ""}`}
                    onClick={() => { navigator.clipboard.writeText(output); setCopied(true); }}
                  >
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                  <pre>{output}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Nav bar */}
      <div className="nav-bar">
        <div className="nav-status">
          <span>{sectionsWithResponses} of {SECTIONS.length} sections have responses</span>
          <span className="nav-legend"><span className="nav-dot poc" /> POC</span>
          <span className="nav-legend"><span className="nav-dot open" /> Open</span>
        </div>
        <div className="nav-buttons">
          {currentSection > 0 && (
            <button className="btn btn-back" onClick={() => setCurrentSection((p) => p - 1)}>← Back</button>
          )}
          {!isLast && (
            <button className="btn btn-next" onClick={() => setCurrentSection((p) => p + 1)}>Next →</button>
          )}
        </div>
      </div>
    </div>
  );
}
