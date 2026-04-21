# STR Comply — Design System
**Version:** 1.0
**Date:** April 2026
**Type:** Design Principle Artifact — Reference Document
**Status:** Approved for Implementation
**Derived From:** PRD v2.3, SRD v1.4, STR_Comply_AccessibilitySpec_v1.0.md

---

## Changelog

- v1.0 (2026-04-19): Initial design system. Defines philosophy, color tokens (aspirational — `tokens.css` not yet created), typography, component patterns, layout rules, content display patterns, anti-patterns, and implementation notes.

---

> **How to use this document**
> Load this file into Claude Code's context whenever working on any UI component, page layout, or styling decision. It is the authoritative source for visual decisions. Do not derive design rules from existing component code — this document takes precedence.

---

## 1. Purpose

This document is the single source of truth for visual design decisions in STR Comply. It is written for two audiences: developers implementing components, and Claude Code sessions working on UI. It defines the token vocabulary, component anatomy, layout constraints, and the reasoning behind each decision. It does not replace the Accessibility Spec — accessibility conformance criteria live in `STR_Comply_AccessibilitySpec_v1.0.md` and are cross-referenced here, not duplicated. It does not replace the SRD — functional requirements live there. This document governs only the visual layer: what things look like, what tokens they use, and what patterns are permitted or prohibited.

---

## 2. Design Philosophy

The eight principles below are not aesthetic preferences. Each one exists because Marcus — the primary user — needs to trust this tool the way he trusts a government records page. Any deviation from these principles should be treated as a defect, not a style discussion.

---

**Principle 1: Trust is conveyed through restraint, not polish.**

Compliance information is high-stakes. Visual complexity — gradients, drop shadows, motion, decorative color — signals that something is trying to look impressive rather than be reliable. The correct model is a well-structured government form, not a SaaS marketing page. Every decorative element that can be removed should be removed. What remains must earn its place by carrying meaning.

---

**Principle 2: One accent color; everything else is neutral.**

A single accent color (indigo) is used exclusively for interactive elements: primary buttons, links, and focus rings. All other chrome — cards, containers, labels, headings, dividers — is built from the neutral scale. This makes interactive affordances immediately legible and prevents the interface from competing with the compliance status information it exists to display.

---

**Principle 3: STR status gets its own semantic palette — used nowhere else.**

The status colors (green for `allowed`, amber for `conditional`, red for `not_allowed`) are exclusively reserved for STR legality status. Using status green for a success toast, a save confirmation, or a positive metric would pollute the semantic meaning that users learn to rely on. If an element is not communicating STR legality status, it must not use status tokens.

---

**Principle 4: Status must never rely on color alone.**

Color is a secondary signal, not the primary one. Every status indicator must combine color with a labeled icon and text. This is required by WCAG 2.1 AA (see `STR_Comply_AccessibilitySpec_v1.0.md`, Section 3) and is also good design: it makes status legible in print, on low-quality screens, and for the roughly 8% of male users with red-green color deficiency.

---

**Principle 5: Freshness has its own visual language, separate from status.**

Data freshness (`fresh`, `review_due`, `needs_review`) is a distinct concept from STR legality status. A market can be "allowed" with "review_due" data — these are orthogonal facts. Freshness uses deliberately different hues (teal, orange, violet) so it cannot be confused with status at a glance. Freshness indicators are small and subordinate — a dot and a timestamp — never a full colored card.

---

**Principle 6: Type hierarchy does more work than color.**

With only two font weights (400 regular, 500 medium) and a seven-step size scale, the type system must carry all hierarchical weight. Color must not substitute for structure. A heading is a heading because it is larger, not because it is a different color. Body text is body text because of its weight and size, not because it is tinted.

---

**Principle 7: Define tokens, not values.**

No component should ever reference a raw hex value. Every color, spacing unit, radius, and border width flows through a named token. This rule has two purposes: it keeps the system coherent (changing a token propagates everywhere), and it makes violations immediately visible during code review.

---

**Principle 8: Disclaimers and source links are design elements, not afterthoughts.**

The disclaimer is a product safety requirement (SRD Section 17.2). Source links are the mechanism by which Marcus can verify information and build trust in the tool. Neither should be rendered as small gray text at the bottom of the page. Both receive real visual weight: the disclaimer is a consistently-styled banner, and source links are sized and labeled to be easy to find and use.

---

## 3. Color Tokens

> **Status:** Aspirational. `frontend/app/tokens.css` does not yet exist. These definitions specify what that file must contain when created. See Section 9 for implementation instructions.

Tokens are organized by purpose, not by hue. Never reach for a hue when a purpose-named token exists.

---

### 3.1 Neutrals

Used for all non-interactive chrome: backgrounds, borders, dividers, body text, headings. The neutral scale is the structural skeleton of every page.

| Token | Hex | Intended Use |
|-------|-----|--------------|
| `--neutral-50` | `#F8FAFC` | Page background, subtle surface fills |
| `--neutral-100` | `#F1F5F9` | Hover state on neutral elements; jurisdiction pill background |
| `--neutral-200` | `#E2E8F0` | Default borders; card borders |
| `--neutral-300` | `#CBD5E1` | Dividers; input borders at rest |
| `--neutral-400` | `#94A3B8` | Muted text; disabled text; placeholder text |
| `--neutral-500` | `#64748B` | Secondary descriptive text |
| `--neutral-600` | `#475569` | Body text; jurisdiction pill text |
| `--neutral-700` | `#334155` | Strong body text; emphasized labels |
| `--neutral-800` | `#1E293B` | Section headings |
| `--neutral-900` | `#0F172A` | Primary text; page headings |

**Do:** Use `--neutral-900` for all primary text, `--neutral-600` for secondary descriptive copy, `--neutral-200` for card borders.

**Don't:** Use neutrals interchangeably with status or accent tokens. Don't use `--neutral-500` for body text if you need legible contrast — use `--neutral-600` or darker.

---

### 3.2 Accent

Used exclusively for interactive elements: primary buttons, text links, focus rings. No decorative uses.

| Token | Hex | Intended Use |
|-------|-----|--------------|
| `--accent-50` | `#EEF2FF` | Accent-tinted backgrounds (disclaimer banner surface) |
| `--accent-500` | `#4F46E5` | Primary button background; link color; focus ring color |
| `--accent-700` | `#3730A3` | Primary button hover state |
| `--accent-900` | `#1E1B4B` | Primary button active/pressed state |

**Do:** Use `--accent-500` for the primary button and all text links. Use `--accent-50` as the background tint for the DisclaimerBanner.

**Don't:** Use accent tokens on non-interactive elements. Don't use a second accent color anywhere in the chrome.

---

### 3.3 Status

Reserved exclusively for STR legality status. These tokens must never appear on any element that is not directly communicating `allowed`, `conditional`, or `not_allowed` status.

**Allowed (green):**

| Token | Hex | Use |
|-------|-----|-----|
| `--status-allowed-bg` | `#F0FDF4` | Badge background |
| `--status-allowed-border` | `#BBF7D0` | Badge border |
| `--status-allowed-text` | `#15803D` | Badge text label |
| `--status-allowed-icon` | `#16A34A` | Badge icon fill |

**Conditional (amber):**

| Token | Hex | Use |
|-------|-----|-----|
| `--status-conditional-bg` | `#FFFBEB` | Badge background |
| `--status-conditional-border` | `#FDE68A` | Badge border |
| `--status-conditional-text` | `#B45309` | Badge text label |
| `--status-conditional-icon` | `#D97706` | Badge icon fill |

**Not Allowed (red):**

| Token | Hex | Use |
|-------|-----|-----|
| `--status-not-allowed-bg` | `#FEF2F2` | Badge background |
| `--status-not-allowed-border` | `#FECACA` | Badge border |
| `--status-not-allowed-text` | `#B91C1C` | Badge text label |
| `--status-not-allowed-icon` | `#DC2626` | Badge icon fill |

**Do:** Use status tokens only inside the `StatusBadge` component. Every status state must render an icon plus a text label — never color alone.

**Don't:** Use `--status-allowed-*` for a success confirmation, a positive metric, or any other non-status UI. Don't use `--status-not-allowed-*` for a destructive button or error message.

---

### 3.4 Freshness

Used exclusively for the `FreshnessIndicator` component. Hues are deliberately distinct from all status colors to prevent confusion between data age and STR legality.

| Token | Hex | Intended Use | Why this hue |
|-------|-----|--------------|--------------|
| `--freshness-fresh-dot` | `#0D9488` | Dot fill for `fresh` state | Teal — distinct from status green |
| `--freshness-review-due-dot` | `#EA580C` | Dot fill for `review_due` state | Orange — distinct from status amber |
| `--freshness-needs-review-dot` | `#7C3AED` | Dot fill for `needs_review` state | Violet — distinct from all status colors |

**Do:** Use these tokens only inside `FreshnessIndicator`. Size the dot so it is visually subordinate to the status badge — it is secondary information.

**Don't:** Use freshness colors anywhere outside `FreshnessIndicator`. Don't use the same hue for a freshness state and a status state, even if they seem "close enough."

---

### 3.5 Semantic Aliases

These tokens reference the primitives above and should be used in component code instead of directly naming a primitive. This is the only layer that components should consume.

| Token | Resolves To | Use |
|-------|-------------|-----|
| `--text-primary` | `var(--neutral-900)` | All primary body text and headings |
| `--text-secondary` | `var(--neutral-600)` | Descriptive labels, metadata, secondary copy |
| `--text-muted` | `var(--neutral-400)` | Placeholders, disabled states, supplemental notes |
| `--surface-page` | `#ffffff` | Page background |
| `--surface-card` | `#ffffff` | Card background |
| `--surface-subtle` | `var(--neutral-50)` | Inset sections, subtle container fills |
| `--border-subtle` | `var(--neutral-200)` | Card borders, thin dividers |
| `--border-default` | `var(--neutral-300)` | Input borders, heavier dividers |

**Do:** Use semantic aliases in all component code. `background: var(--surface-card)` is correct. `background: #ffffff` is not.

**Don't:** Skip the alias layer and reference primitives directly in components.

---

## 4. Typography

**Font family:** System sans stack — matches the existing `tailwind.config.ts` font family configuration.

```
-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif
```

**Weights:** Two only. 400 (regular) and 500 (medium). Weights 600, 700, and above are prohibited. They introduce visual heaviness that conflicts with the restrained aesthetic and are unnecessary given the size scale available.

**Type scale:**

| Step | Size | Line Height | Typical Use |
|------|------|-------------|-------------|
| xs | 12px | 1.3 | Fine print, legal notes, metadata |
| sm | 13px | 1.3 | Labels, pills, badge text |
| base-sm | 15px | 1.6 | Secondary body copy |
| base | 16px | 1.6 | Primary body copy |
| lg | 18px | 1.3 | Card headings, emphasized labels |
| xl | 22px | 1.3 | Section headings |
| 2xl | 28px | 1.3 | Page-level headings |

**Line heights:**
- **1.3 (tight):** Headings and single-line labels where vertical compactness is preferred.
- **1.6 (body):** Multi-line prose, summaries, rule descriptions. Necessary for readability at body sizes.

**Hierarchy:** Size and weight carry the full hierarchy. Color must not substitute for typographic structure. A heading is identified by its size (22–28px) and optionally weight (500), not by being a different color than body text.

---

## 5. Component Patterns

Each component is specified with its structure, tokens, a JSX skeleton, and a do/don't table. All components must be implemented as shared components — never ad hoc inline styles.

---

### 5.1 StatusBadge

**Purpose:** Displays STR legality status. The single most important visual element on a result page.

**Variants:** `allowed` | `conditional` | `not_allowed`

**Structure:** Icon (SVG) + text label, inside a pill-shaped container. The icon must be `aria-hidden="true"` — the text label carries semantic meaning. The container receives a `role="status"` and `aria-label` for screen readers.

**Tokens used:**
- Background: `--status-{variant}-bg`
- Border: `--status-{variant}-border`
- Text: `--status-{variant}-text`
- Icon fill: `--status-{variant}-icon`

```tsx
<span
  role="status"
  aria-label={`STR status: ${label}`}
  className={`status-badge status-badge--${variant}`}
>
  <StatusIcon variant={variant} aria-hidden="true" focusable="false" />
  <span>{label}</span>
</span>
```

Icons by variant: `allowed` → checkmark circle, `conditional` → warning triangle, `not_allowed` → X circle. See `STR_Comply_AccessibilitySpec_v1.0.md` Section 3 for WCAG conformance requirements.

| Do | Don't |
|----|-------|
| Always render icon + text label | Render color alone or icon alone |
| Use status tokens from Section 3.3 | Use status tokens on any non-status UI |
| One badge per result header | Stack or repeat badges in a single context |

---

### 5.2 FreshnessIndicator

**Purpose:** Communicates data age. Subordinate to the status badge — it is secondary information.

**Variants:** `fresh` | `review_due` | `needs_review`

**Structure:** Small filled dot + timestamp text. The dot is a visual accent; the text is the primary communicator. Never a full colored card or banner.

**Tokens used:**
- Dot fill: `--freshness-{variant}-dot`
- Text: `--text-secondary`

```tsx
<div
  className="freshness-indicator"
  aria-label={`Data freshness: ${label}. Last reviewed ${formattedDate}.`}
>
  <span
    className={`freshness-dot freshness-dot--${variant}`}
    aria-hidden="true"
  />
  <span className="freshness-label">Last reviewed {formattedDate}</span>
</div>
```

| Do | Don't |
|----|-------|
| Size the dot to be visually subordinate (6–8px) | Make freshness as visually prominent as status |
| Include a timestamp in the text | Display the dot without a human-readable date |
| Use freshness tokens from Section 3.4 | Reuse any status token for a freshness state |

---

### 5.3 SourceLink

**Purpose:** Provides direct access to the primary source document. Receives meaningful visual weight — it is a core trust mechanism, not a footnote.

**Structure:** Title text + publisher name + external-link icon. Always opens in a new tab. Includes a screen-reader-only "(opens in new tab)" label.

**Tokens used:**
- Text color: `--accent-500`
- Font size: 15–16px (`base-sm` or `base`)
- Icon: `--accent-500`

```tsx
<a
  href={source.url}
  target="_blank"
  rel="noopener noreferrer"
  className="source-link"
>
  <span className="source-title">{source.title}</span>
  <span className="source-publisher"> — {source.publisher}</span>
  <ExternalLinkIcon
    className="source-link-icon"
    aria-hidden="true"
    focusable="false"
  />
  <span className="sr-only">(opens in new tab)</span>
</a>
```

| Do | Don't |
|----|-------|
| Include both title and publisher | Show only a bare URL or generic "Source" label |
| Make touch target ≥ 44×44px | Size at 13px or smaller |
| Always use `rel="noopener noreferrer"` | Open in the same tab |

---

### 5.4 RuleCard

**Purpose:** Displays a single compliance rule (e.g., "Permit Required: Yes"). Groups one rule with its optional jurisdiction level tag.

**Structure:** Neutral surface card. Optional jurisdiction pill at top. Rule title and rule value. Optional notes text.

**Tokens used:**
- Background: `--surface-card`
- Border: `--border-subtle` (0.5px)
- Jurisdiction pill: `--neutral-100` background, `--neutral-600` text
- Title: `--text-primary`, 18px, weight 500
- Value: `--text-primary`, 16px, weight 400
- Notes: `--text-secondary`, 15px

```tsx
<article className="rule-card">
  {rule.jurisdictionLevel && (
    <span className="jurisdiction-pill">{rule.jurisdictionLevel}</span>
  )}
  <h3 className="rule-title">{rule.title}</h3>
  <p className="rule-value">{rule.value}</p>
  {rule.notes && (
    <p className="rule-notes">{rule.notes}</p>
  )}
</article>
```

| Do | Don't |
|----|-------|
| Use a neutral surface — cards should not be colored | Apply status or accent color to the card surface |
| Render jurisdiction pill in neutral tones | Color the pill by jurisdiction level |
| Use `<article>` for semantic grouping | Use a generic `<div>` as the root element |

---

### 5.5 DisclaimerBanner

**Purpose:** Displays the required legal disclaimer on every result page. Always visible — never collapsible or dismissible.

**Structure:** Accent-tinted surface. Info icon at left. Disclaimer copy from SRD Section 17.2. The banner is `role="note"` for screen readers.

**Tokens used:**
- Background: `--accent-50`
- Border: `--accent-500` (left border or full border)
- Icon and text: `--accent-700`

```tsx
<aside
  role="note"
  aria-label="Disclaimer"
  className="disclaimer-banner"
>
  <InfoIcon
    className="disclaimer-icon"
    aria-hidden="true"
    focusable="false"
  />
  <p className="disclaimer-text">{DISCLAIMER_TEXT}</p>
</aside>
```

The disclaimer copy lives in SRD Section 17.2. Import it as a constant — never hardcode it inline.

| Do | Don't |
|----|-------|
| Always render on result pages | Make it collapsible or dismissible |
| Use `--accent-50` background tint | Use `--status-allowed-bg` or any status token |
| Import copy from a shared constant | Paraphrase or weaken the required language |

---

### 5.6 PrimaryButton / SecondaryButton

**Purpose:** Primary actions (save to watchlist, search). Secondary actions (navigate, cancel).

**Tokens used — Primary:**
- Background: `--accent-500`
- Background hover: `--accent-700`
- Background active: `--accent-900`
- Text: `#ffffff`
- Focus ring: `--accent-500` (2px offset ring)

**Tokens used — Secondary:**
- Background: `--surface-card`
- Border: `--border-default`
- Text: `--text-primary`
- Hover: `--surface-subtle` background

```tsx
<button type="button" className="btn-primary">
  {label}
</button>

<button type="button" className="btn-secondary">
  {label}
</button>
```

| Do | Don't |
|----|-------|
| Use `--accent-500` only on Primary | Apply accent color to Secondary buttons |
| Ensure focus ring is visible at 2px (see Accessibility Spec Section 4) | Remove focus ring without a visible replacement |
| Use weight 500 for button labels | Use weight 600 or 700 |

---

## 6. Layout Rules

**Max content width:** 720px for result pages (compliance summaries, rule cards, source lists). This keeps reading line length comfortable and prevents the interface from feeling diluted on wide viewports.

**Spacing scale (px):** 4 / 8 / 12 / 16 / 20 / 24 / 32. No intermediate values. All padding, margin, and gap values must come from this scale.

**Border radii:**
- **6px:** Small elements — pills, tags, small badges.
- **8px:** Default — buttons, inputs.
- **12px:** Large — cards, banners, containers.

**Border width:** 0.5px for card borders and dividers. Thin reads as refined. 1px for input borders at rest; 2px for focus rings (accessibility requirement — see Accessibility Spec Section 4).

**Card pattern:**
```
background: var(--surface-card);
border: 0.5px solid var(--border-subtle);
border-radius: 12px;
padding: 16px 20px;
```

Cards on hover or in an active state may elevate to `--border-default` border color. No drop shadows.

---

## 7. Content Display Patterns

### 7.1 Compliance Summary

Summary text must be 120–180 words (SRD Section 17.1). It is stored content, never AI-generated at runtime. Render in 16px weight-400 body copy, `--text-primary`, line-height 1.6. No special formatting within the summary block — it is plain prose.

### 7.2 Disclaimer Text

Copy is defined in SRD Section 17.2. Formatting is defined here: render inside `DisclaimerBanner` (Section 5.5). Font size 15px (`base-sm`), weight 400, color `--accent-700`. Do not alter the copy or move it to a collapsed or footnote-style element.

### 7.3 Empty States

**Watchlist empty state:** Display inside the watchlist page content area. Copy: neutral, direct, non-marketing. No animated illustrations. Use `--text-secondary` for the message text. Provide one CTA link (search) in accent color.

**Unsupported market empty state:** Triggered when a search query cannot be matched to a supported market. Display the unsupported state page (SRD Section 16). Copy must acknowledge the query and explain that the market is not currently supported. Provide a path back to search.

### 7.4 JurisdictionLevel Pills

Values: `city` | `county` | `state`. Render as a neutral pill — not colored by level. All three values use identical styling.

```
background: var(--neutral-100);
color: var(--neutral-600);
font-size: 13px;
font-weight: 400;
border-radius: 6px;
padding: 2px 8px;
```

Coloring pills by jurisdiction level (e.g., blue for state, green for city) is prohibited — it creates a false visual vocabulary that conflicts with the status and freshness palettes.

---

## 8. Anti-Patterns

The following patterns are explicitly prohibited. Treat them as defects when found in the codebase.

---

**Using status colors on non-status UI.**

```tsx
// WRONG — green save button borrows the "allowed" semantic
<button style={{ background: '#16A34A' }}>Saved</button>

// CORRECT — use accent for interactive elements
<button className="btn-primary">Save Market</button>
```

---

**More than one accent color in the chrome.**

Any element using a second accent (teal, orange, a second shade of blue) competes with the status and freshness palettes. If an element needs color, ask whether it is communicating status or freshness. If not, it should be neutral.

---

**Font weights outside the 400/500 scale.**

`font-weight: 600` and `font-weight: 700` are prohibited. They add visual heaviness that conflicts with the restrained aesthetic and are not necessary given the size scale. If emphasis is needed, increase size, not weight.

---

**Color-only status indicators.**

```tsx
// WRONG — dot alone fails WCAG 1.4.1 (color cannot be the only differentiator)
<span className="green-dot" />

// CORRECT — icon + text label + color together
<StatusBadge variant="allowed" />
```

---

**Hardcoded hex values in `.tsx` files.**

```tsx
// WRONG
<div style={{ color: '#15803D' }}>Allowed</div>

// CORRECT
<div style={{ color: 'var(--status-allowed-text)' }}>Allowed</div>
// or via Tailwind utility mapped to a token (see Section 9)
```

---

**Reusing the status palette for freshness states.**

`fresh` must not use status green. `review_due` must not use status amber. `needs_review` must not use status red. These are separate palettes with separate tokens. See Section 3.4.

---

## 9. Implementation Notes

### 9.1 Create tokens.css

`frontend/app/tokens.css` does not yet exist. Create it with the following content and import it in the root layout.

```css
/* frontend/app/tokens.css */
/* Design token definitions. Edit here; never hardcode hex values in components. */

:root {
  /* Neutrals */
  --neutral-50:  #F8FAFC;
  --neutral-100: #F1F5F9;
  --neutral-200: #E2E8F0;
  --neutral-300: #CBD5E1;
  --neutral-400: #94A3B8;
  --neutral-500: #64748B;
  --neutral-600: #475569;
  --neutral-700: #334155;
  --neutral-800: #1E293B;
  --neutral-900: #0F172A;

  /* Accent — interactive elements only */
  --accent-50:  #EEF2FF;
  --accent-500: #4F46E5;
  --accent-700: #3730A3;
  --accent-900: #1E1B4B;

  /* Status — STR legality only */
  --status-allowed-bg:          #F0FDF4;
  --status-allowed-border:      #BBF7D0;
  --status-allowed-text:        #15803D;
  --status-allowed-icon:        #16A34A;

  --status-conditional-bg:      #FFFBEB;
  --status-conditional-border:  #FDE68A;
  --status-conditional-text:    #B45309;
  --status-conditional-icon:    #D97706;

  --status-not-allowed-bg:      #FEF2F2;
  --status-not-allowed-border:  #FECACA;
  --status-not-allowed-text:    #B91C1C;
  --status-not-allowed-icon:    #DC2626;

  /* Freshness — data age only; deliberately different hues from status */
  --freshness-fresh-dot:        #0D9488;
  --freshness-review-due-dot:   #EA580C;
  --freshness-needs-review-dot: #7C3AED;

  /* Semantic aliases */
  --text-primary:    var(--neutral-900);
  --text-secondary:  var(--neutral-600);
  --text-muted:      var(--neutral-400);

  --surface-page:    #ffffff;
  --surface-card:    #ffffff;
  --surface-subtle:  var(--neutral-50);

  --border-subtle:   var(--neutral-200);
  --border-default:  var(--neutral-300);
}
```

### 9.2 Import in Root Layout

Add `import './tokens.css'` at the top of `frontend/app/layout.tsx`, after the existing `globals.css` import.

### 9.3 Mirror Tokens in Tailwind Config

Extend `tailwind.config.ts` so that Tailwind utility classes resolve to the tokens. This allows `className="text-text-primary"` to work in components:

```typescript
// tailwind.config.ts (extend section)
theme: {
  extend: {
    fontFamily: { /* existing */ },
    colors: {
      neutral: {
        50: 'var(--neutral-50)',
        100: 'var(--neutral-100)',
        200: 'var(--neutral-200)',
        300: 'var(--neutral-300)',
        400: 'var(--neutral-400)',
        500: 'var(--neutral-500)',
        600: 'var(--neutral-600)',
        700: 'var(--neutral-700)',
        800: 'var(--neutral-800)',
        900: 'var(--neutral-900)',
      },
      accent: {
        50:  'var(--accent-50)',
        500: 'var(--accent-500)',
        700: 'var(--accent-700)',
        900: 'var(--accent-900)',
      },
      // Status and freshness tokens are consumed via CSS custom properties
      // in component-level styles — not as Tailwind utilities — to enforce
      // that they are only used inside their designated shared components.
    },
  },
},
```

### 9.4 Shared Components Are Mandatory

Every instance of status and freshness display must go through the shared components defined in Section 5. No ad hoc inline color for status or freshness is permitted. If the shared component does not cover a needed variant, extend the shared component — do not create a one-off inline version.

### 9.5 Lint Rule

Add a lint rule to reject raw hex values in `.tsx` files. The preferred approach is a custom ESLint rule or a stylelint rule targeting `style` prop values. Until the lint rule is in place, treat raw hex values in component code as a PR review failure.

---

## 10. Cross-References

| Document | Scope | Where it overlaps with this doc |
|----------|-------|----------------------------------|
| `Reference Artifacts/STR_Comply_PRD_v2.3.md` | Product intent, user goals, Marcus persona | Design philosophy rationale in Section 2 |
| `Reference Artifacts/STR_Comply_SRD_v1.4.md` | Functional requirements | Section 10.4 (status values), Section 16 (unsupported market), Section 17 (summary + disclaimer content) |
| `Reference Artifacts/STR_Comply_AccessibilitySpec_v1.0.md` | WCAG 2.1 AA conformance | Section 3 (non-text color use), Section 4 (focus indicators), Section 5 (semantic structure). This design system satisfies those requirements but does not re-specify them. |

---

## TODO / Open Questions

The following tokens are not defined in Section 3 but may be needed during implementation. Do not invent values — raise these as questions first:

- **Focus ring offset:** The Accessibility Spec requires visible focus rings. `--accent-500` is the correct ring color, but a `--focus-ring-offset` token (e.g., 2px white gap between element and ring) is not yet defined. Consider adding `--focus-ring-offset: 2px` to tokens.css.
- **Overlay / scrim:** If any future modal or drawer requires a page overlay, the scrim color is not yet tokenized. A neutral semi-transparent token (e.g., `--scrim: rgba(15, 23, 42, 0.4)` from `--neutral-900`) would be appropriate if needed.
- **Skeleton / loading state:** No token for skeleton loader background is defined. If loading skeletons are introduced, a `--surface-skeleton` token should be added rather than using `--neutral-100` directly.
