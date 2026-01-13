/**
 * Shared Contrast & Accessibility Utilities
 *
 * Provides WCAG 2.1 contrast ratio calculations and accessibility auditing
 * functions used across multiple scripts in the Impression toolkit.
 *
 * Standards:
 * - WCAG 2.1 Contrast Requirements
 * - WCAG 2.4.7 Focus Visible
 * - WCAG 2.4.11 Focus Appearance (AAA)
 */

const { hexToRgb, normalizeColor, deltaE2000 } = require('./color-utils');

// ============ LUMINANCE & CONTRAST ============

/**
 * Calculate relative luminance per WCAG 2.1
 * @param {string} hex - Hex color
 * @returns {number} Luminance value (0-1)
 */
function getLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors per WCAG 2.1
 * @param {string} hex1 - First hex color
 * @param {string} hex2 - Second hex color
 * @returns {number} Contrast ratio (1-21)
 */
function getContrastRatio(hex1, hex2) {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ============ WCAG COMPLIANCE ============

/**
 * WCAG contrast level thresholds
 */
const WCAG_THRESHOLDS = {
  AA_NORMAL_TEXT: 4.5,
  AA_LARGE_TEXT: 3.0,
  AA_UI_COMPONENTS: 3.0,
  AAA_NORMAL_TEXT: 7.0,
  AAA_LARGE_TEXT: 4.5,
  FOCUS_INDICATOR: 3.0, // WCAG 2.4.11
};

/**
 * Check WCAG compliance for a color pair
 * @param {string} foreground - Foreground hex color
 * @param {string} background - Background hex color
 * @returns {Object} Compliance results
 */
function checkWCAG(foreground, background) {
  const ratio = getContrastRatio(foreground, background);
  return {
    ratio: ratio.toFixed(2),
    rawRatio: ratio,
    AA: {
      normalText: ratio >= WCAG_THRESHOLDS.AA_NORMAL_TEXT,
      largeText: ratio >= WCAG_THRESHOLDS.AA_LARGE_TEXT,
      uiComponents: ratio >= WCAG_THRESHOLDS.AA_UI_COMPONENTS
    },
    AAA: {
      normalText: ratio >= WCAG_THRESHOLDS.AAA_NORMAL_TEXT,
      largeText: ratio >= WCAG_THRESHOLDS.AAA_LARGE_TEXT
    }
  };
}

/**
 * Get WCAG compliance level string
 * @param {number} ratio - Contrast ratio
 * @returns {string} Compliance level
 */
function getComplianceLevel(ratio) {
  if (ratio >= WCAG_THRESHOLDS.AAA_NORMAL_TEXT) return 'AAA';
  if (ratio >= WCAG_THRESHOLDS.AA_NORMAL_TEXT) return 'AA';
  if (ratio >= WCAG_THRESHOLDS.AA_LARGE_TEXT) return 'AA-large';
  return 'Fail';
}

// ============ ACCESSIBILITY AUDIT ============

/**
 * Audit color combinations for accessibility
 * @param {Object} colors - Design system colors object
 * @returns {Object} Audit results with issues and passing combinations
 */
function auditAccessibility(colors) {
  const issues = [];
  const passing = [];

  // Get background and text colors
  const backgrounds = colors.semantic?.backgrounds?.map(c => c.value) || [];
  const textColors = colors.semantic?.text?.map(c => c.value) || [];

  // Check common combinations
  for (const bg of backgrounds.slice(0, 5)) {
    for (const text of textColors.slice(0, 5)) {
      if (!bg || !text) continue;
      const result = checkWCAG(text, bg);
      const combo = { foreground: text, background: bg, ...result };

      if (!result.AA.normalText) {
        issues.push({
          type: 'contrast',
          severity: 'error',
          ...combo,
          message: `Fails WCAG AA for normal text (${result.ratio}:1, needs 4.5:1)`
        });
      } else if (!result.AAA.normalText) {
        issues.push({
          type: 'contrast',
          severity: 'warning',
          ...combo,
          message: `Passes AA but fails AAA (${result.ratio}:1, needs 7:1 for AAA)`
        });
      } else {
        passing.push(combo);
      }
    }
  }

  return { issues, passing };
}

// ============ FOCUS INDICATOR AUDIT ============

/**
 * Audit focus indicators for WCAG 2.4.7 and 2.4.11 compliance
 * @param {Object} focusIndicators - Focus indicator styles
 * @param {Object} colors - Design system colors for background detection
 * @returns {Object} Audit results
 */
function auditFocusIndicators(focusIndicators, colors) {
  const issues = [];
  const passing = [];

  if (!focusIndicators || Object.keys(focusIndicators).length === 0) {
    return {
      issues: [{
        type: 'focus',
        severity: 'error',
        message: 'No focus indicators detected - WCAG 2.4.7 requires visible focus'
      }],
      passing: [],
      score: 0,
      hasAnyIndicator: false
    };
  }

  // Determine likely background color
  const backgroundColor = colors?.semantic?.backgrounds?.[0]?.value ||
                          colors?.palette?.[0]?.value ||
                          '#ffffff';

  for (const [selector, indicator] of Object.entries(focusIndicators)) {
    const result = auditSingleFocusIndicator(indicator, backgroundColor, selector);
    if (result.passed) {
      passing.push(result);
    } else {
      issues.push(...result.issues);
    }
  }

  const total = Object.keys(focusIndicators).length;
  const score = total > 0 ? Math.round((passing.length / total) * 100) : 0;

  return {
    issues,
    passing,
    score,
    hasAnyIndicator: true
  };
}

/**
 * Audit a single focus indicator
 * @param {Object} indicator - Focus indicator styles
 * @param {string} backgroundColor - Background color for contrast check
 * @param {string} type - Indicator type/selector
 * @returns {Object} Audit result
 */
function auditSingleFocusIndicator(indicator, backgroundColor, type) {
  const issues = [];
  let passed = true;

  // Check outline or border presence
  const outlineColor = normalizeColor(indicator.outlineColor) ||
                       normalizeColor(indicator.borderColor);

  if (!outlineColor) {
    return {
      type,
      passed: false,
      issues: [{
        type: 'focus',
        severity: 'warning',
        selector: type,
        message: `No outline/border color detected for ${type}`
      }]
    };
  }

  // Check thickness (WCAG 2.4.11 recommends >= 2px)
  const thickness = parseFloat(indicator.outlineWidth || indicator.borderWidth || '0');
  if (thickness < 1) {
    issues.push({
      type: 'focus',
      severity: 'error',
      selector: type,
      message: `Focus indicator too thin (${thickness}px, minimum 1px required)`
    });
    passed = false;
  } else if (thickness < 2) {
    issues.push({
      type: 'focus',
      severity: 'warning',
      selector: type,
      message: `Focus indicator thin (${thickness}px, 2px+ recommended)`
    });
  }

  // Check contrast (WCAG 2.4.11 requires >= 3:1)
  const contrast = getContrastRatio(outlineColor, backgroundColor);
  if (contrast < WCAG_THRESHOLDS.FOCUS_INDICATOR) {
    issues.push({
      type: 'focus',
      severity: 'error',
      selector: type,
      outlineColor,
      backgroundColor,
      contrast: contrast.toFixed(2),
      message: `Focus indicator contrast too low (${contrast.toFixed(2)}:1, needs 3:1)`
    });
    passed = false;
  }

  return {
    type,
    passed: passed && issues.length === 0,
    outlineColor,
    thickness,
    contrast: contrast.toFixed(2),
    issues
  };
}

/**
 * Compare focus indicators between project and reference
 * @param {Object} projectFocus - Project focus indicators
 * @param {Object} referenceFocus - Reference focus indicators
 * @returns {Object} Comparison results
 */
function compareFocusIndicators(projectFocus, referenceFocus) {
  const matches = [];
  const differences = [];
  const missing = [];

  if (!referenceFocus) {
    return { matches, differences, missing, score: 100 };
  }

  for (const [selector, refIndicator] of Object.entries(referenceFocus)) {
    const projIndicator = projectFocus?.[selector];

    if (!projIndicator) {
      missing.push({ selector, reference: refIndicator });
      continue;
    }

    // Compare outline colors
    const refColor = normalizeColor(refIndicator.outlineColor || refIndicator.borderColor);
    const projColor = normalizeColor(projIndicator.outlineColor || projIndicator.borderColor);

    if (refColor && projColor) {
      const colorDiff = deltaE2000(refColor, projColor);
      if (colorDiff < 5) {
        matches.push({ selector, project: projIndicator, reference: refIndicator, colorDiff });
      } else {
        differences.push({
          selector,
          project: projIndicator,
          reference: refIndicator,
          colorDiff,
          message: `Focus color differs (ΔE ${colorDiff.toFixed(1)})`
        });
      }
    }
  }

  const total = Object.keys(referenceFocus).length;
  const score = total > 0 ? Math.round((matches.length / total) * 100) : 100;

  return { matches, differences, missing, score };
}

module.exports = {
  // Core functions
  getLuminance,
  getContrastRatio,

  // WCAG compliance
  checkWCAG,
  getComplianceLevel,
  WCAG_THRESHOLDS,

  // Auditing
  auditAccessibility,
  auditFocusIndicators,
  auditSingleFocusIndicator,
  compareFocusIndicators,
};
