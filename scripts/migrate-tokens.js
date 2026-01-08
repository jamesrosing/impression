#!/usr/bin/env node
/**
 * Migrate Tokens
 * Convert design tokens between different formats
 *
 * Supported formats:
 *   - impression: Impression JSON format (our internal format)
 *   - w3c: W3C Design Tokens Community Group format
 *   - sd: Style Dictionary format
 *   - figma: Figma Variables/Tokens Studio format
 *   - tailwind: Tailwind CSS config
 *   - css: CSS custom properties
 *   - shadcn: shadcn/ui HSL format
 *
 * Usage:
 *   node migrate-tokens.js <input> --from=<format> --to=<format> [output]
 *   node migrate-tokens.js design-system.json --from=impression --to=w3c
 *   node migrate-tokens.js tokens.json --from=w3c --to=tailwind tailwind.config.js
 *
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// COLOR UTILITIES
// =============================================================================

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

  return rgbToHex(
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  );
}

// =============================================================================
// FORMAT DETECTION
// =============================================================================

function detectFormat(data) {
  if (!data || typeof data !== 'object') return null;

  // Impression format: has meta.extractedAt and colors.palette
  if (data.meta?.extractedAt && data.colors?.palette) {
    return 'impression';
  }

  // W3C format: uses $type and $value
  if (hasW3CTokens(data)) {
    return 'w3c';
  }

  // Style Dictionary: uses value without $
  if (hasSDTokens(data)) {
    return 'sd';
  }

  // Figma/Tokens Studio: has modes or collections with specific structure
  if (data.collections || (data.global && data.global.$type)) {
    return 'figma';
  }

  // Tailwind: has theme.extend or theme.colors structure
  if (data.theme?.extend || data.theme?.colors || data.content) {
    return 'tailwind';
  }

  // shadcn: has specific shadcn variable names
  if (data.cssVariables && (data.cssVariables['--background'] || data.cssVariables['--primary'])) {
    return 'shadcn';
  }

  return null;
}

function hasW3CTokens(obj, depth = 0) {
  if (depth > 5 || !obj || typeof obj !== 'object') return false;
  if (obj.$type && obj.$value !== undefined) return true;
  return Object.values(obj).some(v => hasW3CTokens(v, depth + 1));
}

function hasSDTokens(obj, depth = 0) {
  if (depth > 5 || !obj || typeof obj !== 'object') return false;
  if (obj.value !== undefined && !obj.$value) return true;
  return Object.values(obj).some(v => hasSDTokens(v, depth + 1));
}

// =============================================================================
// PARSERS: Convert from various formats to internal representation
// =============================================================================

function parseImpression(data) {
  return {
    colors: {
      variables: data.colors?.cssVariables || {},
      palette: data.colors?.palette || [],
      semantic: data.colors?.semantic || {}
    },
    typography: {
      families: data.typography?.fontFamilies || [],
      scale: data.typography?.scale || [],
      weights: data.typography?.fontWeights || [],
      lineHeights: data.typography?.lineHeights || []
    },
    spacing: {
      scale: data.spacing?.scale || [],
      grid: data.spacing?.grid
    },
    shadows: data.shadows || [],
    borderRadius: data.borderRadius || [],
    animations: data.animations || {},
    breakpoints: data.breakpoints || {},
    meta: data.meta || {}
  };
}

function parseW3C(data) {
  const result = {
    colors: { variables: {}, palette: [], semantic: {} },
    typography: { families: [], scale: [], weights: [], lineHeights: [] },
    spacing: { scale: [] },
    shadows: [],
    borderRadius: [],
    animations: { durations: [], easings: [] },
    breakpoints: {},
    meta: {}
  };

  function extractTokens(obj, prefix = '') {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      if (value.$type && value.$value !== undefined) {
        const name = prefix ? `${prefix}-${key}` : key;

        switch (value.$type) {
          case 'color':
            result.colors.variables[`--${name}`] = value.$value;
            result.colors.palette.push({ value: value.$value, name });
            break;
          case 'dimension':
            if (name.includes('space') || name.includes('gap') || name.includes('padding')) {
              result.spacing.scale.push(value.$value);
            } else if (name.includes('radius')) {
              result.borderRadius.push({ value: value.$value, role: name });
            } else if (name.includes('font-size') || name.includes('text')) {
              result.typography.scale.push(value.$value);
            }
            break;
          case 'fontFamily':
            result.typography.families.push({
              family: Array.isArray(value.$value) ? value.$value[0] : value.$value,
              role: name
            });
            break;
          case 'fontWeight':
            result.typography.weights.push(String(value.$value));
            break;
          case 'duration':
            result.animations.durations.push(value.$value);
            break;
          case 'shadow':
            result.shadows.push({ value: formatShadow(value.$value), role: name });
            break;
        }
      } else if (typeof value === 'object' && !value.$type) {
        extractTokens(value, prefix ? `${prefix}-${key}` : key);
      }
    }
  }

  extractTokens(data);
  return result;
}

function formatShadow(shadow) {
  if (typeof shadow === 'string') return shadow;
  if (Array.isArray(shadow)) {
    return shadow.map(s => formatSingleShadow(s)).join(', ');
  }
  return formatSingleShadow(shadow);
}

function formatSingleShadow(s) {
  if (typeof s === 'string') return s;
  const parts = [];
  if (s.inset) parts.push('inset');
  parts.push(s.offsetX || '0');
  parts.push(s.offsetY || '0');
  if (s.blur) parts.push(s.blur);
  if (s.spread) parts.push(s.spread);
  if (s.color) parts.push(s.color);
  return parts.join(' ');
}

function parseStyleDictionary(data) {
  const result = {
    colors: { variables: {}, palette: [], semantic: {} },
    typography: { families: [], scale: [], weights: [], lineHeights: [] },
    spacing: { scale: [] },
    shadows: [],
    borderRadius: [],
    animations: {},
    breakpoints: {},
    meta: {}
  };

  function extractTokens(obj, prefix = '') {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      if (value.value !== undefined && typeof value.value !== 'object') {
        const name = prefix ? `${prefix}-${key}` : key;
        const type = value.type || inferType(name, value.value);

        switch (type) {
          case 'color':
            result.colors.variables[`--${name}`] = value.value;
            result.colors.palette.push({ value: value.value, name });
            break;
          case 'dimension':
          case 'sizing':
          case 'spacing':
            result.spacing.scale.push(value.value);
            break;
          case 'borderRadius':
            result.borderRadius.push({ value: value.value, role: name });
            break;
          case 'fontFamily':
          case 'fontFamilies':
            result.typography.families.push({ family: value.value, role: name });
            break;
          case 'fontSize':
          case 'fontSizes':
            result.typography.scale.push(value.value);
            break;
          case 'fontWeight':
          case 'fontWeights':
            result.typography.weights.push(String(value.value));
            break;
          case 'boxShadow':
            result.shadows.push({ value: value.value, role: name });
            break;
        }
      } else if (typeof value === 'object' && value.value === undefined) {
        extractTokens(value, prefix ? `${prefix}-${key}` : key);
      }
    }
  }

  extractTokens(data);
  return result;
}

function inferType(name, value) {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('color') || (typeof value === 'string' && value.startsWith('#'))) return 'color';
  if (nameLower.includes('space') || nameLower.includes('gap') || nameLower.includes('padding')) return 'spacing';
  if (nameLower.includes('radius')) return 'borderRadius';
  if (nameLower.includes('font-family') || nameLower.includes('fontfamily')) return 'fontFamily';
  if (nameLower.includes('font-size') || nameLower.includes('fontsize')) return 'fontSize';
  if (nameLower.includes('font-weight') || nameLower.includes('fontweight')) return 'fontWeight';
  if (nameLower.includes('shadow')) return 'boxShadow';
  return 'unknown';
}

function parseTailwind(data) {
  const result = {
    colors: { variables: {}, palette: [], semantic: {} },
    typography: { families: [], scale: [], weights: [], lineHeights: [] },
    spacing: { scale: [] },
    shadows: [],
    borderRadius: [],
    animations: {},
    breakpoints: { detected: [] },
    meta: {}
  };

  const theme = data.theme?.extend || data.theme || {};

  // Colors
  if (theme.colors) {
    function extractColors(obj, prefix = '') {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          const name = prefix ? `${prefix}-${key}` : key;
          result.colors.palette.push({ value, name });
          result.colors.variables[`--color-${name}`] = value;
        } else if (typeof value === 'object') {
          extractColors(value, prefix ? `${prefix}-${key}` : key);
        }
      }
    }
    extractColors(theme.colors);
  }

  // Font families
  if (theme.fontFamily) {
    for (const [name, families] of Object.entries(theme.fontFamily)) {
      result.typography.families.push({
        family: Array.isArray(families) ? families[0] : families,
        role: name
      });
    }
  }

  // Font sizes
  if (theme.fontSize) {
    for (const [name, size] of Object.entries(theme.fontSize)) {
      const value = Array.isArray(size) ? size[0] : size;
      result.typography.scale.push(value);
    }
  }

  // Spacing
  if (theme.spacing) {
    for (const value of Object.values(theme.spacing)) {
      result.spacing.scale.push(value);
    }
  }

  // Border radius
  if (theme.borderRadius) {
    for (const [name, value] of Object.entries(theme.borderRadius)) {
      result.borderRadius.push({ value, role: name });
    }
  }

  // Shadows
  if (theme.boxShadow) {
    for (const [name, value] of Object.entries(theme.boxShadow)) {
      result.shadows.push({ value, role: name });
    }
  }

  // Breakpoints
  if (theme.screens) {
    for (const value of Object.values(theme.screens)) {
      const num = parseInt(value);
      if (!isNaN(num)) result.breakpoints.detected.push(num);
    }
  }

  return result;
}

function parseFigma(data) {
  const result = {
    colors: { variables: {}, palette: [], semantic: {} },
    typography: { families: [], scale: [], weights: [], lineHeights: [] },
    spacing: { scale: [] },
    shadows: [],
    borderRadius: [],
    animations: {},
    breakpoints: {},
    meta: {}
  };

  // Handle Tokens Studio format
  function extractTokens(obj, prefix = '') {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('$')) continue;

      if (value.$type || value.type) {
        const type = value.$type || value.type;
        const val = value.$value || value.value;
        const name = prefix ? `${prefix}/${key}` : key;

        switch (type) {
          case 'color':
            const hexColor = rgbaToHex(val);
            result.colors.palette.push({ value: hexColor, name });
            result.colors.variables[`--${name.replace(/\//g, '-')}`] = hexColor;
            break;
          case 'dimension':
          case 'sizing':
          case 'spacing':
            result.spacing.scale.push(val);
            break;
          case 'borderRadius':
            result.borderRadius.push({ value: val, role: name });
            break;
          case 'fontFamilies':
          case 'fontFamily':
            result.typography.families.push({ family: val, role: name });
            break;
          case 'fontSizes':
          case 'fontSize':
            result.typography.scale.push(val);
            break;
          case 'fontWeights':
          case 'fontWeight':
            result.typography.weights.push(String(val));
            break;
          case 'boxShadow':
            result.shadows.push({ value: formatShadow(val), role: name });
            break;
        }
      } else if (typeof value === 'object') {
        extractTokens(value, prefix ? `${prefix}/${key}` : key);
      }
    }
  }

  // Handle collections format
  if (data.collections) {
    for (const collection of data.collections) {
      if (collection.variables) {
        for (const variable of collection.variables) {
          const type = variable.type?.toLowerCase();
          const val = variable.valuesByMode?.default || Object.values(variable.valuesByMode || {})[0];

          if (type === 'color' && val) {
            const hexColor = rgbaToHex(val);
            result.colors.palette.push({ value: hexColor, name: variable.name });
          }
        }
      }
    }
  } else {
    extractTokens(data);
  }

  return result;
}

function rgbaToHex(val) {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object') {
    const r = Math.round((val.r || 0) * 255);
    const g = Math.round((val.g || 0) * 255);
    const b = Math.round((val.b || 0) * 255);
    return rgbToHex(r, g, b);
  }
  return '#000000';
}

function parseShadcn(data) {
  const result = {
    colors: { variables: {}, palette: [], semantic: {} },
    typography: { families: [], scale: [], weights: [], lineHeights: [] },
    spacing: { scale: [] },
    shadows: [],
    borderRadius: [],
    animations: {},
    breakpoints: {},
    meta: {}
  };

  const vars = data.cssVariables || data;

  for (const [key, value] of Object.entries(vars)) {
    if (key.startsWith('--')) {
      result.colors.variables[key] = value;

      // Try to convert HSL to hex for palette
      const hslMatch = value.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
      if (hslMatch) {
        const hex = hslToHex(
          parseFloat(hslMatch[1]),
          parseFloat(hslMatch[2]),
          parseFloat(hslMatch[3])
        );
        result.colors.palette.push({ value: hex, name: key.slice(2) });
      }
    }
  }

  return result;
}

function parseCSS(content) {
  const result = {
    colors: { variables: {}, palette: [], semantic: {} },
    typography: { families: [], scale: [], weights: [], lineHeights: [] },
    spacing: { scale: [] },
    shadows: [],
    borderRadius: [],
    animations: {},
    breakpoints: {},
    meta: {}
  };

  // Extract CSS custom properties
  const varPattern = /--([\w-]+):\s*([^;]+);/g;
  let match;

  while ((match = varPattern.exec(content)) !== null) {
    const name = match[1];
    const value = match[2].trim();
    result.colors.variables[`--${name}`] = value;

    // Detect colors
    if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) {
      let hex = value;
      if (value.startsWith('hsl')) {
        const hslMatch = value.match(/hsl\((\d+),?\s*(\d+)%,?\s*(\d+)%\)/);
        if (hslMatch) {
          hex = hslToHex(parseInt(hslMatch[1]), parseInt(hslMatch[2]), parseInt(hslMatch[3]));
        }
      }
      result.colors.palette.push({ value: hex, name });
    }
  }

  return result;
}

// =============================================================================
// GENERATORS: Convert from internal representation to output formats
// =============================================================================

function generateImpression(tokens) {
  return {
    meta: {
      url: tokens.meta?.url || '',
      title: tokens.meta?.title || 'Migrated Design System',
      extractedAt: new Date().toISOString(),
      viewport: tokens.meta?.viewport || { width: 1920, height: 1080 },
      designCharacter: tokens.meta?.designCharacter || ''
    },
    colors: {
      cssVariables: tokens.colors?.variables || {},
      palette: tokens.colors?.palette || [],
      semantic: tokens.colors?.semantic || { backgrounds: [], text: [], borders: [], accents: [] }
    },
    typography: {
      fontFamilies: tokens.typography?.families || [],
      scale: [...new Set(tokens.typography?.scale || [])],
      fontWeights: [...new Set(tokens.typography?.weights || [])],
      lineHeights: tokens.typography?.lineHeights || [],
      letterSpacing: []
    },
    spacing: {
      scale: [...new Set(tokens.spacing?.scale || [])],
      grid: tokens.spacing?.grid || null,
      gaps: [],
      paddings: []
    },
    animations: tokens.animations || { keyframes: {}, transitions: [], durations: [], easings: [] },
    components: { buttons: [], inputs: [], cards: [] },
    shadows: tokens.shadows || [],
    borderRadius: tokens.borderRadius || [],
    breakpoints: tokens.breakpoints || { detected: [], containerWidths: [] }
  };
}

function generateW3C(tokens) {
  const result = {
    $schema: 'https://design-tokens.github.io/community-group/format/',
    colors: {},
    typography: {},
    spacing: {},
    effects: {},
    breakpoints: {}
  };

  // Colors
  for (const color of (tokens.colors?.palette || [])) {
    const name = (color.name || color.role || `color-${result.colors.length}`).replace(/[^a-zA-Z0-9]/g, '-');
    result.colors[name] = {
      $type: 'color',
      $value: color.value,
      $description: color.role || ''
    };
  }

  // Typography
  for (const font of (tokens.typography?.families || [])) {
    const name = font.role || font.family.replace(/\s+/g, '-').toLowerCase();
    result.typography[`font-family-${name}`] = {
      $type: 'fontFamily',
      $value: [font.family]
    };
  }

  for (let i = 0; i < (tokens.typography?.scale || []).length; i++) {
    result.typography[`font-size-${i}`] = {
      $type: 'dimension',
      $value: tokens.typography.scale[i]
    };
  }

  // Spacing
  for (let i = 0; i < (tokens.spacing?.scale || []).length; i++) {
    result.spacing[`space-${i}`] = {
      $type: 'dimension',
      $value: tokens.spacing.scale[i]
    };
  }

  // Shadows
  for (const shadow of (tokens.shadows || [])) {
    const name = shadow.role || `shadow-${Object.keys(result.effects).length}`;
    result.effects[name] = {
      $type: 'shadow',
      $value: shadow.value
    };
  }

  // Border radius
  for (const radius of (tokens.borderRadius || [])) {
    const name = radius.role || `radius-${Object.keys(result.effects).length}`;
    result.effects[name] = {
      $type: 'dimension',
      $value: radius.value
    };
  }

  return result;
}

function generateStyleDictionary(tokens) {
  const result = {
    color: {},
    font: {},
    size: {},
    space: {},
    shadow: {},
    radius: {}
  };

  // Colors
  for (const color of (tokens.colors?.palette || [])) {
    const name = (color.name || color.role || `${Object.keys(result.color).length}`).replace(/[^a-zA-Z0-9]/g, '-');
    result.color[name] = { value: color.value };
  }

  // Fonts
  for (const font of (tokens.typography?.families || [])) {
    const name = font.role || 'default';
    result.font[name] = { value: font.family };
  }

  // Font sizes
  for (let i = 0; i < (tokens.typography?.scale || []).length; i++) {
    result.size[`font-${i}`] = { value: tokens.typography.scale[i] };
  }

  // Spacing
  for (let i = 0; i < (tokens.spacing?.scale || []).length; i++) {
    result.space[i] = { value: tokens.spacing.scale[i] };
  }

  // Shadows
  for (const shadow of (tokens.shadows || [])) {
    const name = shadow.role || `${Object.keys(result.shadow).length}`;
    result.shadow[name] = { value: shadow.value };
  }

  // Border radius
  for (const radius of (tokens.borderRadius || [])) {
    const name = radius.role || `${Object.keys(result.radius).length}`;
    result.radius[name] = { value: radius.value };
  }

  return result;
}

function generateTailwind(tokens) {
  const config = {
    theme: {
      extend: {
        colors: {},
        fontFamily: {},
        fontSize: {},
        spacing: {},
        borderRadius: {},
        boxShadow: {}
      }
    }
  };

  // Colors
  for (const color of (tokens.colors?.palette || [])) {
    const name = (color.name || color.role || `color${Object.keys(config.theme.extend.colors).length}`)
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .toLowerCase();
    config.theme.extend.colors[name] = color.value;
  }

  // Font families
  for (const font of (tokens.typography?.families || [])) {
    const name = font.role || 'sans';
    config.theme.extend.fontFamily[name] = [font.family];
  }

  // Font sizes
  for (let i = 0; i < (tokens.typography?.scale || []).length; i++) {
    config.theme.extend.fontSize[`size-${i}`] = tokens.typography.scale[i];
  }

  // Spacing
  for (let i = 0; i < (tokens.spacing?.scale || []).length; i++) {
    config.theme.extend.spacing[i] = tokens.spacing.scale[i];
  }

  // Border radius
  for (const radius of (tokens.borderRadius || [])) {
    const name = radius.role || `${Object.keys(config.theme.extend.borderRadius).length}`;
    config.theme.extend.borderRadius[name] = radius.value;
  }

  // Shadows
  for (const shadow of (tokens.shadows || [])) {
    const name = shadow.role || `${Object.keys(config.theme.extend.boxShadow).length}`;
    config.theme.extend.boxShadow[name] = shadow.value;
  }

  return `/** @type {import('tailwindcss').Config} */
module.exports = ${JSON.stringify(config, null, 2)};
`;
}

function generateCSS(tokens) {
  let css = '/* Generated CSS Variables */\n\n:root {\n';

  // From explicit variables
  for (const [name, value] of Object.entries(tokens.colors?.variables || {})) {
    const varName = name.startsWith('--') ? name : `--${name}`;
    css += `  ${varName}: ${value};\n`;
  }

  // Colors from palette
  for (const color of (tokens.colors?.palette || [])) {
    if (color.name && !tokens.colors.variables?.[`--${color.name}`]) {
      css += `  --color-${color.name.replace(/[^a-zA-Z0-9-]/g, '-')}: ${color.value};\n`;
    }
  }

  // Font families
  for (const font of (tokens.typography?.families || [])) {
    const name = font.role || 'font';
    css += `  --font-${name}: "${font.family}";\n`;
  }

  // Font sizes
  for (let i = 0; i < (tokens.typography?.scale || []).length; i++) {
    css += `  --font-size-${i}: ${tokens.typography.scale[i]};\n`;
  }

  // Spacing
  for (let i = 0; i < (tokens.spacing?.scale || []).length; i++) {
    css += `  --spacing-${i}: ${tokens.spacing.scale[i]};\n`;
  }

  // Border radius
  for (const radius of (tokens.borderRadius || [])) {
    const name = radius.role || `${Object.keys(tokens.borderRadius).indexOf(radius)}`;
    css += `  --radius-${name}: ${radius.value};\n`;
  }

  // Shadows
  for (const shadow of (tokens.shadows || [])) {
    const name = shadow.role || `${tokens.shadows.indexOf(shadow)}`;
    css += `  --shadow-${name}: ${shadow.value};\n`;
  }

  css += '}\n';
  return css;
}

function generateShadcn(tokens) {
  const vars = {};

  // Map colors to shadcn semantic names
  const palette = tokens.colors?.palette || [];

  // Find background and foreground
  const lightColors = palette.filter(c => {
    const rgb = hexToRgb(c.value);
    return rgb && (rgb.r + rgb.g + rgb.b) / 3 > 200;
  });
  const darkColors = palette.filter(c => {
    const rgb = hexToRgb(c.value);
    return rgb && (rgb.r + rgb.g + rgb.b) / 3 < 50;
  });

  const bg = lightColors[0]?.value || '#ffffff';
  const fg = darkColors[0]?.value || '#0a0a0a';

  function toHslString(hex) {
    const hsl = hexToHsl(hex);
    if (!hsl) return '0 0% 0%';
    return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
  }

  vars['--background'] = toHslString(bg);
  vars['--foreground'] = toHslString(fg);
  vars['--card'] = toHslString(bg);
  vars['--card-foreground'] = toHslString(fg);
  vars['--popover'] = toHslString(bg);
  vars['--popover-foreground'] = toHslString(fg);
  vars['--primary'] = toHslString(fg);
  vars['--primary-foreground'] = toHslString(bg);

  // Find accent color (not white/black)
  const accentColor = palette.find(c => {
    const rgb = hexToRgb(c.value);
    if (!rgb) return false;
    const avg = (rgb.r + rgb.g + rgb.b) / 3;
    return avg > 50 && avg < 200;
  });

  if (accentColor) {
    vars['--accent'] = toHslString(accentColor.value);
    vars['--accent-foreground'] = toHslString(fg);
  }

  // Standard shadcn vars
  vars['--muted'] = toHslString('#f4f4f5');
  vars['--muted-foreground'] = toHslString('#71717a');
  vars['--secondary'] = toHslString('#f4f4f5');
  vars['--secondary-foreground'] = toHslString('#18181b');
  vars['--destructive'] = toHslString('#ef4444');
  vars['--destructive-foreground'] = toHslString('#fafafa');
  vars['--border'] = toHslString('#e4e4e7');
  vars['--input'] = toHslString('#e4e4e7');
  vars['--ring'] = toHslString(fg);

  // Border radius
  const radius = tokens.borderRadius?.[0]?.value || '0.5rem';
  vars['--radius'] = radius;

  return {
    cssVariables: vars,
    note: 'Add these to your globals.css :root selector for shadcn/ui'
  };
}

function generateFigma(tokens) {
  const result = {
    colors: {},
    typography: {},
    spacing: {},
    effects: {}
  };

  // Colors
  for (const color of (tokens.colors?.palette || [])) {
    const name = color.name || color.role || `color-${Object.keys(result.colors).length}`;
    const rgb = hexToRgb(color.value);
    result.colors[name] = {
      $type: 'color',
      $value: rgb ? { r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255, a: 1 } : color.value
    };
  }

  // Typography
  for (const font of (tokens.typography?.families || [])) {
    const name = font.role || 'default';
    result.typography[`fontFamily/${name}`] = {
      $type: 'fontFamilies',
      $value: font.family
    };
  }

  for (let i = 0; i < (tokens.typography?.scale || []).length; i++) {
    result.typography[`fontSize/${i}`] = {
      $type: 'fontSizes',
      $value: tokens.typography.scale[i]
    };
  }

  // Spacing
  for (let i = 0; i < (tokens.spacing?.scale || []).length; i++) {
    result.spacing[`space-${i}`] = {
      $type: 'spacing',
      $value: tokens.spacing.scale[i]
    };
  }

  // Border radius
  for (const radius of (tokens.borderRadius || [])) {
    const name = radius.role || `radius-${Object.keys(result.effects).length}`;
    result.effects[name] = {
      $type: 'borderRadius',
      $value: radius.value
    };
  }

  return result;
}

// =============================================================================
// MAIN MIGRATION FUNCTION
// =============================================================================

function migrateTokens(input, fromFormat, toFormat) {
  let data = input;

  // If input is a string, try to parse as JSON or CSS
  if (typeof input === 'string') {
    if (input.includes(':root') || input.includes('--')) {
      data = parseCSS(input);
      fromFormat = fromFormat || 'css';
    } else {
      try {
        data = JSON.parse(input);
      } catch (e) {
        throw new Error('Invalid input: could not parse as JSON or CSS');
      }
    }
  }

  // Auto-detect format if not specified
  if (!fromFormat) {
    fromFormat = detectFormat(data);
    if (!fromFormat) {
      throw new Error('Could not detect input format. Please specify --from=<format>');
    }
  }

  // Parse to internal representation
  let tokens;
  switch (fromFormat.toLowerCase()) {
    case 'impression':
      tokens = parseImpression(data);
      break;
    case 'w3c':
      tokens = parseW3C(data);
      break;
    case 'sd':
    case 'style-dictionary':
      tokens = parseStyleDictionary(data);
      break;
    case 'tailwind':
      tokens = parseTailwind(data);
      break;
    case 'figma':
    case 'tokens-studio':
      tokens = parseFigma(data);
      break;
    case 'shadcn':
      tokens = parseShadcn(data);
      break;
    case 'css':
      tokens = typeof data === 'string' ? parseCSS(data) : data;
      break;
    default:
      throw new Error(`Unknown source format: ${fromFormat}`);
  }

  // Generate output format
  switch (toFormat.toLowerCase()) {
    case 'impression':
      return generateImpression(tokens);
    case 'w3c':
      return generateW3C(tokens);
    case 'sd':
    case 'style-dictionary':
      return generateStyleDictionary(tokens);
    case 'tailwind':
      return generateTailwind(tokens);
    case 'figma':
    case 'tokens-studio':
      return generateFigma(tokens);
    case 'shadcn':
      return generateShadcn(tokens);
    case 'css':
      return generateCSS(tokens);
    default:
      throw new Error(`Unknown target format: ${toFormat}`);
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  migrateTokens,
  detectFormat,
  parseImpression,
  parseW3C,
  parseStyleDictionary,
  parseTailwind,
  parseFigma,
  parseShadcn,
  parseCSS,
  generateImpression,
  generateW3C,
  generateStyleDictionary,
  generateTailwind,
  generateFigma,
  generateShadcn,
  generateCSS,
  hexToRgb,
  rgbToHex,
  hexToHsl,
  hslToHex
};

// =============================================================================
// CLI
// =============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);

  // Parse flags
  const fromFlag = args.find(a => a.startsWith('--from='));
  const toFlag = args.find(a => a.startsWith('--to='));

  const fromFormat = fromFlag ? fromFlag.split('=')[1] : null;
  const toFormat = toFlag ? toFlag.split('=')[1] : null;

  const inputPath = args.find(a => !a.startsWith('--'));
  const outputPath = args.filter(a => !a.startsWith('--'))[1] || null;

  if (!inputPath || !toFormat) {
    console.log(`
Impression: Migrate Tokens
==========================

Convert design tokens between different formats.

Supported formats:
  impression   Impression JSON format
  w3c          W3C Design Tokens Community Group
  sd           Style Dictionary
  figma        Figma Variables / Tokens Studio
  tailwind     Tailwind CSS config
  css          CSS custom properties
  shadcn       shadcn/ui HSL format

Usage:
  node migrate-tokens.js <input> --from=<format> --to=<format> [output]

Examples:
  # Impression to W3C tokens
  node migrate-tokens.js design-system.json --from=impression --to=w3c tokens.json

  # W3C to Tailwind config
  node migrate-tokens.js tokens.json --from=w3c --to=tailwind tailwind.config.js

  # Auto-detect source, convert to CSS
  node migrate-tokens.js tokens.json --to=css variables.css

  # Tailwind to shadcn
  node migrate-tokens.js tailwind.config.js --from=tailwind --to=shadcn

  # Figma tokens to CSS
  node migrate-tokens.js figma-tokens.json --from=figma --to=css
`);
    process.exit(1);
  }

  // Read input
  const fullPath = path.resolve(inputPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Error: File not found: ${inputPath}`);
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    let input;

    try {
      input = JSON.parse(content);
    } catch (e) {
      // Might be CSS or Tailwind config
      input = content;
    }

    console.log(`Migrating tokens...`);
    if (fromFormat) console.log(`From: ${fromFormat}`);
    console.log(`To: ${toFormat}`);

    const result = migrateTokens(input, fromFormat, toFormat);

    // Format output
    let output;
    if (typeof result === 'string') {
      output = result;
    } else {
      output = JSON.stringify(result, null, 2);
    }

    if (outputPath) {
      fs.writeFileSync(path.resolve(outputPath), output);
      console.log(`\nSaved to: ${outputPath}`);
    } else {
      console.log('\n' + output);
    }

    // Summary
    console.log('\n--- Migration Summary ---');
    if (typeof result === 'object') {
      const stats = [];
      if (result.colors?.palette?.length) stats.push(`Colors: ${result.colors.palette.length}`);
      if (result.typography?.families?.length) stats.push(`Fonts: ${result.typography.families.length}`);
      if (result.spacing?.scale?.length) stats.push(`Spacing: ${result.spacing.scale.length}`);
      if (result.theme?.extend?.colors) stats.push(`Colors: ${Object.keys(result.theme.extend.colors).length}`);
      console.log(stats.join(' | ') || 'Migration complete');
    } else {
      console.log('Migration complete');
    }

  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
