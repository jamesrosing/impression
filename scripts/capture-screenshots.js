#!/usr/bin/env node
/**
 * Capture Screenshots
 * Generate before/after screenshots for design system comparisons
 *
 * This script is designed to work with Playwright MCP tools for browser automation.
 * It captures screenshots at multiple breakpoints and can generate comparison reports.
 *
 * Usage:
 *   node capture-screenshots.js <url> [output-dir]
 *   node capture-screenshots.js https://example.com ./screenshots
 *   node capture-screenshots.js --compare before/ after/ --output report.html
 *
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_BREAKPOINTS = [
  { name: 'mobile', width: 375, height: 812 },    // iPhone X
  { name: 'tablet', width: 768, height: 1024 },   // iPad
  { name: 'desktop', width: 1440, height: 900 },  // Standard desktop
  { name: 'wide', width: 1920, height: 1080 }     // Full HD
];

const DEFAULT_PAGES = [
  { name: 'home', path: '/' },
  { name: 'components', path: '/components' },
  { name: 'about', path: '/about' }
];

const DEFAULT_ELEMENTS = [
  { name: 'header', selector: 'header, [role="banner"], nav' },
  { name: 'hero', selector: '[class*="hero"], .hero, main > section:first-child' },
  { name: 'buttons', selector: 'button, [role="button"], .btn' },
  { name: 'cards', selector: '[class*="card"], .card, article' },
  { name: 'footer', selector: 'footer, [role="contentinfo"]' }
];

// =============================================================================
// SCREENSHOT UTILITIES
// =============================================================================

function generateScreenshotManifest(url, options = {}) {
  const {
    breakpoints = DEFAULT_BREAKPOINTS,
    pages = [{ name: 'home', path: '/' }],
    elements = DEFAULT_ELEMENTS,
    captureFullPage = true,
    captureFold = true,
    timestamp = new Date().toISOString()
  } = options;

  const manifest = {
    url,
    timestamp,
    breakpoints: [],
    pages: [],
    elements: [],
    instructions: []
  };

  // Generate instructions for each breakpoint
  for (const bp of breakpoints) {
    manifest.breakpoints.push({
      name: bp.name,
      width: bp.width,
      height: bp.height,
      screenshots: []
    });

    for (const page of pages) {
      const pageUrl = new URL(page.path, url).href;
      const filename = `${bp.name}-${page.name}`;

      // Viewport screenshot
      if (captureFold) {
        manifest.instructions.push({
          type: 'viewport',
          breakpoint: bp.name,
          page: page.name,
          url: pageUrl,
          resize: { width: bp.width, height: bp.height },
          filename: `${filename}-viewport.png`
        });
      }

      // Full page screenshot
      if (captureFullPage) {
        manifest.instructions.push({
          type: 'fullPage',
          breakpoint: bp.name,
          page: page.name,
          url: pageUrl,
          resize: { width: bp.width, height: bp.height },
          filename: `${filename}-full.png`
        });
      }

      // Element screenshots
      for (const el of elements) {
        manifest.instructions.push({
          type: 'element',
          breakpoint: bp.name,
          page: page.name,
          url: pageUrl,
          element: el.name,
          selector: el.selector,
          resize: { width: bp.width, height: bp.height },
          filename: `${filename}-${el.name}.png`
        });
      }
    }
  }

  return manifest;
}

function generatePlaywrightCommands(manifest, outputDir = './screenshots') {
  const commands = [];
  let currentUrl = null;
  let currentBreakpoint = null;

  for (const instruction of manifest.instructions) {
    // Navigate if URL changed
    if (instruction.url !== currentUrl) {
      commands.push({
        tool: 'browser_navigate',
        params: { url: instruction.url },
        comment: `Navigate to ${instruction.page} page`
      });
      currentUrl = instruction.url;

      // Wait for page load
      commands.push({
        tool: 'browser_wait_for',
        params: { time: 2 },
        comment: 'Wait for fonts and animations'
      });
    }

    // Resize if breakpoint changed
    if (JSON.stringify(instruction.resize) !== JSON.stringify(currentBreakpoint)) {
      commands.push({
        tool: 'browser_resize',
        params: instruction.resize,
        comment: `Resize to ${instruction.breakpoint}`
      });
      currentBreakpoint = instruction.resize;

      // Small delay after resize
      commands.push({
        tool: 'browser_wait_for',
        params: { time: 0.5 },
        comment: 'Wait for layout'
      });
    }

    // Take screenshot
    const screenshotPath = path.join(outputDir, instruction.filename);

    if (instruction.type === 'element') {
      commands.push({
        tool: 'browser_take_screenshot',
        params: {
          element: instruction.element,
          filename: screenshotPath
        },
        selector: instruction.selector,
        comment: `Capture ${instruction.element} element`,
        fallback: true
      });
    } else if (instruction.type === 'fullPage') {
      commands.push({
        tool: 'browser_take_screenshot',
        params: {
          fullPage: true,
          filename: screenshotPath
        },
        comment: 'Capture full page'
      });
    } else {
      commands.push({
        tool: 'browser_take_screenshot',
        params: {
          filename: screenshotPath
        },
        comment: 'Capture viewport'
      });
    }
  }

  return commands;
}

// =============================================================================
// COMPARISON UTILITIES
// =============================================================================

function generateComparisonReport(beforeDir, afterDir, options = {}) {
  const {
    title = 'Design System Comparison',
    outputPath = 'comparison-report.html'
  } = options;

  // Find matching screenshots
  const beforeFiles = fs.existsSync(beforeDir)
    ? fs.readdirSync(beforeDir).filter(f => f.endsWith('.png'))
    : [];
  const afterFiles = fs.existsSync(afterDir)
    ? fs.readdirSync(afterDir).filter(f => f.endsWith('.png'))
    : [];

  const pairs = [];
  for (const file of beforeFiles) {
    if (afterFiles.includes(file)) {
      pairs.push({
        name: file.replace('.png', ''),
        before: path.join(beforeDir, file),
        after: path.join(afterDir, file)
      });
    }
  }

  // Generate HTML report
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #f5f5f5;
      padding: 2rem;
    }
    h1 {
      text-align: center;
      margin-bottom: 2rem;
      color: #1a1a1a;
    }
    .summary {
      background: white;
      padding: 1rem 2rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .comparison-grid {
      display: grid;
      gap: 2rem;
    }
    .comparison-item {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .comparison-header {
      padding: 1rem;
      background: #1a1a1a;
      color: white;
      font-weight: 600;
    }
    .comparison-body {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1px;
      background: #e5e5e5;
    }
    .image-container {
      background: white;
      padding: 1rem;
    }
    .image-container h3 {
      font-size: 0.875rem;
      color: #666;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .image-container img {
      width: 100%;
      height: auto;
      border: 1px solid #e5e5e5;
      border-radius: 4px;
    }
    .slider-container {
      position: relative;
      background: white;
      padding: 1rem;
      grid-column: span 2;
    }
    .slider-wrapper {
      position: relative;
      overflow: hidden;
    }
    .slider-before, .slider-after {
      width: 100%;
    }
    .slider-after {
      position: absolute;
      top: 0;
      left: 0;
      width: 50%;
      overflow: hidden;
    }
    .slider-handle {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      width: 4px;
      background: #3b82f6;
      cursor: ew-resize;
      z-index: 10;
    }
    .slider-handle::before {
      content: '⇔';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #3b82f6;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
    }
    .toggle-view {
      display: flex;
      gap: 0.5rem;
      padding: 1rem;
      justify-content: center;
      border-top: 1px solid #e5e5e5;
    }
    .toggle-view button {
      padding: 0.5rem 1rem;
      border: 1px solid #e5e5e5;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .toggle-view button:hover {
      background: #f5f5f5;
    }
    .toggle-view button.active {
      background: #1a1a1a;
      color: white;
      border-color: #1a1a1a;
    }
    .view-side-by-side .slider-container { display: none; }
    .view-slider .comparison-body > .image-container { display: none; }
    @media (max-width: 768px) {
      .comparison-body { grid-template-columns: 1fr; }
      .slider-container { grid-column: span 1; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>

  <div class="summary">
    <p><strong>Comparisons:</strong> ${pairs.length} screenshots</p>
    <p><strong>Before:</strong> ${beforeDir}</p>
    <p><strong>After:</strong> ${afterDir}</p>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  </div>

  <div class="comparison-grid">
    ${pairs.map(pair => `
    <div class="comparison-item view-side-by-side" data-name="${pair.name}">
      <div class="comparison-header">${pair.name}</div>
      <div class="comparison-body">
        <div class="image-container">
          <h3>Before</h3>
          <img src="${pair.before}" alt="Before">
        </div>
        <div class="image-container">
          <h3>After</h3>
          <img src="${pair.after}" alt="After">
        </div>
        <div class="slider-container">
          <h3>Comparison Slider</h3>
          <div class="slider-wrapper">
            <img class="slider-before" src="${pair.before}" alt="Before">
            <div class="slider-after">
              <img src="${pair.after}" alt="After" style="width: 200%;">
            </div>
            <div class="slider-handle"></div>
          </div>
        </div>
      </div>
      <div class="toggle-view">
        <button class="active" onclick="setView(this, 'side-by-side')">Side by Side</button>
        <button onclick="setView(this, 'slider')">Slider</button>
      </div>
    </div>
    `).join('\n')}
  </div>

  <script>
    function setView(button, view) {
      const item = button.closest('.comparison-item');
      item.className = 'comparison-item view-' + view;
      item.querySelectorAll('.toggle-view button').forEach(b => b.classList.remove('active'));
      button.classList.add('active');
    }

    // Initialize sliders
    document.querySelectorAll('.slider-handle').forEach(handle => {
      let isDragging = false;

      handle.addEventListener('mousedown', () => isDragging = true);
      document.addEventListener('mouseup', () => isDragging = false);

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const wrapper = handle.closest('.slider-wrapper');
        const rect = wrapper.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

        handle.style.left = (x * 100) + '%';
        wrapper.querySelector('.slider-after').style.width = (x * 100) + '%';
      });
    });
  </script>
</body>
</html>`;

  return {
    html,
    pairs,
    stats: {
      total: pairs.length,
      beforeOnly: beforeFiles.filter(f => !afterFiles.includes(f)),
      afterOnly: afterFiles.filter(f => !beforeFiles.includes(f))
    }
  };
}

// =============================================================================
// CAPTURE PLAN GENERATOR
// =============================================================================

function generateCapturePlan(url, options = {}) {
  const {
    outputDir = './screenshots',
    label = 'capture',
    breakpoints = DEFAULT_BREAKPOINTS,
    pages = [{ name: 'home', path: '/' }],
    elements = DEFAULT_ELEMENTS
  } = options;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const captureDir = path.join(outputDir, `${label}-${timestamp}`);

  const manifest = generateScreenshotManifest(url, {
    breakpoints,
    pages,
    elements
  });

  const commands = generatePlaywrightCommands(manifest, captureDir);

  return {
    manifest,
    commands,
    outputDir: captureDir,
    summary: {
      url,
      timestamp,
      breakpoints: breakpoints.length,
      pages: pages.length,
      elements: elements.length,
      totalScreenshots: manifest.instructions.length
    }
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  generateScreenshotManifest,
  generatePlaywrightCommands,
  generateComparisonReport,
  generateCapturePlan,
  DEFAULT_BREAKPOINTS,
  DEFAULT_PAGES,
  DEFAULT_ELEMENTS
};

// =============================================================================
// CLI
// =============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);

  // Parse flags
  const compareFlag = args.includes('--compare');
  const outputFlag = args.find(a => a.startsWith('--output='));
  const labelFlag = args.find(a => a.startsWith('--label='));
  const pagesFlag = args.find(a => a.startsWith('--pages='));

  if (compareFlag) {
    // Comparison mode
    const dirs = args.filter(a => !a.startsWith('--'));
    if (dirs.length < 2) {
      console.error('Error: --compare requires two directories (before and after)');
      process.exit(1);
    }

    const [beforeDir, afterDir] = dirs;
    const outputPath = outputFlag ? outputFlag.split('=')[1] : 'comparison-report.html';

    console.log(`Comparing screenshots...`);
    console.log(`Before: ${beforeDir}`);
    console.log(`After: ${afterDir}`);

    const result = generateComparisonReport(beforeDir, afterDir, { outputPath });

    fs.writeFileSync(path.resolve(outputPath), result.html);
    console.log(`\nReport saved to: ${outputPath}`);
    console.log(`Comparisons: ${result.stats.total}`);

    if (result.stats.beforeOnly.length > 0) {
      console.log(`Before only: ${result.stats.beforeOnly.join(', ')}`);
    }
    if (result.stats.afterOnly.length > 0) {
      console.log(`After only: ${result.stats.afterOnly.join(', ')}`);
    }

  } else {
    // Capture plan mode
    const url = args.find(a => a.startsWith('http'));
    const outputDir = args.find(a => !a.startsWith('--') && !a.startsWith('http')) || './screenshots';

    if (!url) {
      console.log(`
Impression: Capture Screenshots
================================

Generate screenshot capture plans for design system comparisons.

Usage:
  # Generate capture plan for a URL
  node capture-screenshots.js <url> [output-dir]

  # Compare before/after screenshots
  node capture-screenshots.js --compare <before-dir> <after-dir> [--output=report.html]

Options:
  --label=NAME        Label for this capture session
  --pages=home,about  Pages to capture (comma-separated paths)
  --output=FILE       Output file for comparison report

Examples:
  # Generate capture plan
  node capture-screenshots.js https://example.com ./screenshots

  # With custom label
  node capture-screenshots.js https://example.com --label=before-redesign

  # Compare two capture sessions
  node capture-screenshots.js --compare ./before ./after --output=diff.html

Breakpoints captured:
  - mobile: 375x812
  - tablet: 768x1024
  - desktop: 1440x900
  - wide: 1920x1080

Elements captured:
  - header, hero, buttons, cards, footer

The generated plan includes Playwright MCP commands that can be executed
to capture the actual screenshots.
`);
      process.exit(1);
    }

    const label = labelFlag ? labelFlag.split('=')[1] : 'capture';
    const pages = pagesFlag
      ? pagesFlag.split('=')[1].split(',').map(p => ({ name: p, path: `/${p}` }))
      : [{ name: 'home', path: '/' }];

    console.log(`Generating capture plan for: ${url}`);

    const plan = generateCapturePlan(url, {
      outputDir,
      label,
      pages
    });

    // Output the plan
    console.log(`\n--- Capture Plan ---`);
    console.log(`URL: ${plan.summary.url}`);
    console.log(`Output: ${plan.outputDir}`);
    console.log(`Breakpoints: ${plan.summary.breakpoints}`);
    console.log(`Pages: ${plan.summary.pages}`);
    console.log(`Elements: ${plan.summary.elements}`);
    console.log(`Total screenshots: ${plan.summary.totalScreenshots}`);

    // Save manifest
    const manifestPath = path.join(outputDir, `${label}-manifest.json`);
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify(plan, null, 2));
    console.log(`\nManifest saved to: ${manifestPath}`);

    // Print Playwright commands
    console.log(`\n--- Playwright Commands ---`);
    console.log(`Execute these with Playwright MCP tools:\n`);

    for (const cmd of plan.commands.slice(0, 10)) {
      console.log(`// ${cmd.comment}`);
      console.log(`${cmd.tool}(${JSON.stringify(cmd.params)})`);
      console.log('');
    }

    if (plan.commands.length > 10) {
      console.log(`... and ${plan.commands.length - 10} more commands`);
      console.log(`See full manifest: ${manifestPath}`);
    }
  }
}
