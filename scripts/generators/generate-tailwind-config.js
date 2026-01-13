#!/usr/bin/env node
/**
 * Generate Tailwind Config from Extracted Design System
 * 
 * Usage:
 *   node generate-tailwind-config.js <input.json> [output.js]
 *   node generate-tailwind-config.js references/duchateau.json
 * 
 * If no output file specified, prints to stdout.
 */

const fs = require('fs');
const path = require('path');

function generateTailwindConfig(designSystem) {
  const { colors, typography, spacing, shadows, borderRadius, breakpoints, animations } = designSystem;
  
  // Build color palette from semantic + palette data
  const colorConfig = {};
  
  // Primary colors from palette (with roles)
  colors.palette?.forEach((c, i) => {
    if (c.role) {
      const key = c.role.replace(/-/g, '');
      colorConfig[key] = c.value;
    }
  });
  
  // Semantic color groups
  if (colors.semantic) {
    colorConfig.background = {
      DEFAULT: colors.semantic.backgrounds?.[0]?.value || '#ffffff',
      secondary: colors.semantic.backgrounds?.[1]?.value,
      tertiary: colors.semantic.backgrounds?.[2]?.value,
    };
    colorConfig.foreground = {
      DEFAULT: colors.semantic.text?.[0]?.value || '#000000',
      secondary: colors.semantic.text?.[1]?.value,
      muted: colors.semantic.text?.[2]?.value,
    };
    colorConfig.border = {
      DEFAULT: colors.semantic.borders?.[0]?.value || '#e5e5e5',
      secondary: colors.semantic.borders?.[1]?.value,
    };
    colorConfig.accent = {
      DEFAULT: colors.semantic.accents?.[0]?.value || colors.palette?.find(c => c.role === 'accent')?.value,
    };
  }
  
  // Clean undefined values
  Object.keys(colorConfig).forEach(key => {
    if (typeof colorConfig[key] === 'object') {
      Object.keys(colorConfig[key]).forEach(subKey => {
        if (!colorConfig[key][subKey]) delete colorConfig[key][subKey];
      });
    }
  });

  // Font families
  const fontFamily = {};
  typography.fontFamilies?.forEach(f => {
    const role = f.role || 'sans';
    const key = role.includes('serif') ? 'serif' : 
                role.includes('mono') ? 'mono' : 
                role.includes('display') ? 'display' : 'sans';
    if (!fontFamily[key]) {
      fontFamily[key] = [`"${f.family}"`, 'system-ui', 'sans-serif'];
    }
  });

  // Font sizes from scale
  const fontSize = {};
  const sizeNames = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl'];
  typography.scale?.forEach((size, i) => {
    const name = sizeNames[i] || `custom-${i}`;
    const px = parseFloat(size);
    // Add line-height based on size
    const lineHeight = px < 16 ? '1.5' : px < 24 ? '1.4' : px < 40 ? '1.2' : '1.1';
    fontSize[name] = [size, { lineHeight }];
  });

  // Font weights
  const fontWeight = {};
  typography.fontWeights?.forEach(w => {
    const weightNames = { '100': 'thin', '200': 'extralight', '300': 'light', '400': 'normal', 
                          '500': 'medium', '600': 'semibold', '700': 'bold', '800': 'extrabold', '900': 'black' };
    if (weightNames[w]) fontWeight[weightNames[w]] = w;
  });

  // Spacing scale
  const spacingConfig = {};
  spacing.scale?.forEach(s => {
    const px = parseFloat(s);
    if (px > 0 && px <= 256) {
      // Convert to rem-friendly keys
      const key = px <= 4 ? `${px}` : 
                  px % 4 === 0 ? `${px / 4}` : 
                  `[${s}]`;
      spacingConfig[key] = s;
    }
  });

  // Border radius
  const borderRadiusConfig = {};
  borderRadius?.forEach((r, i) => {
    const names = ['sm', 'DEFAULT', 'md', 'lg', 'xl', '2xl', '3xl', 'full'];
    const name = r.role === 'pill' ? 'full' : names[i] || `custom-${i}`;
    borderRadiusConfig[name] = r.value;
  });

  // Box shadows
  const boxShadow = {};
  shadows?.forEach((s, i) => {
    const names = ['sm', 'DEFAULT', 'md', 'lg', 'xl', '2xl'];
    const name = s.role?.replace(/-/g, '') || names[i] || `custom-${i}`;
    boxShadow[name] = s.value;
  });

  // Breakpoints / screens
  const screens = {};
  breakpoints.detected?.forEach(bp => {
    const name = bp <= 480 ? 'xs' :
                 bp <= 640 ? 'sm' :
                 bp <= 768 ? 'md' :
                 bp <= 1024 ? 'lg' :
                 bp <= 1280 ? 'xl' :
                 bp <= 1536 ? '2xl' : `${bp}`;
    if (!screens[name]) screens[name] = `${bp}px`;
  });

  // Transitions
  const transitionDuration = {};
  animations.durations?.forEach(d => {
    const ms = parseFloat(d) * (d.includes('ms') ? 1 : 1000);
    const name = ms <= 100 ? 'fast' : ms <= 200 ? 'normal' : ms <= 300 ? 'DEFAULT' : ms <= 500 ? 'slow' : 'slower';
    if (!transitionDuration[name]) transitionDuration[name] = `${ms}ms`;
  });

  const transitionTimingFunction = {};
  animations.easings?.forEach((e, i) => {
    const names = ['DEFAULT', 'in', 'out', 'in-out'];
    transitionTimingFunction[names[i] || `custom-${i}`] = e;
  });

  // Build config object
  const config = {
    theme: {
      extend: {
        colors: colorConfig,
        fontFamily,
        fontSize,
        fontWeight,
        spacing: spacingConfig,
        borderRadius: borderRadiusConfig,
        boxShadow,
        screens,
        transitionDuration,
        transitionTimingFunction,
      }
    }
  };

  // Generate output
  const output = `/** @type {import('tailwindcss').Config} */
// Generated from: ${designSystem.meta?.url || 'unknown'}
// Extracted: ${designSystem.meta?.extractedAt || 'unknown'}
// Character: ${designSystem.meta?.designCharacter || ''}

module.exports = ${JSON.stringify(config, null, 2)
  .replace(/"([^"]+)":/g, '$1:')  // Remove quotes from keys
  .replace(/"/g, "'")};           // Single quotes for values
`;

  return output;
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node generate-tailwind-config.js <input.json> [output.js]');
    process.exit(1);
  }

  const inputPath = args[0];
  const outputPath = args[1];

  try {
    const json = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
    const config = generateTailwindConfig(json);
    
    if (outputPath) {
      fs.writeFileSync(outputPath, config);
      console.log(`✓ Generated: ${outputPath}`);
    } else {
      console.log(config);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { generateTailwindConfig };
