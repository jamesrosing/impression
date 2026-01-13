#!/usr/bin/env node
/**
 * Implement Design System Changes
 * Actually modifies config files and creates atomic commits for design alignment
 *
 * Usage:
 *   node implement-design-changes.js <project-path> <reference.json> [--dry-run] [--no-commit]
 *   node implement-design-changes.js ./my-project references/duchateau.json
 *
 * Creates: feature/design-system-alignment branch with actual file modifications
 *
 * @version 2.0.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { compareDesignSystems } = require('./compare-design-systems');

// =============================================================================
// UTILITIES
// =============================================================================

function exec(cmd, cwd, silent = true) {
  try {
    return execSync(cmd, {
      cwd,
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit'
    });
  } catch (err) {
    return null;
  }
}

function backup(filePath) {
  if (fs.existsSync(filePath)) {
    const backupPath = `${filePath}.backup-${Date.now()}`;
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
  }
  return null;
}

function log(msg, level = 'info') {
  const prefix = {
    info: '→',
    success: '✓',
    warn: '⚠️',
    error: '✗',
    dry: '[DRY RUN]'
  };
  console.log(`${prefix[level] || '→'} ${msg}`);
}

// =============================================================================
// CONFIG FILE DETECTION
// =============================================================================

function detectConfigFiles(projectPath) {
  const configs = {
    tailwind: null,
    tailwindFormat: null, // 'js', 'ts', 'mjs', 'cjs'
    cssVars: null,
    packageJson: null,
    isTypeScript: false
  };

  // Tailwind config variants
  const twVariants = [
    { file: 'tailwind.config.ts', format: 'ts' },
    { file: 'tailwind.config.mjs', format: 'mjs' },
    { file: 'tailwind.config.cjs', format: 'cjs' },
    { file: 'tailwind.config.js', format: 'js' }
  ];

  for (const { file, format } of twVariants) {
    if (fs.existsSync(path.join(projectPath, file))) {
      configs.tailwind = file;
      configs.tailwindFormat = format;
      configs.isTypeScript = format === 'ts';
      break;
    }
  }

  // CSS variables (look for globals.css or variables.css)
  const cssLocations = [
    'src/styles/globals.css',
    'src/globals.css',
    'styles/globals.css',
    'app/globals.css',
    'src/app/globals.css',
    'src/styles/variables.css',
    'src/variables.css',
    'styles/variables.css'
  ];

  for (const f of cssLocations) {
    if (fs.existsSync(path.join(projectPath, f))) {
      configs.cssVars = f;
      break;
    }
  }

  // Package.json for dependencies
  if (fs.existsSync(path.join(projectPath, 'package.json'))) {
    configs.packageJson = 'package.json';
  }

  return configs;
}

// =============================================================================
// TOKEN GENERATORS
// =============================================================================

function generateColorTokens(reference, format) {
  const colors = {};

  // From palette with roles
  reference.colors?.palette?.forEach(c => {
    if (c.role) {
      const key = c.role.replace(/-/g, '-').replace(/\s+/g, '-').toLowerCase();
      colors[key] = c.value;
    }
  });

  // Semantic colors
  if (reference.colors?.semantic) {
    const sem = reference.colors.semantic;
    if (sem.backgrounds?.[0]) colors.background = sem.backgrounds[0].value;
    if (sem.backgrounds?.[1]) colors['background-secondary'] = sem.backgrounds[1].value;
    if (sem.text?.[0]) colors.foreground = sem.text[0].value;
    if (sem.text?.[1]) colors['foreground-muted'] = sem.text[1].value;
    if (sem.borders?.[0]) colors.border = sem.borders[0].value;
    if (sem.accents?.[0]) colors.accent = sem.accents[0].value;
    if (sem.accents?.[1]) colors['accent-hover'] = sem.accents[1].value;
  }

  // CSS variables from reference
  if (reference.colors?.cssVariables) {
    Object.entries(reference.colors.cssVariables).forEach(([key, val]) => {
      const cleanKey = key.replace(/^--/, '').replace(/-/g, '-');
      if (!colors[cleanKey]) colors[cleanKey] = val;
    });
  }

  return { format, colors };
}

function generateTypographyTokens(reference, format) {
  const fonts = reference.typography?.fontFamilies || [];
  const scale = reference.typography?.scale || [];
  const weights = reference.typography?.fontWeights || [];
  const lineHeights = reference.typography?.lineHeights || [];
  const letterSpacing = reference.typography?.letterSpacing || [];

  const fontFamily = {};
  fonts.forEach(f => {
    const key = f.role?.includes('serif') ? 'serif' :
                f.role?.includes('mono') ? 'mono' :
                f.role?.includes('display') ? 'display' : 'sans';
    if (!fontFamily[key]) {
      fontFamily[key] = [f.family, 'system-ui', 'sans-serif'];
    }
  });

  const fontSize = {};
  const sizeNames = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl'];
  scale.slice(0, sizeNames.length).forEach((s, i) => {
    fontSize[sizeNames[i]] = s;
  });

  const fontWeight = {};
  weights.forEach(w => {
    const weightMap = {
      '100': 'thin', '200': 'extralight', '300': 'light',
      '400': 'normal', '500': 'medium', '600': 'semibold',
      '700': 'bold', '800': 'extrabold', '900': 'black'
    };
    if (weightMap[w]) fontWeight[weightMap[w]] = w;
  });

  const lineHeight = {};
  lineHeights.slice(0, 6).forEach((lh, i) => {
    const names = ['none', 'tight', 'snug', 'normal', 'relaxed', 'loose'];
    lineHeight[names[i]] = lh.value || lh;
  });

  return { format, fontFamily, fontSize, fontWeight, lineHeight, letterSpacing };
}

function generateSpacingTokens(reference, format) {
  const scale = reference.spacing?.scale || [];
  const spacing = {};

  // Convert to Tailwind-style spacing scale
  const spacingMap = {
    '0px': '0', '1px': 'px', '2px': '0.5', '4px': '1', '6px': '1.5',
    '8px': '2', '10px': '2.5', '12px': '3', '14px': '3.5', '16px': '4',
    '20px': '5', '24px': '6', '28px': '7', '32px': '8', '36px': '9',
    '40px': '10', '44px': '11', '48px': '12', '56px': '14', '64px': '16',
    '80px': '20', '96px': '24', '112px': '28', '128px': '32', '144px': '36',
    '160px': '40', '176px': '44', '192px': '48', '208px': '52', '224px': '56',
    '240px': '60', '256px': '64', '288px': '72', '320px': '80', '384px': '96'
  };

  scale.forEach(s => {
    const key = spacingMap[s] || s.replace('px', '');
    spacing[key] = s;
  });

  return { format, spacing };
}

function generateRadiusTokens(reference, format) {
  const radii = reference.borderRadius || [];
  const borderRadius = {};

  const names = ['none', 'sm', 'DEFAULT', 'md', 'lg', 'xl', '2xl', '3xl', 'full'];
  radii.forEach((r, i) => {
    const val = r.value || r;
    const name = val === '0px' || val === '0' ? 'none' :
                 val === '9999px' || val === '50%' ? 'full' :
                 r.role === 'pill' ? 'full' : names[i + 1] || `r${i}`;
    borderRadius[name] = val;
  });

  return { format, borderRadius };
}

function generateAnimationTokens(reference, format) {
  const durations = reference.animations?.durations || [];
  const easings = reference.animations?.easings || [];
  const keyframes = reference.animations?.keyframes || {};

  const transitionDuration = {};
  const durationNames = ['75', '100', '150', '200', '300', '500', '700', '1000'];
  durations.forEach((d, i) => {
    const ms = parseInt(d);
    const name = durationNames.find(n => Math.abs(parseInt(n) - ms) < 50) || ms.toString();
    transitionDuration[name] = d;
  });

  const transitionTimingFunction = {};
  easings.forEach((e, i) => {
    const names = ['linear', 'in', 'out', 'in-out'];
    transitionTimingFunction[names[i] || `ease${i}`] = e;
  });

  return { format, transitionDuration, transitionTimingFunction, keyframes };
}

function generateShadowTokens(reference, format) {
  const shadows = reference.shadows || [];
  const boxShadow = {};

  const names = ['sm', 'DEFAULT', 'md', 'lg', 'xl', '2xl', 'inner', 'none'];
  shadows.forEach((s, i) => {
    const val = s.value || s;
    if (val === 'none') {
      boxShadow.none = 'none';
    } else {
      boxShadow[names[i] || `shadow${i}`] = val;
    }
  });

  return { format, boxShadow };
}

// =============================================================================
// TAILWIND CONFIG MODIFICATION
// =============================================================================

function parseTailwindConfig(content) {
  // Extract the theme.extend section or create structure
  const result = {
    beforeTheme: '',
    theme: {},
    afterTheme: '',
    raw: content
  };

  // Simple regex-based extraction for common patterns
  const themeMatch = content.match(/theme\s*:\s*\{/);
  if (themeMatch) {
    result.hasTheme = true;
    result.themeStart = themeMatch.index;
  }

  const extendMatch = content.match(/extend\s*:\s*\{/);
  if (extendMatch) {
    result.hasExtend = true;
    result.extendStart = extendMatch.index;
  }

  return result;
}

function mergeTailwindTokens(content, tokens, category) {
  // Determine if we should add to extend or replace
  const hasExtend = content.includes('extend:');
  const hasTheme = content.includes('theme:');

  let tokenString = '';

  switch (category) {
    case 'colors':
      tokenString = `colors: ${JSON.stringify(tokens.colors, null, 8)}`;
      break;
    case 'typography':
      const typoParts = [];
      if (Object.keys(tokens.fontFamily).length > 0) {
        typoParts.push(`fontFamily: ${JSON.stringify(tokens.fontFamily, null, 8)}`);
      }
      if (Object.keys(tokens.fontSize).length > 0) {
        typoParts.push(`fontSize: ${JSON.stringify(tokens.fontSize, null, 8)}`);
      }
      if (Object.keys(tokens.fontWeight).length > 0) {
        typoParts.push(`fontWeight: ${JSON.stringify(tokens.fontWeight, null, 8)}`);
      }
      if (Object.keys(tokens.lineHeight).length > 0) {
        typoParts.push(`lineHeight: ${JSON.stringify(tokens.lineHeight, null, 8)}`);
      }
      tokenString = typoParts.join(',\n        ');
      break;
    case 'spacing':
      tokenString = `spacing: ${JSON.stringify(tokens.spacing, null, 8)}`;
      break;
    case 'borderRadius':
      tokenString = `borderRadius: ${JSON.stringify(tokens.borderRadius, null, 8)}`;
      break;
    case 'animations':
      const animParts = [];
      if (Object.keys(tokens.transitionDuration).length > 0) {
        animParts.push(`transitionDuration: ${JSON.stringify(tokens.transitionDuration, null, 8)}`);
      }
      if (Object.keys(tokens.transitionTimingFunction).length > 0) {
        animParts.push(`transitionTimingFunction: ${JSON.stringify(tokens.transitionTimingFunction, null, 8)}`);
      }
      tokenString = animParts.join(',\n        ');
      break;
    case 'shadows':
      tokenString = `boxShadow: ${JSON.stringify(tokens.boxShadow, null, 8)}`;
      break;
  }

  if (!tokenString) return content;

  // Strategy: Find extend block and add/merge tokens
  if (hasExtend) {
    // Find the extend: { and insert after it
    const extendMatch = content.match(/extend\s*:\s*\{/);
    if (extendMatch) {
      const insertPos = extendMatch.index + extendMatch[0].length;
      const before = content.slice(0, insertPos);
      const after = content.slice(insertPos);

      // Check if category already exists in extend
      const categoryRegex = new RegExp(`(${category}|fontFamily|fontSize|fontWeight|lineHeight|transitionDuration|transitionTimingFunction|boxShadow)\\s*:`);
      if (categoryRegex.test(after.slice(0, 500))) {
        // Merge strategy: for now, replace existing
        // More sophisticated would be deep merge
        log(`Merging ${category} tokens into existing config`, 'info');
      }

      content = `${before}\n        ${tokenString},${after}`;
    }
  } else if (hasTheme) {
    // Add extend block to theme
    const themeMatch = content.match(/theme\s*:\s*\{/);
    if (themeMatch) {
      const insertPos = themeMatch.index + themeMatch[0].length;
      const before = content.slice(0, insertPos);
      const after = content.slice(insertPos);
      content = `${before}\n      extend: {\n        ${tokenString},\n      },${after}`;
    }
  } else {
    // Add entire theme block
    const exportMatch = content.match(/(module\.exports\s*=\s*\{|export\s+default\s*\{)/);
    if (exportMatch) {
      const insertPos = exportMatch.index + exportMatch[0].length;
      const before = content.slice(0, insertPos);
      const after = content.slice(insertPos);
      content = `${before}\n  theme: {\n    extend: {\n      ${tokenString},\n    },\n  },${after}`;
    }
  }

  return content;
}

function modifyTailwindConfig(filePath, tokens, category) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;

  content = mergeTailwindTokens(content, tokens, category);

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

// =============================================================================
// CSS VARIABLES MODIFICATION
// =============================================================================

function generateCSSVariables(tokens, category) {
  const lines = [];

  switch (category) {
    case 'colors':
      Object.entries(tokens.colors).forEach(([k, v]) => {
        lines.push(`  --color-${k}: ${v};`);
      });
      break;
    case 'typography':
      Object.entries(tokens.fontFamily).forEach(([k, v]) => {
        const value = Array.isArray(v) ? v.map(f => f.includes(' ') ? `"${f}"` : f).join(', ') : v;
        lines.push(`  --font-${k}: ${value};`);
      });
      Object.entries(tokens.fontSize).forEach(([k, v]) => {
        lines.push(`  --text-${k}: ${v};`);
      });
      Object.entries(tokens.fontWeight).forEach(([k, v]) => {
        lines.push(`  --font-weight-${k}: ${v};`);
      });
      break;
    case 'spacing':
      Object.entries(tokens.spacing).forEach(([k, v]) => {
        lines.push(`  --spacing-${k}: ${v};`);
      });
      break;
    case 'borderRadius':
      Object.entries(tokens.borderRadius).forEach(([k, v]) => {
        const name = k === 'DEFAULT' ? 'base' : k;
        lines.push(`  --radius-${name}: ${v};`);
      });
      break;
    case 'animations':
      Object.entries(tokens.transitionDuration).forEach(([k, v]) => {
        lines.push(`  --duration-${k}: ${v};`);
      });
      Object.entries(tokens.transitionTimingFunction).forEach(([k, v]) => {
        lines.push(`  --ease-${k}: ${v};`);
      });
      break;
    case 'shadows':
      Object.entries(tokens.boxShadow).forEach(([k, v]) => {
        const name = k === 'DEFAULT' ? 'base' : k;
        lines.push(`  --shadow-${name}: ${v};`);
      });
      break;
  }

  return lines.join('\n');
}

function modifyCSSVariables(filePath, tokens, category) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  const cssVars = generateCSSVariables(tokens, category);

  if (!cssVars) return false;

  // Find :root block
  const rootMatch = content.match(/:root\s*\{([^}]*)\}/);

  if (rootMatch) {
    // Append to existing :root
    const rootContent = rootMatch[1];
    const newRootContent = `${rootContent}\n\n  /* ${category} tokens */\n${cssVars}\n`;
    content = content.replace(rootMatch[0], `:root {${newRootContent}}`);
  } else {
    // Add new :root block at the beginning
    const rootBlock = `:root {\n  /* ${category} tokens */\n${cssVars}\n}\n\n`;
    content = rootBlock + content;
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

// =============================================================================
// PLAN GENERATION & EXECUTION
// =============================================================================

function generateImplementationPlan(projectPath, reference, comparisons, configs) {
  const plan = {
    branch: 'feature/design-system-alignment',
    commits: [],
    configs
  };

  const format = configs.tailwind ? 'tailwind' : 'css';
  const targetFile = configs.tailwind || configs.cssVars;

  if (!targetFile) {
    throw new Error('No config file found. Create tailwind.config.js or src/styles/globals.css first.');
  }

  // P0: Colors (always most impactful)
  if (comparisons.colors.score < 100) {
    plan.commits.push({
      priority: 0,
      message: 'design: add color tokens from reference system',
      file: targetFile,
      category: 'colors',
      tokens: generateColorTokens(reference, format)
    });
  }

  // P1: Typography
  if (comparisons.typography.score < 100) {
    plan.commits.push({
      priority: 1,
      message: 'design: align typography with reference system',
      file: targetFile,
      category: 'typography',
      tokens: generateTypographyTokens(reference, format)
    });
  }

  // P2: Spacing
  if (comparisons.spacing.score < 100) {
    plan.commits.push({
      priority: 2,
      message: 'design: update spacing scale',
      file: targetFile,
      category: 'spacing',
      tokens: generateSpacingTokens(reference, format)
    });
  }

  // P3: Border radius
  if (comparisons.borderRadius.score < 100) {
    plan.commits.push({
      priority: 3,
      message: 'design: align border radius tokens',
      file: targetFile,
      category: 'borderRadius',
      tokens: generateRadiusTokens(reference, format)
    });
  }

  // P4: Shadows (if available)
  if (reference.shadows?.length > 0) {
    plan.commits.push({
      priority: 4,
      message: 'design: add shadow tokens',
      file: targetFile,
      category: 'shadows',
      tokens: generateShadowTokens(reference, format)
    });
  }

  // P5: Animations
  if (reference.animations?.durations?.length > 0 || reference.animations?.easings?.length > 0) {
    plan.commits.push({
      priority: 5,
      message: 'design: add animation/transition tokens',
      file: targetFile,
      category: 'animations',
      tokens: generateAnimationTokens(reference, format)
    });
  }

  return plan;
}

function executePlan(projectPath, plan, options = {}) {
  const { dryRun = false, noCommit = false, backup: doBackup = true } = options;
  const results = [];
  const backups = [];

  // Check git status
  const gitStatus = exec('git status --porcelain', projectPath);
  if (gitStatus && gitStatus.trim() && !dryRun && !noCommit) {
    log('Working directory has uncommitted changes. Creating backup.', 'warn');
  }

  // Ensure we're on the right branch
  if (!dryRun && !noCommit) {
    const currentBranch = exec('git branch --show-current', projectPath)?.trim();
    if (currentBranch !== plan.branch) {
      const branchExists = exec(`git show-ref --verify --quiet refs/heads/${plan.branch}`, projectPath);
      if (branchExists !== null) {
        exec(`git checkout ${plan.branch}`, projectPath);
        log(`Switched to existing branch: ${plan.branch}`, 'success');
      } else {
        exec(`git checkout -b ${plan.branch}`, projectPath);
        log(`Created branch: ${plan.branch}`, 'success');
      }
    }
  } else if (dryRun) {
    log(`Would create/switch to branch: ${plan.branch}`, 'dry');
  }

  // Sort commits by priority
  const sortedCommits = [...plan.commits].sort((a, b) => a.priority - b.priority);

  // Process each commit
  for (const commit of sortedCommits) {
    const filePath = path.join(projectPath, commit.file);

    if (!fs.existsSync(filePath)) {
      log(`File not found: ${commit.file} - skipping ${commit.category}`, 'warn');
      continue;
    }

    // Backup before modification
    if (!dryRun && doBackup) {
      const backupPath = backup(filePath);
      if (backupPath) backups.push(backupPath);
    }

    let modified = false;

    if (!dryRun) {
      // Actually modify the file
      if (plan.configs.tailwind && commit.file === plan.configs.tailwind) {
        modified = modifyTailwindConfig(filePath, commit.tokens, commit.category);
      } else if (plan.configs.cssVars && commit.file === plan.configs.cssVars) {
        modified = modifyCSSVariables(filePath, commit.tokens, commit.category);
      }

      if (modified) {
        log(`Modified ${commit.file} with ${commit.category} tokens`, 'success');

        // Git commit
        if (!noCommit) {
          exec(`git add ${commit.file}`, projectPath);
          exec(`git commit -m "${commit.message}"`, projectPath);
          log(`Committed: ${commit.message}`, 'success');
        }
      } else {
        log(`No changes needed for ${commit.category}`, 'info');
      }
    } else {
      log(`Would modify ${commit.file} with ${commit.category} tokens`, 'dry');
      log(`Would commit: ${commit.message}`, 'dry');
    }

    results.push({
      priority: commit.priority,
      category: commit.category,
      message: commit.message,
      file: commit.file,
      modified,
      tokens: commit.tokens
    });
  }

  // Cleanup old backups (keep only last 5)
  if (backups.length > 5) {
    backups.slice(0, -5).forEach(b => {
      try { fs.unlinkSync(b); } catch (e) {}
    });
  }

  return results;
}

function generatePlanReport(plan, results, projectPath) {
  const lines = [];
  const totalModified = results.filter(r => r.modified).length;

  lines.push('# Design System Implementation Plan');
  lines.push('');
  lines.push(`> Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| **Branch** | \`${plan.branch}\` |`);
  lines.push(`| **Total Changes** | ${results.length} |`);
  lines.push(`| **Files Modified** | ${totalModified} |`);
  lines.push(`| **Target Config** | \`${plan.configs.tailwind || plan.configs.cssVars}\` |`);
  lines.push('');
  lines.push('## Changes by Priority');
  lines.push('');

  for (const r of results) {
    const status = r.modified ? '✅' : '⏭️';
    lines.push(`### P${r.priority}: ${r.category} ${status}`);
    lines.push('');
    lines.push(`**Commit:** \`${r.message}\``);
    lines.push(`**File:** \`${r.file}\``);
    lines.push(`**Status:** ${r.modified ? 'Applied' : 'Skipped (no changes needed)'}`);
    lines.push('');

    if (r.tokens) {
      lines.push('<details>');
      lines.push('<summary>Token Details</summary>');
      lines.push('');
      lines.push('```json');
      lines.push(JSON.stringify(r.tokens, null, 2));
      lines.push('```');
      lines.push('</details>');
      lines.push('');
    }
  }

  lines.push('## Git Commands (Manual)');
  lines.push('');
  lines.push('If you need to manually apply these changes:');
  lines.push('');
  lines.push('```bash');
  lines.push(`git checkout -b ${plan.branch}`);
  lines.push('');
  for (const r of results) {
    lines.push(`# P${r.priority}: ${r.category}`);
    lines.push(`# Modify ${r.file} with tokens from report`);
    lines.push(`git add ${r.file}`);
    lines.push(`git commit -m "${r.message}"`);
    lines.push('');
  }
  lines.push(`git push -u origin ${plan.branch}`);
  lines.push('```');
  lines.push('');
  lines.push('## Rollback');
  lines.push('');
  lines.push('To undo all changes:');
  lines.push('');
  lines.push('```bash');
  lines.push('git checkout main');
  lines.push(`git branch -D ${plan.branch}`);
  lines.push('```');

  return lines.join('\n');
}

// =============================================================================
// EXPORTS FOR PROGRAMMATIC USE
// =============================================================================

module.exports = {
  generateImplementationPlan,
  executePlan,
  generatePlanReport,
  detectConfigFiles,
  // Token generators
  generateColorTokens,
  generateTypographyTokens,
  generateSpacingTokens,
  generateRadiusTokens,
  generateAnimationTokens,
  generateShadowTokens,
  // Config modifiers
  modifyTailwindConfig,
  modifyCSSVariables,
  mergeTailwindTokens,
  generateCSSVariables
};

// =============================================================================
// CLI
// =============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const noCommit = args.includes('--no-commit');
  const noBackup = args.includes('--no-backup');
  const filteredArgs = args.filter(a => !a.startsWith('--'));

  if (filteredArgs.length < 2) {
    console.log(`
Impression: Design System Implementation
=========================================

Usage:
  node implement-design-changes.js <project-path> <reference.json> [options]

Options:
  --dry-run    Preview changes without modifying files
  --no-commit  Modify files but don't create git commits
  --no-backup  Skip creating backup files

Examples:
  # Preview what would change
  node implement-design-changes.js ./my-project references/linear.json --dry-run

  # Apply changes with commits
  node implement-design-changes.js ./my-project references/linear.json

  # Apply changes without git commits
  node implement-design-changes.js ./my-project references/linear.json --no-commit
`);
    process.exit(1);
  }

  const projectPath = path.resolve(filteredArgs[0]);
  const referencePath = path.resolve(filteredArgs[1]);

  if (!fs.existsSync(projectPath)) {
    log(`Project path not found: ${projectPath}`, 'error');
    process.exit(1);
  }

  if (!fs.existsSync(referencePath)) {
    log(`Reference file not found: ${referencePath}`, 'error');
    process.exit(1);
  }

  try {
    console.log('\n🎨 Impression: Implementing Design System Changes\n');
    log('Analyzing project...', 'info');

    // Load reference
    const reference = JSON.parse(fs.readFileSync(referencePath, 'utf-8'));
    log(`Loaded reference: ${reference.meta?.url || referencePath}`, 'info');

    // Run comparison
    const { comparisons, overall } = compareDesignSystems(projectPath, referencePath);
    log(`Current alignment: ${overall}%`, 'info');

    // Detect config files
    const configs = detectConfigFiles(projectPath);
    if (configs.tailwind) {
      log(`Tailwind config: ${configs.tailwind}`, 'info');
    }
    if (configs.cssVars) {
      log(`CSS variables: ${configs.cssVars}`, 'info');
    }

    // Generate plan
    const plan = generateImplementationPlan(projectPath, reference, comparisons, configs);
    log(`Generated plan with ${plan.commits.length} changes`, 'info');

    console.log('');

    // Execute or preview
    const results = executePlan(projectPath, plan, {
      dryRun,
      noCommit,
      backup: !noBackup
    });

    // Generate report
    const report = generatePlanReport(plan, results, projectPath);

    // Save report
    const reportPath = path.join(projectPath, 'DESIGN_IMPLEMENTATION_PLAN.md');
    fs.writeFileSync(reportPath, report);

    console.log('');
    log(`Implementation plan saved to: ${reportPath}`, 'success');

    if (!dryRun && !noCommit) {
      log(`Branch ready: ${plan.branch}`, 'success');
      log(`Push with: git push -u origin ${plan.branch}`, 'info');
    }

  } catch (err) {
    log(`Error: ${err.message}`, 'error');
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
}
