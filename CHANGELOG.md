# Changelog

All notable changes to Impression will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2025-01-12

### Added

#### New Scripts
- **generate-component-library.js** - Generate React/Vue/Svelte components from design tokens
- **generate-style-guide.js** - Generate interactive HTML or Markdown style guide documentation
- **generate-storybook.js** - Generate Storybook CSF3 stories for design system
- **visual-regression.js** - Pixel-diff comparison for visual regression testing
- **watch-design-system.js** - Monitor design system files for changes with webhook support
- **pr-automation.js** - Generate PR descriptions with design change summaries
- **design-versioning.js** - Version tracking with snapshots, diffs, rollback, and changelog
- **semantic-naming.js** - Intelligent semantic naming using HSL color analysis

#### Shared Utilities (scripts/lib/)
- **color-utils.js** - Extracted color conversion and comparison functions (hexToRgb, rgbToHsl, deltaE2000, etc.)
- **contrast-utils.js** - WCAG contrast and focus indicator auditing
- **file-utils.js** - Common file operations and project detection

#### Enhanced Extraction
- Interaction state extraction (hover, focus, active, disabled) in `extract-design-system.js`
- Cubic-bezier and spring curve extraction from animations
- Multi-viewport responsive token support

#### Enhanced Comparison
- Focus indicator accessibility audit (WCAG 2.4.7 and 2.4.11) in `compare-design-systems.js`
- Focus indicator contrast checking (minimum 3:1)
- Focus indicator thickness validation (2px+ recommended)

#### Project Structure
- Reorganized scripts into logical subdirectories (core, generators, tools, ci)
- Added test suite with color-utils tests
- Added unified CLI entry point (bin/impression.js)

### Changed
- Bumped version to 3.0.0
- Updated all documentation (SKILL.md, README.md, CLAUDE.md)
- Enhanced semantic role inference for colors
- Improved error messages and validation

### Fixed
- Removed duplicated color utility code across 7 scripts (~200 LOC reduction)

## [2.0.0] - 2025-01-07

### Added
- **ci-compare.js** - CI/CD integration with exit codes and GitHub/GitLab annotations
- **blend-design-systems.js** - Merge multiple design systems with weighted blending
- **migrate-tokens.js** - Convert tokens between formats (W3C, Tailwind, CSS, Figma, etc.)
- **capture-screenshots.js** - Generate screenshot capture plans
- **generate-figma-tokens.js** - Export to Figma Variables and Tokens Studio format
- **generate-w3c-tokens.js** - W3C Design Tokens and Style Dictionary export
- Pre-extracted Sorrel reference design system

### Changed
- Enhanced color comparison with CIE ΔE 2000 algorithm
- Improved WCAG accessibility auditing
- Better project type detection

## [1.0.0] - 2025-01-05

### Added
- Initial release
- **extract-design-system.js** - Browser injection script for design extraction
- **compare-design-systems.js** - Compare project against reference with CIE ΔE 2000
- **implement-design-changes.js** - Generate implementation plans with atomic commits
- **generate-tailwind-config.js** - JSON to Tailwind config conversion
- **generate-css-variables.js** - JSON to CSS custom properties
- **generate-shadcn-theme.js** - JSON to shadcn/ui HSL format
- Pre-extracted references: Linear, Vercel, DuChateau
- TypeScript definitions (types.d.ts)
- JSON Schema validation (style-guide-schema.json)

---

## Version History

| Version | Date | Summary |
|---------|------|---------|
| 3.0.0 | 2025-01-12 | 8 new scripts, shared utilities, focus indicator audit, component generation |
| 2.0.0 | 2025-01-07 | CI/CD integration, token migration, design blending, Figma export |
| 1.0.0 | 2025-01-05 | Initial release with extraction, comparison, and token generation |
