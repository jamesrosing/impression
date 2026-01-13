/**
 * Color Utilities Tests
 *
 * Tests for scripts/lib/color-utils.js
 */

const {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  rgbToLab,
  deltaE2000,
  deltaE76,
  normalizeColor,
  getColorCharacteristics,
  blendColors,
  colorsAreSimilar
} = require('../scripts/lib/color-utils');

describe('hexToRgb', () => {
  it('converts 6-digit hex to RGB', () => {
    const result = hexToRgb('#ff0000');
    assert.deepEqual(result, { r: 255, g: 0, b: 0 });
  });

  it('converts 3-digit hex to RGB', () => {
    const result = hexToRgb('#f00');
    assert.deepEqual(result, { r: 255, g: 0, b: 0 });
  });

  it('handles hex without # prefix', () => {
    const result = hexToRgb('00ff00');
    assert.deepEqual(result, { r: 0, g: 255, b: 0 });
  });

  it('returns null for invalid hex', () => {
    assert.isNull(hexToRgb('invalid'));
    assert.isNull(hexToRgb(null));
    assert.isNull(hexToRgb(''));
  });

  it('handles white and black', () => {
    assert.deepEqual(hexToRgb('#ffffff'), { r: 255, g: 255, b: 255 });
    assert.deepEqual(hexToRgb('#000000'), { r: 0, g: 0, b: 0 });
  });
});

describe('rgbToHex', () => {
  it('converts RGB to hex', () => {
    assert.equal(rgbToHex({ r: 255, g: 0, b: 0 }), '#ff0000');
    assert.equal(rgbToHex({ r: 0, g: 255, b: 0 }), '#00ff00');
    assert.equal(rgbToHex({ r: 0, g: 0, b: 255 }), '#0000ff');
  });

  it('clamps values to 0-255', () => {
    assert.equal(rgbToHex({ r: 300, g: -10, b: 128 }), '#ff0080');
  });

  it('returns null for invalid input', () => {
    assert.isNull(rgbToHex(null));
  });
});

describe('rgbToHsl', () => {
  it('converts red to HSL', () => {
    const result = rgbToHsl({ r: 255, g: 0, b: 0 });
    assert.equal(result.h, 0);
    assert.equal(result.s, 100);
    assert.equal(result.l, 50);
  });

  it('converts green to HSL', () => {
    const result = rgbToHsl({ r: 0, g: 255, b: 0 });
    assert.equal(result.h, 120);
    assert.equal(result.s, 100);
    assert.equal(result.l, 50);
  });

  it('converts blue to HSL', () => {
    const result = rgbToHsl({ r: 0, g: 0, b: 255 });
    assert.equal(result.h, 240);
    assert.equal(result.s, 100);
    assert.equal(result.l, 50);
  });

  it('handles grayscale (no saturation)', () => {
    const result = rgbToHsl({ r: 128, g: 128, b: 128 });
    assert.equal(result.s, 0);
  });

  it('handles white and black', () => {
    const white = rgbToHsl({ r: 255, g: 255, b: 255 });
    assert.equal(white.l, 100);

    const black = rgbToHsl({ r: 0, g: 0, b: 0 });
    assert.equal(black.l, 0);
  });
});

describe('hslToRgb', () => {
  it('converts HSL to RGB', () => {
    const red = hslToRgb({ h: 0, s: 100, l: 50 });
    assert.deepEqual(red, { r: 255, g: 0, b: 0 });

    const green = hslToRgb({ h: 120, s: 100, l: 50 });
    assert.deepEqual(green, { r: 0, g: 255, b: 0 });
  });

  it('handles grayscale', () => {
    const gray = hslToRgb({ h: 0, s: 0, l: 50 });
    assert.equal(gray.r, 128);
    assert.equal(gray.g, 128);
    assert.equal(gray.b, 128);
  });
});

describe('rgbToLab', () => {
  it('converts white to LAB', () => {
    const result = rgbToLab({ r: 255, g: 255, b: 255 });
    assert.closeTo(result.L, 100, 0.5);
    assert.closeTo(result.a, 0, 1);
    assert.closeTo(result.b, 0, 1);
  });

  it('converts black to LAB', () => {
    const result = rgbToLab({ r: 0, g: 0, b: 0 });
    assert.closeTo(result.L, 0, 0.5);
  });

  it('returns null for invalid input', () => {
    assert.isNull(rgbToLab(null));
  });
});

describe('deltaE2000', () => {
  it('returns 0 for identical colors', () => {
    assert.closeTo(deltaE2000('#ff0000', '#ff0000'), 0, 0.01);
    assert.closeTo(deltaE2000('#000000', '#000000'), 0, 0.01);
  });

  it('returns low value for similar colors', () => {
    // Very similar reds
    const diff = deltaE2000('#ff0000', '#fe0000');
    assert.truthy(diff < 1, 'Similar colors should have ΔE < 1');
  });

  it('returns high value for different colors', () => {
    // Red vs Blue - very different
    const diff = deltaE2000('#ff0000', '#0000ff');
    assert.truthy(diff > 50, 'Different colors should have high ΔE');
  });

  it('is symmetric', () => {
    const diff1 = deltaE2000('#ff0000', '#00ff00');
    const diff2 = deltaE2000('#00ff00', '#ff0000');
    assert.closeTo(diff1, diff2, 0.01);
  });

  it('returns Infinity for invalid colors', () => {
    assert.equal(deltaE2000('invalid', '#ff0000'), Infinity);
    assert.equal(deltaE2000('#ff0000', null), Infinity);
  });
});

describe('deltaE76', () => {
  it('returns 0 for identical colors', () => {
    assert.closeTo(deltaE76('#ffffff', '#ffffff'), 0, 0.01);
  });

  it('returns Infinity for invalid colors', () => {
    assert.equal(deltaE76('invalid', '#ff0000'), Infinity);
  });
});

describe('normalizeColor', () => {
  it('normalizes 3-digit hex', () => {
    assert.equal(normalizeColor('#f00'), '#ff0000');
  });

  it('normalizes rgb() format', () => {
    assert.equal(normalizeColor('rgb(255, 0, 0)'), '#ff0000');
    assert.equal(normalizeColor('rgb(0,255,0)'), '#00ff00');
  });

  it('normalizes rgba() format', () => {
    assert.equal(normalizeColor('rgba(255, 0, 0, 0.5)'), '#ff0000');
  });

  it('normalizes hsl() format', () => {
    const result = normalizeColor('hsl(0, 100%, 50%)');
    assert.equal(result, '#ff0000');
  });

  it('handles named colors', () => {
    assert.equal(normalizeColor('white'), '#ffffff');
    assert.equal(normalizeColor('black'), '#000000');
    assert.equal(normalizeColor('red'), '#ff0000');
  });

  it('handles case insensitivity', () => {
    assert.equal(normalizeColor('WHITE'), '#ffffff');
    assert.equal(normalizeColor('#FF0000'), '#ff0000');
  });

  it('returns null for invalid input', () => {
    assert.isNull(normalizeColor(null));
    assert.isNull(normalizeColor(''));
    assert.isNull(normalizeColor('notacolor'));
    assert.isNull(normalizeColor('transparent'));
  });
});

describe('getColorCharacteristics', () => {
  it('identifies neutral colors', () => {
    const gray = getColorCharacteristics('#808080');
    assert.truthy(gray.isNeutral);
  });

  it('identifies light colors', () => {
    const light = getColorCharacteristics('#f0f0f0');
    assert.truthy(light.isLight);
  });

  it('identifies dark colors', () => {
    const dark = getColorCharacteristics('#1a1a1a');
    assert.truthy(dark.isDark);
  });

  it('identifies vibrant colors', () => {
    const vibrant = getColorCharacteristics('#ff0000');
    assert.truthy(vibrant.isVibrant);
  });
});

describe('blendColors', () => {
  it('blends with 50/50 weight', () => {
    const result = blendColors('#ff0000', '#0000ff', 0.5);
    // Should be purple-ish
    const rgb = hexToRgb(result);
    assert.closeTo(rgb.r, 128, 1);
    assert.closeTo(rgb.b, 128, 1);
  });

  it('returns first color at weight 1', () => {
    const result = blendColors('#ff0000', '#0000ff', 1);
    assert.equal(result, '#ff0000');
  });

  it('returns second color at weight 0', () => {
    const result = blendColors('#ff0000', '#0000ff', 0);
    assert.equal(result, '#0000ff');
  });
});

describe('colorsAreSimilar', () => {
  it('returns true for identical colors', () => {
    assert.truthy(colorsAreSimilar('#ff0000', '#ff0000'));
  });

  it('returns true for very similar colors', () => {
    assert.truthy(colorsAreSimilar('#ff0000', '#fe0101'));
  });

  it('returns false for different colors', () => {
    assert.falsy(colorsAreSimilar('#ff0000', '#0000ff'));
  });

  it('respects custom threshold', () => {
    // With very low threshold, even similar colors fail
    assert.falsy(colorsAreSimilar('#ff0000', '#fe0000', 0.001));
  });
});
