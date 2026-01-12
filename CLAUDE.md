# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Skill Package Structure

This is a **distributable Claude Code skill**. The `impression/` directory IS the skill package that gets installed to `.claude/skills/impression/`.

### Installation

```bash
# From GitHub (recommended)
git clone https://github.com/jamesrosing/impression ~/.claude/skills/impression

# Manual - personal skills
cp -r impression ~/.claude/skills/

# Manual - project-specific
cp -r impression <project>/.claude/skills/

# Development - symlink for live editing
ln -s /path/to/impression ~/.claude/skills/impression
```

### Current Installation
```
~/.claude/skills/impression -> /mnt/d/projects/skillsMP/impression
```

## Project Overview

**Impression** is a Claude Code skill/plugin that extracts design systems from live websites using Playwright browser automation. It outputs structured JSON, and can generate Tailwind configs, CSS variables, shadcn/ui themes, W3C Design Tokens, Figma Variables, or Style Dictionary format. It also compares existing projects against extracted reference designs and generates implementation plans.

**No dependencies** - vanilla Node.js scripts, no package.json, no build step.

## Commands

```bash
# Compare project styles against a reference design system
node scripts/compare-design-systems.js <project-path> <reference.json> [output.md]

# Generate implementation plan with feature branch
node scripts/implement-design-changes.js <project-path> <reference.json> [--dry-run]

# Generate Tailwind config from extracted JSON
node scripts/generate-tailwind-config.js <design-system.json> [output.js]

# Generate CSS variables from extracted JSON
node scripts/generate-css-variables.js <design-system.json> [output.css]

# Generate shadcn/ui theme
node scripts/generate-shadcn-theme.js <design-system.json> [--format=css|json]

# Generate W3C Design Tokens
node scripts/generate-w3c-tokens.js <design-system.json> [--format=w3c|sd]

# Generate Figma Variables
node scripts/generate-figma-tokens.js <design-system.json> [--format=figma|tokens-studio]

# Blend multiple design systems
node scripts/blend-design-systems.js <system1.json> <system2.json> [--weights=60,40]

# Migrate between token formats
node scripts/migrate-tokens.js <input> --from=<format> --to=<format> [output]

# CI comparison with exit codes
node scripts/ci-compare.js <project-path> <reference.json> [--format=github|gitlab|json]

# Generate screenshot capture plan
node scripts/capture-screenshots.js <url> [output-dir]
```

## Architecture

### Core Data Flow

```
Live URL → [Playwright extract] → Impression JSON → [generators] → Output formats
                                        ↓
                              [compare-design-systems.js]
                                        ↓
                            Comparison Report + Gaps
                                        ↓
                           [implement-design-changes.js]
                                        ↓
                          Feature branch + Modified configs
```

### Live Extraction Workflow

The core use case is extracting from a live URL via Playwright MCP tools:

```javascript
// 1. Navigate to target
await browser_navigate({ url: 'https://example.com' });

// 2. Wait for fonts/animations to load
await browser_wait_for({ time: 3 });

// 3. Read the extraction script
const scriptContent = fs.readFileSync('scripts/extract-design-system.js', 'utf8');

// 4. Inject and execute in page context
const result = await browser_run_code({
  code: `async (page) => {
    return await page.evaluate(() => {
      ${scriptContent}
    });
  }`
});

// 5. Save result to references/{site}.json
```

### Script Purposes

| Script | Purpose | Key Exports |
|--------|---------|-------------|
| `extract-design-system.js` | Browser injection script; walks DOM, extracts CSS vars, computed styles, keyframes | `extractDesignSystem()` |
| `compare-design-systems.js` | Compares project to reference JSON using CIE ΔE 2000 color matching (ΔE < 5 = similar) | `compareDesignSystems()`, `deltaE2000()`, `getContrastRatio()` |
| `implement-design-changes.js` | Generates prioritized plan (P0: colors → P4: animations), creates feature branch, modifies configs | `generateImplementationPlan()`, `executePlan()`, `modifyTailwindConfig()` |
| `generate-tailwind-config.js` | JSON → Tailwind config | `generateTailwindConfig()` |
| `generate-css-variables.js` | JSON → CSS custom properties | `generateCSSVariables()` |
| `generate-shadcn-theme.js` | JSON → shadcn/ui HSL format | `mapToShadcnTheme()`, `generateCSS()` |
| `generate-w3c-tokens.js` | JSON → W3C Design Tokens or Style Dictionary | `generateW3CTokens()`, `generateStyleDictionary()` |
| `generate-figma-tokens.js` | JSON → Figma Variables API format | `generateFigmaVariables()`, `generateTokensStudio()` |
| `blend-design-systems.js` | Merge multiple design systems | `blendDesignSystems()`, `dedupeColors()` |
| `migrate-tokens.js` | Convert between token formats | `migrateTokens()`, `detectFormat()` |
| `capture-screenshots.js` | Generate screenshot capture plans | `generateCapturePlan()`, `generateComparisonReport()` |
| `ci-compare.js` | CI/CD integration with exit codes | `runCIComparison()`, `generateGitHubAnnotations()` |

## Pre-Extracted References

`references/` contains ready-to-use design systems:
- `duchateau.json` - Luxury/editorial aesthetic
- `linear.json` - Dark-mode SaaS, Inter Variable, indigo accent
- `vercel.json` - Developer platform, Geist font, blue accent
- `sorrel.json` - Light-mode cooking app, Söhne + Novarese, cream background

## Token Format Support

| Format | Read | Write | Script |
|--------|------|-------|--------|
| Impression JSON | ✓ | ✓ | Native |
| W3C Design Tokens | ✓ | ✓ | `generate-w3c-tokens.js`, `migrate-tokens.js` |
| Style Dictionary | ✓ | ✓ | `generate-w3c-tokens.js --format=sd` |
| Figma Variables | ✓ | ✓ | `generate-figma-tokens.js` |
| Tokens Studio | ✓ | ✓ | `generate-figma-tokens.js --format=tokens-studio` |
| Tailwind CSS | ✓ | ✓ | `generate-tailwind-config.js`, `migrate-tokens.js` |
| CSS Variables | ✓ | ✓ | `generate-css-variables.js`, `migrate-tokens.js` |
| shadcn/ui | ✓ | ✓ | `generate-shadcn-theme.js` |

## Key Algorithms

- **Color Comparison**: RGB → XYZ → LAB → CIE ΔE 2000 (ΔE < 5 = perceptually similar)
- **Accessibility**: WCAG 2.1 contrast ratio calculation (AAA: ≥7:1, AA: ≥4.5:1)
- **Color Blending**: Weighted RGB interpolation with deduplication by color distance
- **Project Detection**: Checks for `tailwind.config.{js,ts,mjs,cjs}`, then CSS files
- **Priority System**: P0 (colors) → P1 (typography) → P2 (spacing) → P3 (border-radius) → P4 (animations)

## File Purposes

- `SKILL.md` - Instructions Claude receives when skill is invoked (edit for behavior changes)
- `README.md` - User-facing documentation
- `CLAUDE.md` - This file — project context for Claude Code
- `marketplace.json` - Plugin metadata for Claude Code marketplace
- `types.d.ts` - TypeScript definitions for all types
- `assets/style-guide-schema.json` - JSON Schema for validation
- `assets/design-system-starter.json` - Starter template

## Development Notes

- All scripts use `require.main === module` pattern for CLI + programmatic use
- Exports are at bottom of each file via `module.exports`
- No external dependencies — uses only Node.js built-ins (`fs`, `path`, `child_process`)
- Color normalization handles hex (3/6 digit), rgb(), rgba(), hsl(), and named colors
