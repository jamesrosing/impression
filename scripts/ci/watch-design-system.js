#!/usr/bin/env node
/**
 * Watch Design System for Changes
 *
 * Features:
 * - Monitor design system JSON files for changes
 * - Compare snapshots over time
 * - Alert on design drift
 * - Generate change reports
 * - Webhook notifications (optional)
 *
 * Usage:
 *   node watch-design-system.js <design-system.json> [--interval=3600] [--output=changes/]
 *   node watch-design-system.js references/linear.json --interval=86400
 *
 * Note: For live URL monitoring, use this with Playwright MCP to periodically
 * re-extract and compare against the baseline.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============ CHANGE DETECTION ============

/**
 * Calculate hash of design system for quick change detection
 */
function hashDesignSystem(designSystem) {
  const normalized = JSON.stringify(designSystem, Object.keys(designSystem).sort());
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

/**
 * Deep compare two objects and return differences
 */
function deepDiff(before, after, path = '') {
  const changes = [];

  if (before === after) return changes;
  if (before === null || after === null) {
    if (before !== after) {
      changes.push({
        type: before === null ? 'added' : 'removed',
        path,
        before,
        after,
      });
    }
    return changes;
  }

  const beforeType = typeof before;
  const afterType = typeof after;

  if (beforeType !== afterType) {
    changes.push({
      type: 'changed',
      path,
      before,
      after,
      note: `Type changed from ${beforeType} to ${afterType}`,
    });
    return changes;
  }

  if (beforeType !== 'object') {
    if (before !== after) {
      changes.push({
        type: 'changed',
        path,
        before,
        after,
      });
    }
    return changes;
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    // For arrays, compare lengths and items
    if (before.length !== after.length) {
      changes.push({
        type: 'changed',
        path,
        before: `Array[${before.length}]`,
        after: `Array[${after.length}]`,
        note: `Array length changed from ${before.length} to ${after.length}`,
      });
    }

    const maxLen = Math.max(before.length, after.length);
    for (let i = 0; i < maxLen; i++) {
      const itemPath = `${path}[${i}]`;
      if (i >= before.length) {
        changes.push({ type: 'added', path: itemPath, after: after[i] });
      } else if (i >= after.length) {
        changes.push({ type: 'removed', path: itemPath, before: before[i] });
      } else {
        changes.push(...deepDiff(before[i], after[i], itemPath));
      }
    }
    return changes;
  }

  // Compare objects
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

/**
 * Categorize changes by design system section
 */
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
    meta: [],
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

/**
 * Calculate severity of changes
 */
function calculateSeverity(changes) {
  if (changes.length === 0) return 'none';

  const categories = categorizeChanges(changes);

  // Critical: color or typography changes
  if (categories.colors.length > 5 || categories.typography.length > 3) {
    return 'critical';
  }

  // High: multiple category changes
  const categoriesWithChanges = Object.values(categories).filter(c => c.length > 0).length;
  if (categoriesWithChanges >= 4) {
    return 'high';
  }

  // Medium: some changes
  if (changes.length > 10) {
    return 'medium';
  }

  // Low: few changes
  return 'low';
}

// ============ SNAPSHOT MANAGEMENT ============

/**
 * Load or create snapshot history file
 */
function loadHistory(historyPath) {
  if (fs.existsSync(historyPath)) {
    return JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
  }
  return {
    snapshots: [],
    changes: [],
  };
}

/**
 * Save snapshot to history
 */
function saveSnapshot(historyPath, designSystem, hash) {
  const history = loadHistory(historyPath);

  const snapshot = {
    timestamp: new Date().toISOString(),
    hash,
    meta: {
      url: designSystem.meta?.url,
      siteName: designSystem.meta?.siteName,
    },
    summary: {
      colorCount: designSystem.colors?.palette?.length || 0,
      fontCount: designSystem.typography?.fontFamilies?.length || 0,
      spacingCount: designSystem.spacing?.scale?.length || 0,
    },
  };

  history.snapshots.push(snapshot);

  // Keep last 100 snapshots
  if (history.snapshots.length > 100) {
    history.snapshots = history.snapshots.slice(-100);
  }

  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

  return snapshot;
}

/**
 * Record change event
 */
function recordChange(historyPath, before, after, changes) {
  const history = loadHistory(historyPath);

  const changeEvent = {
    timestamp: new Date().toISOString(),
    beforeHash: before.hash,
    afterHash: after.hash,
    severity: calculateSeverity(changes),
    summary: {
      total: changes.length,
      added: changes.filter(c => c.type === 'added').length,
      removed: changes.filter(c => c.type === 'removed').length,
      changed: changes.filter(c => c.type === 'changed').length,
    },
    categories: Object.fromEntries(
      Object.entries(categorizeChanges(changes))
        .filter(([_, v]) => v.length > 0)
        .map(([k, v]) => [k, v.length])
    ),
  };

  history.changes.push(changeEvent);

  // Keep last 100 changes
  if (history.changes.length > 100) {
    history.changes = history.changes.slice(-100);
  }

  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

  return changeEvent;
}

// ============ REPORT GENERATION ============

function generateChangeReport(before, after, changes, options = {}) {
  const categories = categorizeChanges(changes);
  const severity = calculateSeverity(changes);

  const lines = [];
  lines.push(`# Design System Change Report`);
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Source:** ${after.meta?.url || 'Unknown'}`);
  lines.push(`**Severity:** ${severity.toUpperCase()}`);
  lines.push('');

  // Summary
  lines.push(`## Summary`);
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Changes | ${changes.length} |`);
  lines.push(`| Added | ${changes.filter(c => c.type === 'added').length} |`);
  lines.push(`| Removed | ${changes.filter(c => c.type === 'removed').length} |`);
  lines.push(`| Modified | ${changes.filter(c => c.type === 'changed').length} |`);
  lines.push('');

  // Categories
  lines.push(`## Changes by Category`);
  lines.push('');

  for (const [category, categoryChanges] of Object.entries(categories)) {
    if (categoryChanges.length === 0) continue;

    lines.push(`### ${category.charAt(0).toUpperCase() + category.slice(1)} (${categoryChanges.length})`);
    lines.push('');

    for (const change of categoryChanges.slice(0, 10)) {
      const icon = change.type === 'added' ? '➕' :
                   change.type === 'removed' ? '➖' : '🔄';
      const detail = change.type === 'changed' ?
                     `\`${formatValue(change.before)}\` → \`${formatValue(change.after)}\`` :
                     change.type === 'added' ?
                     `\`${formatValue(change.after)}\`` :
                     `\`${formatValue(change.before)}\``;

      lines.push(`- ${icon} **${change.path}**: ${detail}`);
    }

    if (categoryChanges.length > 10) {
      lines.push(`- ... and ${categoryChanges.length - 10} more`);
    }

    lines.push('');
  }

  // Recommendations
  lines.push(`## Recommendations`);
  lines.push('');

  if (severity === 'critical') {
    lines.push(`⚠️ **Critical changes detected.** Review color and typography changes immediately.`);
  } else if (severity === 'high') {
    lines.push(`⚠️ **Significant changes detected.** Multiple design system categories affected.`);
  } else if (severity === 'medium') {
    lines.push(`ℹ️ **Moderate changes detected.** Review changes before next deployment.`);
  } else if (severity === 'low') {
    lines.push(`✅ **Minor changes detected.** No immediate action required.`);
  } else {
    lines.push(`✅ **No changes detected.** Design system is stable.`);
  }

  lines.push('');
  lines.push('---');
  lines.push('*Generated by Impression Design System Watcher*');

  return lines.join('\n');
}

function formatValue(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') {
    if (Array.isArray(value)) return `Array[${value.length}]`;
    return 'Object';
  }
  const str = String(value);
  return str.length > 50 ? str.slice(0, 47) + '...' : str;
}

// ============ WEBHOOK NOTIFICATIONS ============

async function sendWebhook(url, payload) {
  try {
    const http = url.startsWith('https') ? require('https') : require('http');
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        resolve({ status: res.statusCode });
      });

      req.on('error', reject);
      req.write(JSON.stringify(payload));
      req.end();
    });
  } catch (err) {
    console.error(`Webhook failed: ${err.message}`);
    return { status: 0, error: err.message };
  }
}

// ============ MAIN ============

function watchDesignSystem(designSystemPath, baselinePath, options = {}) {
  const {
    outputDir = null,
    historyPath = null,
    webhookUrl = null,
  } = options;

  // Load current design system
  const current = JSON.parse(fs.readFileSync(designSystemPath, 'utf-8'));
  const currentHash = hashDesignSystem(current);

  // Load baseline if exists
  let baseline = null;
  let baselineHash = null;

  if (baselinePath && fs.existsSync(baselinePath)) {
    baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
    baselineHash = hashDesignSystem(baseline);
  }

  const result = {
    timestamp: new Date().toISOString(),
    currentHash,
    baselineHash,
    changed: false,
    changes: [],
    severity: 'none',
    report: null,
  };

  // Compare if baseline exists
  if (baseline) {
    if (currentHash !== baselineHash) {
      result.changed = true;
      result.changes = deepDiff(baseline, current);
      result.severity = calculateSeverity(result.changes);
      result.report = generateChangeReport(baseline, current, result.changes);

      // Save to history if path provided
      if (historyPath) {
        saveSnapshot(historyPath, current, currentHash);
        recordChange(
          historyPath,
          { hash: baselineHash },
          { hash: currentHash },
          result.changes
        );
      }

      // Send webhook if configured
      if (webhookUrl && result.severity !== 'none') {
        sendWebhook(webhookUrl, {
          event: 'design_system_changed',
          severity: result.severity,
          changes: result.changes.length,
          categories: categorizeChanges(result.changes),
          timestamp: result.timestamp,
        });
      }

      // Write report if output dir specified
      if (outputDir) {
        fs.mkdirSync(outputDir, { recursive: true });
        const reportPath = path.join(outputDir, `change-report-${Date.now()}.md`);
        fs.writeFileSync(reportPath, result.report);
        result.reportPath = reportPath;
      }
    }
  } else {
    // No baseline - save current as baseline
    if (outputDir) {
      fs.mkdirSync(outputDir, { recursive: true });
      const newBaselinePath = path.join(outputDir, 'baseline.json');
      fs.writeFileSync(newBaselinePath, JSON.stringify(current, null, 2));
      result.baselinePath = newBaselinePath;
      result.note = 'Created new baseline';
    }
  }

  return result;
}

/**
 * Compare two design system files directly
 */
function compareDesignSystems(beforePath, afterPath, options = {}) {
  const before = JSON.parse(fs.readFileSync(beforePath, 'utf-8'));
  const after = JSON.parse(fs.readFileSync(afterPath, 'utf-8'));

  const changes = deepDiff(before, after);

  return {
    timestamp: new Date().toISOString(),
    beforePath,
    afterPath,
    beforeHash: hashDesignSystem(before),
    afterHash: hashDesignSystem(after),
    changed: changes.length > 0,
    changes,
    severity: calculateSeverity(changes),
    categories: categorizeChanges(changes),
    report: generateChangeReport(before, after, changes, options),
  };
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node watch-design-system.js <design-system.json> [baseline.json] [options]');
    console.error('');
    console.error('Options:');
    console.error('  --output=<dir>     Output directory for reports');
    console.error('  --history=<file>   History file path for tracking changes');
    console.error('  --webhook=<url>    Webhook URL for notifications');
    console.error('  --compare          Compare two files directly');
    console.error('');
    console.error('Example:');
    console.error('  node watch-design-system.js current.json baseline.json --output=./changes');
    console.error('  node watch-design-system.js new.json old.json --compare');
    process.exit(1);
  }

  const designSystemPath = path.resolve(args[0]);
  let baselinePath = args[1] && !args[1].startsWith('--') ? path.resolve(args[1]) : null;
  let outputDir = null;
  let historyPath = null;
  let webhookUrl = null;
  let compareMode = false;

  for (const arg of args.slice(1)) {
    if (arg.startsWith('--output=')) {
      outputDir = path.resolve(arg.split('=')[1]);
    } else if (arg.startsWith('--history=')) {
      historyPath = path.resolve(arg.split('=')[1]);
    } else if (arg.startsWith('--webhook=')) {
      webhookUrl = arg.split('=')[1];
    } else if (arg === '--compare') {
      compareMode = true;
    }
  }

  if (!fs.existsSync(designSystemPath)) {
    console.error(`Error: Design system file not found: ${designSystemPath}`);
    process.exit(1);
  }

  try {
    let result;

    if (compareMode && baselinePath) {
      // Direct comparison mode
      result = compareDesignSystems(baselinePath, designSystemPath, { outputDir });
      console.log(`\nDesign System Comparison:`);
      console.log(`  Before: ${baselinePath}`);
      console.log(`  After: ${designSystemPath}`);
    } else {
      // Watch mode
      result = watchDesignSystem(designSystemPath, baselinePath, {
        outputDir,
        historyPath,
        webhookUrl,
      });
      console.log(`\nDesign System Watch:`);
      console.log(`  Current: ${designSystemPath}`);
      if (baselinePath) console.log(`  Baseline: ${baselinePath}`);
    }

    console.log(`  Changed: ${result.changed ? 'Yes' : 'No'}`);
    if (result.changed) {
      console.log(`  Severity: ${result.severity}`);
      console.log(`  Total Changes: ${result.changes.length}`);

      const categories = categorizeChanges(result.changes);
      const nonEmpty = Object.entries(categories).filter(([_, v]) => v.length > 0);
      if (nonEmpty.length > 0) {
        console.log(`  Categories:`);
        for (const [cat, changes] of nonEmpty) {
          console.log(`    - ${cat}: ${changes.length}`);
        }
      }
    }

    if (result.reportPath) {
      console.log(`\n✓ Report saved to: ${result.reportPath}`);
    }

    if (result.note) {
      console.log(`\nNote: ${result.note}`);
    }

    // Print report to stdout if no output dir
    if (!outputDir && result.report) {
      console.log('\n' + result.report);
    }

    // Exit with code based on severity
    if (result.severity === 'critical') {
      process.exit(2);
    } else if (result.severity === 'high' || result.severity === 'medium') {
      process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  watchDesignSystem,
  compareDesignSystems,
  deepDiff,
  categorizeChanges,
  calculateSeverity,
  hashDesignSystem,
  generateChangeReport,
};
