#!/usr/bin/env node
/**
 * CI Compare
 * Design system comparison for CI/CD pipelines
 *
 * Runs design token comparison and outputs machine-readable results
 * with appropriate exit codes for CI integration.
 *
 * Usage:
 *   node ci-compare.js <project-path> <reference.json> [options]
 *   node ci-compare.js ./my-project ./design-system.json --threshold=80
 *   node ci-compare.js . ./linear.json --format=github --fail-on=warning
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - Critical issues found (or error)
 *   2 - Warnings found (with --fail-on=warning)
 *
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// Import comparison module
let compareDesignSystems;
try {
  const comparePath = path.join(__dirname, 'compare-design-systems.js');
  if (fs.existsSync(comparePath)) {
    compareDesignSystems = require(comparePath);
  }
} catch (e) {
  // Will be defined inline if import fails
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const SEVERITY_LEVELS = {
  critical: { weight: 100, emoji: '🔴', github: 'error' },
  major: { weight: 50, emoji: '🟠', github: 'error' },
  minor: { weight: 20, emoji: '🟡', github: 'warning' },
  info: { weight: 5, emoji: '🔵', github: 'notice' }
};

const DEFAULT_THRESHOLDS = {
  colorDelta: 5,          // CIE ΔE 2000 threshold for "similar" colors
  contrastMinimum: 4.5,   // WCAG AA minimum contrast ratio
  fontSimilarity: 0.8,    // Font matching threshold
  spacingTolerance: 0.1,  // 10% tolerance for spacing values
  overallScore: 70        // Minimum passing score
};

// =============================================================================
// SIMPLIFIED COMPARISON (if module not available)
// =============================================================================

function simpleCompare(projectPath, reference) {
  const issues = [];
  let score = 100;

  // Check for Tailwind config
  const tailwindPath = path.join(projectPath, 'tailwind.config.js');
  const tailwindTsPath = path.join(projectPath, 'tailwind.config.ts');
  const hasTailwind = fs.existsSync(tailwindPath) || fs.existsSync(tailwindTsPath);

  // Check for globals.css
  const cssLocations = [
    'src/styles/globals.css',
    'src/app/globals.css',
    'styles/globals.css',
    'app/globals.css',
    'src/index.css'
  ];

  let cssContent = '';
  let cssPath = '';
  for (const loc of cssLocations) {
    const fullPath = path.join(projectPath, loc);
    if (fs.existsSync(fullPath)) {
      cssContent = fs.readFileSync(fullPath, 'utf-8');
      cssPath = loc;
      break;
    }
  }

  // Basic color check
  const refColors = reference.colors?.palette || [];
  if (refColors.length > 0) {
    const primaryColor = refColors[0]?.value;
    if (primaryColor && cssContent && !cssContent.includes(primaryColor)) {
      issues.push({
        severity: 'major',
        category: 'colors',
        message: `Primary color ${primaryColor} not found in CSS`,
        file: cssPath
      });
      score -= 15;
    }
  }

  // Font check
  const refFonts = reference.typography?.fontFamilies || [];
  for (const font of refFonts.slice(0, 2)) {
    const fontName = font.family?.toLowerCase();
    if (fontName && cssContent && !cssContent.toLowerCase().includes(fontName)) {
      issues.push({
        severity: 'minor',
        category: 'typography',
        message: `Font family "${font.family}" not found`,
        file: cssPath
      });
      score -= 5;
    }
  }

  // Config check
  if (!hasTailwind && !cssContent) {
    issues.push({
      severity: 'critical',
      category: 'config',
      message: 'No Tailwind config or CSS file found',
      file: projectPath
    });
    score -= 30;
  }

  return {
    score: Math.max(0, score),
    issues,
    summary: {
      colors: { matched: 0, missing: 0 },
      typography: { matched: 0, missing: 0 },
      spacing: { matched: 0, missing: 0 }
    }
  };
}

// =============================================================================
// CI REPORT GENERATORS
// =============================================================================

function generateJSONReport(result, options = {}) {
  return {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    project: options.projectPath,
    reference: options.referencePath,
    score: result.score,
    passed: result.score >= (options.threshold || 70),
    summary: result.summary,
    issues: result.issues.map(issue => ({
      severity: issue.severity,
      category: issue.category,
      message: issue.message,
      file: issue.file || null,
      line: issue.line || null
    })),
    thresholds: options.thresholds || DEFAULT_THRESHOLDS
  };
}

function generateGitHubAnnotations(result, options = {}) {
  const annotations = [];

  for (const issue of result.issues) {
    const level = SEVERITY_LEVELS[issue.severity]?.github || 'notice';
    const file = issue.file || 'design-system';

    // GitHub Actions workflow command format
    annotations.push(
      `::${level} file=${file}${issue.line ? `,line=${issue.line}` : ''}::${issue.message}`
    );
  }

  // Summary annotation
  const statusEmoji = result.score >= (options.threshold || 70) ? '✅' : '❌';
  annotations.unshift(
    `::notice::${statusEmoji} Design System Score: ${result.score}/100`
  );

  return annotations.join('\n');
}

function generateGitLabReport(result, options = {}) {
  // GitLab Code Quality report format
  const report = [];

  for (const issue of result.issues) {
    report.push({
      description: issue.message,
      check_name: `design-system/${issue.category}`,
      fingerprint: Buffer.from(`${issue.category}:${issue.message}`).toString('base64').slice(0, 32),
      severity: issue.severity === 'critical' ? 'blocker' :
                issue.severity === 'major' ? 'critical' :
                issue.severity === 'minor' ? 'major' : 'minor',
      location: {
        path: issue.file || 'design-system.json',
        lines: { begin: issue.line || 1 }
      }
    });
  }

  return report;
}

function generateMarkdownReport(result, options = {}) {
  const passed = result.score >= (options.threshold || 70);
  const statusEmoji = passed ? '✅' : '❌';

  let md = `# Design System Comparison Report\n\n`;
  md += `${statusEmoji} **Score: ${result.score}/100**\n\n`;

  if (!passed) {
    md += `> ⚠️ Score below threshold (${options.threshold || 70})\n\n`;
  }

  // Summary table
  md += `## Summary\n\n`;
  md += `| Category | Matched | Missing |\n`;
  md += `|----------|---------|----------|\n`;

  for (const [category, stats] of Object.entries(result.summary || {})) {
    md += `| ${category} | ${stats.matched || 0} | ${stats.missing || 0} |\n`;
  }

  // Issues
  if (result.issues.length > 0) {
    md += `\n## Issues (${result.issues.length})\n\n`;

    const grouped = {};
    for (const issue of result.issues) {
      if (!grouped[issue.severity]) grouped[issue.severity] = [];
      grouped[issue.severity].push(issue);
    }

    for (const severity of ['critical', 'major', 'minor', 'info']) {
      if (grouped[severity]?.length > 0) {
        const { emoji } = SEVERITY_LEVELS[severity];
        md += `### ${emoji} ${severity.charAt(0).toUpperCase() + severity.slice(1)} (${grouped[severity].length})\n\n`;

        for (const issue of grouped[severity]) {
          md += `- **${issue.category}**: ${issue.message}`;
          if (issue.file) md += ` (\`${issue.file}\`)`;
          md += `\n`;
        }
        md += `\n`;
      }
    }
  } else {
    md += `\n## ✨ No issues found!\n`;
  }

  md += `\n---\n*Generated by Impression CI Compare*\n`;

  return md;
}

function generateTextReport(result, options = {}) {
  const passed = result.score >= (options.threshold || 70);
  let text = '';

  text += `════════════════════════════════════════════════════════════════\n`;
  text += `  DESIGN SYSTEM COMPARISON REPORT\n`;
  text += `════════════════════════════════════════════════════════════════\n\n`;

  text += `  Score: ${result.score}/100 ${passed ? '[PASS]' : '[FAIL]'}\n`;
  text += `  Threshold: ${options.threshold || 70}\n\n`;

  text += `  Summary:\n`;
  for (const [category, stats] of Object.entries(result.summary || {})) {
    text += `    ${category}: ${stats.matched || 0} matched, ${stats.missing || 0} missing\n`;
  }

  if (result.issues.length > 0) {
    text += `\n  Issues (${result.issues.length}):\n`;
    for (const issue of result.issues) {
      const { emoji } = SEVERITY_LEVELS[issue.severity] || { emoji: '•' };
      text += `    ${emoji} [${issue.severity.toUpperCase()}] ${issue.category}: ${issue.message}\n`;
    }
  }

  text += `\n════════════════════════════════════════════════════════════════\n`;

  return text;
}

// =============================================================================
// MAIN CI COMPARISON
// =============================================================================

function runCIComparison(projectPath, referencePath, options = {}) {
  const {
    threshold = 70,
    format = 'text',
    failOn = 'critical',
    thresholds = DEFAULT_THRESHOLDS
  } = options;

  // Load reference
  if (!fs.existsSync(referencePath)) {
    throw new Error(`Reference file not found: ${referencePath}`);
  }

  const reference = JSON.parse(fs.readFileSync(referencePath, 'utf-8'));

  // Run comparison
  let result;
  if (compareDesignSystems?.runComparison) {
    result = compareDesignSystems.runComparison(projectPath, reference, thresholds);
  } else {
    result = simpleCompare(projectPath, reference);
  }

  // Generate report based on format
  const reportOptions = { projectPath, referencePath, threshold, thresholds };
  let report;

  switch (format.toLowerCase()) {
    case 'json':
      report = JSON.stringify(generateJSONReport(result, reportOptions), null, 2);
      break;
    case 'github':
      report = generateGitHubAnnotations(result, reportOptions);
      break;
    case 'gitlab':
      report = JSON.stringify(generateGitLabReport(result, reportOptions), null, 2);
      break;
    case 'markdown':
    case 'md':
      report = generateMarkdownReport(result, reportOptions);
      break;
    default:
      report = generateTextReport(result, reportOptions);
  }

  // Determine exit code
  let exitCode = 0;
  const hasCritical = result.issues.some(i => i.severity === 'critical');
  const hasMajor = result.issues.some(i => i.severity === 'major');
  const hasWarning = result.issues.some(i => i.severity === 'minor');

  if (hasCritical) {
    exitCode = 1;
  } else if (failOn === 'major' && hasMajor) {
    exitCode = 1;
  } else if (failOn === 'warning' && (hasWarning || hasMajor)) {
    exitCode = 2;
  } else if (result.score < threshold) {
    exitCode = 1;
  }

  return {
    result,
    report,
    exitCode,
    passed: exitCode === 0
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  runCIComparison,
  generateJSONReport,
  generateGitHubAnnotations,
  generateGitLabReport,
  generateMarkdownReport,
  generateTextReport,
  SEVERITY_LEVELS,
  DEFAULT_THRESHOLDS
};

// =============================================================================
// CLI
// =============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);

  // Parse flags
  const thresholdFlag = args.find(a => a.startsWith('--threshold='));
  const formatFlag = args.find(a => a.startsWith('--format='));
  const failOnFlag = args.find(a => a.startsWith('--fail-on='));
  const outputFlag = args.find(a => a.startsWith('--output='));
  const quietFlag = args.includes('--quiet') || args.includes('-q');

  const threshold = thresholdFlag ? parseInt(thresholdFlag.split('=')[1]) : 70;
  const format = formatFlag ? formatFlag.split('=')[1] : 'text';
  const failOn = failOnFlag ? failOnFlag.split('=')[1] : 'critical';
  const outputPath = outputFlag ? outputFlag.split('=')[1] : null;

  const positionalArgs = args.filter(a => !a.startsWith('--') && !a.startsWith('-'));
  const projectPath = positionalArgs[0];
  const referencePath = positionalArgs[1];

  if (!projectPath || !referencePath) {
    console.log(`
Impression: CI Compare
======================

Design system comparison for CI/CD pipelines.

Usage:
  node ci-compare.js <project-path> <reference.json> [options]

Options:
  --threshold=N      Minimum passing score (default: 70)
  --format=FORMAT    Output format: text, json, github, gitlab, markdown
  --fail-on=LEVEL    Fail threshold: critical, major, warning (default: critical)
  --output=FILE      Write report to file instead of stdout
  --quiet, -q        Suppress output (exit code only)

Exit Codes:
  0  All checks passed
  1  Critical issues or score below threshold
  2  Warnings (with --fail-on=warning)

Examples:
  # Basic comparison
  node ci-compare.js ./my-project ./design-system.json

  # GitHub Actions integration
  node ci-compare.js . ./reference.json --format=github

  # GitLab CI with strict threshold
  node ci-compare.js . ./brand.json --format=gitlab --threshold=90

  # Fail on any warning
  node ci-compare.js . ./strict.json --fail-on=warning

  # Save report to file
  node ci-compare.js . ./design.json --format=markdown --output=report.md

CI Integration:

  GitHub Actions:
    - name: Design System Check
      run: node scripts/ci-compare.js . design-system.json --format=github

  GitLab CI:
    design-check:
      script:
        - node scripts/ci-compare.js . design.json --format=gitlab > gl-code-quality.json
      artifacts:
        reports:
          codequality: gl-code-quality.json
`);
    process.exit(1);
  }

  try {
    const fullProjectPath = path.resolve(projectPath);
    const fullReferencePath = path.resolve(referencePath);

    if (!fs.existsSync(fullProjectPath)) {
      console.error(`Error: Project path not found: ${projectPath}`);
      process.exit(1);
    }

    if (!fs.existsSync(fullReferencePath)) {
      console.error(`Error: Reference file not found: ${referencePath}`);
      process.exit(1);
    }

    const { result, report, exitCode, passed } = runCIComparison(
      fullProjectPath,
      fullReferencePath,
      { threshold, format, failOn }
    );

    // Output report
    if (!quietFlag) {
      if (outputPath) {
        fs.writeFileSync(path.resolve(outputPath), report);
        console.log(`Report saved to: ${outputPath}`);
        console.log(`Score: ${result.score}/100 ${passed ? '[PASS]' : '[FAIL]'}`);
      } else {
        console.log(report);
      }
    }

    process.exit(exitCode);

  } catch (err) {
    if (!quietFlag) {
      console.error(`Error: ${err.message}`);
    }
    process.exit(1);
  }
}
