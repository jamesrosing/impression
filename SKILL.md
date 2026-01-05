---
name: design-system-extractor
description: Extract complete design systems from live URLs, compare against existing projects, and generate implementation plans. Use when needing to (1) scrape design tokens from reference websites, (2) analyze how an existing project differs from a target design system, (3) generate style guides as JSON/Tailwind/CSS variables, (4) create feature branches with design alignment changes, or (5) reverse-engineer the styling of any website.
---

# Design System Extractor

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
Create a feature branch to align my project with the Stripe dashboard design
```

## Workflow 1: Extract Design System from URL

### Process

1. Navigate to target URL:
   ```javascript
   await browser_navigate(url);
   ```

2. Wait for full page load (fonts, animations):
   ```javascript
   await browser_wait_for({ time: 3 });
   ```

3. Capture multiple viewports for responsive patterns:
   ```javascript
   // Desktop
   await browser_resize({ width: 1920, height: 1080 });
   await browser_take_screenshot({ filename: 'desktop.png' });
   
   // Tablet
   await browser_resize({ width: 768, height: 1024 });
   
   // Mobile
   await browser_resize({ width: 375, height: 667 });
   ```

4. Inject extraction script:
   ```javascript
   const result = await browser_run_code({
     code: `(async (page) => {
       return await page.evaluate(() => {
         // Paste contents of scripts/extract-design-system.js here
       });
     })`
   });
   ```

5. Save extracted data to JSON following the schema in `templates/style-guide-schema.json`

### Output Files

- `{site-name}-design-system.json` - Complete extracted tokens
- `{site-name}-tailwind.config.js` - Generated Tailwind configuration (optional)
- `{site-name}-variables.css` - CSS custom properties (optional)

## Workflow 2: Compare Project Against Style Guide

### Quick Start

```bash
node scripts/compare-design-systems.js /path/to/project examples/extracted/duchateau.json
node scripts/compare-design-systems.js /path/to/project examples/extracted/duchateau.json comparison-report.md
```

### Process

The comparison script automatically:

1. **Detects project type** (Tailwind, CSS variables, CSS-in-JS)
2. **Extracts current styles** from config files
3. **Runs diff algorithms** for each category
4. **Generates markdown report** with scores and recommendations

### Comparison Algorithms

| Category | Algorithm | Match Criteria |
|----------|-----------|----------------|
| Colors | CIE ΔE 2000 | Exact: ΔE = 0, Similar: ΔE < 5, Different: ΔE ≥ 5 |
| Typography | Fuzzy string match | Font family name contains/contained by reference |
| Spacing | Numeric diff | Exact: 0px diff, Close: ≤2px diff |
| Border Radius | Exact match | Pixel value equality |

### Output Report Structure

```markdown
# Design System Comparison Report

## Overall Alignment Score: 72%

| Category | Score | Status |
|----------|-------|--------|
| Colors | 85% | ✅ |
| Typography | 50% | ⚠️ |
| Spacing | 70% | ⚠️ |
| Border Radius | 100% | ✅ |

## Colors (85%)
### ✅ Exact Matches (8)
### ⚠️ Similar Colors (3)
### ❌ Missing from Project (2)

## Recommendations
1. **Install missing fonts** - Add: beaufort-pro, ABC Social Condensed
2. **Align spacing scale** - Consider adopting: 5px, 8px, 10px
```

### Programmatic Usage

```javascript
const { compareDesignSystems } = require('./scripts/compare-design-systems');

const { projectType, comparisons, report } = compareDesignSystems(
  '/path/to/project',
  'examples/extracted/duchateau.json'
);

console.log(`Project type: ${projectType}`);
console.log(`Color alignment: ${comparisons.colors.score}%`);
```

## Workflow 3: Implement Design Changes

### Quick Start

```bash
# Preview what would change
node scripts/implement-design-changes.js /path/to/project examples/extracted/duchateau.json --dry-run

# Execute (creates branch and generates plan)
node scripts/implement-design-changes.js /path/to/project examples/extracted/duchateau.json
```

### Process

The implementation script:

1. **Runs comparison** to identify gaps
2. **Detects config files** (tailwind.config.js or CSS variables file)
3. **Generates prioritized tokens** for each category
4. **Creates feature branch** `feature/design-system-alignment`
5. **Outputs implementation plan** with exact tokens to add

### Priority Order

| Priority | Category | Description |
|----------|----------|-------------|
| P0 | Colors | Design tokens foundation (backgrounds, text, borders, accents) |
| P1 | Typography | Font families, size scale, weights |
| P2 | Spacing | Spacing scale values |
| P3 | Border Radius | Corner radius tokens |
| P4 | Animations | Durations and easing functions |

### Output: DESIGN_IMPLEMENTATION_PLAN.md

```markdown
# Implementation Plan

**Branch:** `feature/design-system-alignment`
**Commits:** 5

## Execution Order

### P0: colors
**Commit:** `design: add color tokens from reference system`
**File:** `tailwind.config.js`
**Tokens:**
```
colors: {
  'primary': '#000000',
  'background': '#ffffff',
  'accent': '#cc3366'
}
```

## Git Commands
```bash
git checkout -b feature/design-system-alignment
# Edit tailwind.config.js with tokens above
git add tailwind.config.js
git commit -m "design: add color tokens from reference system"
```
```

### Atomic Commits

Each category gets its own commit for clean history:

```bash
git log --oneline
# a1b2c3d design: add animation/transition tokens
# d4e5f6g design: align border radius tokens  
# g7h8i9j design: update spacing scale
# j1k2l3m design: align typography with reference system
# m4n5o6p design: add color tokens from reference system
```

### Programmatic Usage

```javascript
const { generateImplementationPlan, executePlan } = require('./scripts/implement-design-changes');
const { compareDesignSystems } = require('./scripts/compare-design-systems');

const { comparisons } = compareDesignSystems(projectPath, referencePath);
const reference = JSON.parse(fs.readFileSync(referencePath));
const configs = { tailwind: 'tailwind.config.js' };

const plan = generateImplementationPlan(projectPath, reference, comparisons, configs);
const results = executePlan(projectPath, plan, true); // dry-run
```

## Workflow 4: Generate Implementation Files

After extracting a design system, generate ready-to-use config files:

```bash
# Extract from live site
# (use Playwright extraction workflow)

# Generate Tailwind config
node scripts/generate-tailwind-config.js site-design.json tailwind.config.js

# Generate CSS variables
node scripts/generate-css-variables.js site-design.json src/styles/variables.css

# Or use pre-extracted reference
node scripts/generate-tailwind-config.js examples/extracted/duchateau.json
```

For Claude to execute in a project:

```
Generate a Tailwind config from the DuChateau design system and apply it to my project
```

Claude will:
1. Read `examples/extracted/duchateau.json`
2. Run `generate-tailwind-config.js` 
3. Merge with existing `tailwind.config.js` or create new
4. Update any conflicting theme values

## Pre-Extracted References

Skip live extraction for commonly referenced designs:

| Design System | File | Notes |
|--------------|------|-------|
| DuChateau | `examples/extracted/duchateau.json` | Luxury/editorial aesthetic |
| Linear | `examples/extracted/linear.json` | Clean, minimal SaaS (TODO) |
| Stripe Dashboard | `examples/extracted/stripe-dashboard.json` | Data-dense, professional (TODO) |
| Vercel | `examples/extracted/vercel.json` | Developer-focused (TODO) |

## Limitations

- **Cross-origin stylesheets**: May be inaccessible due to CORS
- **CSS-in-JS runtime styles**: Require page interaction to trigger all states
- **Protected sites**: Some sites block automated access
- **Dynamic content**: May need to scroll/interact to capture all styles

### Workarounds

- For protected sites: Manual inspection or saved HTML
- For dynamic content: Scroll page before extraction
- For CSS-in-JS: Interact with components to trigger style injection

## Script Reference

### extract-design-system.js

Location: `scripts/extract-design-system.js`

Injects into page context and returns comprehensive design tokens:
- Colors (variables, palette, semantic groupings)
- Typography (families, scale, weights, line-heights)
- Spacing (scale, detected grid system)
- Animations (keyframes, transitions, durations, easings)
- Components (buttons, inputs, cards patterns)
- Icons (library detection, sizes)
- Breakpoints (media queries, container widths)
- Shadows and border-radius patterns

### compare-design-systems.js

Location: `scripts/compare-design-systems.js`

Compares project styles against a reference design system JSON.

**CLI Usage:**
```bash
node scripts/compare-design-systems.js <project-path> <reference.json> [output.md]
```

**Features:**
- Auto-detects project type (Tailwind, CSS, CSS-in-JS)
- Extracts colors, fonts, spacing, border-radius from project
- CIE ΔE color comparison (perceptually accurate)
- Generates markdown report with scores per category
- Provides actionable recommendations

**Exports:**
- `compareDesignSystems(projectPath, referencePath)` → `{ projectType, comparisons, report }`
- `deltaE(hex1, hex2)` → number (color difference)
- `normalizeColor(color)` → hex string

### implement-design-changes.js

Location: `scripts/implement-design-changes.js`

Generates implementation plan with prioritized tokens for each category.

**CLI Usage:**
```bash
node scripts/implement-design-changes.js <project-path> <reference.json> [--dry-run]
```

**Features:**
- Creates `feature/design-system-alignment` branch
- Generates tokens in correct format (Tailwind or CSS vars)
- Prioritizes changes (P0: colors → P4: animations)
- Outputs `DESIGN_IMPLEMENTATION_PLAN.md` with exact tokens and git commands

**Exports:**
- `generateImplementationPlan(projectPath, reference, comparisons, configs)` → plan object
- `executePlan(projectPath, plan, dryRun)` → results array

### generate-tailwind-config.js

Location: `scripts/generate-tailwind-config.js`

Transforms extracted JSON into a production-ready Tailwind config.

**CLI Usage:**
```bash
node scripts/generate-tailwind-config.js examples/extracted/duchateau.json
node scripts/generate-tailwind-config.js examples/extracted/duchateau.json tailwind.config.js
```

**Programmatic Usage:**
```javascript
const { generateTailwindConfig } = require('./scripts/generate-tailwind-config');
const designSystem = JSON.parse(fs.readFileSync('duchateau.json'));
const config = generateTailwindConfig(designSystem);
fs.writeFileSync('tailwind.config.js', config);
```

**Generates:**
- `colors` - Semantic color tokens (background, foreground, border, accent)
- `fontFamily` - Font stacks organized by role (sans, serif, display, mono)
- `fontSize` - Type scale with calculated line-heights
- `fontWeight` - Available weights with semantic names
- `spacing` - Full spacing scale
- `borderRadius` - Radius tokens with semantic names
- `boxShadow` - Shadow definitions
- `screens` - Responsive breakpoints
- `transitionDuration` - Animation durations
- `transitionTimingFunction` - Easing curves

### generate-css-variables.js

Location: `scripts/generate-css-variables.js`

Transforms extracted JSON into CSS custom properties.

**CLI Usage:**
```bash
node scripts/generate-css-variables.js examples/extracted/duchateau.json
node scripts/generate-css-variables.js examples/extracted/duchateau.json variables.css
```

**Programmatic Usage:**
```javascript
const { generateCSSVariables } = require('./scripts/generate-css-variables');
const designSystem = JSON.parse(fs.readFileSync('duchateau.json'));
const css = generateCSSVariables(designSystem);
fs.writeFileSync('variables.css', css);
```

**Generates organized sections:**
- Colors (palette, semantic backgrounds/text/borders/accents)
- Typography (families, sizes, weights, line-heights, letter-spacing)
- Spacing (full scale + shortcuts: xs, sm, md, lg, xl)
- Border radius
- Shadows
- Transitions (durations, easings)
- Breakpoints (reference values)
- Container widths

### Usage via Playwright

```javascript
// Read the script
const scriptContent = await readFile('scripts/extract-design-system.js');

// Execute in page context
const designSystem = await browser_run_code({
  code: `async (page) => {
    return await page.evaluate(() => {
      ${scriptContent}
    });
  }`
});
```
