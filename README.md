# Impression

Extract complete design systems from any live website using Playwright browser automation. Compare projects against reference designs with perceptually accurate color matching, generate implementation plans, and export to multiple token formats.

## Why Impression?

**The "make it look like X" problem is tedious.** When a client says "match Linear's design" or "align with our brand guidelines", you're stuck:

- Opening DevTools, inspecting elements one-by-one
- Copy-pasting CSS variables manually
- Guessing if your colors are "close enough"
- Translating designs to Tailwind/CSS by hand
- No way to measure design drift over time

**Impression automates all of this.** One command extracts a complete design system. One command compares your project against it with perceptually accurate color matching. One command generates an implementation plan with atomic commits.

| Problem | Manual Approach | Impression |
|---------|-----------------|------------|
| "Extract Linear's design" | Hours of DevTools inspection | `Extract the design system from https://linear.app` |
| "How close are we to brand?" | Eyeballing | CIE ΔE 2000 comparison + 0-100% score |
| "Generate Tailwind config" | Manual translation | `node scripts/generate-tailwind-config.js` |
| "Are we WCAG compliant?" | Manual contrast checks | Automated accessibility audit |

## What It Does

- **Extracts** colors, typography, spacing, animations, shadows, border-radius, breakpoints, gradients, interaction states, cubic-bezier curves, and component patterns from any URL
- **Outputs** JSON (canonical), Tailwind config, CSS variables, shadcn/ui themes, W3C Design Tokens, Figma Variables, or Style Dictionary
- **Compares** your project against extracted design systems using CIE ΔE 2000 color matching with WCAG accessibility audits and focus indicator compliance
- **Generates** prioritized implementation plans with atomic commits (P0→P4)
- **Creates** component libraries (React/Vue/Svelte), style guide documentation, and Storybook stories
- **Blends** multiple design systems into hybrid combinations
- **Migrates** tokens between different format standards
- **Versions** design systems with snapshots, diffs, rollback, and changelogs
- **Automates** PR generation with design change summaries and visual regression testing

**Zero dependencies** — vanilla Node.js scripts, no package.json, no build step.

## Installation

### From GitHub (Recommended)

```bash
git clone https://github.com/jamesrosing/impression ~/.claude/skills/impression
```

### Manual Installation

```bash
# Personal skills
cp -r impression ~/.claude/skills/

# Project-specific
cp -r impression <project>/.claude/skills/
```

## Usage

### Extract a Design System

```
Extract the design system from https://linear.app
```

```
Scrape the styles from https://stripe.com/docs and save as JSON
```

### Compare Against a Reference

```
Compare my project at /path/to/project against the Linear design system
```

### Generate Implementation Plan

```
Create a feature branch to align my webapp with the DuChateau design
```

### Generate Token Formats

```
Generate a shadcn theme from the Vercel design system
```

```
Convert the Linear design to W3C tokens format
```

## CLI Commands

### Compare Project Against Reference

```bash
# Generate comparison report (prints to stdout)
node scripts/compare-design-systems.js ./my-project references/duchateau.json

# Save to file
node scripts/compare-design-systems.js ./my-project references/duchateau.json comparison.md
```

**Output includes:**
- Overall alignment score (0-100%)
- Per-category scores (colors, typography, spacing, border-radius)
- Exact matches, similar colors (ΔE < 5), missing tokens
- WCAG accessibility audit for contrast ratios
- Actionable recommendations

### Generate Implementation Plan

```bash
# Preview changes (dry run)
node scripts/implement-design-changes.js ./my-project references/duchateau.json --dry-run

# Generate plan and create feature branch
node scripts/implement-design-changes.js ./my-project references/duchateau.json
```

**Creates:**
- Feature branch: `feature/design-system-alignment`
- `DESIGN_IMPLEMENTATION_PLAN.md` with exact tokens and git commands
- Prioritized commits: P0 (colors) → P1 (typography) → P2 (spacing) → P3 (border-radius) → P4 (animations)
- Automatic config file modifications (Tailwind, CSS)

### Generate Token Formats

```bash
# Tailwind config
node scripts/generate-tailwind-config.js references/duchateau.json tailwind.config.js

# CSS variables
node scripts/generate-css-variables.js references/duchateau.json variables.css

# shadcn/ui theme
node scripts/generate-shadcn-theme.js references/linear.json --format=css

# W3C Design Tokens
node scripts/generate-w3c-tokens.js references/linear.json tokens.json

# Figma Variables
node scripts/generate-figma-tokens.js references/vercel.json --format=figma

# Style Dictionary
node scripts/generate-w3c-tokens.js references/linear.json --format=sd
```

### Blend Design Systems

```bash
# Equal blend of two systems
node scripts/blend-design-systems.js linear.json vercel.json blended.json

# Weighted blend (60% Linear, 40% Vercel)
node scripts/blend-design-systems.js linear.json vercel.json --weights=60,40

# Prefer first system, fill gaps from others
node scripts/blend-design-systems.js linear.json vercel.json --strategy=prefer
```

### Migrate Between Formats

```bash
# Impression to W3C tokens
node scripts/migrate-tokens.js design-system.json --from=impression --to=w3c tokens.json

# W3C to Tailwind config
node scripts/migrate-tokens.js tokens.json --from=w3c --to=tailwind tailwind.config.js

# Figma tokens to CSS
node scripts/migrate-tokens.js figma-tokens.json --from=figma --to=css variables.css
```

### CI Integration

```bash
# Basic comparison with exit codes
node scripts/ci-compare.js ./my-project ./design-system.json

# GitHub Actions format
node scripts/ci-compare.js . ./reference.json --format=github

# GitLab CI with strict threshold
node scripts/ci-compare.js . ./brand.json --format=gitlab --threshold=90
```

### Screenshot Comparisons

```bash
# Generate capture plan
node scripts/capture-screenshots.js https://example.com ./screenshots

# Compare before/after
node scripts/capture-screenshots.js --compare ./before ./after --output=diff.html
```

### Generate Component Library

```bash
# React components (default)
node scripts/generate-component-library.js design.json ./components

# Vue components
node scripts/generate-component-library.js design.json ./components --framework=vue

# Svelte components
node scripts/generate-component-library.js design.json ./components --framework=svelte
```

### Generate Style Guide

```bash
# Interactive HTML style guide
node scripts/generate-style-guide.js design.json style-guide.html

# Markdown documentation
node scripts/generate-style-guide.js design.json style-guide.md --format=md
```

### Visual Regression Testing

```bash
# Compare before/after screenshots
node scripts/visual-regression.js ./before ./after ./diff-output

# With custom threshold
node scripts/visual-regression.js ./before ./after --threshold=0.05
```

### Watch Design System Changes

```bash
# Monitor for changes
node scripts/watch-design-system.js design.json baseline.json

# With webhook notifications
node scripts/watch-design-system.js design.json --webhook=https://hooks.slack.com/...
```

### PR Automation

```bash
# Generate PR body
node scripts/pr-automation.js before.json after.json --format=github

# Generate commit message
node scripts/pr-automation.js before.json after.json --commit-message
```

### Generate Storybook Stories

```bash
# Generate CSF3 stories
node scripts/generate-storybook.js design.json ./stories
```

### Design Versioning

```bash
# Initialize version tracking
node scripts/design-versioning.js init --design=design.json

# Create snapshot
node scripts/design-versioning.js snapshot --message="Add brand colors"

# List versions
node scripts/design-versioning.js list

# Compare versions
node scripts/design-versioning.js diff v1 v2

# Rollback
node scripts/design-versioning.js rollback v1

# Generate changelog
node scripts/design-versioning.js changelog
```

### Semantic Naming

```bash
# Generate semantic names
node scripts/semantic-naming.js design.json

# Output as CSS
node scripts/semantic-naming.js design.json --format=css

# Output as Tailwind
node scripts/semantic-naming.js design.json --format=tailwind
```

## Pre-Extracted References

Skip live extraction for these popular designs:

| Site | File | Character |
|------|------|-----------|
| DuChateau | `references/duchateau.json` | Luxury editorial, serif typography, warm neutrals |
| Linear | `references/linear.json` | Dark-mode SaaS, Inter Variable, indigo accent (#5e6ad2) |
| Vercel | `references/vercel.json` | Light-mode developer platform, Geist font, blue accent (#0070f3) |
| Sorrel | `references/sorrel.json` | Light-mode cooking app, Söhne + Novarese, cream background |

## What Gets Extracted

| Category | Details |
|----------|---------|
| **Colors** | CSS variables from `:root`, computed palette with occurrence counts, semantic groupings, gradients, dark/light mode detection |
| **Typography** | Font families (via Font Loading API), size scale, weights, line-heights, letter-spacing, font pairings |
| **Spacing** | Scale derived from padding/margin/gap values, grid detection |
| **Animations** | `@keyframes` rules, transition properties, durations, cubic-bezier/spring easing functions |
| **Interaction States** | Hover, focus, active, disabled states for interactive elements |
| **Focus Indicators** | Outline styles, colors, widths, offsets for accessibility |
| **Components** | Buttons, inputs, and cards with full computed styles |
| **Layout** | Breakpoints from `@media` queries, container `max-width` values, responsive tokens |
| **Effects** | Box shadows, border-radius patterns |
| **Icons** | Library detection (Lucide, Heroicons, FontAwesome, Material) |

## Supported Output Formats

| Format | Script | Description |
|--------|--------|-------------|
| Impression JSON | (native) | Canonical format with full extraction data |
| Tailwind CSS | `generate-tailwind-config.js` | `theme.extend` configuration |
| CSS Variables | `generate-css-variables.js` | `:root` custom properties |
| shadcn/ui | `generate-shadcn-theme.js` | HSL format for shadcn components |
| W3C Design Tokens | `generate-w3c-tokens.js` | DTCG standard format |
| Figma Variables | `generate-figma-tokens.js` | Figma API format |
| Tokens Studio | `generate-figma-tokens.js --format=tokens-studio` | Tokens Studio format |
| Style Dictionary | `generate-w3c-tokens.js --format=sd` | Style Dictionary format |

## Comparison Algorithms

| Category | Algorithm | Match Criteria |
|----------|-----------|----------------|
| Colors | CIE ΔE 2000 | Exact: ΔE = 0, Similar: ΔE < 5, Different: ΔE ≥ 5 |
| Typography | Fuzzy string match | Font family name contains/contained by reference |
| Spacing | Numeric diff | Exact: 0px diff, Close: ≤2px diff |
| Border Radius | Exact match | Pixel value equality |
| Contrast | WCAG 2.1 | AAA: ≥7:1, AA: ≥4.5:1, AA-large: ≥3:1 |
| Focus Indicators | WCAG 2.4.7/2.4.11 | Contrast ≥3:1, thickness ≥2px recommended |

## File Structure

```
impression/
├── SKILL.md                    # Claude skill instructions
├── CLAUDE.md                   # Project context for Claude Code
├── marketplace.json            # Plugin metadata
├── README.md                   # This file
├── LICENSE                     # MIT
├── types.d.ts                  # TypeScript definitions
├── scripts/
│   ├── extract-design-system.js      # Browser injection script
│   ├── compare-design-systems.js     # CIE ΔE 2000 + WCAG + focus comparison
│   ├── implement-design-changes.js   # Plan generator with config modification
│   ├── generate-tailwind-config.js   # JSON → Tailwind
│   ├── generate-css-variables.js     # JSON → CSS vars
│   ├── generate-figma-tokens.js      # JSON → Figma Variables
│   ├── generate-shadcn-theme.js      # JSON → shadcn/ui
│   ├── generate-w3c-tokens.js        # JSON → W3C/Style Dictionary
│   ├── generate-component-library.js # JSON → React/Vue/Svelte components
│   ├── generate-style-guide.js       # JSON → HTML/Markdown docs
│   ├── generate-storybook.js         # JSON → Storybook CSF3 stories
│   ├── blend-design-systems.js       # Merge multiple systems
│   ├── migrate-tokens.js             # Convert between formats
│   ├── capture-screenshots.js        # Before/after screenshots
│   ├── visual-regression.js          # Pixel-diff comparison
│   ├── watch-design-system.js        # Monitor design changes
│   ├── pr-automation.js              # Generate PR descriptions
│   ├── design-versioning.js          # Version tracking and history
│   ├── semantic-naming.js            # Intelligent semantic naming
│   └── ci-compare.js                 # CI/CD integration
├── references/                 # Pre-extracted design systems
│   ├── duchateau.json
│   ├── linear.json
│   ├── vercel.json
│   └── sorrel.json
└── assets/
    ├── style-guide-schema.json       # JSON Schema for validation
    ├── design-system-starter.json    # Starter template
    └── examples/               # Example generated configs
```

## TypeScript Support

TypeScript definitions are provided in `types.d.ts`:

```typescript
import type { DesignSystem, ComparisonResult, TokenFormat } from 'impression/types';
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Design System Check
  run: node scripts/ci-compare.js . design-system.json --format=github
```

### GitLab CI

```yaml
design-check:
  script:
    - node scripts/ci-compare.js . design.json --format=gitlab > gl-code-quality.json
  artifacts:
    reports:
      codequality: gl-code-quality.json
```

## Limitations

- **Cross-origin stylesheets**: May be inaccessible due to CORS
- **CSS-in-JS**: Requires page interaction to trigger runtime style injection
- **Protected sites**: Some sites block automated browser access
- **Dynamic content**: May need scrolling/interaction to capture lazy-loaded styles

## Requirements

- Claude Code with Playwright MCP, or Claude.ai (Pro/Max/Team/Enterprise)
- Node.js 18+ (for CLI scripts)

## License

MIT

## Contributing

PRs welcome! Completed features:

- [x] Tailwind config generator
- [x] CSS variables generator
- [x] Project comparison with CIE ΔE 2000 color matching
- [x] WCAG accessibility audits (contrast + focus indicators)
- [x] Implementation plan generator with atomic commits
- [x] Pre-extracted references (Linear, Vercel, DuChateau, Sorrel)
- [x] Figma Variables export
- [x] shadcn/ui theme generator
- [x] W3C Design Tokens format
- [x] Style Dictionary format
- [x] Design system blending
- [x] Token format migration
- [x] CI/CD integration
- [x] TypeScript definitions
- [x] Dark/light mode detection
- [x] Interaction state extraction (hover, focus, active, disabled)
- [x] Cubic-bezier/spring curve extraction
- [x] Multi-viewport responsive token support
- [x] Focus indicator accessibility audit (WCAG 2.4.7/2.4.11)
- [x] Component library generation (React, Vue, Svelte)
- [x] Style guide documentation generation (HTML, Markdown)
- [x] Visual regression testing
- [x] Design system change watching with webhooks
- [x] Automated PR generation with design change summaries
- [x] Storybook CSF3 story generation
- [x] Design versioning with snapshots and rollback
- [x] Semantic naming with HSL color analysis
- [ ] More references (Stripe, Notion, Tailwind UI)
- [ ] Figma plugin integration
