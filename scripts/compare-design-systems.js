#!/usr/bin/env node
/**
 * Compare Project Styles Against Reference Design System
 * 
 * Usage:
 *   node compare-design-systems.js <project-path> <reference.json> [output.md]
 *   node compare-design-systems.js /path/to/project examples/extracted/duchateau.json
 * 
 * Auto-detects: Tailwind config, CSS variables, CSS files
 * Outputs: Markdown comparison report with similarity scores
 */

const fs = require('fs');
const path = require('path');

// ============ COLOR UTILITIES ============

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToLab(rgb) {
  // Convert RGB to XYZ
  let r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
  
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  
  const fx = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
  const fy = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
  const fz = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;
  
  return {
    l: (116 * fy) - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz)
  };
}

function deltaE(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return Infinity;
  
  const lab1 = rgbToLab(rgb1);
  const lab2 = rgbToLab(rgb2);
  
  return Math.sqrt(
    Math.pow(lab2.l - lab1.l, 2) +
    Math.pow(lab2.a - lab1.a, 2) +
    Math.pow(lab2.b - lab1.b, 2)
  );
}

function normalizeColor(color) {
  if (!color) return null;
  color = color.trim().toLowerCase();
  
  // Handle rgb/rgba
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
  
  // Handle hex
  if (color.startsWith('#')) {
    if (color.length === 4) {
      return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    }
    return color.slice(0, 7);
  }
  
  // Named colors (common ones)
  const named = {
    white: '#ffffff', black: '#000000', red: '#ff0000',
    green: '#00ff00', blue: '#0000ff', transparent: null
  };
  return named[color] || null;
}

// ============ PROJECT STYLE EXTRACTION ============

function detectProjectType(projectPath) {
  const files = fs.readdirSync(projectPath);
  
  if (files.some(f => f.match(/tailwind\.config\.(js|ts|mjs|cjs)$/))) {
    return 'tailwind';
  }
  
  const pkgPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps['styled-components'] || deps['@emotion/react'] || deps['@emotion/styled']) {
      return 'css-in-js';
    }
  }
  
  return 'css';
}

function extractTailwindConfig(projectPath) {
  const configFiles = ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs', 'tailwind.config.cjs'];
  let configPath = null;
  
  for (const file of configFiles) {
    const fullPath = path.join(projectPath, file);
    if (fs.existsSync(fullPath)) {
      configPath = fullPath;
      break;
    }
  }
  
  if (!configPath) return null;
  
  const content = fs.readFileSync(configPath, 'utf-8');
  const extracted = { colors: {}, fonts: [], spacing: [], borderRadius: [], shadows: [] };
  
  // Extract colors (handles nested objects)
  const colorMatches = content.matchAll(/['"]?([\w-]+)['"]?\s*:\s*['"]?(#[a-fA-F0-9]{3,8}|rgb[a]?\([^)]+\))['"]?/g);
  for (const match of colorMatches) {
    const normalized = normalizeColor(match[2]);
    if (normalized) extracted.colors[match[1]] = normalized;
  }
  
  // Extract font families
  const fontMatches = content.matchAll(/fontFamily\s*:\s*\{([^}]+)\}/gs);
  for (const match of fontMatches) {
    const fonts = match[1].matchAll(/['"]([^'"]+)['"]/g);
    for (const font of fonts) {
      if (!font[1].includes('system') && !font[1].includes('sans-serif')) {
        extracted.fonts.push(font[1]);
      }
    }
  }
  
  // Extract spacing values
  const spacingMatches = content.matchAll(/spacing\s*:\s*\{([^}]+)\}/gs);
  for (const match of spacingMatches) {
    const values = match[1].matchAll(/['"]?([\d.]+(?:px|rem|em)?)['"]/g);
    for (const val of values) {
      extracted.spacing.push(val[1]);
    }
  }
  
  // Extract border radius
  const radiusMatches = content.matchAll(/borderRadius\s*:\s*\{([^}]+)\}/gs);
  for (const match of radiusMatches) {
    const values = match[1].matchAll(/['"]?([\d.]+(?:px|rem|em)?)['"]/g);
    for (const val of values) {
      extracted.borderRadius.push(val[1]);
    }
  }
  
  return extracted;
}

function extractCSSVariables(projectPath) {
  const extracted = { colors: {}, fonts: [], spacing: [], borderRadius: [], shadows: [] };
  
  // Find CSS files
  const findCSS = (dir, files = []) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        findCSS(fullPath, files);
      } else if (entry.name.match(/\.(css|scss|sass)$/)) {
        files.push(fullPath);
      }
    }
    return files;
  };
  
  const cssFiles = findCSS(projectPath);
  
  for (const file of cssFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Extract CSS variables from :root
    const rootMatch = content.match(/:root\s*\{([^}]+)\}/s);
    if (rootMatch) {
      const vars = rootMatch[1].matchAll(/--([^:]+):\s*([^;]+);/g);
      for (const v of vars) {
        const name = v[1].trim();
        const value = v[2].trim();
        
        if (name.includes('color') || name.includes('bg') || name.includes('text') || name.includes('border')) {
          const normalized = normalizeColor(value);
          if (normalized) extracted.colors[name] = normalized;
        } else if (name.includes('font') && !name.includes('size')) {
          extracted.fonts.push(value.replace(/['"]/g, '').split(',')[0].trim());
        } else if (name.includes('spacing') || name.includes('gap') || name.includes('margin') || name.includes('padding')) {
          extracted.spacing.push(value);
        } else if (name.includes('radius')) {
          extracted.borderRadius.push(value);
        } else if (name.includes('shadow')) {
          extracted.shadows.push(value);
        }
      }
    }
    
    // Extract inline colors
    const colorMatches = content.matchAll(/(#[a-fA-F0-9]{3,8}|rgb[a]?\([^)]+\))/g);
    for (const match of colorMatches) {
      const normalized = normalizeColor(match[1]);
      if (normalized && !Object.values(extracted.colors).includes(normalized)) {
        extracted.colors[`inline-${Object.keys(extracted.colors).length}`] = normalized;
      }
    }
  }
  
  return extracted;
}

function extractProjectStyles(projectPath) {
  const type = detectProjectType(projectPath);
  
  switch (type) {
    case 'tailwind':
      return { type, styles: extractTailwindConfig(projectPath) };
    case 'css':
    case 'css-in-js':
      return { type, styles: extractCSSVariables(projectPath) };
    default:
      return { type: 'unknown', styles: null };
  }
}

// ============ COMPARISON ALGORITHMS ============

function compareColors(projectColors, referenceColors) {
  const results = { exact: [], similar: [], missing: [], extra: [], score: 0 };
  
  const refPalette = referenceColors.palette?.map(c => c.value) || [];
  const refSemantic = [
    ...(referenceColors.semantic?.backgrounds?.map(c => c.value) || []),
    ...(referenceColors.semantic?.text?.map(c => c.value) || []),
    ...(referenceColors.semantic?.borders?.map(c => c.value) || []),
    ...(referenceColors.semantic?.accents?.map(c => c.value) || [])
  ];
  const allRefColors = [...new Set([...refPalette, ...refSemantic])].filter(Boolean);
  
  const projectColorValues = Object.values(projectColors).filter(Boolean);
  const matchedRef = new Set();
  
  for (const projColor of projectColorValues) {
    let found = false;
    
    // Check exact match
    for (const refColor of allRefColors) {
      if (projColor.toLowerCase() === refColor.toLowerCase()) {
        results.exact.push({ project: projColor, reference: refColor });
        matchedRef.add(refColor);
        found = true;
        break;
      }
    }
    
    if (!found) {
      // Check similar (ΔE < 5)
      for (const refColor of allRefColors) {
        if (matchedRef.has(refColor)) continue;
        const de = deltaE(projColor, refColor);
        if (de < 5) {
          results.similar.push({ project: projColor, reference: refColor, deltaE: de.toFixed(2) });
          matchedRef.add(refColor);
          found = true;
          break;
        }
      }
    }
    
    if (!found) {
      results.extra.push(projColor);
    }
  }
  
  // Find missing reference colors
  for (const refColor of allRefColors) {
    if (!matchedRef.has(refColor)) {
      results.missing.push(refColor);
    }
  }
  
  // Calculate score
  const total = allRefColors.length || 1;
  results.score = Math.round(((results.exact.length + results.similar.length * 0.8) / total) * 100);
  
  return results;
}

function compareTypography(projectFonts, referenceTypography) {
  const results = { matched: [], missing: [], extra: [], score: 0 };
  
  const refFonts = referenceTypography.fontFamilies?.map(f => f.family.toLowerCase()) || [];
  const projFonts = projectFonts.map(f => f.toLowerCase());
  
  for (const proj of projFonts) {
    const match = refFonts.find(ref => 
      ref.includes(proj) || proj.includes(ref) ||
      ref.split(' ')[0] === proj.split(' ')[0]
    );
    if (match) {
      results.matched.push({ project: proj, reference: match });
    } else {
      results.extra.push(proj);
    }
  }
  
  for (const ref of refFonts) {
    if (!results.matched.find(m => m.reference === ref)) {
      results.missing.push(ref);
    }
  }
  
  const total = refFonts.length || 1;
  results.score = Math.round((results.matched.length / total) * 100);
  
  return results;
}

function compareSpacing(projectSpacing, referenceSpacing) {
  const results = { matched: [], close: [], missing: [], extra: [], score: 0 };
  
  const parseValue = (v) => {
    if (typeof v === 'number') return v;
    const match = String(v).match(/([\d.]+)/);
    return match ? parseFloat(match[1]) : null;
  };
  
  const refScale = referenceSpacing.scale?.map(parseValue).filter(v => v !== null) || [];
  const projScale = projectSpacing.map(parseValue).filter(v => v !== null);
  
  const matchedRef = new Set();
  
  for (const proj of projScale) {
    let found = false;
    
    // Exact match
    for (const ref of refScale) {
      if (proj === ref) {
        results.matched.push({ project: `${proj}px`, reference: `${ref}px` });
        matchedRef.add(ref);
        found = true;
        break;
      }
    }
    
    if (!found) {
      // Close match (within 2px)
      for (const ref of refScale) {
        if (matchedRef.has(ref)) continue;
        if (Math.abs(proj - ref) <= 2) {
          results.close.push({ project: `${proj}px`, reference: `${ref}px`, diff: `${Math.abs(proj - ref)}px` });
          matchedRef.add(ref);
          found = true;
          break;
        }
      }
    }
    
    if (!found) {
      results.extra.push(`${proj}px`);
    }
  }
  
  for (const ref of refScale) {
    if (!matchedRef.has(ref)) {
      results.missing.push(`${ref}px`);
    }
  }
  
  const total = refScale.length || 1;
  results.score = Math.round(((results.matched.length + results.close.length * 0.7) / total) * 100);
  
  return results;
}

function compareBorderRadius(projectRadius, referenceRadius) {
  const results = { matched: [], missing: [], extra: [], score: 0 };
  
  const parseValue = (v) => {
    if (typeof v === 'object') return parseFloat(v.value) || null;
    const match = String(v).match(/([\d.]+)/);
    return match ? parseFloat(match[1]) : null;
  };
  
  const refValues = referenceRadius?.map(parseValue).filter(v => v !== null) || [];
  const projValues = projectRadius.map(parseValue).filter(v => v !== null);
  
  for (const proj of projValues) {
    if (refValues.includes(proj)) {
      results.matched.push(`${proj}px`);
    } else {
      results.extra.push(`${proj}px`);
    }
  }
  
  for (const ref of refValues) {
    if (!projValues.includes(ref)) {
      results.missing.push(`${ref}px`);
    }
  }
  
  const total = refValues.length || 1;
  results.score = Math.round((results.matched.length / total) * 100);
  
  return results;
}

// ============ REPORT GENERATION ============

function generateReport(projectPath, reference, projectType, comparisons) {
  const lines = [];
  const overallScore = Math.round(
    (comparisons.colors.score + comparisons.typography.score + 
     comparisons.spacing.score + comparisons.borderRadius.score) / 4
  );
  
  lines.push(`# Design System Comparison Report`);
  lines.push('');
  lines.push(`**Project:** \`${projectPath}\``);
  lines.push(`**Reference:** ${reference.meta?.url || 'Unknown'}`);
  lines.push(`**Project Type:** ${projectType}`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`## Overall Alignment Score: ${overallScore}%`);
  lines.push('');
  lines.push(`| Category | Score | Status |`);
  lines.push(`|----------|-------|--------|`);
  lines.push(`| Colors | ${comparisons.colors.score}% | ${comparisons.colors.score >= 80 ? '✅' : comparisons.colors.score >= 50 ? '⚠️' : '❌'} |`);
  lines.push(`| Typography | ${comparisons.typography.score}% | ${comparisons.typography.score >= 80 ? '✅' : comparisons.typography.score >= 50 ? '⚠️' : '❌'} |`);
  lines.push(`| Spacing | ${comparisons.spacing.score}% | ${comparisons.spacing.score >= 80 ? '✅' : comparisons.spacing.score >= 50 ? '⚠️' : '❌'} |`);
  lines.push(`| Border Radius | ${comparisons.borderRadius.score}% | ${comparisons.borderRadius.score >= 80 ? '✅' : comparisons.borderRadius.score >= 50 ? '⚠️' : '❌'} |`);
  lines.push('');
  
  // Colors section
  lines.push(`## Colors (${comparisons.colors.score}%)`);
  lines.push('');
  
  if (comparisons.colors.exact.length) {
    lines.push(`### ✅ Exact Matches (${comparisons.colors.exact.length})`);
    lines.push('');
    comparisons.colors.exact.forEach(c => {
      lines.push(`- \`${c.project}\``);
    });
    lines.push('');
  }
  
  if (comparisons.colors.similar.length) {
    lines.push(`### ⚠️ Similar Colors (${comparisons.colors.similar.length})`);
    lines.push('');
    lines.push(`| Project | Reference | ΔE |`);
    lines.push(`|---------|-----------|-----|`);
    comparisons.colors.similar.forEach(c => {
      lines.push(`| \`${c.project}\` | \`${c.reference}\` | ${c.deltaE} |`);
    });
    lines.push('');
  }
  
  if (comparisons.colors.missing.length) {
    lines.push(`### ❌ Missing from Project (${comparisons.colors.missing.length})`);
    lines.push('');
    comparisons.colors.missing.forEach(c => {
      lines.push(`- \`${c}\``);
    });
    lines.push('');
  }
  
  if (comparisons.colors.extra.length) {
    lines.push(`### ➕ Extra in Project (${comparisons.colors.extra.length})`);
    lines.push('');
    comparisons.colors.extra.slice(0, 10).forEach(c => {
      lines.push(`- \`${c}\``);
    });
    if (comparisons.colors.extra.length > 10) {
      lines.push(`- ... and ${comparisons.colors.extra.length - 10} more`);
    }
    lines.push('');
  }
  
  // Typography section
  lines.push(`## Typography (${comparisons.typography.score}%)`);
  lines.push('');
  
  if (comparisons.typography.matched.length) {
    lines.push(`### ✅ Matched Fonts`);
    lines.push('');
    comparisons.typography.matched.forEach(f => {
      lines.push(`- **${f.project}** → ${f.reference}`);
    });
    lines.push('');
  }
  
  if (comparisons.typography.missing.length) {
    lines.push(`### ❌ Missing Fonts`);
    lines.push('');
    comparisons.typography.missing.forEach(f => {
      lines.push(`- ${f}`);
    });
    lines.push('');
  }
  
  // Spacing section
  lines.push(`## Spacing (${comparisons.spacing.score}%)`);
  lines.push('');
  
  if (comparisons.spacing.matched.length) {
    lines.push(`### ✅ Exact Matches: ${comparisons.spacing.matched.map(m => m.project).join(', ')}`);
    lines.push('');
  }
  
  if (comparisons.spacing.close.length) {
    lines.push(`### ⚠️ Close Matches`);
    lines.push('');
    comparisons.spacing.close.forEach(s => {
      lines.push(`- ${s.project} → ${s.reference} (off by ${s.diff})`);
    });
    lines.push('');
  }
  
  if (comparisons.spacing.missing.length) {
    lines.push(`### ❌ Missing: ${comparisons.spacing.missing.join(', ')}`);
    lines.push('');
  }
  
  // Border Radius section
  lines.push(`## Border Radius (${comparisons.borderRadius.score}%)`);
  lines.push('');
  
  if (comparisons.borderRadius.matched.length) {
    lines.push(`### ✅ Matched: ${comparisons.borderRadius.matched.join(', ')}`);
    lines.push('');
  }
  
  if (comparisons.borderRadius.missing.length) {
    lines.push(`### ❌ Missing: ${comparisons.borderRadius.missing.join(', ')}`);
    lines.push('');
  }
  
  // Recommendations
  lines.push(`## Recommendations`);
  lines.push('');
  
  const recommendations = [];
  
  if (comparisons.colors.score < 80) {
    recommendations.push(`1. **Update color palette** - ${comparisons.colors.missing.length} reference colors are missing`);
  }
  if (comparisons.typography.score < 80) {
    recommendations.push(`${recommendations.length + 1}. **Install missing fonts** - Add: ${comparisons.typography.missing.join(', ')}`);
  }
  if (comparisons.spacing.score < 80) {
    recommendations.push(`${recommendations.length + 1}. **Align spacing scale** - Consider adopting reference spacing: ${comparisons.spacing.missing.slice(0, 5).join(', ')}`);
  }
  if (comparisons.borderRadius.score < 80) {
    recommendations.push(`${recommendations.length + 1}. **Update border radius tokens** - Missing: ${comparisons.borderRadius.missing.join(', ')}`);
  }
  
  if (recommendations.length === 0) {
    lines.push('Project is well-aligned with the reference design system! Minor tweaks may improve consistency further.');
  } else {
    lines.push(...recommendations);
  }
  
  lines.push('');
  lines.push('---');
  lines.push(`*Generated by design-system-extractor*`);
  
  return lines.join('\n');
}

// ============ MAIN ============

function compareDesignSystems(projectPath, referencePath) {
  // Load reference
  const reference = JSON.parse(fs.readFileSync(referencePath, 'utf-8'));
  
  // Extract project styles
  const { type: projectType, styles: projectStyles } = extractProjectStyles(projectPath);
  
  if (!projectStyles) {
    throw new Error(`Could not extract styles from project at ${projectPath}`);
  }
  
  // Run comparisons
  const comparisons = {
    colors: compareColors(projectStyles.colors || {}, reference.colors || {}),
    typography: compareTypography(projectStyles.fonts || [], reference.typography || {}),
    spacing: compareSpacing(projectStyles.spacing || [], reference.spacing || {}),
    borderRadius: compareBorderRadius(projectStyles.borderRadius || [], reference.borderRadius || [])
  };
  
  // Generate report
  const report = generateReport(projectPath, reference, projectType, comparisons);
  
  return { projectType, comparisons, report };
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node compare-design-systems.js <project-path> <reference.json> [output.md]');
    console.error('');
    console.error('Example:');
    console.error('  node compare-design-systems.js ./my-project examples/extracted/duchateau.json');
    console.error('  node compare-design-systems.js ./my-project examples/extracted/duchateau.json comparison-report.md');
    process.exit(1);
  }

  const projectPath = path.resolve(args[0]);
  const referencePath = path.resolve(args[1]);
  const outputPath = args[2];

  if (!fs.existsSync(projectPath)) {
    console.error(`Error: Project path not found: ${projectPath}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(referencePath)) {
    console.error(`Error: Reference file not found: ${referencePath}`);
    process.exit(1);
  }

  try {
    const { projectType, comparisons, report } = compareDesignSystems(projectPath, referencePath);
    
    console.log(`Detected project type: ${projectType}`);
    console.log(`Overall alignment: ${Math.round((comparisons.colors.score + comparisons.typography.score + comparisons.spacing.score + comparisons.borderRadius.score) / 4)}%`);
    console.log('');
    
    if (outputPath) {
      fs.writeFileSync(outputPath, report);
      console.log(`✓ Report saved to: ${outputPath}`);
    } else {
      console.log(report);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { compareDesignSystems, deltaE, normalizeColor };
