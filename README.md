# Design System Extractor

Extract complete design systems from any live website. Generate structured style guides, compare against existing projects, and create implementation plans.

## What It Does

- **Extracts** colors, typography, spacing, animations, shadows, border-radius, breakpoints, and component patterns from any URL
- **Outputs** JSON (canonical), Tailwind config, or CSS custom properties
- **Compares** your project against extracted design systems with ΔE color matching
- **Generates** prioritized implementation plans with atomic commits

## Installation

### Claude Code (Recommended)

```bash
/plugin marketplace add jamesrosing/design-system-extractor
```

### Manual Installation

Copy to your skills directory:

```bash
# Personal skills
cp -r design-system-extractor ~/.claude/skills/

# Project-specific
cp -r design-system-extractor .claude/skills/
```

### Claude.ai Web App

1. Go to **Settings** → **Profile** → **Custom Skills**
2. Upload the `SKILL.md` file and supporting folders

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

## Compare Project Against Reference

Analyze how your project's styles align with an extracted design system:

```bash
# Generate comparison report
node scripts/compare-design-systems.js ./my-project examples/extracted/duchateau.json

# Save to file
node scripts/compare-design-systems.js ./my-project examples/extracted/duchateau.json comparison.md
```

Output includes:
- Overall alignment score (0-100%)
- Per-category scores (colors, typography, spacing, border-radius)
- Exact matches, similar colors (ΔE < 5), missing tokens
- Actionable recommendations

## Generate Implementation Plan

Create a prioritized plan to align your project with a reference:

```bash
# Preview changes (dry run)
node scripts/implement-design-changes.js ./my-project examples/extracted/duchateau.json --dry-run

# Generate plan and create branch
node scripts/implement-design-changes.js ./my-project examples/extracted/duchateau.json
```

Creates:
- Feature branch: `feature/design-system-alignment`
- `DESIGN_IMPLEMENTATION_PLAN.md` with exact tokens and git commands
- Prioritized commits: P0 (colors) → P4 (animations)

## Output Formats

### JSON (Default)

Complete structured data following the canonical schema in `templates/style-guide-schema.json`.

### Tailwind Config

Generate directly from extracted JSON:

```bash
node scripts/generate-tailwind-config.js examples/extracted/duchateau.json tailwind.config.js
```

Output:
```javascript
// Generated tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#000000',
        background: { DEFAULT: '#ffffff', secondary: '#fbf9f4' },
        foreground: { DEFAULT: '#000000', secondary: '#333333' },
        accent: { DEFAULT: '#cc3366' }
      },
      fontFamily: {
        serif: ['"beaufort-pro"', 'system-ui', 'sans-serif'],
        display: ['"ABC Social Condensed Bold"', 'system-ui', 'sans-serif']
      },
      // ... full theme
    }
  }
}
```

### CSS Variables

Generate directly from extracted JSON:

```bash
node scripts/generate-css-variables.js examples/extracted/duchateau.json variables.css
```

Output:
```css
:root {
  /* Colors */
  --color-primary: #000000;
  --color-bg: #ffffff;
  --color-bg-2: #fbf9f4;
  --color-text: #000000;
  --color-text-secondary: #333333;
  --color-accent: #cc3366;
  
  /* Typography */
  --font-serif: "beaufort-pro", system-ui, sans-serif;
  --font-display: "ABC Social Condensed Bold", system-ui, sans-serif;
  --font-size-xs: 12px;
  --font-size-sm: 13px;
  /* ... full scale */
  
  /* Spacing */
  --spacing-xs: 5px;
  --spacing-sm: 8px;
  --spacing-md: 10px;
  /* ... */
}
```

## Pre-Extracted References

Skip live extraction for these popular designs:

| Site | File | Character |
|------|------|-----------|
| DuChateau | `examples/extracted/duchateau.json` | Luxury editorial |
| Linear | `examples/extracted/linear.json` | Clean, minimal SaaS (TODO) |
| Stripe | `examples/extracted/stripe.json` | Data-dense, professional (TODO) |
| Vercel | `examples/extracted/vercel.json` | Developer-focused (TODO) |

## What Gets Extracted

| Category | Details |
|----------|---------|
| **Colors** | CSS variables, computed palette, semantic groupings (backgrounds, text, borders, accents) |
| **Typography** | Font families, scale, weights, line-heights, letter-spacing |
| **Spacing** | Scale, grid detection, gaps, paddings, margins |
| **Animations** | Keyframes, transitions, durations, easings |
| **Components** | Buttons, inputs, cards (with full style properties) |
| **Layout** | Breakpoints, container widths |
| **Effects** | Shadows, border-radius patterns |
| **Icons** | Library detection (Lucide, Heroicons, FontAwesome, etc.) |

## File Structure

```
design-system-extractor/
├── SKILL.md                    # Main instructions
├── marketplace.json            # Plugin metadata
├── README.md                   # This file
├── LICENSE                     # MIT
├── scripts/
│   ├── extract-design-system.js      # Browser injection script
│   ├── compare-design-systems.js     # Project ↔ reference comparison
│   ├── implement-design-changes.js   # Generate implementation plan
│   ├── generate-tailwind-config.js   # JSON → Tailwind converter
│   └── generate-css-variables.js     # JSON → CSS vars converter
├── templates/                  # (reserved for future templates)
├── references/                 # (reserved for style references)
└── examples/
    ├── extracted/
    │   └── duchateau.json      # Pre-extracted: luxury flooring
    └── generated/              # Generated config examples
        ├── duchateau-tailwind.config.js
        └── duchateau-variables.css
```

## Limitations

- **Cross-origin stylesheets**: May be inaccessible due to CORS
- **CSS-in-JS**: Requires page interaction to trigger all runtime styles
- **Protected sites**: Some sites block automated access
- **Dynamic content**: May need scrolling to capture lazy-loaded styles

## Requirements

- Claude Code, Claude.ai (Pro/Max/Team/Enterprise), or Claude API
- Playwright browser automation (for live extraction)

## License

MIT

## Contributing

PRs welcome! Ideas for improvement:

- [x] Tailwind config generator
- [x] CSS variables generator
- [x] Project comparison with ΔE color matching
- [x] Implementation plan generator
- [ ] More pre-extracted references (Stripe, Vercel, Notion)
- [ ] Figma export format
- [ ] Automated PR generation with before/after screenshots
