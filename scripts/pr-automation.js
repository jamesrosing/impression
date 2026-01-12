#!/usr/bin/env node
/**
 * PR Automation with Design System Changes
 *
 * Features:
 * - Generate PR descriptions with design changes
 * - Create before/after screenshot comparisons
 * - Auto-label PRs based on design change severity
 * - GitHub/GitLab integration
 * - Design system impact analysis
 *
 * Usage:
 *   node pr-automation.js <before.json> <after.json> [options]
 *   node pr-automation.js baseline.json current.json --output=pr-body.md
 *   node pr-automation.js baseline.json current.json --format=github
 *
 * Note: This generates PR content. Use with `gh pr create` for GitHub.
 */

const fs = require('fs');
const path = require('path');

// ============ CHANGE ANALYSIS ============

function deepDiff(before, after, path = '') {
  const changes = [];

  if (before === after) return changes;
  if (before === null || after === null) {
    if (before !== after) {
      changes.push({ type: before === null ? 'added' : 'removed', path, before, after });
    }
    return changes;
  }

  if (typeof before !== typeof after) {
    changes.push({ type: 'changed', path, before, after });
    return changes;
  }

  if (typeof before !== 'object') {
    if (before !== after) {
      changes.push({ type: 'changed', path, before, after });
    }
    return changes;
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const maxLen = Math.max(before.length, after.length);
    for (let i = 0; i < maxLen; i++) {
      if (i >= before.length) {
        changes.push({ type: 'added', path: `${path}[${i}]`, after: after[i] });
      } else if (i >= after.length) {
        changes.push({ type: 'removed', path: `${path}[${i}]`, before: before[i] });
      } else {
        changes.push(...deepDiff(before[i], after[i], `${path}[${i}]`));
      }
    }
    return changes;
  }

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of allKeys) {
    const keyPath = path ? `${path}.${key}` : key;
    if (!(key in before)) {
      changes.push({ type: 'added', path: keyPath, after: after[key] });
    } else if (!(key in after)) {
      changes.push({ type: 'removed', path: keyPath, before: before[key] });
    } else {
      changes.push(...deepDiff(before[key], after[key], keyPath));
    }
  }

  return changes;
}

function categorizeChanges(changes) {
  const categories = {
    colors: [],
    typography: [],
    spacing: [],
    borderRadius: [],
    animations: [],
    effects: [],
    layout: [],
    components: [],
    focusIndicators: [],
    interactionStates: [],
    other: [],
  };

  for (const change of changes) {
    const section = change.path.split('.')[0].split('[')[0];
    if (section in categories) {
      categories[section].push(change);
    } else {
      categories.other.push(change);
    }
  }

  return categories;
}

function calculateImpact(changes) {
  const categories = categorizeChanges(changes);

  // Critical changes
  const criticalCount = categories.colors.length + categories.typography.length;
  if (criticalCount > 10) return { level: 'critical', label: 'design-breaking' };

  // High impact
  const highCount = Object.values(categories).flat().length;
  if (highCount > 25) return { level: 'high', label: 'design-significant' };
  if (categories.colors.length > 5 || categories.typography.length > 3) {
    return { level: 'high', label: 'design-significant' };
  }

  // Medium impact
  if (highCount > 10) return { level: 'medium', label: 'design-update' };

  // Low impact
  if (highCount > 0) return { level: 'low', label: 'design-minor' };

  return { level: 'none', label: null };
}

// ============ PR BODY GENERATION ============

function generatePRBody(before, after, changes, options = {}) {
  const { screenshots = [], branchName = 'feature/design-update' } = options;

  const categories = categorizeChanges(changes);
  const impact = calculateImpact(changes);

  const lines = [];

  // Header
  lines.push(`## 🎨 Design System Changes`);
  lines.push('');

  // Impact badge
  const impactEmoji = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
    none: '⚪',
  };
  lines.push(`**Impact Level:** ${impactEmoji[impact.level]} ${impact.level.toUpperCase()}`);
  lines.push('');

  // Summary stats
  lines.push(`### Summary`);
  lines.push('');
  lines.push(`| Category | Changes |`);
  lines.push(`|----------|---------|`);

  for (const [category, categoryChanges] of Object.entries(categories)) {
    if (categoryChanges.length > 0) {
      const icon = categoryChanges.some(c => c.type === 'removed') ? '➖' :
                   categoryChanges.some(c => c.type === 'added') ? '➕' : '🔄';
      lines.push(`| ${icon} ${category} | ${categoryChanges.length} |`);
    }
  }
  lines.push('');

  // Detailed changes by category
  lines.push(`### Detailed Changes`);
  lines.push('');

  // Colors
  if (categories.colors.length > 0) {
    lines.push(`<details>`);
    lines.push(`<summary><strong>🎨 Colors (${categories.colors.length} changes)</strong></summary>`);
    lines.push('');
    lines.push('```diff');
    for (const change of categories.colors.slice(0, 15)) {
      if (change.type === 'added') {
        lines.push(`+ ${change.path}: ${formatValue(change.after)}`);
      } else if (change.type === 'removed') {
        lines.push(`- ${change.path}: ${formatValue(change.before)}`);
      } else {
        lines.push(`- ${change.path}: ${formatValue(change.before)}`);
        lines.push(`+ ${change.path}: ${formatValue(change.after)}`);
      }
    }
    if (categories.colors.length > 15) {
      lines.push(`# ... and ${categories.colors.length - 15} more`);
    }
    lines.push('```');
    lines.push('</details>');
    lines.push('');
  }

  // Typography
  if (categories.typography.length > 0) {
    lines.push(`<details>`);
    lines.push(`<summary><strong>📝 Typography (${categories.typography.length} changes)</strong></summary>`);
    lines.push('');
    lines.push('```diff');
    for (const change of categories.typography.slice(0, 15)) {
      if (change.type === 'added') {
        lines.push(`+ ${change.path}: ${formatValue(change.after)}`);
      } else if (change.type === 'removed') {
        lines.push(`- ${change.path}: ${formatValue(change.before)}`);
      } else {
        lines.push(`- ${change.path}: ${formatValue(change.before)}`);
        lines.push(`+ ${change.path}: ${formatValue(change.after)}`);
      }
    }
    lines.push('```');
    lines.push('</details>');
    lines.push('');
  }

  // Spacing
  if (categories.spacing.length > 0) {
    lines.push(`<details>`);
    lines.push(`<summary><strong>📐 Spacing (${categories.spacing.length} changes)</strong></summary>`);
    lines.push('');
    lines.push('```diff');
    for (const change of categories.spacing.slice(0, 10)) {
      if (change.type === 'added') {
        lines.push(`+ ${change.path}: ${formatValue(change.after)}`);
      } else if (change.type === 'removed') {
        lines.push(`- ${change.path}: ${formatValue(change.before)}`);
      } else {
        lines.push(`- ${change.path}: ${formatValue(change.before)}`);
        lines.push(`+ ${change.path}: ${formatValue(change.after)}`);
      }
    }
    lines.push('```');
    lines.push('</details>');
    lines.push('');
  }

  // Other changes (collapsed)
  const otherCategories = ['borderRadius', 'animations', 'effects', 'layout', 'components', 'focusIndicators', 'interactionStates', 'other'];
  const otherChanges = otherCategories.flatMap(c => categories[c] || []);

  if (otherChanges.length > 0) {
    lines.push(`<details>`);
    lines.push(`<summary><strong>📦 Other Changes (${otherChanges.length})</strong></summary>`);
    lines.push('');
    for (const category of otherCategories) {
      if (categories[category] && categories[category].length > 0) {
        lines.push(`- **${category}**: ${categories[category].length} changes`);
      }
    }
    lines.push('</details>');
    lines.push('');
  }

  // Screenshots section
  if (screenshots.length > 0) {
    lines.push(`### 📸 Visual Comparison`);
    lines.push('');
    lines.push(`| Before | After |`);
    lines.push(`|--------|-------|`);
    for (const shot of screenshots) {
      lines.push(`| ![Before](${shot.before}) | ![After](${shot.after}) |`);
    }
    lines.push('');
  }

  // Checklist
  lines.push(`### ✅ Review Checklist`);
  lines.push('');
  lines.push(`- [ ] Visual regression tests passed`);
  lines.push(`- [ ] Color contrast meets WCAG AA`);
  if (categories.typography.length > 0) {
    lines.push(`- [ ] Typography changes reviewed`);
  }
  if (categories.focusIndicators && categories.focusIndicators.length > 0) {
    lines.push(`- [ ] Focus indicators meet WCAG 2.4.7`);
  }
  lines.push(`- [ ] Design system documentation updated`);
  lines.push('');

  // Footer
  lines.push('---');
  lines.push(`*Generated by [Impression](https://github.com/jamesrosing/impression) PR Automation*`);

  return lines.join('\n');
}

function formatValue(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') {
    if (Array.isArray(value)) return `[${value.length} items]`;
    return JSON.stringify(value).slice(0, 50);
  }
  const str = String(value);
  return str.length > 40 ? str.slice(0, 37) + '...' : str;
}

// ============ GITHUB CLI INTEGRATION ============

function generateGitHubCommand(prBody, options = {}) {
  const {
    title = 'Update design system',
    base = 'main',
    draft = false,
    labels = [],
  } = options;

  const impact = calculateImpact(options.changes || []);
  if (impact.label) labels.push(impact.label);

  const labelArg = labels.length > 0 ? `--label "${labels.join(',')}"` : '';
  const draftArg = draft ? '--draft' : '';

  return `gh pr create --title "${title}" --body "$(cat <<'EOF'
${prBody}
EOF
)" ${labelArg} ${draftArg} --base ${base}`;
}

function generateGitLabMRBody(before, after, changes, options = {}) {
  // GitLab uses similar markdown but with different collapse syntax
  let body = generatePRBody(before, after, changes, options);

  // GitLab uses different collapsible syntax
  body = body.replace(/<details>/g, '<details markdown="1">');

  return body;
}

// ============ COMMIT MESSAGE GENERATION ============

function generateCommitMessage(changes, options = {}) {
  const { scope = 'design' } = options;
  const categories = categorizeChanges(changes);
  const impact = calculateImpact(changes);

  let type = 'chore';
  if (categories.colors.length > 0 || categories.typography.length > 0) {
    type = 'style';
  }
  if (impact.level === 'critical' || impact.level === 'high') {
    type = 'feat';
  }

  const parts = [];
  if (categories.colors.length > 0) parts.push(`${categories.colors.length} color`);
  if (categories.typography.length > 0) parts.push(`${categories.typography.length} typography`);
  if (categories.spacing.length > 0) parts.push(`${categories.spacing.length} spacing`);

  const summary = parts.length > 0 ? parts.join(', ') + ' changes' : 'design system updates';

  return `${type}(${scope}): ${summary}

${impact.level.toUpperCase()} impact design system update.

Changes:
${Object.entries(categories)
  .filter(([_, v]) => v.length > 0)
  .map(([k, v]) => `- ${k}: ${v.length} changes`)
  .join('\n')}

Generated by Impression`;
}

// ============ MAIN ============

function generatePRAutomation(beforePath, afterPath, options = {}) {
  const {
    format = 'github',
    screenshots = [],
    title = 'Update design system tokens',
    base = 'main',
    draft = false,
    labels = [],
  } = options;

  const before = JSON.parse(fs.readFileSync(beforePath, 'utf-8'));
  const after = JSON.parse(fs.readFileSync(afterPath, 'utf-8'));

  const changes = deepDiff(before, after);
  const impact = calculateImpact(changes);

  let prBody;
  if (format === 'gitlab') {
    prBody = generateGitLabMRBody(before, after, changes, { screenshots });
  } else {
    prBody = generatePRBody(before, after, changes, { screenshots });
  }

  const result = {
    prBody,
    changes: changes.length,
    categories: categorizeChanges(changes),
    impact,
    commitMessage: generateCommitMessage(changes),
  };

  if (format === 'github') {
    result.command = generateGitHubCommand(prBody, {
      title,
      base,
      draft,
      labels,
      changes,
    });
  }

  return result;
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node pr-automation.js <before.json> <after.json> [options]');
    console.error('');
    console.error('Options:');
    console.error('  --output=<file>     Write PR body to file');
    console.error('  --format=github     Output format: github, gitlab (default: github)');
    console.error('  --title="..."       PR title');
    console.error('  --base=main         Base branch');
    console.error('  --draft             Create as draft PR');
    console.error('  --labels=a,b,c      PR labels');
    console.error('  --commit            Output commit message only');
    console.error('');
    console.error('Example:');
    console.error('  node pr-automation.js baseline.json current.json --output=pr-body.md');
    console.error('  node pr-automation.js baseline.json current.json | gh pr create --body-file -');
    process.exit(1);
  }

  const beforePath = path.resolve(args[0]);
  const afterPath = path.resolve(args[1]);

  let outputPath = null;
  let format = 'github';
  let title = 'Update design system tokens';
  let base = 'main';
  let draft = false;
  let labels = [];
  let commitOnly = false;

  for (const arg of args.slice(2)) {
    if (arg.startsWith('--output=')) {
      outputPath = path.resolve(arg.split('=')[1]);
    } else if (arg.startsWith('--format=')) {
      format = arg.split('=')[1];
    } else if (arg.startsWith('--title=')) {
      title = arg.split('=')[1];
    } else if (arg.startsWith('--base=')) {
      base = arg.split('=')[1];
    } else if (arg === '--draft') {
      draft = true;
    } else if (arg.startsWith('--labels=')) {
      labels = arg.split('=')[1].split(',');
    } else if (arg === '--commit') {
      commitOnly = true;
    }
  }

  if (!fs.existsSync(beforePath)) {
    console.error(`Error: Before file not found: ${beforePath}`);
    process.exit(1);
  }

  if (!fs.existsSync(afterPath)) {
    console.error(`Error: After file not found: ${afterPath}`);
    process.exit(1);
  }

  try {
    const result = generatePRAutomation(beforePath, afterPath, {
      format,
      title,
      base,
      draft,
      labels,
    });

    if (commitOnly) {
      console.log(result.commitMessage);
      process.exit(0);
    }

    console.log(`Design System PR Automation`);
    console.log(`  Impact: ${result.impact.level}`);
    console.log(`  Changes: ${result.changes}`);
    console.log('');

    if (outputPath) {
      fs.writeFileSync(outputPath, result.prBody);
      console.log(`✓ PR body saved to: ${outputPath}`);

      if (result.command) {
        console.log('\nTo create PR, run:');
        console.log(`  gh pr create --body-file "${outputPath}" --title "${title}"`);
      }
    } else {
      // Output PR body to stdout for piping
      console.log(result.prBody);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  generatePRAutomation,
  generatePRBody,
  generateCommitMessage,
  calculateImpact,
  deepDiff,
  categorizeChanges,
};
