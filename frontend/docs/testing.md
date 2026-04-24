# STR Comply — Test Suite Documentation

Run all tests: `npm test` (uses Vitest in node environment)

---

## Test inventory

| File | Feature | Cases |
|------|---------|-------|
| `__tests__/unit/normalize-query.test.ts` | `lib/normalize.ts` | 7 |
| `__tests__/api/search.test.ts` | `GET /api/search` | 8 |
| `__tests__/api/watchlist.test.ts` | `GET + POST /api/watchlist` | 9 |
| `__tests__/api/property-requirements.test.ts` | `GET /api/property/requirements` | 11 |
| `__tests__/agents/property-requirements-agent.test.ts` | `lib/agents/property-requirements-agent.ts` | 8 |
| `__tests__/api/ingest-market.test.ts` | `POST /api/admin/ingest-market` | 17 |
| `__tests__/agents/market-ingestion-agent.test.ts` | `lib/agents/market-ingestion-agent.ts` | 12 |

**Total: 72 test cases across 7 files** *(count reflects suite at time of writing; run `npm test` for live count)*

---

## Conventions

**Mocking db:**
All tests mock `@/lib/db` to avoid real DB connections. Because Prisma 7 + adapter-pg does not expose model accessors in tests, use `as unknown as` for type assertions on the mock:
```ts
const mockDb = db as unknown as { market: { findUnique: ReturnType<typeof vi.fn> } }
```
Routes that use `$queryRaw`/`$executeRaw` (not model accessors) mock `db.$queryRaw` and `db.$executeRaw` instead.

**Mocking Anthropic SDK:**
Use a regular `function` (not arrow) so `new Anthropic()` works as a constructor:
```ts
const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(function () {
    return { messages: { create: mockCreate } }
  }),
}))
```

**Mocking agents in route tests:**
Route tests mock the agent module so AI calls are never made:
```ts
vi.mock('@/lib/agents/market-ingestion-agent', () => ({
  runMarketIngestionAgent: vi.fn(),
}))
```

---

## Test case reference

### `normalize-query.test.ts`
| Case | Expectation |
|------|-------------|
| Lowercases input | `'Santa Monica'` → `'santa monica'` |
| Trims whitespace | `'  los angeles  '` → `'los angeles'` |
| Collapses multiple spaces | `'west   hollywood'` → `'west hollywood'` |
| Removes punctuation | `'santa monica, ca.'` → `'santa monica ca'` |
| Handles clean slug input | `'pasadena'` → `'pasadena'` |
| Handles combined whitespace + punctuation | `'  Malibu, CA!  '` → `'malibu ca'` |
| Handles empty string | `''` → `''` |

---

### `search.test.ts` — `GET /api/search`
**Input validation**
| Case | Expectation |
|------|-------------|
| `q` missing | 400 |
| `q` > 200 characters | 400 |

**Market resolution** (db fully mocked)
| Case | Expectation |
|------|-------------|
| Exact slug match | 200, `type: 'supported'`, `redirectUrl: '/market/santa-monica'` |
| Alias match (slug misses) | 200, `type: 'supported'` |
| Partial name match (slug + alias miss) | 200, `type: 'supported'` |
| No match found | 200, `type: 'unsupported'`, `normalizedQuery` present |
| Alias points to archived market | 200, `type: 'unsupported'` |
| DB error | 500 |

---

### `watchlist.test.ts` — `GET + POST /api/watchlist`
**GET** (auth + db mocked)
| Case | Expectation |
|------|-------------|
| Unauthenticated | 401 |
| Empty watchlist | 200, `[]` |
| Populated watchlist | 200, array with `marketSlug` and nested `market` |

**POST** (auth + db mocked)
| Case | Expectation |
|------|-------------|
| Unauthenticated | 401 |
| Invalid JSON body | 400 |
| `marketSlug` missing | 400 |
| Market does not exist | 404 |
| Market is archived | 404 |
| Valid request | 201, `watchlistItem.upsert` called once |

---

### `property-requirements.test.ts` — `GET /api/property/requirements`
**Input validation** (`lat`/`lon` use `z.coerce.number` — empty string coerces to 0, so "missing" is not a 400)
| Case | Expectation |
|------|-------------|
| `address` missing | 400 |
| `marketId` missing | 400 |
| `lat` is not a number | 400 |

**Property cache check**
| Case | Expectation |
|------|-------------|
| Address not in Property cache | 404 ("Run an address search first") |

**Happy path** (agent mocked)
| Case | Expectation |
|------|-------------|
| Valid request | 200, `disclaimerRequired: true` |
| Requirements array returned | `requirements[0].ruleKey === 'fire_inspection'` |
| `confidenceNote` + `reviewFlags` present | strings/arrays in body |
| Agent called with correct params | `lat: 34.0195`, `lon: -118.4912` |

**Agent errors**
| Case | Expectation |
|------|-------------|
| `ANTHROPIC_API_KEY` not configured | 503 |
| Agent throws `Market not found: ...` | 404 |
| Other agent failure | 500 |

---

### `property-requirements-agent.test.ts` — `lib/agents/property-requirements-agent.ts`
**Guards**
| Case | Expectation |
|------|-------------|
| `ANTHROPIC_API_KEY` not set | throws `'ANTHROPIC_API_KEY is not configured'` |
| Market not in DB | throws `'Market not found: mkt-santa-monica'` |

**Tool use extraction**
| Case | Expectation |
|------|-------------|
| Tool use block present | returns `requirements` with correct `ruleKey` |
| Text preamble before tool_use block | tool_use still found and parsed |
| No tool_use block in response | throws `'Agent did not return structured requirements'` |

**Result shape**
| Case | Expectation |
|------|-------------|
| All required fields present | `address`, `marketId`, `requirements`, `confidenceNote`, `reviewFlags` |
| Market rules in system prompt | `str_status`, `permit_required`, and market name present in system text |
| `tool_choice: any` used | forces structured output from Claude |

---

### `ingest-market.test.ts` — `POST /api/admin/ingest-market`
**Auth** (HMAC token, 5-min TTL)
| Case | Expectation |
|------|-------------|
| No Authorization header | 401 |
| Malformed token | 401 |
| Expired token (6 min old) | 401 |
| `AUTH_SECRET` not set | 500 (misconfiguration) |
| Fresh valid token | passes auth, reaches slug check |

**Input validation**
| Case | Expectation |
|------|-------------|
| Body is not valid JSON | 400 |
| `slug` missing from body | 400 |
| `slug` is empty string | 400 |

**Scope lock**
| Case | Expectation |
|------|-------------|
| Slug not in Market table | 404 ("Only existing markets can be refreshed") |

**Happy path** (agent + db mocked)
| Case | Expectation |
|------|-------------|
| Successful refresh | 200, `marketId`, `slug`, `confidenceScore`, `ruleCount`, `sourceCount` |
| `ruleDiff` in response | `added`, `removed`, `changed` arrays present |
| Added rules detected | `nightly_cap` appears in `ruleDiff.added` |
| Removed rules detected | `permit_required` appears in `ruleDiff.removed` |
| Changed rule values detected | `str_status.value` change captured with `from`/`to` |
| Diff summary in reviewNotes | at least one `added`/`removed`/`changed` note |
| Agent called with existing context | `existingMarket.slug`, `existingMarket.rules` present |

**DB writes**
| Case | Expectation |
|------|-------------|
| Market UPDATE executed | `UPDATE "Market"` call present |
| `freshnessStatus = 'needs_review'` on UPDATE | string `needs_review` in SQL call |
| Existing rules deleted | `DELETE FROM "MarketRule"` call present |
| Only active sources deleted | `DELETE FROM "MarketSource"` includes `active` filter |
| One rule INSERT per agent rule | INSERT count matches `result.rules.length` |
| One source INSERT per agent source | INSERT count matches `result.sources.length` |

**Agent errors**
| Case | Expectation |
|------|-------------|
| Agent throws | 500, `error: 'Agent failed'`, `detail` contains message |

---

### `market-ingestion-agent.test.ts` — `lib/agents/market-ingestion-agent.ts`
**Haiku pre-screen**
| Case | Expectation |
|------|-------------|
| JSON in single text block | parsed; two total API calls made |
| JSON in later text block (preamble prose first) | parsed without error |
| Haiku returns unparseable text | falls back to defaults, does not throw |

**Sonnet response parsing**
| Case | Expectation |
|------|-------------|
| JSON in single text block | result fields match `validAgentResult` |
| JSON in later text block | parsed correctly |
| No JSON in any block | throws with "parse" in message |
| Haiku notes carried into reviewNotes | `reviewNotes` contains Haiku note |

**Context grounding**
| Case | Expectation |
|------|-------------|
| Existing market JSON in Sonnet user message | `slug` and rule keys present in prompt content |
| Haiku notes in Sonnet prompt | note text present in user message |
| Existing slug preserved | `result.slug === 'santa-monica'` |

**Result shape**
| Case | Expectation |
|------|-------------|
| All required fields present | `strStatus` matches enum, `rules`/`sources` are arrays |
| Slug generated from cityName | when no existingMarket, slug derived from cityName |

---

## Adding new tests

1. Create `__tests__/api/<route-name>.test.ts` for routes, `__tests__/agents/<agent-name>.test.ts` for agents, `__tests__/unit/<util>.test.ts` for pure utilities.
2. Mock `@/lib/db` and `@anthropic-ai/sdk` at the top of every agent/route test (see conventions above).
3. Add a row to the inventory table above.
4. Run `npm test` before committing — all 78 cases must pass.
