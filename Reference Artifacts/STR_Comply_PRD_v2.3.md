**STR COMPLY**

Short-Term Rental Compliance Intelligence Platform

Product Requirements Document | v2.3 | Desktop-First Capstone Revision

| Author | Product Management Team |
| :---- | :---- |
| **Status** | Revised — Source Discovery Agent + Approval Flow Added |
| **Date** | April 2026 |
| **Phase** | Capstone Feasibility \+ MVP Validation |
| **Primary Persona** | STR Investor (Marcus) |

| TLDR: STR investors spend hours stitching together municipal code pages, city program websites, and informal sources just to answer one question: is this market worth pursuing for short-term rental use? This revision narrows the MVP to a desktop-first, high-trust lookup experience for a small set of LA-area markets, with grounded summaries, source links, timestamps, and a lightweight watchlist. |
| :---- |

**1\. About**

STR Comply is an AI-assisted short-term rental compliance intelligence product for investors and operators who need fast, jurisdiction-specific clarity on STR rules. The product is designed to reduce the time and uncertainty involved in answering the core acquisition question: “Is this market worth pursuing for STR use?”

This revision updates the original PRD to reflect feasibility findings from recent research and discussion. The long-term vision remains a broader compliance intelligence platform, but the capstone MVP is intentionally narrowed to a desktop-first experience focused on a limited set of LA-area jurisdictions and high-trust decision support.

**2\. Market Insights**

**Competitor Analysis**

The original PRD positioned STR Comply as a white-space opportunity. Updated research suggests the whitespace is narrower than originally stated. There are now investor-facing and adjacent products that overlap materially with parts of the concept, especially regulation databases, zoning or regulations lookups, and permit tracking.

| Competitor | Core Offering | Gap vs. Updated MVP | Pricing Signal |
| :---- | :---- | :---- | :---- |
| STR Profit Map | Investor-focused STR analytics plus regulations database and summaries | Closest feature overlap; still lighter on high-trust source-first workflow and LA-area depth | Mid-tier annual SaaS |
| RentPermit | Permit checker, dashboard, renewals, alerts | More permit-tracking oriented than underwriting and market screening | Low monthly SaaS |
| AirDNA | STR analytics with zoning / regulations signals | Strong in underwriting; less focused on cited legal interpretation | Premium analytics SaaS |
| Mashvisor | Real estate analytics plus short-term regulations tooling / API | Broader investor analytics; less focused on narrow compliance workflow | Mid-tier / API-led |
| Deckard / Host Compliance | Government-focused STR monitoring and enforcement | Indirect competitor; B2G rather than self-serve investor | Enterprise / government |
| Avalara MyLodgeTax | Lodging tax compliance | Tax-only; not a substitute for market legality decisions | Service / subscription |
| Manual Research | City websites, attorneys, forums, SEO blogs | Still the default workflow; slow and high variance | Free to high advisory cost |

Updated insight: the opportunity is not “no competitors.” It is a tighter wedge around a high-trust, desktop-first, source-linked market legality lookup for STR investors evaluating new markets quickly.

**Market Analysis**

* Platform-scale supply is clearly large, but some original PRD figures were too certain. Recent public reporting supports millions of Airbnb and Vrbo listings globally, while the exact size of the U.S. multi-property STR investor cohort remains directional rather than precisely validated.  
* The strongest validated market signal is not a single host-count statistic; it is that regulation is an active, growing constraint on STR supply and therefore a real underwriting variable for investors.  
* The original “\~400K investors managing 2+ properties” and associated TAM math should be treated as directional hypotheses, not fully validated facts.  
* For the MVP, the more important market test is whether investors will use and trust a faster legality lookup workflow in a constrained geographic wedge.

**Technology Analysis \- AI-Specific Landscape**

* Large language models can translate dense municipal rules into plain language when constrained to grounded source text.  
* RAG remains relevant for future scale, but a full production RAG \+ change-detection pipeline is not required for the capstone MVP.  
* The capstone should prefer curated ingestion plus AI-assisted summarization over automated scraping at scale.  
* Geocoding is helpful for user input normalization, but parcel-accurate multi-jurisdiction handling is out of scope for MVP.

**Customer Segments**

| Segment | Profile | WTP Signal |
| :---- | :---- | :---- |
| STR Investors (Primary) | Own 2-20 properties; acquisition-focused; often research several markets before buying | High relative to other cohorts if trust and time savings are proven |
| Solo Hosts (Secondary) | 1-2 properties; anxious about staying compliant | Lower and more price sensitive |
| Real Estate Agents / Brokers | Need fast STR viability answers for clients | Moderate; high lookup need but secondary for MVP |
| Property Managers | Manage multi-unit portfolios | High, but operational needs extend beyond capstone MVP |

**User Personas**

Marcus \- The STR Investor (Primary Persona)

* Age 38 | Denver, CO | 7-property STR portfolio  
* Goal: expand into new markets with faster underwriting decisions  
* Need: determine quickly whether a market is viable for STR before spending time on deeper analysis  
* Frustrations: fragmented city pages, legal jargon, outdated blogs, attorney costs, uncertainty about whether he is interpreting rules correctly  
* Quote: “I need to know in minutes whether this market is worth pursuing \- not after hours of research.”

Jessica \- The Solo Host (Secondary Persona)

* Age 29 | Austin, TX | 1 Airbnb property  
* Goal: stay compliant without legal help  
* Need: know whether she needs a permit, renewal, or policy update  
* Note: important secondary persona, but not the primary design target for the capstone MVP

**3\. The Problem**

**Use Cases**

* Investor evaluating a new market: needs to know whether STR activity appears allowed, restricted, or prohibited before making an offer or deeper underwriting investment  
* Existing host facing compliance uncertainty: needs a faster path to relevant rules and official sources  
* Agent or broker advising a buyer: needs a fast screening answer on STR viability  
* Portfolio operator comparing markets: needs a repeatable way to check and save target jurisdictions

**Pain Points**

* Fragmentation: relevant rules and program guidance are spread across municipal code publishers, city planning sites, tax offices, FAQs, forms, and portals  
* Opacity: dense legal language and policy terms such as primary residence, permit cap, or owner occupancy require interpretation  
* Trust deficit: blog posts, forums, and SEO articles may be outdated or incomplete  
* Speed problem: investors lose hours per property or market assembling a decision from multiple sources  
* Operational inconsistency: the process varies by jurisdiction, making repeatable market comparison difficult

**Problem Statement**

| PROBLEM | Marcus, an STR investor expanding into new markets, spends 3-8 hours researching fragmented regulations and still lacks confidence in his conclusion. That delays decisions, increases legal risk, and raises underwriting costs. |
| :---- | :---- |

**Hypotheses and Mission Statement**

Primary Hypothesis: If STR investors can enter a market or address and receive a fast, source-linked, plain-English legality summary with freshness signals, they will reduce research time substantially and trust the workflow enough to save and revisit markets.

Mission: To make short-term rental compliance more accessible, understandable, and actionable for investors and operators without replacing the need for formal legal advice in high-stakes cases.

**4\. The Solution**

**Ideation \- Full Feature Universe**

* Market or address-based STR lookup  
* Plain-English rule summaries  
* Source-linked rule cards  
* Freshness indicators  
* Watchlist for saved markets or properties  
* Change detection and alerts  
* Permit and license tracking  
* Scenario modeling  
* Attorney referral or escalation workflows  
* API access for downstream integrations

**Leveraging AI**

* For MVP, AI supports grounded summarization of curated legal and program source material.  
* AI is not the core infrastructure for the capstone build; data quality and trust are more important than maximal automation.  
* For future phases, AI can expand into change summarization, broader retrieval, and structured extraction once the underlying data layer is stronger.

| AI PRINCIPLE: For the capstone MVP, AI should only summarize grounded source material and should never be presented as a substitute for official legal interpretation. |
| :---- |

**Feature Prioritization \- RICE Framework**

| Feature | Reach | Impact | Confidence | Effort | Updated Priority |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Market-based lookup | 100% | 10 | 9 | 3 | MVP |
| Compliance summary card | 100% | 10 | 9 | 3 | MVP |
| Source-linked rule cards | 100% | 9 | 10 | 2 | MVP |
| Freshness indicator | 90% | 8 | 9 | 2 | MVP |
| Watchlist (markets only) | 60% | 7 | 8 | 2 | MVP |
| Property-level permit tracking | 40% | 7 | 4 | 7 | Post-MVP |
| Automated change alerts | 50% | 8 | 5 | 8 | Backend agent built (off by default); user-facing alerts remain post-MVP |
| Source Discovery Agent | 20% | 9 | 10 | 3 | **Maintainer tool — shipped** — auto-finds replacement URLs for broken sources using Claude Sonnet + web_search with Haiku validation gate |
| Source Approval Flow | 20% | 9 | 10 | 2 | **Maintainer tool — shipped** — HMAC-signed email links let maintainers approve or dismiss discovered replacement sources |
| Confidence scoring model | 40% | 6 | 3 | 7 | Post-MVP |

Updated scope decision: the original seven-feature MVP is not feasible for the capstone. The capstone MVP consists of five core features only: market-based lookup, compliance summary card, source links, freshness indicator, and market watchlist.

**AI MVP Architecture Overview**

* Data ingestion layer: curated collection of official market pages, program documentation, and code references for a small set of LA-area jurisdictions  
* Storage layer: simple structured records for each market, with rule fields and source URLs  
* Summary layer: pre-generated or batch-generated AI summaries reviewed against source material  
* Application layer: desktop-first React web experience with search, results, and watchlist  
* Backend layer: lightweight API for search and saved items; no production-grade scrape pipeline required for the capstone  
* Refresh model: automated weekly background agent (off by default) fetches source URLs, detects regulatory changes, and either auto-updates low-risk content or flags high-risk changes for human review; humans approve before compliance facts are overwritten
* Source recovery: when a source URL goes permanently broken, the Source Discovery Agent (Claude Sonnet + web\_search, Haiku validation gate) automatically finds replacement candidates; maintainers receive HMAC-signed approve/dismiss links via email and activate replacements with one click

**Roadmap**

| Phase | Timeline | Deliverables |
| :---- | :---- | :---- |
| Phase 0 | Capstone Weeks 1-2 | Market selection, source collection, structured data schema, desktop UX skeleton |
| Phase 1 (MVP) | Capstone Weeks 3-4 | Desktop-first lookup, summary card, source links, freshness indicator, watchlist |
| Phase 2 | Post-capstone | Additional markets, alerts, broader ingestion, stronger retrieval layer |
| Phase 3 | Future | Permit workflows, monitoring, APIs, richer portfolio intelligence |

**Assumptions and Constraints**

* Assumption: a small set of official LA-area STR sources can be curated quickly enough for a capstone MVP  
* Assumption: investors will value a fast market-screening workflow even without full parcel-level precision  
* Assumption: grounded summaries plus sources are sufficient to test trust in the product concept  
* Constraint: municipal code portals and city program pages are fragmented and may not support scalable scraping or commercial reuse cleanly
* Constraint: a compliance monitor agent has been built to automate freshness checking at low cost (< $0.05/month at current scale). It is disabled by default and toggled via `COMPLIANCE_MONITOR_ENABLED` environment variable
* Constraint: a source discovery agent has been built to automatically find replacement URLs when sources go permanently broken. It runs within the compliance monitor and as an on-demand CLI (`scripts/discover-sources.ts`). Replacements require maintainer approval via signed email link before activation  
* Constraint: permit registry and enforcement truth data are not consistently public or structured  
* Constraint: the team has limited AI and backend depth, so the MVP must avoid infrastructure-heavy features

**Risks**

| Risk | Severity | Mitigation |
| :---- | :---- | :---- |
| User assumes result is definitive legal advice | High | Prominent disclaimer, official source links, and clear scope language |
| Summary is inaccurate or overconfident | High | Use grounded source text, keep summaries concise, manual review on MVP markets |
| Data becomes stale | Medium | Display last-updated timestamp and needs-review badge |
| Too little market coverage to demonstrate value | Medium | Choose high-signal LA-area markets and message coverage clearly |
| Team overbuilds AI / scraping infra | High | Keep architecture curated and desktop-first for capstone |

**5\. Requirements**

**User Journeys**

Current-State Journey \- No AI Product

* Marcus discovers a property or market of interest on Zillow, Redfin, or a brokerage feed  
* He searches Google, forums, and SEO content for STR rules  
* He moves to city planning, tax, or municipal code websites to verify what applies  
* He interprets legal language manually and may ask a broker, local operator, or attorney for confirmation  
* He makes a decision slowly and with incomplete confidence

MVP Journey \- Desktop-First Lookup Experience

* Marcus enters an address or market in the search bar  
* System maps the query to a supported market and returns a compliance card  
* Marcus sees STR allowed / not allowed / conditional, permit required yes / no, owner-occupied yes / no, and a short summary  
* He clicks official sources to validate the result and reviews the last-updated timestamp  
* He saves the market to a watchlist if it remains relevant

**Functional Requirements**

* F1 \- Market-Based Lookup: system shall accept a free-text address or market input and map it to a supported city or jurisdiction  
* F2 \- Compliance Summary Card: system shall display whether STR activity is allowed, not allowed, or conditional, along with permit required and owner-occupied signals  
* F3 \- Plain-English Summary: system shall present a concise summary grounded in curated source material  
* F4 \- Source-Linked Rule Cards: every result shall include at least one official source link  
* F5 \- Freshness Indicator: every market result shall display a last-updated timestamp and a needs-review state when appropriate  
* F6 \- Watchlist: authenticated users shall be able to save a limited number of markets for later review

**Non-Functional Requirements**

* Desktop-first responsive web interface optimized for laptop research workflows  
* Fast search and result load for supported markets  
* Readable, source-forward experience that prioritizes clarity over dense detail  
* Accessibility-conscious information hierarchy and contrast  
* Clear 'not legal advice' messaging in all result views

**AI & Data Requirements**

* Data coverage: 5-10 LA-area markets for MVP  
* Sources: official city / county planning, finance, registration, and code resources  
* LLM usage: batch or offline summary generation against grounded text only  
* No production-scale embeddings, monitoring pipeline, or ML confidence model required for capstone  
* Telemetry events: search\_performed, result\_viewed, source\_clicked, market\_saved, unsupported\_market\_seen

**6\. Challenges**

* Data fragmentation remains the central product challenge; official truth is often split across code publishers, city pages, and operational portals  
* Jurisdiction complexity is especially high in LA and surrounding areas because city, county, and special-area rules may differ  
* Trust can fail quickly if summaries overstate certainty  
* Limited market coverage means onboarding and positioning must clearly explain what is and is not supported  
* Scaling beyond MVP will require a more durable data operations strategy than the capstone can support

**7\. Positioning**

| Use Case | Pain Point | Updated STR Comply Solution | Impact |
| :---- | :---- | :---- | :---- |
| New market evaluation | Hours of fragmented research | Fast desktop lookup with grounded summary and sources | Faster go / no-go decision |
| Trust validation | Unclear which source is authoritative | Official source links plus timestamp | Higher confidence in results |
| Market comparison | Re-researching the same markets repeatedly | Saved market watchlist | Simpler repeat workflow |
| Future monitoring | Rules may change after research | Positioned as future roadmap, not MVP | Clearer scope and expectation setting |

**8\. Measuring Success**

**Metrics**

| Metric | Definition | MVP Target | Why It Matters |
| :---- | :---- | :---- | :---- |
| Lookup completion rate | % of searches that return a supported market result | 70%+ | Shows whether supported coverage and UX are working |
| Source click-through rate | % of result views with source click | 25%+ | Measures trust and validation behavior |
| Watchlist conversion | % of results saved to watchlist | 15-25% | Signals ongoing interest |
| Task time reduction | Median time to answer core legality question | Under 3 minutes in tests | Directly maps to user pain |
| User confidence score | Self-reported confidence after lookup | Improves vs. current workflow baseline | Validates decision-support value |

**AI-Specific Metrics**

* Summary grounding quality: reviewer confirms summary matches cited source material  
* Unsupported claim rate: target near zero for claims not backed by displayed sources  
* User trust signal: users report that the summary is understandable and adequately sourced

**North Star Metric**

| NORTH STAR | Supported market decisions completed \- the count of lookup sessions where a user reaches a result, reviews the summary, and validates with source material. This better matches the capstone MVP than a broad monitored-properties metric. |
| :---- | :---- |

**9\. Launching**

**Stakeholders & Communication**

| Stakeholder | Role | Cadence |
| :---- | :---- | :---- |
| Engineering Lead / BE support | Core technical delivery | Frequent check-ins during capstone build |
| PM team | Scope, prioritization, synthesis | Daily or near-daily working syncs |
| Design / FE contributors | Desktop UX, clarity, trust presentation | Sprint-based collaboration |
| Target users / interviewees | Usability and trust feedback | Lightweight feedback sessions |

**Roll-Out Strategy**

* Capstone demo scope: limited LA-area market coverage with explicit support boundaries  
* Use pilot messaging rather than broad public-launch language  
* Validate with a small set of STR investor interviews or usability tests focused on speed, trust, and clarity  
* Use the capstone output to decide whether to invest in deeper data infrastructure and post-MVP features