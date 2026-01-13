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

**Impression** is a Claude Code skill/plugin that extracts design systems from live websites using Playwright browser automation. It outputs structured JSON, and can generate Tailwind configs, CSS variables, shadcn/ui themes, W3C Design Tokens, Figma Variables, React/Vue/Svelte components, Storybook stories, and style guide documentation. It also compares existing projects against extracted reference designs and generates implementation plans.

**No dependencies** - vanilla Node.js scripts, no package.json, no build step.

## Unified CLI

```bash
# Use the unified CLI for all commands
node bin/impression.js <command> [options]

# Examples
node bin/impression.js compare ./project references/linear.json
node bin/impression.js generate tailwind design.json
node bin/impression.js version init --design=design.json
node bin/impression.js help
```

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

# Generate React/Vue/Svelte component library
node scripts/generate-component-library.js <design-system.json> [output-dir] [--framework=react|vue|svelte]

# Generate style guide documentation
node scripts/generate-style-guide.js <design-system.json> [output] [--format=html|md]

# Visual regression testing
node scripts/visual-regression.js <before-dir> <after-dir> [output-dir] [--threshold=0.1]

# Watch design system for changes
node scripts/watch-design-system.js <design-system.json> [baseline.json] [--webhook=url]

# Generate PR description from design changes
node scripts/pr-automation.js <before.json> <after.json> [--format=github|gitlab]

# Generate Storybook CSF3 stories
node scripts/generate-storybook.js <design-system.json> [output-dir]

# Design versioning and history
node scripts/design-versioning.js <command> [options]  # init|snapshot|list|diff|rollback|changelog

# Semantic naming for colors
node scripts/semantic-naming.js <design-system.json> [--format=json|css|tailwind]
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
| `extract-design-system.js` | Browser injection script; walks DOM, extracts CSS vars, computed styles, keyframes, interaction states | `extractDesignSystem()` |
| `compare-design-systems.js` | Compares project to reference JSON using CIE ΔE 2000 color matching (ΔE < 5 = similar), WCAG + focus audit | `compareDesignSystems()`, `deltaE2000()`, `getContrastRatio()`, `auditFocusIndicators()` |
| `implement-design-changes.js` | Generates prioritized plan (P0: colors → P4: animations), creates feature branch, modifies configs | `generateImplementationPlan()`, `executePlan()`, `modifyTailwindConfig()` |
| `generate-tailwind-config.js` | JSON → Tailwind config | `generateTailwindConfig()` |
| `generate-css-variables.js` | JSON → CSS custom properties | `generateCSSVariables()` |
| `generate-shadcn-theme.js` | JSON → shadcn/ui HSL format | `mapToShadcnTheme()`, `generateCSS()` |
| `generate-w3c-tokens.js` | JSON → W3C Design Tokens or Style Dictionary | `generateW3CTokens()`, `generateStyleDictionary()` |
| `generate-figma-tokens.js` | JSON → Figma Variables API format | `generateFigmaVariables()`, `generateTokensStudio()` |
| `generate-component-library.js` | JSON → React/Vue/Svelte components with design tokens | `generateComponentLibrary()`, `generateReactComponent()` |
| `generate-style-guide.js` | JSON → interactive HTML or Markdown documentation | `generateStyleGuide()`, `generateHTML()`, `generateMarkdown()` |
| `generate-storybook.js` | JSON → Storybook CSF3 stories | `generateStorybook()`, `generateColorStories()` |
| `blend-design-systems.js` | Merge multiple design systems | `blendDesignSystems()`, `dedupeColors()` |
| `migrate-tokens.js` | Convert between token formats | `migrateTokens()`, `detectFormat()` |
| `capture-screenshots.js` | Generate screenshot capture plans | `generateCapturePlan()`, `generateComparisonReport()` |
| `visual-regression.js` | Pixel-diff comparison between before/after screenshots | `compareScreenshots()`, `generateDiffReport()` |
| `watch-design-system.js` | Monitor design system files for changes | `watchDesignSystem()`, `deepDiff()`, `detectSeverity()` |
| `pr-automation.js` | Generate PR descriptions from design changes | `generatePRBody()`, `generateCommitMessage()`, `detectImpactLevel()` |
| `design-versioning.js` | Version tracking with snapshots and history | `initVersioning()`, `createSnapshot()`, `diffVersions()`, `rollback()` |
| `semantic-naming.js` | Intelligent semantic naming using HSL analysis | `analyzeDesignSystem()`, `detectColorRole()`, `generateNamedTokens()` |
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
- **Focus Indicators**: WCAG 2.4.7/2.4.11 compliance (contrast ≥3:1, thickness ≥2px recommended)
- **Color Blending**: Weighted RGB interpolation with deduplication by color distance
- **Semantic Naming**: HSL color analysis for role detection (primary, success, error, warning, etc.)
- **Project Detection**: Checks for `tailwind.config.{js,ts,mjs,cjs}`, then CSS files
- **Priority System**: P0 (colors) → P1 (typography) → P2 (spacing) → P3 (border-radius) → P4 (animations)
- **Visual Regression**: Pixel-diff comparison with configurable threshold
- **Version Diffing**: Deep object comparison with change categorization

## File Purposes

- `SKILL.md` - Instructions Claude receives when skill is invoked (edit for behavior changes)
- `README.md` - User-facing documentation
- `CLAUDE.md` - This file — project context for Claude Code
- `CHANGELOG.md` - Version history and release notes
- `marketplace.json` - Plugin metadata for Claude Code marketplace
- `types.d.ts` - TypeScript definitions for all types
- `bin/impression.js` - Unified CLI entry point
- `scripts/lib/` - Shared utilities (color-utils, contrast-utils, file-utils)
- `scripts/core/` - Core extraction and comparison scripts
- `scripts/generators/` - Output format generators
- `scripts/tools/` - Utility scripts (blend, migrate, naming)
- `scripts/ci/` - CI/CD and automation scripts
- `tests/` - Test suite with test-runner
- `assets/style-guide-schema.json` - JSON Schema for validation
- `assets/design-system-starter.json` - Starter template
- `assets/examples/` - Generated examples (component-library, storybook, style-guide)

## Development Notes

- All scripts use `require.main === module` pattern for CLI + programmatic use
- Exports are at bottom of each file via `module.exports`
- No external dependencies — uses only Node.js built-ins (`fs`, `path`, `child_process`)
- Color normalization handles hex (3/6 digit), rgb(), rgba(), hsl(), and named colors
