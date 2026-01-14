---
name: impression
description: |
  Extract design systems from live websites, compare projects against references, generate implementation plans. Triggers: "extract design", "scrape styles", "get design system", "grab CSS from URL", "what fonts/colors does [site] use", "compare my styles to", "match [brand] design", "design system diff", "generate tailwind config", "create CSS variables", "shadcn theme", "W3C tokens", "figma variables", "blend designs", "migrate tokens". Pre-extracted: Linear, Vercel, DuChateau, Sorrel. Outputs JSON, Tailwind, CSS vars, shadcn, W3C tokens, Figma, Style Dictionary. Uses CIE ΔE 2000 color matching + WCAG audits.
---

# Impression

Extract, compare, and implement design systems from any website.

## Quick Start

**Extract from URL:**
```
Extract the design system from https://linear.app
```

**Compare project to reference:**
```
Compare my project at /path/to/project against the Linear design system
```

**Generate implementation plan:**
```
Create a feature branch to align my project with the DuChateau design
```

**Generate token formats:**
```
Generate a shadcn theme from the Vercel design system
Convert the Linear design to W3C tokens format
```

## Workflow 1: Extract Design System from URL

### Process

1. `browser_navigate({ url })` → target site
2. `browser_wait_for({ time: 3 })` → wait for fonts/animations
3. `browser_resize()` + `browser_take_screenshot()` → capture viewports (1920px, 768px, 375px)
4. `browser_run_code()` → inject `scripts/extract-design-system.js` via `page.evaluate()`
5. Save result to `{site-name}-design-system.json`

### Output

- Primary: JSON following `assets/style-guide-schema.json`
- Optional: Run generators for Tailwind, CSS vars, shadcn, W3C tokens, Figma

## Workflow 2: Compare Project Against Style Guide

### Quick Start

```bash
node scripts/compare-design-systems.js /path/to/project references/duchateau.json
node scripts/compare-design-systems.js /path/to/project references/duchateau.json comparison.md
```

### Comparison Algorithms

| Category | Algorithm | Match Criteria |
|----------|-----------|----------------|
| Colors | CIE ΔE 2000 | Exact: ΔE = 0, Similar: ΔE < 5, Different: ΔE ≥ 5 |
| Contrast | WCAG 2.1 | AAA: ≥7:1, AA: ≥4.5:1, AA-large: ≥3:1 |
| Focus Indicators | WCAG 2.4.7/2.4.11 | Contrast ≥3:1, Thickness ≥2px recommended |
| Typography | Fuzzy string match | Font family name contains/contained by reference |
| Spacing | Numeric diff | Exact: 0px diff, Close: ≤2px diff |
| Border Radius | Exact match | Pixel value equality |

### Output

Report includes overall alignment score, per-category scores, WCAG accessibility audit, and actionable recommendations.

## Workflow 3: Implement Design Changes

### Quick Start

```bash
# Preview what would change
node scripts/implement-design-changes.js /path/to/project references/duchateau.json --dry-run

# Execute (creates branch, modifies configs, generates plan)
node scripts/implement-design-changes.js /path/to/project references/duchateau.json
```

### Process

1. Runs comparison to identify gaps
2. Detects config files (tailwind.config.js or CSS variables)
3. Generates prioritized tokens
4. Creates feature branch `feature/design-system-alignment`
5. **Modifies config files directly** with backup
6. Outputs implementation plan

### Priority Order

| Priority | Category | Description |
|----------|----------|-------------|
| P0 | Colors | Design tokens foundation |
| P1 | Typography | Font families, size scale, weights |
| P2 | Spacing | Spacing scale values |
| P3 | Border Radius | Corner radius tokens |
| P4 | Animations | Durations and easing functions |

## Workflow 4: Generate Token Formats

```bash
# Tailwind config
node scripts/generate-tailwind-config.js site-design.json tailwind.config.js

# CSS variables
node scripts/generate-css-variables.js site-design.json variables.css

# shadcn/ui theme (HSL format)
node scripts/generate-shadcn-theme.js site-design.json --format=css

# W3C Design Tokens
node scripts/generate-w3c-tokens.js site-design.json tokens.json

# Figma Variables
node scripts/generate-figma-tokens.js site-design.json --format=figma

# Style Dictionary
node scripts/generate-w3c-tokens.js site-design.json --format=sd
```

## Workflow 5: Blend Design Systems

Merge multiple design systems into a hybrid:

```bash
# Equal blend
node scripts/blend-design-systems.js linear.json vercel.json blended.json

# Weighted blend (60% Linear, 40% Vercel)
node scripts/blend-design-systems.js linear.json vercel.json --weights=60,40

# Prefer first system, fill gaps from others
node scripts/blend-design-systems.js linear.json vercel.json --strategy=prefer
```

## Workflow 6: Migrate Between Formats

Convert tokens between different standards:

```bash
# Impression to W3C
node scripts/migrate-tokens.js design.json --from=impression --to=w3c

# W3C to Tailwind
node scripts/migrate-tokens.js tokens.json --from=w3c --to=tailwind

# Figma to CSS
node scripts/migrate-tokens.js figma.json --from=figma --to=css
```

Supported formats: `impression`, `w3c`, `sd` (Style Dictionary), `figma`, `tailwind`, `css`, `shadcn`

## Workflow 7: CI/CD Integration

```bash
# GitHub Actions format
node scripts/ci-compare.js . ./reference.json --format=github

# GitLab CI format
node scripts/ci-compare.js . ./reference.json --format=gitlab --threshold=90
```

Exit codes: 0 = pass, 1 = critical issues, 2 = warnings

## Pre-Extracted References

| Design System | File | Notes |
|--------------|------|-------|
| DuChateau | `references/duchateau.json` | Luxury editorial, serif typography, warm neutrals |
| Linear | `references/linear.json` | Dark-mode SaaS, Inter Variable, indigo accent |
| Vercel | `references/vercel.json` | Developer platform, Geist font, blue accent |
| Sorrel | `references/sorrel.json` | Light-mode cooking app, Söhne + Novarese, cream |
| Stripe | `references/stripe.json` | Developer payments, Söhne font, #635bff purple |
| Notion | `references/notion.json` | Productivity workspace, NotionInter, comprehensive scales |
| Tailwind UI | `references/tailwindui.json` | Component library, InterVariable, utility-first |
| YouTube | `references/youtube.json` | Video platform, Roboto font, #ff0000 red accent |

## Workflow 8: Generate Component Library

Generate React/Vue/Svelte components from extracted design patterns:

```bash
# React components (default)
node scripts/generate-component-library.js site-design.json ./components

# Vue components
node scripts/generate-component-library.js site-design.json ./components --framework=vue

# Svelte components
node scripts/generate-component-library.js site-design.json ./components --framework=svelte
```

Generates Button, Input, Card components with design tokens, TypeScript types, and index exports.

## Workflow 9: Generate Style Guide Documentation

```bash
# Interactive HTML style guide
node scripts/generate-style-guide.js site-design.json style-guide.html

# Markdown documentation
node scripts/generate-style-guide.js site-design.json style-guide.md --format=md
```

## Workflow 10: Visual Regression Testing

```bash
# Compare before/after screenshots
node scripts/visual-regression.js ./before-screenshots ./after-screenshots ./diff-output

# With custom threshold
node scripts/visual-regression.js ./before ./after --threshold=0.05
```

Exit codes: 0 = no changes, 1 = visual differences detected

## Workflow 11: Watch Design System Changes

```bash
# Monitor design system for changes
node scripts/watch-design-system.js site-design.json baseline.json

# With webhook notifications
node scripts/watch-design-system.js design.json --webhook=https://hooks.slack.com/...
```

## Workflow 12: PR Automation

```bash
# Generate PR body from design changes
node scripts/pr-automation.js before.json after.json --format=github

# GitLab format
node scripts/pr-automation.js before.json after.json --format=gitlab

# Generate commit message
node scripts/pr-automation.js before.json after.json --commit-message
```

## Workflow 13: Storybook Generation

```bash
# Generate Storybook CSF3 stories
node scripts/generate-storybook.js site-design.json ./stories
```

Generates stories for Colors, Typography, Spacing, Components in Storybook 7+ format.

## Workflow 14: Design Versioning

```bash
# Initialize version tracking
node scripts/design-versioning.js init --design=site-design.json

# Create version snapshot
node scripts/design-versioning.js snapshot --message="Add new brand colors"

# List versions
node scripts/design-versioning.js list

# Compare versions
node scripts/design-versioning.js diff v1 v2

# Rollback to previous version
node scripts/design-versioning.js rollback v1

# Generate changelog
node scripts/design-versioning.js changelog
```

## Workflow 15: Semantic Naming

```bash
# Generate semantic names for colors
node scripts/semantic-naming.js site-design.json

# Output as CSS variables
node scripts/semantic-naming.js site-design.json --format=css

# Output as Tailwind config
node scripts/semantic-naming.js site-design.json --format=tailwind
```

Analyzes colors using HSL and detects semantic roles (primary, success, error, warning, etc.).

## Limitations

- **Cross-origin stylesheets**: May be inaccessible due to CORS
- **CSS-in-JS**: Require page interaction to trigger runtime styles
- **Protected sites**: Some sites block automated access
- **Dynamic content**: May need scrolling to capture all styles

### Workarounds

- For protected sites: Manual inspection or saved HTML
- For dynamic content: Scroll page before extraction
- For CSS-in-JS: Interact with components to trigger style injection
