# Impression

Extract complete design systems from any live website using Playwright browser automation. Compare projects against reference designs with perceptually accurate color matching, generate implementation plans, and export to multiple token formats.

## What It Does

- **Extracts** colors, typography, spacing, animations, shadows, border-radius, breakpoints, gradients, and component patterns from any URL
- **Outputs** JSON (canonical), Tailwind config, CSS variables, shadcn/ui themes, W3C Design Tokens, Figma Variables, or Style Dictionary
- **Compares** your project against extracted design systems using CIE ΔE 2000 color matching with WCAG accessibility audits
- **Generates** prioritized implementation plans with atomic commits (P0→P4)
- **Blends** multiple design systems into hybrid combinations
- **Migrates** tokens between different format standards

**Zero dependencies** — vanilla Node.js scripts, no package.json, no build step.

## Installation

### Claude Code (Recommended)

```bash
/plugin marketplace add jamesrosing/impression
```

### Manual Installation

```bash
# Personal skills
cp -r impression ~/.claude/skills/

# Project-specific
cp -r impression .claude/skills/
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
node scripts/compare-design-systems.js ./my-project examples/extracted/duchateau.json

# Save to file
node scripts/compare-design-systems.js ./my-project examples/extracted/duchateau.json comparison.md
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
node scripts/implement-design-changes.js ./my-project examples/extracted/duchateau.json --dry-run

# Generate plan and create feature branch
node scripts/implement-design-changes.js ./my-project examples/extracted/duchateau.json
```

**Creates:**
- Feature branch: `feature/design-system-alignment`
- `DESIGN_IMPLEMENTATION_PLAN.md` with exact tokens and git commands
- Prioritized commits: P0 (colors) → P1 (typography) → P2 (spacing) → P3 (border-radius) → P4 (animations)
- Automatic config file modifications (Tailwind, CSS)

### Generate Token Formats

```bash
# Tailwind config
node scripts/generate-tailwind-config.js examples/extracted/duchateau.json tailwind.config.js

# CSS variables
node scripts/generate-css-variables.js examples/extracted/duchateau.json variables.css

# shadcn/ui theme
node scripts/generate-shadcn-theme.js examples/extracted/linear.json --format=css

# W3C Design Tokens
node scripts/generate-w3c-tokens.js examples/extracted/linear.json tokens.json

# Figma Variables
node scripts/generate-figma-tokens.js examples/extracted/vercel.json --format=figma

# Style Dictionary
node scripts/generate-w3c-tokens.js examples/extracted/linear.json --format=sd
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

## Pre-Extracted References

Skip live extraction for these popular designs:

| Site | File | Character |
|------|------|-----------|
| DuChateau | `examples/extracted/duchateau.json` | Luxury editorial, serif typography, warm neutrals |
| Linear | `examples/extracted/linear.json` | Dark-mode SaaS, Inter Variable, indigo accent (#5e6ad2) |
| Vercel | `examples/extracted/vercel.json` | Light-mode developer platform, Geist font, blue accent (#0070f3) |
| Sorrel | `examples/extracted/sorrel.json` | Light-mode cooking app, Söhne + Novarese, cream background |

## What Gets Extracted

| Category | Details |
|----------|---------|
| **Colors** | CSS variables from `:root`, computed palette with occurrence counts, semantic groupings, gradients, dark/light mode detection |
| **Typography** | Font families (via Font Loading API), size scale, weights, line-heights, letter-spacing, font pairings |
| **Spacing** | Scale derived from padding/margin/gap values, grid detection |
| **Animations** | `@keyframes` rules, transition properties, durations, easing functions |
| **Components** | Buttons, inputs, and cards with full computed styles |
| **Layout** | Breakpoints from `@media` queries, container `max-width` values |
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
│   ├── compare-design-systems.js     # CIE ΔE 2000 + WCAG comparison
│   ├── implement-design-changes.js   # Plan generator with config modification
│   ├── generate-tailwind-config.js   # JSON → Tailwind
│   ├── generate-css-variables.js     # JSON → CSS vars
│   ├── generate-figma-tokens.js      # JSON → Figma Variables
│   ├── generate-shadcn-theme.js      # JSON → shadcn/ui
│   ├── generate-w3c-tokens.js        # JSON → W3C/Style Dictionary
│   ├── blend-design-systems.js       # Merge multiple systems
│   ├── migrate-tokens.js             # Convert between formats
│   ├── capture-screenshots.js        # Before/after screenshots
│   └── ci-compare.js                 # CI/CD integration
├── templates/
│   ├── style-guide-schema.json       # JSON Schema for validation
│   └── design-system-starter.json    # Starter template
├── examples/
│   ├── extracted/              # Pre-extracted reference designs
│   │   ├── duchateau.json
│   │   ├── linear.json
│   │   ├── vercel.json
│   │   └── sorrel.json
│   └── generated/              # Example generated configs
└── tests/
    └── test-core.js            # Test suite
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
- [x] WCAG accessibility audits
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
- [ ] More references (Stripe, Notion, Tailwind UI)
- [ ] Automated PR generation with before/after screenshots
- [ ] Component pattern library extraction
