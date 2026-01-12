#!/usr/bin/env node
/**
 * Design System Versioning and History
 *
 * Features:
 * - Create versions/snapshots of design systems
 * - Track changes between versions
 * - Rollback to previous versions
 * - Generate changelog between versions
 * - Semantic versioning suggestions
 *
 * Usage:
 *   node design-versioning.js init <design-system.json>
 *   node design-versioning.js snapshot [--message="..."]
 *   node design-versioning.js list
 *   node design-versioning.js diff <v1> <v2>
 *   node design-versioning.js rollback <version>
 *   node design-versioning.js changelog [--from=v1] [--to=v2]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============ VERSION STORE ============

const VERSION_FILE = '.impression-versions.json';

function loadVersionStore(dir) {
  const storePath = path.join(dir, VERSION_FILE);
  if (fs.existsSync(storePath)) {
    return JSON.parse(fs.readFileSync(storePath, 'utf-8'));
  }
  return {
    designSystemPath: null,
    versions: [],
    current: null,
    created: new Date().toISOString(),
  };
}

function saveVersionStore(dir, store) {
  const storePath = path.join(dir, VERSION_FILE);
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
}

function hashContent(content) {
  return crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex').slice(0, 12);
}

// ============ DIFF ENGINE ============

function deepDiff(before, after, path = '') {
  const changes = [];

  if (before === after) return changes;
  if (before === null || after === null || typeof before !== typeof after) {
    if (before !== after) {
      changes.push({ type: before === null ? 'added' : after === null ? 'removed' : 'changed', path, before, after });
    }
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
  const categories = {};
  for (const change of changes) {
    const section = change.path.split('.')[0].split('[')[0];
    if (!categories[section]) categories[section] = [];
    categories[section].push(change);
  }
  return categories;
}

// ============ SEMANTIC VERSION ============

function suggestVersion(currentVersion, changes) {
  const categories = categorizeChanges(changes);

  // Parse current version
  const match = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return '1.0.0';

  let [, major, minor, patch] = match.map(Number);

  // Breaking changes (colors, typography)
  const breakingCategories = ['colors', 'typography'];
  const hasBreaking = breakingCategories.some(cat =>
    (categories[cat] || []).some(c => c.type === 'removed' || c.type === 'changed')
  );

  if (hasBreaking && changes.length > 10) {
    return `${major + 1}.0.0`;
  }

  // New features (new categories or many additions)
  const hasNewFeatures = changes.filter(c => c.type === 'added').length > 5;
  if (hasNewFeatures) {
    return `${major}.${minor + 1}.0`;
  }

  // Patches
  return `${major}.${minor}.${patch + 1}`;
}

// ============ COMMANDS ============

function init(designSystemPath, outputDir) {
  const store = loadVersionStore(outputDir);

  if (store.versions.length > 0) {
    return { success: false, error: 'Version store already initialized' };
  }

  const designSystem = JSON.parse(fs.readFileSync(designSystemPath, 'utf-8'));
  const hash = hashContent(designSystem);

  // Create versions directory
  const versionsDir = path.join(outputDir, '.impression-snapshots');
  fs.mkdirSync(versionsDir, { recursive: true });

  // Save initial version
  const version = {
    id: hash,
    version: '1.0.0',
    message: 'Initial version',
    timestamp: new Date().toISOString(),
    changes: 0,
    categories: {},
  };

  fs.writeFileSync(
    path.join(versionsDir, `${hash}.json`),
    JSON.stringify(designSystem, null, 2)
  );

  store.designSystemPath = path.resolve(designSystemPath);
  store.versions = [version];
  store.current = hash;
  saveVersionStore(outputDir, store);

  return { success: true, version };
}

function snapshot(outputDir, options = {}) {
  const { message = 'Design system update' } = options;

  const store = loadVersionStore(outputDir);

  if (!store.designSystemPath) {
    return { success: false, error: 'Not initialized. Run init first.' };
  }

  if (!fs.existsSync(store.designSystemPath)) {
    return { success: false, error: `Design system file not found: ${store.designSystemPath}` };
  }

  const designSystem = JSON.parse(fs.readFileSync(store.designSystemPath, 'utf-8'));
  const hash = hashContent(designSystem);

  // Check if unchanged
  if (hash === store.current) {
    return { success: false, error: 'No changes detected' };
  }

  // Load previous version for diff
  const versionsDir = path.join(outputDir, '.impression-snapshots');
  const previousPath = path.join(versionsDir, `${store.current}.json`);
  const previous = JSON.parse(fs.readFileSync(previousPath, 'utf-8'));

  // Calculate diff
  const changes = deepDiff(previous, designSystem);
  const categories = categorizeChanges(changes);

  // Suggest version
  const latestVersion = store.versions[store.versions.length - 1].version;
  const suggestedVersion = suggestVersion(latestVersion, changes);

  // Save new version
  fs.writeFileSync(
    path.join(versionsDir, `${hash}.json`),
    JSON.stringify(designSystem, null, 2)
  );

  const version = {
    id: hash,
    version: suggestedVersion,
    message,
    timestamp: new Date().toISOString(),
    previousId: store.current,
    changes: changes.length,
    categories: Object.fromEntries(
      Object.entries(categories).map(([k, v]) => [k, v.length])
    ),
  };

  store.versions.push(version);
  store.current = hash;
  saveVersionStore(outputDir, store);

  return { success: true, version, changes: changes.length };
}

function list(outputDir) {
  const store = loadVersionStore(outputDir);

  if (store.versions.length === 0) {
    return { success: false, error: 'No versions found. Run init first.' };
  }

  return {
    success: true,
    versions: store.versions,
    current: store.current,
    designSystemPath: store.designSystemPath,
  };
}

function diff(outputDir, v1, v2) {
  const store = loadVersionStore(outputDir);

  const findVersion = (v) => {
    // Find by version string or ID
    return store.versions.find(ver =>
      ver.version === v || ver.id === v || ver.id.startsWith(v)
    );
  };

  const version1 = findVersion(v1);
  const version2 = findVersion(v2);

  if (!version1) return { success: false, error: `Version not found: ${v1}` };
  if (!version2) return { success: false, error: `Version not found: ${v2}` };

  const versionsDir = path.join(outputDir, '.impression-snapshots');
  const ds1 = JSON.parse(fs.readFileSync(path.join(versionsDir, `${version1.id}.json`), 'utf-8'));
  const ds2 = JSON.parse(fs.readFileSync(path.join(versionsDir, `${version2.id}.json`), 'utf-8'));

  const changes = deepDiff(ds1, ds2);
  const categories = categorizeChanges(changes);

  return {
    success: true,
    from: version1,
    to: version2,
    changes,
    categories,
    summary: {
      total: changes.length,
      added: changes.filter(c => c.type === 'added').length,
      removed: changes.filter(c => c.type === 'removed').length,
      changed: changes.filter(c => c.type === 'changed').length,
    },
  };
}

function rollback(outputDir, targetVersion) {
  const store = loadVersionStore(outputDir);

  const version = store.versions.find(v =>
    v.version === targetVersion || v.id === targetVersion || v.id.startsWith(targetVersion)
  );

  if (!version) {
    return { success: false, error: `Version not found: ${targetVersion}` };
  }

  const versionsDir = path.join(outputDir, '.impression-snapshots');
  const snapshotPath = path.join(versionsDir, `${version.id}.json`);
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));

  // Write to design system file
  fs.writeFileSync(store.designSystemPath, JSON.stringify(snapshot, null, 2));

  // Create rollback version entry
  const hash = version.id;
  const rollbackVersion = {
    id: hash,
    version: version.version + '-rollback',
    message: `Rolled back to ${version.version}`,
    timestamp: new Date().toISOString(),
    previousId: store.current,
    isRollback: true,
    rolledBackTo: version.version,
  };

  store.versions.push(rollbackVersion);
  store.current = hash;
  saveVersionStore(outputDir, store);

  return { success: true, rolledBackTo: version };
}

function generateChangelog(outputDir, options = {}) {
  const { from = null, to = null, format = 'markdown' } = options;

  const store = loadVersionStore(outputDir);

  if (store.versions.length < 2) {
    return { success: false, error: 'Need at least 2 versions for changelog' };
  }

  let versions = store.versions;

  // Filter by from/to if specified
  if (from) {
    const fromIndex = versions.findIndex(v =>
      v.version === from || v.id === from || v.id.startsWith(from)
    );
    if (fromIndex >= 0) versions = versions.slice(fromIndex);
  }

  if (to) {
    const toIndex = versions.findIndex(v =>
      v.version === to || v.id === to || v.id.startsWith(to)
    );
    if (toIndex >= 0) versions = versions.slice(0, toIndex + 1);
  }

  // Generate changelog
  const lines = [];
  lines.push(`# Design System Changelog`);
  lines.push('');

  for (let i = versions.length - 1; i >= 0; i--) {
    const version = versions[i];
    const date = new Date(version.timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    lines.push(`## [${version.version}] - ${date}`);
    lines.push('');
    lines.push(version.message);
    lines.push('');

    if (version.categories && Object.keys(version.categories).length > 0) {
      lines.push(`### Changes`);
      lines.push('');
      for (const [category, count] of Object.entries(version.categories)) {
        lines.push(`- **${category}**: ${count} changes`);
      }
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('*Generated by Impression Design Versioning*');

  return {
    success: true,
    changelog: lines.join('\n'),
    versions: versions.length,
  };
}

// ============ CLI ============

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.error('Usage: node design-versioning.js <command> [options]');
    console.error('');
    console.error('Commands:');
    console.error('  init <design-system.json>     Initialize version tracking');
    console.error('  snapshot [--message="..."]    Create new version snapshot');
    console.error('  list                          List all versions');
    console.error('  diff <v1> <v2>                Show diff between versions');
    console.error('  rollback <version>            Rollback to a previous version');
    console.error('  changelog [--from=v1] [--to=v2]  Generate changelog');
    process.exit(1);
  }

  const outputDir = process.cwd();

  try {
    let result;

    switch (command) {
      case 'init': {
        const designSystemPath = args[1];
        if (!designSystemPath) {
          console.error('Usage: node design-versioning.js init <design-system.json>');
          process.exit(1);
        }
        result = init(path.resolve(designSystemPath), outputDir);
        if (result.success) {
          console.log(`✓ Initialized version tracking`);
          console.log(`  Version: ${result.version.version}`);
          console.log(`  ID: ${result.version.id}`);
        }
        break;
      }

      case 'snapshot': {
        let message = 'Design system update';
        for (const arg of args.slice(1)) {
          if (arg.startsWith('--message=')) {
            message = arg.split('=').slice(1).join('=');
          }
        }
        result = snapshot(outputDir, { message });
        if (result.success) {
          console.log(`✓ Created snapshot`);
          console.log(`  Version: ${result.version.version}`);
          console.log(`  ID: ${result.version.id}`);
          console.log(`  Changes: ${result.changes}`);
        }
        break;
      }

      case 'list': {
        result = list(outputDir);
        if (result.success) {
          console.log(`Design System Versions`);
          console.log(`  Path: ${result.designSystemPath}`);
          console.log(`  Current: ${result.current}`);
          console.log('');
          console.log('Versions:');
          for (const v of result.versions.reverse()) {
            const current = v.id === result.current ? ' (current)' : '';
            const date = new Date(v.timestamp).toLocaleDateString();
            console.log(`  ${v.version}${current} - ${date} - ${v.message}`);
          }
        }
        break;
      }

      case 'diff': {
        const v1 = args[1];
        const v2 = args[2];
        if (!v1 || !v2) {
          console.error('Usage: node design-versioning.js diff <v1> <v2>');
          process.exit(1);
        }
        result = diff(outputDir, v1, v2);
        if (result.success) {
          console.log(`Diff: ${result.from.version} → ${result.to.version}`);
          console.log(`  Total changes: ${result.summary.total}`);
          console.log(`  Added: ${result.summary.added}`);
          console.log(`  Removed: ${result.summary.removed}`);
          console.log(`  Changed: ${result.summary.changed}`);
          console.log('');
          console.log('By category:');
          for (const [cat, changes] of Object.entries(result.categories)) {
            console.log(`  ${cat}: ${changes.length}`);
          }
        }
        break;
      }

      case 'rollback': {
        const targetVersion = args[1];
        if (!targetVersion) {
          console.error('Usage: node design-versioning.js rollback <version>');
          process.exit(1);
        }
        result = rollback(outputDir, targetVersion);
        if (result.success) {
          console.log(`✓ Rolled back to ${result.rolledBackTo.version}`);
        }
        break;
      }

      case 'changelog': {
        let from = null;
        let to = null;
        for (const arg of args.slice(1)) {
          if (arg.startsWith('--from=')) from = arg.split('=')[1];
          if (arg.startsWith('--to=')) to = arg.split('=')[1];
        }
        result = generateChangelog(outputDir, { from, to });
        if (result.success) {
          console.log(result.changelog);
        }
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }

    if (result && !result.success) {
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  init,
  snapshot,
  list,
  diff,
  rollback,
  generateChangelog,
  loadVersionStore,
  saveVersionStore,
  deepDiff,
  suggestVersion,
};
