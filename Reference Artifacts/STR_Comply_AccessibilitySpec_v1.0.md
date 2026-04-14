# STR Comply — UI Accessibility Specification
**Version:** 1.0
**Date:** April 2026
**Type:** Design Principle Artifact — Reference Document
**Status:** Approved for Implementation
**Derived From:** PRD v2.1, SRD v1.0

---

## Assumptions (stated explicitly)

The following assumptions are made based on the PRD/SRD and current codebase:

- **Product type:** Desktop-first web app. Primary session is a laptop browser. Mobile is not a design target for the capstone, but responsive reflow must not break.
- **Primary user (Marcus):** A 38-year-old growth-minded STR investor who uses productivity software daily. Not a power-user of accessibility technology, but must not be excluded. Secondary users may include people with visual, motor, or cognitive needs.
- **Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS. No component library — all components are custom-built.
- **Trust-critical product:** The UI surfaces legal and compliance information. Errors in comprehension have real consequences (bad acquisition decisions). Accessibility here is not cosmetic — it directly serves the core product promise of clarity.
- **Status color reliance risk:** The current design uses green/amber/red as primary signals for STR status, freshness, and rule values. This is a HIGH accessibility risk for color-blind users (~8% of men have red-green deficiency). Non-color indicators are required.
- **WCAG target:** WCAG 2.1 Level AA is the standard. Level AAA criteria for contrast on status badges are recommended given their decision-critical role.

---

## 1. Accessibility Baseline

### Standard

**WCAG 2.1 Level AA** is the required conformance target. This aligns with ADA Title III expectations for web-based products and is the widely accepted baseline for commercial SaaS tools.

### Practical implications for this interface

| Area | Implication |
|---|---|
| Color-coded status signals | Every green/amber/red indicator must carry a non-color differentiator (icon, label, pattern, or text) |
| External source links | Must announce destination and that they open in a new tab |
| Search form | Must expose validation errors to screen readers, not just visually |
| Watchlist table | Must be a proper `<table>` with headers; not a styled `<div>` grid |
| Login form | Must meet full form accessibility requirements — labels, errors, focus management |
| Disclaimer | Must be reachable and announced correctly; not hidden from assistive technology |
| Jurisdiction/freshness tags | Small colored tags must meet 3:1 minimum contrast as UI components |

### Minimum conformance for this capstone

Given time constraints, prioritize in this order:

1. **P0 — Must ship:** Keyboard navigability of all interactions, color-independent status signals, form error announcement, correct semantic HTML throughout, visible focus indicators, external link labeling, alt text on all non-decorative images/icons
2. **P1 — Ship before demo:** Contrast ratios verified on all text, ARIA roles on SearchBar combobox, table headers on Watchlist, skip nav link
3. **P2 — Post-capstone:** Full screen reader audit, ARIA live region optimization, motion reduction, mobile accessibility

---

## 2. Semantic Structure

### Page Landmarks

Every page must use correct HTML5 landmark elements. These are the nav regions assistive technology users jump between.

```html
<!-- Required structure on every page -->
<body>
  <a href="#main-content" class="sr-only focus:not-sr-only">Skip to main content</a>
  <header role="banner">
    <nav aria-label="Main navigation">...</nav>
  </header>
  <main id="main-content">...</main>
  <footer role="contentinfo">...</footer>
</body>
```

**Anti-pattern (current risk):** The current layout.tsx wraps children in `<main>` without an `id`. Add `id="main-content"` to enable the skip link target.

### Navigation (`Nav.tsx`)

```html
<!-- Correct -->
<nav aria-label="Main navigation">
  <a href="/" aria-current="page">Lookup</a>   <!-- aria-current only on active link -->
  <a href="/watchlist">Watchlist <span aria-label="3 saved markets">3</span></a>
</nav>
```

- Use `aria-current="page"` on the active nav link, not just a visual class.
- The watchlist count badge needs an accessible label: the raw number "3" has no context. Use `<span class="sr-only"> saved markets</span>` or `aria-label="Watchlist, 3 saved markets"` on the link.
- Do not use ARIA roles on `<nav>` — the element already carries the landmark role natively.

### Search Bar (`SearchBar.tsx`)

The search bar is the primary interaction on the home page. It is functionally a combobox (text input + submit button), not a true ARIA combobox (which implies a dropdown listbox). Use the simpler pattern:

```html
<form role="search" aria-label="Market compliance lookup">
  <label for="market-search" class="sr-only">
    Enter a city, market, or property address
  </label>
  <input
    id="market-search"
    type="search"
    name="q"
    aria-describedby="search-hint search-error"
    aria-invalid="false"  <!-- set to "true" on error -->
    autocomplete="off"
    spellcheck="false"
  />
  <p id="search-hint" class="...">
    Try "Santa Monica" or "123 Main St, Los Angeles"
  </p>
  <p id="search-error" role="alert" aria-live="assertive">
    <!-- Populated on error; empty string when no error -->
  </p>
  <button type="submit">Look up</button>
</form>
```

**Key requirements:**
- `<form role="search">` identifies this as a search landmark — screen reader users can jump to it.
- The visual placeholder is not a substitute for a `<label>`. Use `class="sr-only"` to visually hide the label while keeping it accessible.
- `aria-describedby` links both the hint text and the error container so both are read on focus.
- `role="alert"` on the error paragraph causes screen readers to announce it immediately when it receives content, without the user having to navigate to it.
- The SVG search icon inside the button is decorative — add `aria-hidden="true"` to it.

### Buttons

```html
<!-- Correct: text label present -->
<button type="submit">Look up</button>

<!-- Correct: icon-only button needs an accessible name -->
<button type="button" aria-label="Remove Santa Monica from watchlist">
  <svg aria-hidden="true" focusable="false">...</svg>
</button>

<!-- Anti-pattern: icon-only with no label -->
<button type="button">
  <svg>...</svg>  <!-- Screen reader announces nothing meaningful -->
</button>
```

All `<button>` elements must have a visible text label OR an `aria-label`/`aria-labelledby`. Icon-only buttons (the bookmark button in WatchlistButton.tsx) must have `aria-label`.

### Links

External source links (`SourceList.tsx`) open in a new tab. This must be announced:

```html
<a
  href="https://..."
  target="_blank"
  rel="noopener noreferrer"
  aria-label="Home-Sharing Program — City of Santa Monica (opens in new tab)"
>
  Home-Sharing Program — City of Santa Monica
  <svg aria-hidden="true"><!-- external link icon --></svg>
  <span class="sr-only">(opens in new tab)</span>
</a>
```

Use either `aria-label` (replaces the full visible text) or `<span class="sr-only">` appended inside the link (preferred — keeps visible text unchanged). The external link SVG icon must be `aria-hidden="true"`.

**Anti-pattern:** `target="_blank"` with no announcement. Users lose context when focus jumps to a new window with no warning.

### Cards (`RuleCard.tsx`, `ComplianceSummaryCard.tsx`)

Cards are not interactive containers — they display information. Do not add `role="button"` or `tabindex` to a card `<div>` unless the entire card is clickable.

```html
<!-- Correct: card is a display container -->
<article aria-label="Permit / Registration rule">
  <h3>Permit / Registration</h3>
  <span class="...">Required</span>  <!-- status badge -->
  <p>City registration and business license required before listing.</p>
  <a href="..." target="_blank" ...>SMMC § 6.20.030 (opens in new tab)</a>
</article>
```

- Use `<article>` when the card is a self-contained piece of content (a rule).
- Add `aria-label` on the `<article>` to give it a unique name that includes the rule label, so screen reader users can distinguish cards when navigating by landmark.
- The jurisdiction level tag (City/County/State) should be read as part of the label. Consider including it in the `<article aria-label>` or using an adjacent `<span>` with visible + screen-reader text.

### Status Badges (`StatusBadge.tsx`, `FreshnessBadge.tsx`, `RuleCard` value badges)

This is the highest-risk component in the entire UI for accessibility.

**The problem:** Color alone signals "Allowed" (green), "Conditional" (amber), "Not Allowed" (red). ~8% of male users have red-green color deficiency and may not distinguish green from amber or red.

**Required fix — non-color indicators:**

```html
<!-- Each badge MUST have a text label, not just a colored dot -->

<!-- STR Status badge -->
<span class="inline-flex items-center gap-1.5 bg-green-50 text-green-700 ...">
  <svg aria-hidden="true"><!-- checkmark icon --></svg>  <!-- shape differentiator -->
  Allowed
</span>

<span class="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 ...">
  <svg aria-hidden="true"><!-- warning triangle icon --></svg>
  Conditional
</span>

<span class="inline-flex items-center gap-1.5 bg-red-50 text-red-700 ...">
  <svg aria-hidden="true"><!-- x-circle icon --></svg>
  Not Allowed
</span>
```

The colored dot (`.w-1.5.h-1.5.rounded-full`) currently used in RuleCard provides zero information to color-blind users and zero information to screen readers. Replace it with a meaningful icon (shape differentiator) or remove it in favor of the text label alone.

**For screen readers:** The text label ("Allowed", "Required", "Conditional") is what matters. The dot and color are visual-only — `aria-hidden="true"` on the dot is correct.

### Watchlist Table (`watchlist/page.tsx`)

The watchlist uses `<table>`, which is correct. Verify:

```html
<table>
  <caption class="sr-only">Saved markets watchlist</caption>
  <thead>
    <tr>
      <th scope="col">Market</th>
      <th scope="col">STR Eligibility</th>
      <th scope="col">Permit</th>
      <th scope="col">Owner-Occupied</th>
      <th scope="col">Freshness</th>
      <th scope="col">Saved</th>
      <th scope="col"><span class="sr-only">Actions</span></th>
    </tr>
  </thead>
  <tbody>...</tbody>
</table>
```

- Every `<th>` must have `scope="col"` or `scope="row"`.
- The empty action column header needs a `<span class="sr-only">Actions</span>` so the column is labeled.
- Add a `<caption>` (can be visually hidden with `sr-only`) so the table announces its purpose when focused.
- The "Remove" button in each row needs context: `aria-label="Remove [Market Name] from watchlist"` — not just "Remove".

### Login Form (`login/page.tsx`)

Covered in detail in Section 4. Summary:
- `<label>` associated via `htmlFor` — already present.
- Error messages must use `role="alert"`.
- Success state must be announced.

### Modals/Dialogs

None currently in the MVP. If added post-MVP, require `role="dialog"`, `aria-modal="true"`, focus trap, and focus return on close.

### Focus Order

The tab order must follow the visual reading order (left-to-right, top-to-bottom):

1. Skip link (visually hidden until focused)
2. Nav: logo → Lookup → Watchlist → Sign in
3. Main content: search form → hint text → submit button
4. After search: results section — market heading → compliance card → rule cards → source list → freshness → watchlist button → disclaimer

**Verify:** There must be no tabindex values other than `0` and `-1`. Never use positive `tabindex` values — they override the natural DOM order and create unpredictable navigation.

---

## 3. Keyboard Interaction Model

### Tab order rules

- All focusable elements receive focus in DOM order.
- Skip link appears as the first focusable element.
- The inline search results appear directly below the search bar in DOM order — no focus management needed beyond scroll.

### SearchBar

| Key | Behavior |
|---|---|
| `Tab` | Focus enters the text input |
| `Enter` | Submits the form (native behavior) |
| `Tab` again | Moves to the submit button |
| `Enter` on button | Submits the form |

No arrow-key navigation needed — this is a plain text input, not a combobox with a dropdown.

### Navigation Links

| Key | Behavior |
|---|---|
| `Tab` | Moves between nav links |
| `Enter` | Follows the link |

### Rule Cards

Rule cards are not interactive. They should not be focusable as containers. Tab passes through the card to reach the code reference `<a>` link inside it.

| Key | Behavior |
|---|---|
| `Tab` | Moves to the code citation link (if present) |
| `Enter` on link | Opens the citation in a new tab |

### Source List Links

| Key | Behavior |
|---|---|
| `Tab` | Moves between source links |
| `Enter` | Opens the source in a new tab |

### WatchlistButton

| Key | Behavior |
|---|---|
| `Tab` | Focuses the button |
| `Enter` or `Space` | Saves or removes the market |

After saving: button label and state update. The state change should be announced via `aria-live` or by updating `aria-pressed` (if using a toggle pattern):

```html
<button
  type="button"
  aria-pressed="false"  <!-- true when saved -->
  aria-label="Save Santa Monica to watchlist"
>
  Save
</button>
```

When `aria-pressed` changes, screen readers announce the new state. This is the correct pattern for a toggle save button.

### Watchlist Table Remove Button

| Key | Behavior |
|---|---|
| `Tab` | Focuses the Remove button for each row |
| `Enter` or `Space` | Removes the market |

After removal: the row disappears from the DOM. Focus must move to a meaningful location — either the next row's Remove button, or the "My Markets" heading if no rows remain. Do not let focus fall to `<body>`.

### Skip Link

```html
<a
  href="#main-content"
  class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-gray-900 focus:border focus:border-gray-900 focus:rounded"
>
  Skip to main content
</a>
```

This should be the very first element in `<body>`. On focus (via keyboard Tab), it becomes visible. On activation, it moves focus to `<main id="main-content">`.

### Escape Handling

No modals in MVP. If toasts or overlays are added later, `Escape` must dismiss them.

---

## 4. Form Accessibility

### SearchBar — Full Specification

```html
<form role="search" aria-label="Market compliance lookup">

  <!-- Visible label hidden off-screen; DO NOT use placeholder as the only label -->
  <label for="market-search" class="sr-only">
    Enter a city, market, or property address
  </label>

  <div class="flex ...">
    <svg aria-hidden="true" focusable="false"><!-- search icon --></svg>

    <input
      id="market-search"
      type="search"
      name="q"
      value={query}
      placeholder="Enter an address or city — try 'Santa Monica'"
      aria-describedby="search-hint search-error"
      aria-invalid={error ? 'true' : 'false'}
      aria-required="true"
      autoComplete="off"
      spellCheck="false"
    />

    <button type="submit" aria-label="Search for market">Look up</button>
  </div>

  <!-- Helper text: always present in DOM, referenced by aria-describedby -->
  <p id="search-hint" class="text-sm text-gray-400">
    Try a city name or address — e.g. "Santa Monica" or "123 Main St, LA"
  </p>

  <!-- Error: rendered but empty until an error occurs -->
  <p
    id="search-error"
    role="alert"
    aria-live="assertive"
    class="text-sm text-red-500"
  >
    {error || ''}
  </p>

</form>
```

**Required field indication:** For a single-field search form, `aria-required="true"` is sufficient. No asterisk needed at this scale.

**Error message rules:**
- `role="alert"` + `aria-live="assertive"` = announces immediately when content appears.
- Do not toggle the element in/out of the DOM — screen readers may miss dynamic insertion. Instead, keep the element present with empty content, then populate it.
- Error text must be human-readable: "Enter a city, market, or property address" — not "Required field" or "Error: 400".

**Validation timing:** Validate on submit only (not on blur or keypress). Premature validation interrupts the user mid-input and is disruptive to screen reader users.

### Login Form — Full Specification

```html
<form noValidate onSubmit={handleSubmit}>
  <div>
    <label htmlFor="email">Email address</label>
    <input
      id="email"
      type="email"
      name="email"
      autoComplete="email"
      aria-describedby="email-error"
      aria-invalid={!!error}
      aria-required="true"
    />
    <p
      id="email-error"
      role="alert"
      aria-live="assertive"
    >
      {error || ''}
    </p>
  </div>

  <button type="submit">Continue</button>

  <!-- Success state -->
  {submitted && (
    <p role="status" aria-live="polite">
      Signed in. Redirecting you now.
    </p>
  )}
</form>
```

**Success state:** Use `role="status"` + `aria-live="polite"` (not `assertive`) — the confirmation message is non-urgent. `role="alert"` would interrupt whatever the screen reader is currently doing.

**Password fields:** Not applicable to this prototype. If added: use `<input type="password">` with a visible "Show/Hide" toggle button that uses `aria-pressed` and updates `aria-label` ("Show password" / "Hide password").

**Multi-step forms:** Not in MVP. If added later: use `aria-describedby` pointing to step progress indicator, and move focus to the first field of each new step.

**Autofill:** `autoComplete="email"` on the email field enables browser autofill. Do not suppress it.

---

## 5. Visual Accessibility

### Color Contrast Requirements

All contrast ratios measured against WCAG 2.1 SC 1.4.3 (Level AA) and 1.4.6 (Level AAA).

| Element | Minimum ratio | Recommended |
|---|---|---|
| Body text on white background | 4.5:1 (AA) | 7:1 (AAA) — gray-900 on white |
| Large text (18pt+ / 14pt bold+) | 3:1 (AA) | 4.5:1 |
| Status badge text on badge background | 4.5:1 (AA for text) | Verify each badge |
| Jurisdiction tag text | 4.5:1 (AA) | Critical — small text |
| Focus indicator | 3:1 against adjacent color | Use offset outline |
| Placeholder text | 4.5:1 (AA) | gray-400 (#9ca3af) on white = ~2.9:1 — **FAILS** |

**Immediate fix required:** `placeholder-gray-400` in SearchBar.tsx fails contrast at ~2.9:1. Switch placeholder text to `placeholder-gray-500` (#6b7280) which achieves ~4.6:1.

**Verify these specific combinations:**
- `text-orange-600` on white: #ea580c on #fff = 3.4:1 — fails AA for small text. Use `text-orange-700` (#c2410c) = 4.7:1 ✓
- `text-amber-700` on `bg-amber-50`: verify programmatically.
- `text-gray-400` on white (`text-gray-400` labels): #9ca3af = 2.9:1 — **FAILS** for body-size text. Use `text-gray-500` minimum.
- Status badge jurisdiction tags: `text-gray-500` on `bg-gray-100` = verify.

### Focus Indicator

The current Tailwind default focus ring is often suppressed by `outline-none` in custom inputs. This is a WCAG 2.4.7 failure.

**Required pattern:**

```css
/* In globals.css or as Tailwind utility */
:focus-visible {
  outline: 2px solid #1d4ed8;   /* blue-700 */
  outline-offset: 2px;
}

/* For dark surfaces */
.dark-surface :focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}
```

```tsx
// In Tailwind — replace outline-none with:
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
```

**Anti-pattern:** `className="... outline-none"` with no replacement focus style. This makes the app entirely unusable via keyboard for sighted keyboard users.

Use `:focus-visible` (not `:focus`) to avoid showing focus rings on mouse clicks while preserving them for keyboard navigation.

### Touch Target Size

Desktop-first product, but keyboard-clickable targets still apply:
- Minimum 44×44px touch/click target for all interactive elements.
- The current bookmark button in WatchlistButton.tsx compact mode renders at approximately 28×28px — increase the padding.
- Nav links with `px-4 py-1.5` are borderline — verify with browser DevTools.

### Text Scaling and Zoom

WCAG 1.4.4 requires no loss of content or functionality up to 200% zoom.

- Use `rem` units for font sizes, not `px`. Tailwind's default `text-sm` = `0.875rem` ✓.
- The `text-[11px]` and `text-[10px]` custom sizes in RuleCard and jurisdiction tags will not scale with user font preferences if set in `px`. Convert to `text-[0.6875rem]` or simply use `text-xs`.
- Test at 200% browser zoom: verify no horizontal scrolling, no text truncation, no overlapping elements.

### Responsive Reflow

WCAG 1.4.10 requires content reflows to a single column at 320px viewport width without horizontal scrolling.

- The desktop-first layout does not need to be optimized for mobile, but it must not break at narrow viewports in ways that hide content.
- The watchlist table uses `hidden md:table-cell` for several columns — this is acceptable reflow behavior.
- Verify that the compliance summary card and rule cards stack gracefully if viewport narrows.

### Motion Reduction

Users with vestibular disorders may be harmed by animations. Respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

In Tailwind: add `motion-reduce:transition-none` to all animated components. The hero collapse transition (`transition-all duration-300`) in `page.tsx` should use:

```tsx
className={`${
  hasResults ? 'pt-10 pb-8' : 'pt-24 pb-20'
} motion-reduce:transition-none transition-all duration-300`}
```

The `animate-pulse` skeleton loaders also need to respect this:
```tsx
className="animate-pulse motion-reduce:animate-none"
```

### Non-Color Status Cues

Every status signal that currently uses only color must have a secondary, non-color cue:

| Component | Current (color only) | Required fix |
|---|---|---|
| ComplianceSummaryCard status icon | ✓ / ⚠ / ✕ text icons | Already present ✓ |
| RuleCard value badge dot | Colored dot only | Replace with icon (checkmark / warning / x) |
| StatusBadge dot | Colored dot only | Replace with icon |
| FreshnessBadge icon | ✓ / ! / ⚠ text icons | Already present ✓ |
| Jurisdiction tag | Background color only | Add text label "City" / "County" / "State" | Already present ✓ |

---

## 6. Media and Content

### Alt Text Strategy

All meaningful images must have descriptive alt text. All decorative images must have `alt=""`.

| Element | Classification | Required alt |
|---|---|---|
| The STR Comply logo (if it becomes an image) | Meaningful | `alt="STR Comply"` |
| SVG search icon in SearchBar | Decorative (button has text label) | `aria-hidden="true"` on SVG |
| SVG external link icon in SourceList | Decorative (link has text) | `aria-hidden="true"` on SVG |
| SVG chevron icon in SourceList | Decorative | `aria-hidden="true"` on SVG |
| SVG bookmark icon in WatchlistButton | Decorative (button has text/aria-label) | `aria-hidden="true"` on SVG |
| Status icons (✓ ⚠ ✕) as SVGs | Decorative (text present) | `aria-hidden="true"` |

**Rule:** If an SVG icon is inside a button or link that has a text label or `aria-label`, the SVG is decorative — use `aria-hidden="true" focusable="false"`. The `focusable="false"` attribute is required for IE11 compatibility and some older SVG implementations that make SVGs focusable by default.

### SVG Accessibility

For any standalone SVG used as a semantic image (without surrounding text):

```html
<svg role="img" aria-label="Warning: data needs review">
  <title>Warning: data needs review</title>
  ...
</svg>
```

The `<title>` element inside SVG is the accessible name. `role="img"` is required because SVGs are not natively mapped to the `img` role in all browsers.

### Empty States and Loading States

```html
<!-- Loading skeleton: announce to screen readers -->
<div aria-busy="true" aria-label="Loading market results...">
  <div class="animate-pulse motion-reduce:animate-none ..."></div>
</div>

<!-- Empty watchlist state -->
<p role="status">
  No markets tracked yet. Search for a market to add it to your watchlist.
</p>
```

- Use `aria-busy="true"` on the container while content loads.
- Empty states should use `role="status"` so screen readers announce the state on arrival.
- The "No results" state in `page.tsx` should use `role="status"` so the result of the search is announced.

### Disclaimer

The disclaimer is legally required content. It must be reachable and not suppressed from assistive technology.

```html
<aside aria-label="Legal disclaimer">
  <p>
    <strong>Disclaimer:</strong> This summary is for informational purposes only...
  </p>
</aside>
```

Use `<aside>` (complementary landmark) to make it navigable by landmark. Do not use `aria-hidden` on it.

---

## 7. Component-Level Acceptance Criteria

### SearchBar

**Given** a user navigates to the home page via keyboard only  
**When** they press `Tab` once  
**Then** focus moves to the search input (after the skip link)

**Given** a user submits an empty search  
**When** the form is submitted via Enter or button click  
**Then** an error message "Enter a city, market, or property address" is announced immediately by screen readers without requiring focus change

**Given** a user enters "Santa Monica" and submits  
**When** results appear below the search bar  
**Then** results are present in DOM order below the form and reachable by continuing to Tab

**Keyboard-only verification:**
- [ ] Tab moves focus into the input
- [ ] Enter submits the form
- [ ] Empty submit shows visible error AND announces it
- [ ] Valid submit renders results reachable without any page navigation

**Screen reader verification (VoiceOver on macOS):**
- [ ] Input is announced as "Enter a city, market, or property address, search field" on focus
- [ ] Error is announced immediately on empty submit
- [ ] Success: results section heading is reachable after Tabbing past the button

**Visual inspection:**
- [ ] Focus ring visible on input when focused
- [ ] Focus ring visible on button when focused
- [ ] Error text visible in red with `text-red-500` or stronger

---

### ComplianceSummaryCard

**Given** a user views a market result  
**When** using a color-blind simulator  
**Then** the STR status (Allowed / Conditional / Not Allowed) is distinguishable by shape or text, not color alone

**Given** a screen reader user reaches the compliance card  
**When** they navigate the card  
**Then** they hear the status label, heading, and plain-English summary in a logical order

**Keyboard-only verification:**
- [ ] WatchlistButton inside the card is reachable via Tab
- [ ] WatchlistButton Save/Saved toggle is operable via Enter or Space

**Screen reader verification:**
- [ ] Status icon (✓ / ⚠ / ✕) is `aria-hidden` — text label carries the meaning
- [ ] `WatchlistButton` announces its action ("Save" or "Saved" + market name)

**Visual inspection:**
- [ ] Green/amber/red differentiators use icons or text, not color dots alone
- [ ] Card has visible border or separation from surrounding content

---

### RuleCard

**Given** a user views a rule card  
**When** they are using a screen reader  
**Then** the rule label, jurisdiction level, status value, detail text, and source link are all announced in reading order

**Given** the jurisdiction tag reads "State" (blue)  
**When** a color-blind user views it  
**Then** the text "State" is present and readable without relying on the blue background

**Keyboard-only verification:**
- [ ] Code citation link inside the card is Tab-reachable
- [ ] Link opens in new tab and focus does not become trapped

**Screen reader verification:**
- [ ] Code reference link announces "SMMC § 6.20.010, opens in new tab"
- [ ] Jurisdiction tag text ("City", "County", "State") is readable — not hidden

**Visual inspection:**
- [ ] Status dot replaced with or supplemented by an icon
- [ ] Jurisdiction tag has sufficient contrast

---

### Watchlist Table

**Given** a signed-in user has saved markets  
**When** the watchlist page loads  
**Then** the `<table>` has all column headers with `scope="col"` and the Remove button includes the market name in its `aria-label`

**Keyboard-only verification:**
- [ ] Table is navigable with Tab/Shift+Tab through links and buttons
- [ ] "Remove" button for each row is reachable and operable
- [ ] After removal, focus moves to the next row or the page heading

**Screen reader verification:**
- [ ] Table announces "Saved markets watchlist" as caption
- [ ] Each row's Remove button announces "Remove [Market Name] from watchlist"
- [ ] Market name link announces destination ("/market/santa-monica")

**Visual inspection:**
- [ ] Hidden columns on mobile (`hidden md:table-cell`) do not cause layout breaks
- [ ] Empty state message is visible and clear

---

### WatchlistButton (standalone)

**Given** a signed-out user clicks "Track this Market"  
**When** they are redirected to login  
**Then** after signing in, they are returned to the market page (returnTo param)

**Given** a signed-in user toggles the save state  
**When** state changes  
**Then** button label updates and the new state is announced by screen readers via `aria-pressed` change

**Screen reader verification:**
- [ ] Toggle button state announced: "Save, not pressed" → "Saved, pressed"
- [ ] Market name is part of the button's accessible label

---

### Login Form

**Given** a user submits with no email  
**When** validation runs  
**Then** error "Enter a valid email address." is announced immediately

**Given** a user submits a valid email  
**When** sign-in succeeds  
**Then** "Signed in. Redirecting you now." is announced via `role="status"`

**Keyboard-only verification:**
- [ ] Focus enters email input on page load (`autoFocus`)
- [ ] Tab moves to the Continue button
- [ ] Enter submits

**Screen reader verification:**
- [ ] Label "Email address" announced on focus
- [ ] Error announced on bad submit without focus moving
- [ ] Success state announced

---

## 8. Testing Requirements

### Manual Keyboard Test Plan

Run this on every major user-facing page before capstone demo.

**Test environment:** Chrome on macOS with no pointing device connected (or touchpad disabled).

1. Press `Tab` on load — first focus is the skip link (verify it appears visually)
2. Press `Enter` on skip link — focus jumps to `<main id="main-content">`
3. Tab through all interactive elements on the page in order; verify no elements are skipped or inaccessible
4. On the home page: Tab to search input → type a city name → press Enter → verify results appear and are reachable by continuing to Tab
5. On results: Tab to the code citation links — verify they open new tabs
6. Tab to the WatchlistButton — press Space or Enter — verify state changes
7. On watchlist: Tab to each Remove button — press Enter — verify row is removed and focus moves logically
8. On login: Tab to email → type invalid email → press Enter → verify error visible and logical

### Screen Reader Test Plan

**Primary tool:** VoiceOver on macOS (Cmd+F5 to enable). Also test with NVDA on Windows if possible.

**Key scenarios:**

1. **Search flow:** Open home page, use VoiceOver Quick Nav to find the `role="search"` landmark. Tab to input. Hear input label. Type "Santa Monica". Press Enter. Navigate to results using heading navigation (VoiceOver: Ctrl+Opt+Cmd+H). Verify headings are logical.

2. **Error announcement:** Clear the search input. Press Enter. Verify error is announced without pressing Tab.

3. **Status badge reading:** Navigate to ComplianceSummaryCard. Verify screen reader announces "STR Eligible" or "Conditional" or "Not Permitted" — not just a color.

4. **External links:** Navigate to SourceList. Tab to each link. Verify "opens in new tab" is included in the announcement.

5. **Rule cards:** Navigate rule cards. Verify each card's jurisdiction tag ("City", "State") is readable, not hidden.

6. **Watchlist table:** Navigate to watchlist page. Use table navigation (VoiceOver: Ctrl+Opt+Arrow keys). Verify column headers are read for each cell.

### Automated Testing Ideas

For a capstone project, prioritize tools that require no test setup:

- **axe DevTools browser extension** (free): Run on every page. Fix all "critical" and "serious" violations before demo. Common automated catches: missing labels, insufficient contrast, missing alt text, invalid ARIA.
- **Chrome Lighthouse Accessibility audit**: Run in DevTools → Lighthouse → Accessibility. Target score 90+.
- **eslint-plugin-jsx-a11y**: Add to the project — catches missing alt text, button labels, and ARIA misuse at write-time.

```bash
npm install --save-dev eslint-plugin-jsx-a11y
```

```json
// .eslintrc
{
  "plugins": ["jsx-a11y"],
  "extends": ["plugin:jsx-a11y/recommended"]
}
```

Common catches by this plugin: `<img>` without `alt`, `<button>` without text, `<a>` without `href`, interactive elements with bad ARIA roles.

### Contrast and Focus Testing

- **Contrast:** Use the Chrome DevTools color picker (click any color in the Styles panel — it shows the contrast ratio inline). Alternatively, use the [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/).
- **Focus:** Tab through every interactive element. Every focused element must have a clearly visible focus ring. Take a screenshot at each step if doing a review pass.
- **Color blindness simulation:** Chrome DevTools → Rendering tab → Emulate vision deficiencies → "Deuteranopia" (most common red-green deficiency). Verify all status indicators are still distinguishable.

### QA Checklist Before Demo

| Check | Pass/Fail |
|---|---|
| All pages pass axe DevTools with zero "critical" violations | |
| Lighthouse accessibility score ≥ 90 on home page and market result page | |
| Keyboard-only test completed on all 4 main pages | |
| No color-only status signals (rule badges, status card, freshness) | |
| Placeholder text contrast ≥ 4.5:1 | |
| External links all include "(opens in new tab)" announcement | |
| Skip link present and functional | |
| Watchlist table has correct `<th scope="col">` headers | |
| Remove buttons include market name in `aria-label` | |
| Search error announced via `role="alert"` | |
| Login success announced via `role="status"` | |
| All SVG icons have `aria-hidden="true" focusable="false"` | |
| No `tabindex` values > 0 in the codebase | |
| `prefers-reduced-motion` respected on all animations | |
| `outline-none` replaced with visible focus ring pattern everywhere | |

---

## 9. Implementation Checklist

Use this during build and code review.

### HTML Structure
- [ ] Every page has `<header>`, `<nav aria-label="Main navigation">`, `<main id="main-content">`, `<footer>`
- [ ] Skip link is first element in `<body>` and links to `#main-content`
- [ ] No `<div>` or `<span>` used where a semantic element exists (`<button>`, `<a>`, `<nav>`, etc.)
- [ ] `<table>` used for watchlist — not a styled `<div>` grid
- [ ] All `<th>` elements have `scope="col"` or `scope="row"`
- [ ] Active nav link uses `aria-current="page"`

### Labels and Names
- [ ] Every `<input>` has a `<label>` associated via `htmlFor` / `id` — placeholder is not a substitute
- [ ] Every icon-only `<button>` has `aria-label`
- [ ] Every SVG icon has `aria-hidden="true" focusable="false"`
- [ ] External links include `<span class="sr-only">(opens in new tab)</span>` or equivalent in `aria-label`
- [ ] Watchlist "Remove" buttons include the market name: `aria-label="Remove Santa Monica from watchlist"`
- [ ] WatchlistButton toggle uses `aria-pressed` for state

### Forms
- [ ] Search form has `role="search"` and `aria-label`
- [ ] `aria-invalid` set to `"true"` on inputs with errors
- [ ] `aria-describedby` on each input points to both hint text and error container
- [ ] Error containers use `role="alert"` and are present in DOM at all times (not toggled in/out)
- [ ] Success states use `role="status"` with `aria-live="polite"`
- [ ] Validation fires on submit, not on blur

### Status and Color
- [ ] No status is communicated by color alone — every color signal has a text or icon duplicate
- [ ] Colored dots replaced with or supplemented by meaningful icons
- [ ] `placeholder-gray-500` (not `gray-400`) used for placeholder text
- [ ] `text-orange-700` (not `text-orange-600`) used for small orange text on white

### Focus and Keyboard
- [ ] `outline-none` never appears without a replacement focus style
- [ ] `:focus-visible` pattern used on all interactive elements
- [ ] No `tabindex` values greater than 0 anywhere in the codebase
- [ ] After removing a watchlist item, focus moves to the next row or the heading
- [ ] All content reachable and operable via keyboard alone

### Motion and Performance
- [ ] `motion-reduce:transition-none` on all transition utilities
- [ ] `motion-reduce:animate-none` on all `animate-pulse` skeletons
- [ ] `prefers-reduced-motion` CSS media query present in `globals.css`

### Code Review Gate
Before any PR merges a new component or page:
- [ ] Run axe DevTools on the affected page — zero new critical violations
- [ ] Tab through the new component — all interactive elements reachable
- [ ] Verify every new `<button>` has an accessible name
- [ ] Verify every new SVG has `aria-hidden="true"`
- [ ] Verify any new color-coded indicator has a non-color duplicate signal

---

*This document is a living artifact. Update it as new components are added to the product.*
