#!/usr/bin/env node
/**
 * Generate CSS Custom Properties from Extracted Design System
 * 
 * Usage:
 *   node generate-css-variables.js <input.json> [output.css]
 *   node generate-css-variables.js references/duchateau.json
 * 
 * If no output file specified, prints to stdout.
 */

const fs = require('fs');
const path = require('path');

function generateCSSVariables(designSystem) {
  const { meta, colors, typography, spacing, shadows, borderRadius, breakpoints, animations } = designSystem;
  
  const lines = [];
  
  // Header comment
  lines.push(`/**`);
  lines.push(` * Design System Variables`);
  lines.push(` * Source: ${meta?.url || 'unknown'}`);
  lines.push(` * Extracted: ${meta?.extractedAt || 'unknown'}`);
  if (meta?.designCharacter) {
    lines.push(` * Character: ${meta.designCharacter}`);
  }
  lines.push(` */`);
  lines.push('');
  lines.push(':root {');
  
  // ============ COLORS ============
  lines.push('  /* ========== Colors ========== */');
  lines.push('');
  
  // Palette colors with roles
  lines.push('  /* Palette */');
  colors.palette?.forEach((c, i) => {
    const name = c.role ? c.role.replace(/\s+/g, '-').toLowerCase() : `palette-${i + 1}`;
    lines.push(`  --color-${name}: ${c.value};`);
  });
  lines.push('');
  
  // Semantic colors
  if (colors.semantic) {
    lines.push('  /* Semantic - Backgrounds */');
    colors.semantic.backgrounds?.slice(0, 4).forEach((c, i) => {
      const suffix = i === 0 ? '' : `-${i + 1}`;
      lines.push(`  --color-bg${suffix}: ${c.value};`);
    });
    lines.push('');
    
    lines.push('  /* Semantic - Text */');
    colors.semantic.text?.slice(0, 4).forEach((c, i) => {
      const names = ['', '-secondary', '-muted', '-subtle'];
      lines.push(`  --color-text${names[i] || `-${i + 1}`}: ${c.value};`);
    });
    lines.push('');
    
    lines.push('  /* Semantic - Borders */');
    colors.semantic.borders?.slice(0, 3).forEach((c, i) => {
      const suffix = i === 0 ? '' : `-${i + 1}`;
      lines.push(`  --color-border${suffix}: ${c.value};`);
    });
    lines.push('');
    
    if (colors.semantic.accents?.length) {
      lines.push('  /* Semantic - Accents */');
      colors.semantic.accents.slice(0, 3).forEach((c, i) => {
        const suffix = i === 0 ? '' : `-${i + 1}`;
        lines.push(`  --color-accent${suffix}: ${c.value};`);
      });
      lines.push('');
    }
  }

  // ============ TYPOGRAPHY ============
  lines.push('  /* ========== Typography ========== */');
  lines.push('');
  
  // Font families
  lines.push('  /* Font Families */');
  typography.fontFamilies?.forEach(f => {
    const role = f.role || 'primary';
    const key = role.includes('serif') ? 'serif' : 
                role.includes('mono') ? 'mono' : 
                role.includes('display') ? 'display' :
                role.includes('ui') ? 'ui' : 'sans';
    lines.push(`  --font-${key}: "${f.family}", system-ui, sans-serif;`);
  });
  lines.push('');
  
  // Font sizes
  lines.push('  /* Font Sizes */');
  const sizeNames = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl'];
  typography.scale?.forEach((size, i) => {
    const name = sizeNames[i] || `${i + 1}`;
    lines.push(`  --font-size-${name}: ${size};`);
  });
  lines.push('');
  
  // Font weights
  lines.push('  /* Font Weights */');
  const weightNames = { '100': 'thin', '200': 'extralight', '300': 'light', '400': 'normal', 
                        '500': 'medium', '600': 'semibold', '700': 'bold', '800': 'extrabold', '900': 'black' };
  typography.fontWeights?.forEach(w => {
    const name = weightNames[w] || w;
    lines.push(`  --font-weight-${name}: ${w};`);
  });
  lines.push('');
  
  // Line heights
  if (typography.lineHeights?.length) {
    lines.push('  /* Line Heights */');
    const lhNames = ['tight', 'snug', 'normal', 'relaxed', 'loose'];
    typography.lineHeights.slice(0, 5).forEach((lh, i) => {
      if (lh.value !== 'normal') {
        lines.push(`  --line-height-${lhNames[i] || i + 1}: ${lh.value};`);
      }
    });
    lines.push('');
  }
  
  // Letter spacing
  if (typography.letterSpacing?.length) {
    lines.push('  /* Letter Spacing */');
    const lsNames = ['tighter', 'tight', 'normal', 'wide', 'wider'];
    typography.letterSpacing.slice(0, 5).forEach((ls, i) => {
      lines.push(`  --letter-spacing-${lsNames[i] || i + 1}: ${ls.value};`);
    });
    lines.push('');
  }

  // ============ SPACING ============
  lines.push('  /* ========== Spacing ========== */');
  lines.push('');
  
  spacing.scale?.forEach((s, i) => {
    const px = parseFloat(s);
    if (px > 0 && px <= 256) {
      lines.push(`  --spacing-${i + 1}: ${s};`);
    }
  });
  lines.push('');
  
  // Common spacing shortcuts
  const commonSpacing = spacing.scale?.slice(0, 8) || [];
  if (commonSpacing.length >= 4) {
    lines.push('  /* Spacing Shortcuts */');
    lines.push(`  --spacing-xs: ${commonSpacing[0]};`);
    lines.push(`  --spacing-sm: ${commonSpacing[1]};`);
    lines.push(`  --spacing-md: ${commonSpacing[2]};`);
    lines.push(`  --spacing-lg: ${commonSpacing[3]};`);
    if (commonSpacing[4]) lines.push(`  --spacing-xl: ${commonSpacing[4]};`);
    if (commonSpacing[5]) lines.push(`  --spacing-2xl: ${commonSpacing[5]};`);
    lines.push('');
  }

  // ============ BORDER RADIUS ============
  if (borderRadius?.length) {
    lines.push('  /* ========== Border Radius ========== */');
    lines.push('');
    const radiusNames = ['sm', 'DEFAULT', 'md', 'lg', 'xl', '2xl', 'full'];
    borderRadius.forEach((r, i) => {
      const name = r.role === 'pill' ? 'full' : 
                   r.role ? r.role.replace(/\s+/g, '-') : 
                   radiusNames[i] || `${i + 1}`;
      lines.push(`  --radius-${name}: ${r.value};`);
    });
    lines.push('');
  }

  // ============ SHADOWS ============
  if (shadows?.length) {
    lines.push('  /* ========== Shadows ========== */');
    lines.push('');
    const shadowNames = ['sm', 'DEFAULT', 'md', 'lg', 'xl', '2xl'];
    shadows.forEach((s, i) => {
      const name = s.role ? s.role.replace(/[\s-]+/g, '-') : shadowNames[i] || `${i + 1}`;
      lines.push(`  --shadow-${name}: ${s.value};`);
    });
    lines.push('');
  }

  // ============ ANIMATIONS ============
  if (animations?.durations?.length || animations?.easings?.length) {
    lines.push('  /* ========== Transitions ========== */');
    lines.push('');
    
    if (animations.durations?.length) {
      lines.push('  /* Durations */');
      const durNames = ['fast', 'normal', 'DEFAULT', 'slow', 'slower'];
      animations.durations.slice(0, 5).forEach((d, i) => {
        lines.push(`  --duration-${durNames[i] || i + 1}: ${d};`);
      });
      lines.push('');
    }
    
    if (animations.easings?.length) {
      lines.push('  /* Easings */');
      const easeNames = ['DEFAULT', 'in', 'out', 'in-out'];
      animations.easings.slice(0, 4).forEach((e, i) => {
        lines.push(`  --ease-${easeNames[i] || i + 1}: ${e};`);
      });
      lines.push('');
    }
  }

  // ============ BREAKPOINTS ============
  if (breakpoints?.detected?.length) {
    lines.push('  /* ========== Breakpoints (reference) ========== */');
    lines.push('');
    const bpNames = { xs: 480, sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 };
    breakpoints.detected.slice(0, 6).forEach((bp, i) => {
      const name = Object.entries(bpNames).find(([_, v]) => Math.abs(v - bp) < 50)?.[0] || `bp-${i + 1}`;
      lines.push(`  --breakpoint-${name}: ${bp}px;`);
    });
    lines.push('');
  }

  // ============ CONTAINER ============
  if (breakpoints?.containerWidths?.length) {
    lines.push('  /* Container Widths */');
    breakpoints.containerWidths.forEach((w, i) => {
      const names = ['sm', 'md', 'lg', 'xl'];
      lines.push(`  --container-${names[i] || i + 1}: ${w}px;`);
    });
    lines.push('');
  }

  lines.push('}');
  
  return lines.join('\n');
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node generate-css-variables.js <input.json> [output.css]');
    process.exit(1);
  }

  const inputPath = args[0];
  const outputPath = args[1];

  try {
    const json = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
    const css = generateCSSVariables(json);
    
    if (outputPath) {
      fs.writeFileSync(outputPath, css);
      console.log(`✓ Generated: ${outputPath}`);
    } else {
      console.log(css);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { generateCSSVariables };
