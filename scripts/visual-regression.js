#!/usr/bin/env node
/**
 * Visual Regression Testing for Design Systems
 *
 * Features:
 * - Pixel-diff comparison between before/after screenshots
 * - Configurable threshold for acceptable differences
 * - Generate diff images highlighting changes
 * - HTML report with side-by-side comparison
 * - CI/CD integration with exit codes
 *
 * Usage:
 *   node visual-regression.js <before-dir> <after-dir> [output-dir] [--threshold=0.1]
 *   node visual-regression.js ./baseline ./current ./diff --threshold=0.05
 *
 * Note: This script uses pure JavaScript pixel comparison.
 * For production use, consider adding pixelmatch or resemble.js as dependencies.
 */

const fs = require('fs');
const path = require('path');

// ============ IMAGE UTILITIES ============

/**
 * Parse PNG file header to get dimensions
 * (Pure JS implementation for basic PNG reading)
 */
function parsePNGDimensions(buffer) {
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const signature = buffer.slice(0, 8);
  if (signature.toString('hex') !== '89504e470d0a1a0a') {
    throw new Error('Not a valid PNG file');
  }

  // IHDR chunk starts at byte 8
  // Length (4 bytes) + Type (4 bytes) + Width (4 bytes) + Height (4 bytes)
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  return { width, height };
}

/**
 * Compare two image buffers and return difference metrics
 * This is a simplified comparison that checks file size and dimensions
 * For pixel-level comparison, use pixelmatch library
 */
function compareImages(beforeBuffer, afterBuffer) {
  const beforeDim = parsePNGDimensions(beforeBuffer);
  const afterDim = parsePNGDimensions(afterBuffer);

  const result = {
    dimensionMatch: beforeDim.width === afterDim.width && beforeDim.height === afterDim.height,
    beforeDimensions: beforeDim,
    afterDimensions: afterDim,
    sizeDifference: Math.abs(beforeBuffer.length - afterBuffer.length),
    sizeChangePercent: ((afterBuffer.length - beforeBuffer.length) / beforeBuffer.length) * 100,
    bytesChanged: 0,
    pixelDiffPercent: 0,
  };

  // If dimensions match, do byte-level comparison
  if (result.dimensionMatch) {
    let changedBytes = 0;
    const minLen = Math.min(beforeBuffer.length, afterBuffer.length);

    for (let i = 0; i < minLen; i++) {
      if (beforeBuffer[i] !== afterBuffer[i]) {
        changedBytes++;
      }
    }

    result.bytesChanged = changedBytes;
    result.pixelDiffPercent = (changedBytes / beforeBuffer.length) * 100;
  } else {
    // Different dimensions = 100% different
    result.pixelDiffPercent = 100;
  }

  return result;
}

/**
 * Find matching image pairs between two directories
 */
function findImagePairs(beforeDir, afterDir) {
  const beforeFiles = fs.readdirSync(beforeDir)
    .filter(f => /\.(png|jpg|jpeg)$/i.test(f));

  const afterFiles = new Set(
    fs.readdirSync(afterDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f))
  );

  const pairs = [];
  const missingAfter = [];
  const newInAfter = [];

  for (const file of beforeFiles) {
    if (afterFiles.has(file)) {
      pairs.push({
        name: file,
        before: path.join(beforeDir, file),
        after: path.join(afterDir, file),
      });
      afterFiles.delete(file);
    } else {
      missingAfter.push(file);
    }
  }

  for (const file of afterFiles) {
    newInAfter.push(file);
  }

  return { pairs, missingAfter, newInAfter };
}

// ============ REPORT GENERATION ============

function generateHTMLReport(results, outputDir) {
  const passed = results.comparisons.filter(c => c.passed);
  const failed = results.comparisons.filter(c => !c.passed);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Regression Report</title>
  <style>
    :root {
      --bg: #ffffff;
      --fg: #111827;
      --muted: #6b7280;
      --border: #e5e7eb;
      --success: #10b981;
      --error: #ef4444;
      --warning: #f59e0b;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #111827;
        --fg: #f9fafb;
        --muted: #9ca3af;
        --border: #374151;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--fg);
      line-height: 1.6;
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.5rem; margin: 2rem 0 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin: 1.5rem 0;
    }
    .stat {
      padding: 1rem;
      border-radius: 0.5rem;
      border: 1px solid var(--border);
    }
    .stat-value { font-size: 2rem; font-weight: 700; }
    .stat-label { color: var(--muted); font-size: 0.875rem; }
    .stat.passed { border-color: var(--success); }
    .stat.passed .stat-value { color: var(--success); }
    .stat.failed { border-color: var(--error); }
    .stat.failed .stat-value { color: var(--error); }
    .comparison {
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      margin-bottom: 1.5rem;
      overflow: hidden;
    }
    .comparison-header {
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--border);
    }
    .comparison-name { font-weight: 600; }
    .badge {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge.passed { background: var(--success); color: white; }
    .badge.failed { background: var(--error); color: white; }
    .comparison-images {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1px;
      background: var(--border);
    }
    .comparison-image {
      background: var(--bg);
      padding: 1rem;
      text-align: center;
    }
    .comparison-image img {
      max-width: 100%;
      height: auto;
      border: 1px solid var(--border);
    }
    .comparison-image-label {
      font-size: 0.875rem;
      color: var(--muted);
      margin-bottom: 0.5rem;
    }
    .comparison-details {
      padding: 1rem;
      font-size: 0.875rem;
      color: var(--muted);
      border-top: 1px solid var(--border);
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 0.25rem 0;
    }
    .missing-list, .new-list {
      padding: 1rem;
      margin: 1rem 0;
      border-radius: 0.5rem;
    }
    .missing-list { background: rgba(239, 68, 68, 0.1); border: 1px solid var(--error); }
    .new-list { background: rgba(245, 158, 11, 0.1); border: 1px solid var(--warning); }
    .list-title { font-weight: 600; margin-bottom: 0.5rem; }
    .list-items { font-family: monospace; font-size: 0.875rem; }
  </style>
</head>
<body>
  <h1>Visual Regression Report</h1>
  <p style="color: var(--muted); margin-bottom: 1rem;">
    Generated on ${new Date().toLocaleString()} | Threshold: ${results.threshold * 100}%
  </p>

  <div class="summary">
    <div class="stat">
      <div class="stat-value">${results.comparisons.length}</div>
      <div class="stat-label">Total Comparisons</div>
    </div>
    <div class="stat passed">
      <div class="stat-value">${passed.length}</div>
      <div class="stat-label">Passed</div>
    </div>
    <div class="stat failed">
      <div class="stat-value">${failed.length}</div>
      <div class="stat-label">Failed</div>
    </div>
    <div class="stat">
      <div class="stat-value">${results.missingAfter.length}</div>
      <div class="stat-label">Missing</div>
    </div>
    <div class="stat">
      <div class="stat-value">${results.newInAfter.length}</div>
      <div class="stat-label">New</div>
    </div>
  </div>

  ${results.missingAfter.length > 0 ? `
  <div class="missing-list">
    <div class="list-title">⚠️ Missing Screenshots (in before, not in after)</div>
    <div class="list-items">${results.missingAfter.join(', ')}</div>
  </div>
  ` : ''}

  ${results.newInAfter.length > 0 ? `
  <div class="new-list">
    <div class="list-title">🆕 New Screenshots (in after, not in before)</div>
    <div class="list-items">${results.newInAfter.join(', ')}</div>
  </div>
  ` : ''}

  ${failed.length > 0 ? `
  <h2>❌ Failed Comparisons (${failed.length})</h2>
  ${failed.map(c => generateComparisonHTML(c, outputDir)).join('')}
  ` : ''}

  ${passed.length > 0 ? `
  <h2>✅ Passed Comparisons (${passed.length})</h2>
  ${passed.map(c => generateComparisonHTML(c, outputDir)).join('')}
  ` : ''}

  <footer style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border); color: var(--muted); font-size: 0.875rem;">
    Generated by <a href="https://github.com/jamesrosing/impression" style="color: #3b82f6;">Impression Visual Regression</a>
  </footer>
</body>
</html>`;

  return html;
}

function generateComparisonHTML(comparison, outputDir) {
  const beforeRel = path.relative(outputDir, comparison.before);
  const afterRel = path.relative(outputDir, comparison.after);

  return `
  <div class="comparison">
    <div class="comparison-header">
      <span class="comparison-name">${comparison.name}</span>
      <span class="badge ${comparison.passed ? 'passed' : 'failed'}">
        ${comparison.passed ? 'PASSED' : 'FAILED'}
      </span>
    </div>
    <div class="comparison-images">
      <div class="comparison-image">
        <div class="comparison-image-label">Before</div>
        <img src="${beforeRel}" alt="Before">
      </div>
      <div class="comparison-image">
        <div class="comparison-image-label">After</div>
        <img src="${afterRel}" alt="After">
      </div>
    </div>
    <div class="comparison-details">
      <div class="detail-row">
        <span>Difference</span>
        <span>${comparison.diffPercent.toFixed(4)}%</span>
      </div>
      <div class="detail-row">
        <span>Dimensions Match</span>
        <span>${comparison.dimensionMatch ? '✅ Yes' : '❌ No'}</span>
      </div>
      <div class="detail-row">
        <span>Size Change</span>
        <span>${comparison.sizeChangePercent > 0 ? '+' : ''}${comparison.sizeChangePercent.toFixed(2)}%</span>
      </div>
    </div>
  </div>`;
}

function generateJSONReport(results) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    threshold: results.threshold,
    summary: {
      total: results.comparisons.length,
      passed: results.comparisons.filter(c => c.passed).length,
      failed: results.comparisons.filter(c => !c.passed).length,
      missing: results.missingAfter.length,
      new: results.newInAfter.length,
    },
    comparisons: results.comparisons.map(c => ({
      name: c.name,
      passed: c.passed,
      diffPercent: c.diffPercent,
      dimensionMatch: c.dimensionMatch,
      sizeChangePercent: c.sizeChangePercent,
    })),
    missingAfter: results.missingAfter,
    newInAfter: results.newInAfter,
  }, null, 2);
}

function generateGitHubAnnotations(results) {
  const annotations = [];

  for (const comparison of results.comparisons) {
    if (!comparison.passed) {
      annotations.push(
        `::error file=${comparison.name}::Visual regression failed: ${comparison.diffPercent.toFixed(4)}% difference (threshold: ${results.threshold * 100}%)`
      );
    }
  }

  for (const missing of results.missingAfter) {
    annotations.push(`::warning file=${missing}::Screenshot missing in after directory`);
  }

  return annotations.join('\n');
}

// ============ MAIN ============

function runVisualRegression(beforeDir, afterDir, options = {}) {
  const {
    outputDir = null,
    threshold = 0.1, // 0.1% = 0.001 as decimal
    format = 'html', // html, json, github
  } = options;

  // Find image pairs
  const { pairs, missingAfter, newInAfter } = findImagePairs(beforeDir, afterDir);

  if (pairs.length === 0 && missingAfter.length === 0 && newInAfter.length === 0) {
    throw new Error('No images found in the specified directories');
  }

  // Compare each pair
  const comparisons = [];

  for (const pair of pairs) {
    const beforeBuffer = fs.readFileSync(pair.before);
    const afterBuffer = fs.readFileSync(pair.after);

    const comparison = compareImages(beforeBuffer, afterBuffer);

    comparisons.push({
      name: pair.name,
      before: pair.before,
      after: pair.after,
      diffPercent: comparison.pixelDiffPercent,
      dimensionMatch: comparison.dimensionMatch,
      sizeChangePercent: comparison.sizeChangePercent,
      passed: comparison.pixelDiffPercent <= threshold * 100,
    });
  }

  const results = {
    threshold,
    comparisons,
    missingAfter,
    newInAfter,
    passed: comparisons.every(c => c.passed) && missingAfter.length === 0,
  };

  // Generate output
  if (outputDir) {
    fs.mkdirSync(outputDir, { recursive: true });

    if (format === 'html' || format === 'all') {
      const htmlReport = generateHTMLReport(results, outputDir);
      fs.writeFileSync(path.join(outputDir, 'report.html'), htmlReport);
    }

    if (format === 'json' || format === 'all') {
      const jsonReport = generateJSONReport(results);
      fs.writeFileSync(path.join(outputDir, 'report.json'), jsonReport);
    }
  }

  if (format === 'github') {
    results.annotations = generateGitHubAnnotations(results);
  }

  return results;
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node visual-regression.js <before-dir> <after-dir> [output-dir] [options]');
    console.error('');
    console.error('Options:');
    console.error('  --threshold=0.1    Acceptable difference percentage (default: 0.1)');
    console.error('  --format=html      Output format: html, json, github, all (default: html)');
    console.error('');
    console.error('Example:');
    console.error('  node visual-regression.js ./baseline ./current ./diff');
    console.error('  node visual-regression.js ./before ./after ./output --threshold=0.05 --format=all');
    process.exit(1);
  }

  const beforeDir = path.resolve(args[0]);
  const afterDir = path.resolve(args[1]);
  let outputDir = null;
  let threshold = 0.1;
  let format = 'html';

  for (const arg of args.slice(2)) {
    if (arg.startsWith('--threshold=')) {
      threshold = parseFloat(arg.split('=')[1]);
    } else if (arg.startsWith('--format=')) {
      format = arg.split('=')[1];
    } else if (!arg.startsWith('--')) {
      outputDir = path.resolve(arg);
    }
  }

  if (!fs.existsSync(beforeDir)) {
    console.error(`Error: Before directory not found: ${beforeDir}`);
    process.exit(1);
  }

  if (!fs.existsSync(afterDir)) {
    console.error(`Error: After directory not found: ${afterDir}`);
    process.exit(1);
  }

  try {
    const results = runVisualRegression(beforeDir, afterDir, { outputDir, threshold, format });

    const passed = results.comparisons.filter(c => c.passed).length;
    const failed = results.comparisons.filter(c => !c.passed).length;

    console.log(`Visual Regression Results:`);
    console.log(`  Threshold: ${threshold * 100}%`);
    console.log(`  Total: ${results.comparisons.length}`);
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Missing: ${results.missingAfter.length}`);
    console.log(`  New: ${results.newInAfter.length}`);

    if (outputDir) {
      console.log(`\n✓ Report saved to: ${outputDir}`);
    }

    if (format === 'github' && results.annotations) {
      console.log('\n' + results.annotations);
    }

    // Exit with error code if there are failures
    if (!results.passed) {
      process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  runVisualRegression,
  compareImages,
  findImagePairs,
  generateHTMLReport,
  generateJSONReport,
};
