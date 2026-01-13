/**
 * Contrast Utilities Tests
 *
 * Tests for scripts/lib/contrast-utils.js
 */

const {
  getLuminance,
  getContrastRatio,
  checkWCAG,
  getComplianceLevel,
  WCAG_THRESHOLDS
} = require('../scripts/lib/contrast-utils');

describe('getLuminance', () => {
  it('returns 1 for white', () => {
    assert.closeTo(getLuminance('#ffffff'), 1, 0.01);
  });

  it('returns 0 for black', () => {
    assert.closeTo(getLuminance('#000000'), 0, 0.01);
  });

  it('returns middle value for gray', () => {
    const lum = getLuminance('#808080');
    assert.truthy(lum > 0.1 && lum < 0.5, 'Gray should have mid luminance');
  });

  it('returns 0 for invalid colors', () => {
    assert.equal(getLuminance('invalid'), 0);
    assert.equal(getLuminance(null), 0);
  });
});

describe('getContrastRatio', () => {
  it('returns 21:1 for black on white', () => {
    assert.closeTo(getContrastRatio('#000000', '#ffffff'), 21, 0.1);
  });

  it('returns 1:1 for same color', () => {
    assert.closeTo(getContrastRatio('#ff0000', '#ff0000'), 1, 0.01);
  });

  it('is symmetric', () => {
    const ratio1 = getContrastRatio('#000000', '#ffffff');
    const ratio2 = getContrastRatio('#ffffff', '#000000');
    assert.closeTo(ratio1, ratio2, 0.01);
  });

  it('handles colored combinations', () => {
    // Yellow on black should have good contrast
    const ratio = getContrastRatio('#ffff00', '#000000');
    assert.truthy(ratio > 10, 'Yellow on black should have good contrast');
  });
});

describe('checkWCAG', () => {
  it('passes all levels for black on white', () => {
    const result = checkWCAG('#000000', '#ffffff');
    assert.truthy(result.AA.normalText);
    assert.truthy(result.AA.largeText);
    assert.truthy(result.AA.uiComponents);
    assert.truthy(result.AAA.normalText);
    assert.truthy(result.AAA.largeText);
  });

  it('fails AA for low contrast colors', () => {
    // Light gray on white - low contrast
    const result = checkWCAG('#cccccc', '#ffffff');
    assert.falsy(result.AA.normalText);
  });

  it('returns numeric ratio', () => {
    const result = checkWCAG('#000000', '#ffffff');
    assert.truthy(parseFloat(result.ratio) > 20);
  });
});

describe('getComplianceLevel', () => {
  it('returns AAA for high ratios', () => {
    assert.equal(getComplianceLevel(21), 'AAA');
    assert.equal(getComplianceLevel(7.5), 'AAA');
  });

  it('returns AA for medium ratios', () => {
    assert.equal(getComplianceLevel(5), 'AA');
    assert.equal(getComplianceLevel(4.5), 'AA');
  });

  it('returns AA-large for lower ratios', () => {
    assert.equal(getComplianceLevel(3.5), 'AA-large');
    assert.equal(getComplianceLevel(3), 'AA-large');
  });

  it('returns Fail for low ratios', () => {
    assert.equal(getComplianceLevel(2), 'Fail');
    assert.equal(getComplianceLevel(1), 'Fail');
  });
});

describe('WCAG_THRESHOLDS', () => {
  it('has correct AA thresholds', () => {
    assert.equal(WCAG_THRESHOLDS.AA_NORMAL_TEXT, 4.5);
    assert.equal(WCAG_THRESHOLDS.AA_LARGE_TEXT, 3.0);
    assert.equal(WCAG_THRESHOLDS.AA_UI_COMPONENTS, 3.0);
  });

  it('has correct AAA thresholds', () => {
    assert.equal(WCAG_THRESHOLDS.AAA_NORMAL_TEXT, 7.0);
    assert.equal(WCAG_THRESHOLDS.AAA_LARGE_TEXT, 4.5);
  });

  it('has focus indicator threshold', () => {
    assert.equal(WCAG_THRESHOLDS.FOCUS_INDICATOR, 3.0);
  });
});
