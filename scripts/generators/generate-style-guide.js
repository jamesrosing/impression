#!/usr/bin/env node
/**
 * Generate Style Guide Documentation from Design System
 *
 * Features:
 * - Generate interactive HTML style guide
 * - Generate Markdown documentation
 * - Color swatches with contrast ratios
 * - Typography specimens
 * - Spacing scale visualization
 * - Animation previews
 *
 * Usage:
 *   node generate-style-guide.js <design-system.json> [output] [--format=html|md]
 *   node generate-style-guide.js references/linear.json style-guide.html
 *   node generate-style-guide.js references/vercel.json style-guide.md --format=md
 */

const fs = require('fs');
const path = require('path');

// ============ HTML TEMPLATE ============

const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{TITLE}} - Style Guide</title>
  <style>
    :root {
      --bg: #ffffff;
      --fg: #111827;
      --muted: #6b7280;
      --border: #e5e7eb;
      --accent: #3b82f6;
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
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.75rem; margin: 2.5rem 0 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    h3 { font-size: 1.25rem; margin: 1.5rem 0 0.75rem; color: var(--muted); }
    p { margin-bottom: 1rem; color: var(--muted); }
    .meta { color: var(--muted); font-size: 0.875rem; margin-bottom: 2rem; }
    .grid { display: grid; gap: 1rem; }
    .grid-2 { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
    .grid-3 { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
    .grid-4 { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); }
    .card {
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      overflow: hidden;
    }
    .swatch {
      height: 80px;
      display: flex;
      align-items: flex-end;
      padding: 0.5rem;
      font-size: 0.75rem;
      font-family: monospace;
    }
    .swatch-info {
      padding: 0.75rem;
      font-size: 0.875rem;
    }
    .swatch-name { font-weight: 600; }
    .swatch-value { color: var(--muted); font-family: monospace; font-size: 0.75rem; }
    .swatch-contrast { font-size: 0.7rem; margin-top: 0.25rem; }
    .font-specimen {
      padding: 1.5rem;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      margin-bottom: 1rem;
    }
    .font-name { font-size: 0.875rem; color: var(--muted); margin-bottom: 0.5rem; }
    .font-preview { font-size: 2rem; margin-bottom: 0.5rem; }
    .font-weights { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1rem; }
    .font-weight { font-size: 1rem; }
    .spacing-bar {
      background: var(--accent);
      height: 24px;
      border-radius: 2px;
      display: flex;
      align-items: center;
      padding-left: 0.5rem;
      color: white;
      font-size: 0.75rem;
      font-family: monospace;
    }
    .spacing-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }
    .spacing-label {
      width: 60px;
      font-family: monospace;
      font-size: 0.875rem;
      color: var(--muted);
    }
    .radius-preview {
      width: 80px;
      height: 80px;
      background: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.75rem;
      font-family: monospace;
    }
    .shadow-preview {
      width: 100%;
      height: 60px;
      background: var(--bg);
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      color: var(--muted);
    }
    .animation-preview {
      padding: 1rem;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      margin-bottom: 0.5rem;
    }
    .animation-name { font-weight: 600; margin-bottom: 0.25rem; }
    .animation-value { font-family: monospace; font-size: 0.75rem; color: var(--muted); }
    .animation-demo {
      width: 40px;
      height: 40px;
      background: var(--accent);
      border-radius: 0.25rem;
      margin-top: 0.5rem;
    }
    .breakpoint-bar {
      background: linear-gradient(90deg, var(--accent), transparent);
      height: 8px;
      border-radius: 4px;
      margin-bottom: 0.25rem;
    }
    .code {
      background: var(--border);
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      font-family: monospace;
      font-size: 0.875rem;
    }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border); }
    th { font-weight: 600; background: var(--border); }
    .pass { color: #10b981; }
    .fail { color: #ef4444; }
  </style>
</head>
<body>
  <h1>{{TITLE}}</h1>
  <p class="meta">Generated from {{SOURCE}} on {{DATE}}</p>

  {{CONTENT}}

  <footer style="margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--border); color: var(--muted); font-size: 0.875rem;">
    Generated by <a href="https://github.com/jamesrosing/impression" style="color: var(--accent);">Impression</a>
  </footer>
</body>
</html>`;

// ============ CONTENT GENERATORS ============

function getContrastRatio(hex1, hex2) {
  const getLuminance = (hex) => {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const toLinear = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  };

  try {
    const l1 = getLuminance(hex1);
    const l2 = getLuminance(hex2);
    return ((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2);
  } catch (e) {
    return 'N/A';
  }
}

function generateColorsHTML(colors) {
  if (!colors) return '';

  let html = '<h2>Colors</h2>';

  // Semantic colors
  if (colors.semantic) {
    html += '<h3>Semantic Colors</h3>';
    html += '<div class="grid grid-3">';

    const semanticColors = [];

    // Handle new semantic structure
    if (colors.semantic.primary) {
      semanticColors.push({ name: 'Primary', value: colors.semantic.primary });
    }
    if (colors.semantic.secondary) {
      semanticColors.push({ name: 'Secondary', value: colors.semantic.secondary });
    }
    if (colors.semantic.accent) {
      semanticColors.push({ name: 'Accent', value: colors.semantic.accent });
    }
    if (colors.semantic.success) {
      semanticColors.push({ name: 'Success', value: colors.semantic.success });
    }
    if (colors.semantic.warning) {
      semanticColors.push({ name: 'Warning', value: colors.semantic.warning });
    }
    if (colors.semantic.error) {
      semanticColors.push({ name: 'Error', value: colors.semantic.error });
    }
    if (colors.semantic.info) {
      semanticColors.push({ name: 'Info', value: colors.semantic.info });
    }

    // Handle legacy semantic structure
    if (colors.semantic.backgrounds) {
      colors.semantic.backgrounds.forEach((c, i) => {
        semanticColors.push({ name: `Background ${i + 1}`, value: c.value });
      });
    }
    if (colors.semantic.text) {
      colors.semantic.text.forEach((c, i) => {
        semanticColors.push({ name: `Text ${i + 1}`, value: c.value });
      });
    }
    if (colors.semantic.accents) {
      colors.semantic.accents.forEach((c, i) => {
        semanticColors.push({ name: `Accent ${i + 1}`, value: c.value });
      });
    }

    // Handle nested background/foreground
    if (colors.semantic.background) {
      Object.entries(colors.semantic.background).forEach(([key, value]) => {
        if (value) semanticColors.push({ name: `BG ${key}`, value });
      });
    }
    if (colors.semantic.foreground) {
      Object.entries(colors.semantic.foreground).forEach(([key, value]) => {
        if (value) semanticColors.push({ name: `FG ${key}`, value });
      });
    }

    for (const { name, value } of semanticColors) {
      if (!value) continue;
      const textColor = getContrastRatio(value, '#ffffff') > 4.5 ? '#ffffff' : '#000000';
      const contrast = getContrastRatio(value, '#ffffff');
      html += `
        <div class="card">
          <div class="swatch" style="background: ${value}; color: ${textColor};">${value}</div>
          <div class="swatch-info">
            <div class="swatch-name">${name}</div>
            <div class="swatch-contrast">Contrast on white: ${contrast}:1</div>
          </div>
        </div>`;
    }
    html += '</div>';
  }

  // Palette
  if (colors.palette && colors.palette.length > 0) {
    html += '<h3>Color Palette</h3>';
    html += '<div class="grid grid-4">';
    for (const color of colors.palette.slice(0, 24)) {
      const value = color.value || color;
      const textColor = getContrastRatio(value, '#ffffff') > 4.5 ? '#ffffff' : '#000000';
      html += `
        <div class="card">
          <div class="swatch" style="background: ${value}; color: ${textColor};">${value}</div>
          <div class="swatch-info">
            <div class="swatch-value">${color.count ? `Used ${color.count}x` : ''}</div>
          </div>
        </div>`;
    }
    html += '</div>';
  }

  // CSS Variables
  if (colors.cssVariables && Object.keys(colors.cssVariables).length > 0) {
    html += '<h3>CSS Variables</h3>';
    html += '<table><tr><th>Variable</th><th>Value</th><th>Preview</th></tr>';
    for (const [name, value] of Object.entries(colors.cssVariables).slice(0, 20)) {
      html += `
        <tr>
          <td><code class="code">--${name}</code></td>
          <td><code class="code">${value}</code></td>
          <td><div style="width: 24px; height: 24px; background: ${value}; border-radius: 4px; border: 1px solid var(--border);"></div></td>
        </tr>`;
    }
    html += '</table>';
  }

  return html;
}

function generateTypographyHTML(typography) {
  if (!typography) return '';

  let html = '<h2>Typography</h2>';

  // Font families
  if (typography.fontFamilies && typography.fontFamilies.length > 0) {
    html += '<h3>Font Families</h3>';
    for (const font of typography.fontFamilies) {
      const family = typeof font === 'string' ? font : font.family;
      const weights = font.weights || typography.fontWeights || [400, 500, 600, 700];
      html += `
        <div class="font-specimen">
          <div class="font-name">${family}</div>
          <div class="font-preview" style="font-family: '${family}', system-ui;">
            The quick brown fox jumps over the lazy dog
          </div>
          <div class="font-weights">
            ${weights.map(w => `<span class="font-weight" style="font-family: '${family}', system-ui; font-weight: ${w};">${w}</span>`).join('')}
          </div>
        </div>`;
    }
  }

  // Font sizes
  if (typography.fontSizes && typography.fontSizes.length > 0) {
    html += '<h3>Font Size Scale</h3>';
    html += '<table><tr><th>Size</th><th>Preview</th></tr>';
    const sizes = [...new Set(typography.fontSizes)].sort((a, b) => parseFloat(a) - parseFloat(b));
    for (const size of sizes.slice(0, 12)) {
      html += `
        <tr>
          <td><code class="code">${size}</code></td>
          <td style="font-size: ${size};">Sample Text</td>
        </tr>`;
    }
    html += '</table>';
  }

  // Line heights
  if (typography.lineHeights && typography.lineHeights.length > 0) {
    html += '<h3>Line Heights</h3>';
    html += '<div class="grid grid-4">';
    for (const lh of [...new Set(typography.lineHeights)].slice(0, 8)) {
      html += `<div class="code">${lh}</div>`;
    }
    html += '</div>';
  }

  return html;
}

function generateSpacingHTML(spacing) {
  if (!spacing || !spacing.scale || spacing.scale.length === 0) return '';

  let html = '<h2>Spacing</h2>';
  html += '<h3>Spacing Scale</h3>';

  const scale = [...new Set(spacing.scale)].sort((a, b) => parseFloat(a) - parseFloat(b));

  for (const value of scale.slice(0, 16)) {
    const numValue = parseFloat(value);
    const width = Math.min(numValue * 4, 400);
    html += `
      <div class="spacing-row">
        <span class="spacing-label">${value}${typeof value === 'number' ? 'px' : ''}</span>
        <div class="spacing-bar" style="width: ${width}px;">${value}</div>
      </div>`;
  }

  return html;
}

function generateBorderRadiusHTML(borderRadius) {
  if (!borderRadius || borderRadius.length === 0) return '';

  let html = '<h2>Border Radius</h2>';
  html += '<div class="grid grid-4">';

  const radii = [...new Set(borderRadius.map(r => r.value || r))];

  for (const radius of radii) {
    html += `
      <div class="card" style="padding: 1rem; text-align: center;">
        <div class="radius-preview" style="border-radius: ${radius}; margin: 0 auto;">${radius}</div>
      </div>`;
  }

  html += '</div>';
  return html;
}

function generateEffectsHTML(effects) {
  if (!effects) return '';

  let html = '';

  // Box shadows
  if (effects.boxShadows && effects.boxShadows.length > 0) {
    html += '<h2>Shadows</h2>';
    html += '<div class="grid grid-2">';
    for (const shadow of effects.boxShadows.slice(0, 8)) {
      html += `
        <div class="card" style="padding: 1rem;">
          <div class="shadow-preview" style="box-shadow: ${shadow};">${shadow.slice(0, 30)}...</div>
        </div>`;
    }
    html += '</div>';
  }

  return html;
}

function generateAnimationsHTML(animations) {
  if (!animations) return '';

  let html = '<h2>Animations</h2>';

  // Durations
  if (animations.durations && animations.durations.length > 0) {
    html += '<h3>Durations</h3>';
    html += '<div class="grid grid-4">';
    for (const d of [...new Set(animations.durations)].slice(0, 8)) {
      html += `<div class="code">${d}</div>`;
    }
    html += '</div>';
  }

  // Easing functions
  if (animations.easings && animations.easings.length > 0) {
    html += '<h3>Easing Functions</h3>';
    for (const easing of animations.easings.slice(0, 6)) {
      const value = easing.value || easing;
      const name = easing.name || value;
      html += `
        <div class="animation-preview">
          <div class="animation-name">${name}</div>
          <div class="animation-value">${value}</div>
          <div class="animation-demo" style="animation: slideIn 1s ${value} infinite alternate;"></div>
        </div>`;
    }
    html += `
      <style>
        @keyframes slideIn {
          from { transform: translateX(0); }
          to { transform: translateX(100px); }
        }
      </style>`;
  }

  return html;
}

function generateLayoutHTML(layout) {
  if (!layout) return '';

  let html = '';

  // Breakpoints
  if (layout.breakpoints && layout.breakpoints.length > 0) {
    html += '<h2>Breakpoints</h2>';
    html += '<table><tr><th>Name</th><th>Value</th><th>Width</th></tr>';

    const sorted = [...layout.breakpoints].sort((a, b) => {
      const aVal = parseInt(a.value || a);
      const bVal = parseInt(b.value || b);
      return aVal - bVal;
    });

    for (const bp of sorted) {
      const value = bp.value || bp;
      const name = bp.name || value;
      const numVal = parseInt(value);
      const width = Math.min(numVal / 4, 300);
      html += `
        <tr>
          <td>${name}</td>
          <td><code class="code">${value}</code></td>
          <td><div class="breakpoint-bar" style="width: ${width}px;"></div></td>
        </tr>`;
    }
    html += '</table>';
  }

  // Container widths
  if (layout.containerWidths && layout.containerWidths.length > 0) {
    html += '<h3>Container Widths</h3>';
    html += '<div class="grid grid-4">';
    for (const w of layout.containerWidths) {
      html += `<div class="code">${w}</div>`;
    }
    html += '</div>';
  }

  return html;
}

function generateHTML(designSystem) {
  const title = designSystem.meta?.siteName || designSystem.meta?.url || 'Design System';
  const source = designSystem.meta?.url || 'Unknown';
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  let content = '';
  content += generateColorsHTML(designSystem.colors);
  content += generateTypographyHTML(designSystem.typography);
  content += generateSpacingHTML(designSystem.spacing);
  content += generateBorderRadiusHTML(designSystem.borderRadius);
  content += generateEffectsHTML(designSystem.effects);
  content += generateAnimationsHTML(designSystem.animations);
  content += generateLayoutHTML(designSystem.layout);

  return HTML_TEMPLATE
    .replace(/\{\{TITLE\}\}/g, title)
    .replace('{{SOURCE}}', source)
    .replace('{{DATE}}', date)
    .replace('{{CONTENT}}', content);
}

// ============ MARKDOWN GENERATOR ============

function generateMarkdown(designSystem) {
  const title = designSystem.meta?.siteName || designSystem.meta?.url || 'Design System';
  const source = designSystem.meta?.url || 'Unknown';
  const date = new Date().toISOString().split('T')[0];

  let md = `# ${title} - Style Guide\n\n`;
  md += `> Generated from ${source} on ${date}\n\n`;

  // Colors
  if (designSystem.colors) {
    md += `## Colors\n\n`;

    if (designSystem.colors.semantic) {
      md += `### Semantic Colors\n\n`;
      md += `| Name | Value | Usage |\n`;
      md += `|------|-------|-------|\n`;

      const semantic = designSystem.colors.semantic;
      if (semantic.primary) md += `| Primary | \`${semantic.primary}\` | Main brand color |\n`;
      if (semantic.secondary) md += `| Secondary | \`${semantic.secondary}\` | Secondary actions |\n`;
      if (semantic.accent) md += `| Accent | \`${semantic.accent}\` | Highlights |\n`;
      if (semantic.success) md += `| Success | \`${semantic.success}\` | Success states |\n`;
      if (semantic.warning) md += `| Warning | \`${semantic.warning}\` | Warning states |\n`;
      if (semantic.error) md += `| Error | \`${semantic.error}\` | Error states |\n`;
      if (semantic.info) md += `| Info | \`${semantic.info}\` | Informational |\n`;

      md += `\n`;
    }

    if (designSystem.colors.palette && designSystem.colors.palette.length > 0) {
      md += `### Color Palette\n\n`;
      md += `| Color | Count |\n`;
      md += `|-------|-------|\n`;
      for (const color of designSystem.colors.palette.slice(0, 20)) {
        const value = color.value || color;
        const count = color.count || '-';
        md += `| \`${value}\` | ${count} |\n`;
      }
      md += `\n`;
    }
  }

  // Typography
  if (designSystem.typography) {
    md += `## Typography\n\n`;

    if (designSystem.typography.fontFamilies && designSystem.typography.fontFamilies.length > 0) {
      md += `### Font Families\n\n`;
      for (const font of designSystem.typography.fontFamilies) {
        const family = typeof font === 'string' ? font : font.family;
        md += `- **${family}**\n`;
      }
      md += `\n`;
    }

    if (designSystem.typography.fontSizes && designSystem.typography.fontSizes.length > 0) {
      md += `### Font Sizes\n\n`;
      const sizes = [...new Set(designSystem.typography.fontSizes)].sort((a, b) => parseFloat(a) - parseFloat(b));
      md += sizes.slice(0, 12).map(s => `\`${s}\``).join(' · ') + '\n\n';
    }

    if (designSystem.typography.fontWeights && designSystem.typography.fontWeights.length > 0) {
      md += `### Font Weights\n\n`;
      md += designSystem.typography.fontWeights.map(w => `\`${w}\``).join(' · ') + '\n\n';
    }
  }

  // Spacing
  if (designSystem.spacing && designSystem.spacing.scale && designSystem.spacing.scale.length > 0) {
    md += `## Spacing\n\n`;
    const scale = [...new Set(designSystem.spacing.scale)].sort((a, b) => parseFloat(a) - parseFloat(b));
    md += `| Value | Pixels |\n`;
    md += `|-------|--------|\n`;
    for (const s of scale.slice(0, 16)) {
      const px = typeof s === 'number' ? s : parseFloat(s);
      md += `| \`${s}\` | ${px}px |\n`;
    }
    md += `\n`;
  }

  // Border Radius
  if (designSystem.borderRadius && designSystem.borderRadius.length > 0) {
    md += `## Border Radius\n\n`;
    const radii = [...new Set(designSystem.borderRadius.map(r => r.value || r))];
    md += radii.map(r => `\`${r}\``).join(' · ') + '\n\n';
  }

  // Animations
  if (designSystem.animations) {
    md += `## Animations\n\n`;

    if (designSystem.animations.durations && designSystem.animations.durations.length > 0) {
      md += `### Durations\n\n`;
      md += [...new Set(designSystem.animations.durations)].slice(0, 8).map(d => `\`${d}\``).join(' · ') + '\n\n';
    }

    if (designSystem.animations.easings && designSystem.animations.easings.length > 0) {
      md += `### Easing Functions\n\n`;
      md += `| Name | Value |\n`;
      md += `|------|-------|\n`;
      for (const e of designSystem.animations.easings.slice(0, 8)) {
        const name = e.name || 'Custom';
        const value = e.value || e;
        md += `| ${name} | \`${value}\` |\n`;
      }
      md += `\n`;
    }
  }

  // Layout
  if (designSystem.layout && designSystem.layout.breakpoints && designSystem.layout.breakpoints.length > 0) {
    md += `## Layout\n\n`;
    md += `### Breakpoints\n\n`;
    md += `| Name | Value |\n`;
    md += `|------|-------|\n`;

    const sorted = [...designSystem.layout.breakpoints].sort((a, b) => {
      const aVal = parseInt(a.value || a);
      const bVal = parseInt(b.value || b);
      return aVal - bVal;
    });

    for (const bp of sorted) {
      const name = bp.name || '-';
      const value = bp.value || bp;
      md += `| ${name} | \`${value}\` |\n`;
    }
    md += `\n`;
  }

  md += `---\n\n*Generated by [Impression](https://github.com/jamesrosing/impression)*\n`;

  return md;
}

// ============ MAIN ============

function generateStyleGuide(designSystemPath, outputPath, options = {}) {
  const { format = 'html' } = options;

  const designSystem = JSON.parse(fs.readFileSync(designSystemPath, 'utf-8'));

  let content;
  let extension;

  if (format === 'md' || format === 'markdown') {
    content = generateMarkdown(designSystem);
    extension = '.md';
  } else {
    content = generateHTML(designSystem);
    extension = '.html';
  }

  if (outputPath) {
    // Add extension if not present
    if (!outputPath.endsWith(extension) && !outputPath.endsWith('.html') && !outputPath.endsWith('.md')) {
      outputPath += extension;
    }
    fs.writeFileSync(outputPath, content);
  }

  return { content, format, outputPath };
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node generate-style-guide.js <design-system.json> [output] [--format=html|md]');
    console.error('');
    console.error('Example:');
    console.error('  node generate-style-guide.js references/linear.json style-guide.html');
    console.error('  node generate-style-guide.js references/linear.json style-guide.md --format=md');
    process.exit(1);
  }

  const designSystemPath = path.resolve(args[0]);
  let outputPath = null;
  let format = 'html';

  for (const arg of args.slice(1)) {
    if (arg.startsWith('--format=')) {
      format = arg.split('=')[1];
    } else if (!arg.startsWith('--')) {
      outputPath = path.resolve(arg);
    }
  }

  if (!fs.existsSync(designSystemPath)) {
    console.error(`Error: Design system file not found: ${designSystemPath}`);
    process.exit(1);
  }

  try {
    const result = generateStyleGuide(designSystemPath, outputPath, { format });

    if (outputPath) {
      console.log(`✓ Generated ${result.format.toUpperCase()} style guide`);
      console.log(`  Output: ${result.outputPath}`);
    } else {
      console.log(result.content);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  generateStyleGuide,
  generateHTML,
  generateMarkdown,
};
