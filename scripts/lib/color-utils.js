/**
 * Shared Color Utilities
 *
 * Provides color conversion, comparison, and analysis functions used across
 * multiple scripts in the Impression design system toolkit.
 *
 * Key algorithms:
 * - CIE ΔE 2000: Perceptually accurate color difference
 * - RGB ↔ LAB ↔ HSL conversions
 * - Color normalization from various formats
 */

// ============ COLOR CONVERSIONS ============

/**
 * Convert hex color to RGB object
 * @param {string} hex - Hex color (3 or 6 digit, with or without #)
 * @returns {{r: number, g: number, b: number}|null}
 */
function hexToRgb(hex) {
  if (!hex) return null;
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Convert RGB to hex color
 * @param {{r: number, g: number, b: number}} rgb
 * @returns {string}
 */
function rgbToHex(rgb) {
  if (!rgb) return null;
  const toHex = (c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Convert RGB to HSL
 * @param {{r: number, g: number, b: number}} rgb
 * @returns {{h: number, s: number, l: number}}
 */
function rgbToHsl(rgb) {
  if (!rgb) return null;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;

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

/**
 * Convert HSL to RGB
 * @param {{h: number, s: number, l: number}} hsl - h: 0-360, s: 0-100, l: 0-100
 * @returns {{r: number, g: number, b: number}}
 */
function hslToRgb(hsl) {
  if (!hsl) return null;
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

/**
 * Convert RGB to LAB color space (for perceptual comparison)
 * Uses D65 illuminant
 * @param {{r: number, g: number, b: number}} rgb
 * @returns {{L: number, a: number, b: number}|null}
 */
function rgbToLab(rgb) {
  if (!rgb) return null;

  // Convert RGB to XYZ (sRGB with D65 illuminant)
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  r *= 100; g *= 100; b *= 100;

  // D65 reference white
  const refX = 95.047;
  const refY = 100.000;
  const refZ = 108.883;

  let x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / refX;
  let y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) / refY;
  let z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / refZ;

  const epsilon = 0.008856;
  const kappa = 903.3;

  x = x > epsilon ? Math.pow(x, 1/3) : (kappa * x + 16) / 116;
  y = y > epsilon ? Math.pow(y, 1/3) : (kappa * y + 16) / 116;
  z = z > epsilon ? Math.pow(z, 1/3) : (kappa * z + 16) / 116;

  return {
    L: 116 * y - 16,
    a: 500 * (x - y),
    b: 200 * (y - z)
  };
}

// ============ COLOR COMPARISON ============

/**
 * CIE ΔE 2000 - Perceptually uniform color difference
 * Reference: http://www.ece.rochester.edu/~gsharma/ciede2000/
 *
 * Thresholds:
 * - ΔE = 0: Identical
 * - ΔE < 1: Not perceptible by human eye
 * - ΔE < 5: Perceptible but similar
 * - ΔE >= 5: Clearly different
 *
 * @param {string} hex1 - First hex color
 * @param {string} hex2 - Second hex color
 * @returns {number} Color difference (0 = identical)
 */
function deltaE2000(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return Infinity;

  const lab1 = rgbToLab(rgb1);
  const lab2 = rgbToLab(rgb2);
  if (!lab1 || !lab2) return Infinity;

  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;

  // Weighting factors
  const kL = 1, kC = 1, kH = 1;

  // Calculate C' and h'
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cab = (C1 + C2) / 2;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cab, 7) / (Math.pow(Cab, 7) + Math.pow(25, 7))));

  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);

  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  const h1p = Math.atan2(b1, a1p) * 180 / Math.PI;
  const h2p = Math.atan2(b2, a2p) * 180 / Math.PI;
  const h1pAdj = h1p < 0 ? h1p + 360 : h1p;
  const h2pAdj = h2p < 0 ? h2p + 360 : h2p;

  // Calculate ΔL', ΔC', ΔH'
  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp;
  if (C1p * C2p === 0) {
    dhp = 0;
  } else if (Math.abs(h2pAdj - h1pAdj) <= 180) {
    dhp = h2pAdj - h1pAdj;
  } else if (h2pAdj - h1pAdj > 180) {
    dhp = h2pAdj - h1pAdj - 360;
  } else {
    dhp = h2pAdj - h1pAdj + 360;
  }

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp * Math.PI / 360);

  // Calculate mean values
  const Lp = (L1 + L2) / 2;
  const Cp = (C1p + C2p) / 2;

  let Hp;
  if (C1p * C2p === 0) {
    Hp = h1pAdj + h2pAdj;
  } else if (Math.abs(h1pAdj - h2pAdj) <= 180) {
    Hp = (h1pAdj + h2pAdj) / 2;
  } else if (h1pAdj + h2pAdj < 360) {
    Hp = (h1pAdj + h2pAdj + 360) / 2;
  } else {
    Hp = (h1pAdj + h2pAdj - 360) / 2;
  }

  // Calculate T
  const T = 1 - 0.17 * Math.cos((Hp - 30) * Math.PI / 180)
              + 0.24 * Math.cos(2 * Hp * Math.PI / 180)
              + 0.32 * Math.cos((3 * Hp + 6) * Math.PI / 180)
              - 0.20 * Math.cos((4 * Hp - 63) * Math.PI / 180);

  // Calculate SL, SC, SH
  const dTheta = 30 * Math.exp(-Math.pow((Hp - 275) / 25, 2));
  const RC = 2 * Math.sqrt(Math.pow(Cp, 7) / (Math.pow(Cp, 7) + Math.pow(25, 7)));
  const SL = 1 + (0.015 * Math.pow(Lp - 50, 2)) / Math.sqrt(20 + Math.pow(Lp - 50, 2));
  const SC = 1 + 0.045 * Cp;
  const SH = 1 + 0.015 * Cp * T;
  const RT = -Math.sin(2 * dTheta * Math.PI / 180) * RC;

  // Final calculation
  const dE = Math.sqrt(
    Math.pow(dLp / (kL * SL), 2) +
    Math.pow(dCp / (kC * SC), 2) +
    Math.pow(dHp / (kH * SH), 2) +
    RT * (dCp / (kC * SC)) * (dHp / (kH * SH))
  );

  return dE;
}

/**
 * Legacy CIE76 color difference (simpler but less accurate)
 * @param {string} hex1
 * @param {string} hex2
 * @returns {number}
 */
function deltaE76(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return Infinity;

  const lab1 = rgbToLab(rgb1);
  const lab2 = rgbToLab(rgb2);
  if (!lab1 || !lab2) return Infinity;

  return Math.sqrt(
    Math.pow(lab2.L - lab1.L, 2) +
    Math.pow(lab2.a - lab1.a, 2) +
    Math.pow(lab2.b - lab1.b, 2)
  );
}

// Default to ΔE 2000
const deltaE = deltaE2000;

// ============ COLOR NORMALIZATION ============

/**
 * Named CSS colors mapping
 */
const NAMED_COLORS = {
  white: '#ffffff', black: '#000000', red: '#ff0000',
  green: '#008000', blue: '#0000ff', transparent: null,
  gray: '#808080', grey: '#808080', silver: '#c0c0c0',
  navy: '#000080', teal: '#008080', purple: '#800080',
  orange: '#ffa500', yellow: '#ffff00', lime: '#00ff00',
  aqua: '#00ffff', cyan: '#00ffff', magenta: '#ff00ff',
  fuchsia: '#ff00ff', maroon: '#800000', olive: '#808000',
  pink: '#ffc0cb', coral: '#ff7f50', gold: '#ffd700',
  indigo: '#4b0082', violet: '#ee82ee', tan: '#d2b48c',
  beige: '#f5f5dc', ivory: '#fffff0', khaki: '#f0e68c',
  lavender: '#e6e6fa', plum: '#dda0dd', salmon: '#fa8072',
  crimson: '#dc143c', tomato: '#ff6347', chocolate: '#d2691e'
};

/**
 * Normalize any color format to hex
 * Supports: hex (3/6 digit), rgb(), rgba(), hsl(), hsla(), named colors
 * @param {string} color
 * @returns {string|null} Normalized hex color or null
 */
function normalizeColor(color) {
  if (!color) return null;
  color = String(color).trim().toLowerCase();

  // Handle rgb/rgba
  const rgbMatch = color.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  // Handle hsl/hsla
  const hslMatch = color.match(/hsla?\s*\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?/);
  if (hslMatch) {
    const rgb = hslToRgb({
      h: parseInt(hslMatch[1]),
      s: parseInt(hslMatch[2]),
      l: parseInt(hslMatch[3])
    });
    return rgbToHex(rgb);
  }

  // Handle hex
  if (color.startsWith('#')) {
    if (color.length === 4) {
      return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    }
    return color.slice(0, 7);
  }

  // Named colors
  return NAMED_COLORS[color] || null;
}

// ============ COLOR ANALYSIS ============

/**
 * Get color characteristics from hex
 * @param {string} hex
 * @returns {Object} Color characteristics
 */
function getColorCharacteristics(hex) {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb);

  if (!hsl) return null;

  return {
    hex,
    rgb,
    hsl,
    isNeutral: hsl.s < 10,
    isLight: hsl.l > 70,
    isDark: hsl.l < 30,
    isMuted: hsl.s < 30 && hsl.l > 30 && hsl.l < 70,
    isVibrant: hsl.s > 60,
  };
}

/**
 * Blend two colors by weighted RGB interpolation
 * @param {string} hex1
 * @param {string} hex2
 * @param {number} weight - Weight for first color (0-1)
 * @returns {string} Blended hex color
 */
function blendColors(hex1, hex2, weight = 0.5) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return hex1 || hex2;

  return rgbToHex({
    r: Math.round(rgb1.r * weight + rgb2.r * (1 - weight)),
    g: Math.round(rgb1.g * weight + rgb2.g * (1 - weight)),
    b: Math.round(rgb1.b * weight + rgb2.b * (1 - weight))
  });
}

/**
 * Check if two colors are similar (ΔE < threshold)
 * @param {string} hex1
 * @param {string} hex2
 * @param {number} threshold - Default 5 (perceptible but similar)
 * @returns {boolean}
 */
function colorsAreSimilar(hex1, hex2, threshold = 5) {
  return deltaE2000(hex1, hex2) < threshold;
}

module.exports = {
  // Conversions
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  rgbToLab,

  // Comparison
  deltaE,
  deltaE2000,
  deltaE76,
  colorsAreSimilar,

  // Normalization
  normalizeColor,
  NAMED_COLORS,

  // Analysis
  getColorCharacteristics,
  blendColors,
};
