/**
 * Design System Extractor v3.0
 * Enhanced extraction with:
 * - Interaction state capture (hover, focus, active, disabled)
 * - Cubic-bezier/spring curve extraction
 * - Multi-viewport responsive token support
 * - Enhanced semantic role inference
 * - Dark/light mode detection
 * - Gradient and component pattern extraction
 *
 * Inject this script into a page via Playwright browser_run_code or browser_evaluate
 * Returns comprehensive design tokens extracted from the live page
 */

const extractDesignSystem = (options = {}) => {
  const {
    scrollCapture = false,           // Scroll page to trigger lazy-loaded content
    captureComponents = true,        // Extract component patterns
    captureInteractionStates = true, // Extract hover/focus/active/disabled states
    inferRoles = true,               // Infer semantic roles for colors
    detectThemes = true,             // Detect dark/light mode themes
    viewport = null                  // Current viewport label (for responsive extraction)
  } = options;

  const result = {
    meta: {
      url: window.location.href,
      title: document.title,
      extractedAt: new Date().toISOString(),
      extractorVersion: '3.0.0',
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        label: viewport || 'default'
      },
      designCharacter: '',
      detectedTheme: 'unknown'
    },
    colors: {
      cssVariables: {},
      palette: [],
      semantic: {
        primary: null,
        secondary: null,
        accent: null,
        background: { primary: null, secondary: null, tertiary: null },
        foreground: { primary: null, secondary: null, muted: null },
        border: { default: null, muted: null },
        success: null,
        warning: null,
        error: null,
        info: null
      },
      computed: { backgrounds: [], text: [], borders: [], accents: [] },
      gradients: [],
      light: null,
      dark: null
    },
    typography: {
      fontFamilies: [],
      scale: [],
      lineHeights: [],
      letterSpacing: [],
      fontWeights: [],
      pairings: []
    },
    spacing: {
      scale: [],
      grid: null,
      gaps: [],
      paddings: [],
      margins: []
    },
    animations: {
      keyframes: {},
      transitions: [],
      durations: [],
      easings: [],
      cubicBeziers: [],    // Extracted cubic-bezier curves with names
      springConfigs: []     // CSS spring() if detected
    },
    components: {
      buttons: [],
      inputs: [],
      cards: [],
      navigation: [],
      modals: [],
      dropdowns: [],
      badges: [],
      alerts: [],
      links: []
    },
    interactionStates: {
      buttons: { default: [], hover: [], focus: [], active: [], disabled: [] },
      inputs: { default: [], hover: [], focus: [], active: [], disabled: [] },
      links: { default: [], hover: [], focus: [], active: [], visited: [] },
      cards: { default: [], hover: [] }
    },
    focusIndicators: {
      outlineStyles: [],
      ringStyles: [],
      shadowStyles: [],
      hasVisibleFocus: false
    },
    icons: { library: null, sizes: [], colors: [] },
    breakpoints: { detected: [], containerWidths: [] },
    shadows: [],
    borderRadius: []
  };

  // ============ UTILITY FUNCTIONS ============

  const rgbToHex = (rgb) => {
    if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return null;
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return rgb.startsWith('#') ? rgb : null;
    const [, r, g, b] = match;
    return '#' + [r, g, b].map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
  };

  const rgbToHsl = (rgb) => {
    if (!rgb) return null;
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return null;
    let [, r, g, b] = match.map(Number);
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
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
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  };

  const parseGradient = (value) => {
    if (!value || !value.includes('gradient')) return null;
    const gradientMatch = value.match(/(linear-gradient|radial-gradient|conic-gradient)\(([^)]+)\)/);
    if (!gradientMatch) return null;

    const type = gradientMatch[1];
    const content = gradientMatch[2];
    const colors = [];

    const colorMatches = content.matchAll(/(#[a-fA-F0-9]{3,8}|rgba?\([^)]+\)|[a-z]+(?=\s|,|$))/gi);
    for (const match of colorMatches) {
      const hex = rgbToHex(match[1]) || match[1];
      if (hex && hex.startsWith('#')) colors.push(hex);
    }

    return { type, raw: value, colors };
  };

  const parseCubicBezier = (value) => {
    if (!value) return [];
    const beziers = [];

    // Named easings to cubic-bezier mapping
    const namedEasings = {
      'ease': { value: 'cubic-bezier(0.25, 0.1, 0.25, 1)', name: 'ease' },
      'ease-in': { value: 'cubic-bezier(0.42, 0, 1, 1)', name: 'ease-in' },
      'ease-out': { value: 'cubic-bezier(0, 0, 0.58, 1)', name: 'ease-out' },
      'ease-in-out': { value: 'cubic-bezier(0.42, 0, 0.58, 1)', name: 'ease-in-out' },
      'linear': { value: 'cubic-bezier(0, 0, 1, 1)', name: 'linear' }
    };

    // Extract cubic-bezier functions
    const bezierMatches = value.matchAll(/cubic-bezier\(\s*([0-9.]+)\s*,\s*([0-9.-]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.-]+)\s*\)/g);
    for (const match of bezierMatches) {
      const [, x1, y1, x2, y2] = match;
      const bezierValue = `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;

      // Try to identify common patterns
      let name = 'custom';
      const params = [parseFloat(x1), parseFloat(y1), parseFloat(x2), parseFloat(y2)];

      // Common easing patterns
      if (params[0] === 0.16 && params[1] === 1 && params[2] === 0.3 && params[3] === 1) name = 'ease-out-expo';
      else if (params[0] === 0.7 && params[1] === 0 && params[2] === 0.84 && params[3] === 0) name = 'ease-in-expo';
      else if (params[0] === 0.87 && params[1] === 0 && params[2] === 0.13 && params[3] === 1) name = 'ease-in-out-expo';
      else if (params[0] === 0.33 && params[1] === 1 && params[2] === 0.68 && params[3] === 1) name = 'ease-out-cubic';
      else if (params[0] === 0.32 && params[1] === 0 && params[2] === 0.67 && params[3] === 0) name = 'ease-in-cubic';
      else if (params[0] === 0.22 && params[1] === 1 && params[2] === 0.36 && params[3] === 1) name = 'ease-out-quint';
      else if (params[1] < 0 || params[3] > 1) name = 'spring-like';

      beziers.push({ value: bezierValue, name, params });
    }

    // Check for named easings
    for (const [named, data] of Object.entries(namedEasings)) {
      if (value.includes(named) && !value.includes('cubic-bezier')) {
        beziers.push(data);
      }
    }

    // Check for CSS spring() function (experimental)
    const springMatch = value.match(/spring\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)(?:\s+([0-9.]+))?\s*\)/);
    if (springMatch) {
      const [, mass, stiffness, damping, velocity = '0'] = springMatch;
      beziers.push({
        value: `spring(${mass} ${stiffness} ${damping} ${velocity})`,
        name: 'spring',
        params: { mass: parseFloat(mass), stiffness: parseFloat(stiffness), damping: parseFloat(damping), velocity: parseFloat(velocity) }
      });
    }

    return beziers;
  };

  const countOccurrences = (arr) => {
    const counts = {};
    arr.forEach(item => { if (item) counts[item] = (counts[item] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }));
  };

  const getLuminance = (hex) => {
    if (!hex) return 0;
    const rgb = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!rgb) return 0;
    const [r, g, b] = [1, 2, 3].map(i => {
      const c = parseInt(rgb[i], 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const isDarkColor = (hex) => getLuminance(hex) < 0.5;

  const getContrastRatio = (hex1, hex2) => {
    const l1 = getLuminance(hex1);
    const l2 = getLuminance(hex2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  };

  // ============ THEME DETECTION ============

  const detectTheme = () => {
    let hasDarkMediaQuery = false;
    let hasLightMediaQuery = false;

    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.type === CSSRule.MEDIA_RULE) {
            if (rule.conditionText.includes('prefers-color-scheme: dark')) hasDarkMediaQuery = true;
            if (rule.conditionText.includes('prefers-color-scheme: light')) hasLightMediaQuery = true;
          }
        }
      } catch (e) {}
    }

    const html = document.documentElement;
    const body = document.body;
    const themeClasses = ['dark', 'light', 'theme-dark', 'theme-light', 'dark-mode', 'light-mode'];
    const themeAttrs = ['data-theme', 'data-mode', 'data-color-scheme', 'data-color-mode'];

    let currentTheme = 'unknown';

    for (const cls of themeClasses) {
      if (html.classList.contains(cls) || body.classList.contains(cls)) {
        currentTheme = cls.includes('dark') ? 'dark' : 'light';
        break;
      }
    }

    for (const attr of themeAttrs) {
      const val = html.getAttribute(attr) || body.getAttribute(attr);
      if (val) {
        currentTheme = val.includes('dark') ? 'dark' : 'light';
        break;
      }
    }

    if (currentTheme === 'unknown') {
      const bgColor = getComputedStyle(body).backgroundColor;
      const hex = rgbToHex(bgColor);
      if (hex) {
        currentTheme = isDarkColor(hex) ? 'dark' : 'light';
      }
    }

    result.meta.detectedTheme = (hasDarkMediaQuery && hasLightMediaQuery) ? 'both' : currentTheme;
    return { hasDarkMediaQuery, hasLightMediaQuery, currentTheme };
  };

  // ============ CSS VARIABLES & KEYFRAMES ============

  const extractCSSRules = () => {
    const cssVars = {};
    const darkVars = {};
    const lightVars = {};
    const allCubicBeziers = [];

    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.type === CSSRule.STYLE_RULE) {
            if (rule.selectorText === ':root' || rule.selectorText === 'html') {
              for (const prop of rule.style) {
                if (prop.startsWith('--')) cssVars[prop] = rule.style.getPropertyValue(prop).trim();
              }
            }
            if (rule.selectorText.includes('.dark') || rule.selectorText.includes('[data-theme="dark"]')) {
              for (const prop of rule.style) {
                if (prop.startsWith('--')) darkVars[prop] = rule.style.getPropertyValue(prop).trim();
              }
            }
            if (rule.selectorText.includes('.light') || rule.selectorText.includes('[data-theme="light"]')) {
              for (const prop of rule.style) {
                if (prop.startsWith('--')) lightVars[prop] = rule.style.getPropertyValue(prop).trim();
              }
            }

            // Extract cubic-beziers from transition/animation properties
            const transition = rule.style.transition;
            const animation = rule.style.animation;
            const animationTimingFunction = rule.style.animationTimingFunction;
            const transitionTimingFunction = rule.style.transitionTimingFunction;

            [transition, animation, animationTimingFunction, transitionTimingFunction].forEach(val => {
              if (val) {
                const beziers = parseCubicBezier(val);
                allCubicBeziers.push(...beziers);
              }
            });
          }

          if (rule.type === CSSRule.KEYFRAMES_RULE) {
            result.animations.keyframes[rule.name] = rule.cssText;
          }

          if (rule.type === CSSRule.MEDIA_RULE) {
            const bpMatches = rule.conditionText.matchAll(/\((?:min|max)-width:\s*(\d+(?:\.\d+)?)(px|em|rem)\)/g);
            for (const match of bpMatches) {
              let value = parseFloat(match[1]);
              if (match[2] === 'em' || match[2] === 'rem') value *= 16;
              result.breakpoints.detected.push(Math.round(value));
            }

            if (rule.conditionText.includes('prefers-color-scheme: dark')) {
              for (const innerRule of rule.cssRules) {
                if (innerRule.type === CSSRule.STYLE_RULE &&
                    (innerRule.selectorText === ':root' || innerRule.selectorText === 'html')) {
                  for (const prop of innerRule.style) {
                    if (prop.startsWith('--')) darkVars[prop] = innerRule.style.getPropertyValue(prop).trim();
                  }
                }
              }
            }

            if (rule.conditionText.includes('prefers-color-scheme: light')) {
              for (const innerRule of rule.cssRules) {
                if (innerRule.type === CSSRule.STYLE_RULE &&
                    (innerRule.selectorText === ':root' || innerRule.selectorText === 'html')) {
                  for (const prop of innerRule.style) {
                    if (prop.startsWith('--')) lightVars[prop] = innerRule.style.getPropertyValue(prop).trim();
                  }
                }
              }
            }
          }
        }
      } catch (e) {}
    }

    result.colors.cssVariables = cssVars;
    if (Object.keys(darkVars).length > 0) result.colors.dark = { cssVariables: darkVars };
    if (Object.keys(lightVars).length > 0) result.colors.light = { cssVariables: lightVars };

    // Dedupe cubic beziers
    const seenBeziers = new Set();
    result.animations.cubicBeziers = allCubicBeziers.filter(b => {
      if (seenBeziers.has(b.value)) return false;
      seenBeziers.add(b.value);
      return true;
    });
  };

  // ============ ENHANCED SEMANTIC ROLE INFERENCE ============

  const inferColorRoles = (colorData) => {
    // Background analysis
    const bgCounts = countOccurrences(colorData.bg);
    const textCounts = countOccurrences(colorData.text);
    const borderCounts = countOccurrences(colorData.border);
    const accentCounts = countOccurrences(colorData.accent);

    // Primary background (most common)
    if (bgCounts[0]) {
      result.colors.semantic.background.primary = bgCounts[0].value;
      if (bgCounts[1]) result.colors.semantic.background.secondary = bgCounts[1].value;
      if (bgCounts[2]) result.colors.semantic.background.tertiary = bgCounts[2].value;
    }

    // Primary foreground (most common text)
    if (textCounts[0]) {
      result.colors.semantic.foreground.primary = textCounts[0].value;
      if (textCounts[1]) result.colors.semantic.foreground.secondary = textCounts[1].value;
      // Find muted (low contrast text)
      const primaryBg = result.colors.semantic.background.primary;
      if (primaryBg) {
        const mutedText = textCounts.find(t => {
          const contrast = getContrastRatio(t.value, primaryBg);
          return contrast > 2 && contrast < 4.5; // Low but visible contrast
        });
        if (mutedText) result.colors.semantic.foreground.muted = mutedText.value;
      }
    }

    // Border colors
    if (borderCounts[0]) {
      result.colors.semantic.border.default = borderCounts[0].value;
      // Find muted border (very low contrast)
      const primaryBg = result.colors.semantic.background.primary;
      if (primaryBg && borderCounts[1]) {
        const contrast1 = getContrastRatio(borderCounts[0].value, primaryBg);
        const contrast2 = getContrastRatio(borderCounts[1].value, primaryBg);
        if (contrast2 < contrast1) {
          result.colors.semantic.border.muted = borderCounts[1].value;
        }
      }
    }

    // Accent color (from interactive elements)
    if (accentCounts[0]) {
      result.colors.semantic.accent = accentCounts[0].value;
    }

    // Semantic colors by HSL analysis
    const allColors = [...new Set([...colorData.bg, ...colorData.text, ...colorData.accent, ...colorData.border])];

    for (const hex of allColors) {
      if (!hex) continue;
      const hsl = rgbToHsl(`rgb(${parseInt(hex.slice(1,3),16)}, ${parseInt(hex.slice(3,5),16)}, ${parseInt(hex.slice(5,7),16)})`);
      if (!hsl) continue;

      // Green hues (80-160) = success
      if (hsl.h >= 80 && hsl.h <= 160 && hsl.s > 30 && !result.colors.semantic.success) {
        result.colors.semantic.success = hex;
      }
      // Red hues (0-20 or 340-360) = error
      if ((hsl.h <= 20 || hsl.h >= 340) && hsl.s > 40 && !result.colors.semantic.error) {
        result.colors.semantic.error = hex;
      }
      // Yellow/Orange hues (30-60) = warning
      if (hsl.h >= 30 && hsl.h <= 60 && hsl.s > 50 && !result.colors.semantic.warning) {
        result.colors.semantic.warning = hex;
      }
      // Blue hues (200-240) = info
      if (hsl.h >= 200 && hsl.h <= 240 && hsl.s > 40 && !result.colors.semantic.info) {
        result.colors.semantic.info = hex;
      }
    }

    // Try to identify primary/secondary from CSS variable names
    for (const [name, value] of Object.entries(result.colors.cssVariables)) {
      const hex = rgbToHex(value) || (value.startsWith('#') ? value : null);
      if (!hex) continue;

      const nameLower = name.toLowerCase();
      if (nameLower.includes('primary') && !nameLower.includes('text') && !nameLower.includes('bg')) {
        result.colors.semantic.primary = hex;
      }
      if (nameLower.includes('secondary') && !nameLower.includes('text') && !nameLower.includes('bg')) {
        result.colors.semantic.secondary = hex;
      }
      if (nameLower.includes('accent')) {
        result.colors.semantic.accent = hex;
      }
    }
  };

  // ============ INTERACTION STATE EXTRACTION ============

  const extractInteractionStates = () => {
    if (!captureInteractionStates) return;

    const extractElementState = (el, state) => {
      const cs = getComputedStyle(el);
      return {
        backgroundColor: rgbToHex(cs.backgroundColor),
        color: rgbToHex(cs.color),
        borderColor: rgbToHex(cs.borderColor),
        boxShadow: cs.boxShadow !== 'none' ? cs.boxShadow : null,
        outline: cs.outline !== 'none' ? cs.outline : null,
        outlineOffset: cs.outlineOffset,
        transform: cs.transform !== 'none' ? cs.transform : null,
        opacity: cs.opacity !== '1' ? cs.opacity : null,
        cursor: cs.cursor
      };
    };

    // Create a temporary style element for pseudo-class simulation
    const styleEl = document.createElement('style');
    document.head.appendChild(styleEl);

    // Extract button states
    document.querySelectorAll('button, [role="button"], a[class*="btn"], a[class*="button"]').forEach((el, idx) => {
      if (idx >= 5) return; // Limit to first 5 buttons

      // Default state
      result.interactionStates.buttons.default.push(extractElementState(el, 'default'));

      // Note: True hover/focus states require Playwright interaction
      // Here we capture computed styles that hint at interaction states
      const classes = el.classList.toString();
      if (classes.includes('hover') || classes.includes('active')) {
        result.interactionStates.buttons.hover.push({ note: 'hover class detected', classes });
      }
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') {
        result.interactionStates.buttons.disabled.push(extractElementState(el, 'disabled'));
      }
    });

    // Extract input states
    document.querySelectorAll('input:not([type="hidden"]), textarea, select').forEach((el, idx) => {
      if (idx >= 5) return;

      result.interactionStates.inputs.default.push(extractElementState(el, 'default'));

      if (el.disabled || el.getAttribute('aria-disabled') === 'true') {
        result.interactionStates.inputs.disabled.push(extractElementState(el, 'disabled'));
      }
    });

    // Extract link states
    document.querySelectorAll('a[href]').forEach((el, idx) => {
      if (idx >= 5) return;
      result.interactionStates.links.default.push(extractElementState(el, 'default'));
    });

    // Extract card hover hints
    document.querySelectorAll('[class*="card"], article').forEach((el, idx) => {
      if (idx >= 3) return;
      result.interactionStates.cards.default.push(extractElementState(el, 'default'));
    });

    // Clean up
    styleEl.remove();
  };

  // ============ FOCUS INDICATOR EXTRACTION ============

  const extractFocusIndicators = () => {
    const focusStyles = {
      outlines: [],
      rings: [],
      shadows: []
    };

    // Check CSS for focus-visible and focus rules
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.type === CSSRule.STYLE_RULE) {
            const selector = rule.selectorText;
            if (selector && (selector.includes(':focus') || selector.includes(':focus-visible') || selector.includes(':focus-within'))) {
              const style = rule.style;

              if (style.outline && style.outline !== 'none') {
                focusStyles.outlines.push({
                  selector,
                  outline: style.outline,
                  outlineOffset: style.outlineOffset
                });
              }

              if (style.boxShadow && style.boxShadow !== 'none') {
                // Check if it looks like a focus ring
                if (style.boxShadow.includes('0 0') || style.boxShadow.includes('inset')) {
                  focusStyles.rings.push({
                    selector,
                    boxShadow: style.boxShadow
                  });
                } else {
                  focusStyles.shadows.push({
                    selector,
                    boxShadow: style.boxShadow
                  });
                }
              }

              // Check for ring-* classes (Tailwind pattern)
              if (selector.includes('ring')) {
                focusStyles.rings.push({
                  selector,
                  ring: true
                });
              }
            }
          }
        }
      } catch (e) {}
    }

    result.focusIndicators.outlineStyles = [...new Set(focusStyles.outlines.map(f => f.outline))];
    result.focusIndicators.ringStyles = focusStyles.rings.slice(0, 5);
    result.focusIndicators.shadowStyles = focusStyles.shadows.slice(0, 5);
    result.focusIndicators.hasVisibleFocus = focusStyles.outlines.length > 0 || focusStyles.rings.length > 0 || focusStyles.shadows.length > 0;
  };

  // ============ TYPOGRAPHY PAIRING DETECTION ============

  const detectTypographyPairings = (fontData) => {
    const pairings = [];
    const fontUsage = {};

    fontData.forEach(f => {
      const key = f.family;
      if (!fontUsage[key]) {
        fontUsage[key] = { heading: 0, body: 0, sizes: [] };
      }
      const size = parseFloat(f.size);
      fontUsage[key].sizes.push(size);
      if (size >= 24) fontUsage[key].heading++;
      else fontUsage[key].body++;
    });

    let headingFont = null;
    let bodyFont = null;

    for (const [family, usage] of Object.entries(fontUsage)) {
      const avgSize = usage.sizes.reduce((a, b) => a + b, 0) / usage.sizes.length;
      if (usage.heading > usage.body && avgSize >= 20) {
        if (!headingFont || usage.heading > fontUsage[headingFont]?.heading) {
          headingFont = family;
        }
      } else {
        if (!bodyFont || usage.body > fontUsage[bodyFont]?.body) {
          bodyFont = family;
        }
      }
    }

    if (headingFont && bodyFont && headingFont !== bodyFont) {
      pairings.push({
        heading: headingFont,
        body: bodyFont,
        type: 'contrast'
      });
    } else if (headingFont || bodyFont) {
      pairings.push({
        heading: headingFont || bodyFont,
        body: bodyFont || headingFont,
        type: 'uniform'
      });
    }

    return pairings;
  };

  // ============ COMPONENT EXTRACTION ============

  const extractComponents = () => {
    // Buttons
    document.querySelectorAll('button, [role="button"], a[class*="btn"], a[class*="button"]').forEach(el => {
      const cs = getComputedStyle(el);
      result.components.buttons.push({
        text: el.textContent?.trim().slice(0, 50),
        variant: inferButtonVariant(el, cs),
        backgroundColor: rgbToHex(cs.backgroundColor),
        textColor: rgbToHex(cs.color),
        borderRadius: cs.borderRadius,
        padding: cs.padding,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        border: cs.border,
        boxShadow: cs.boxShadow !== 'none' ? cs.boxShadow : null,
        classes: el.classList.toString()
      });
    });

    // Inputs
    document.querySelectorAll('input:not([type="hidden"]), textarea, select').forEach(el => {
      const cs = getComputedStyle(el);
      result.components.inputs.push({
        type: el.type || el.tagName.toLowerCase(),
        backgroundColor: rgbToHex(cs.backgroundColor),
        borderColor: rgbToHex(cs.borderColor),
        borderRadius: cs.borderRadius,
        padding: cs.padding,
        fontSize: cs.fontSize,
        border: cs.border,
        classes: el.classList.toString()
      });
    });

    // Cards
    document.querySelectorAll('[class*="card"], article, [role="article"]').forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.boxShadow !== 'none' || cs.border !== 'none') {
        result.components.cards.push({
          backgroundColor: rgbToHex(cs.backgroundColor),
          borderRadius: cs.borderRadius,
          padding: cs.padding,
          boxShadow: cs.boxShadow !== 'none' ? cs.boxShadow : null,
          border: cs.border !== 'none' ? cs.border : null,
          classes: el.classList.toString()
        });
      }
    });

    // Links
    document.querySelectorAll('a[href]').forEach(el => {
      const cs = getComputedStyle(el);
      result.components.links.push({
        color: rgbToHex(cs.color),
        textDecoration: cs.textDecoration,
        fontWeight: cs.fontWeight,
        classes: el.classList.toString()
      });
    });

    // Navigation
    document.querySelectorAll('nav, [role="navigation"], header').forEach(el => {
      const cs = getComputedStyle(el);
      result.components.navigation.push({
        backgroundColor: rgbToHex(cs.backgroundColor),
        padding: cs.padding,
        position: cs.position,
        height: cs.height,
        classes: el.classList.toString()
      });
    });

    // Modals/Dialogs
    document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="dialog"]').forEach(el => {
      const cs = getComputedStyle(el);
      result.components.modals.push({
        backgroundColor: rgbToHex(cs.backgroundColor),
        borderRadius: cs.borderRadius,
        padding: cs.padding,
        boxShadow: cs.boxShadow,
        maxWidth: cs.maxWidth,
        classes: el.classList.toString()
      });
    });

    // Dropdowns
    document.querySelectorAll('[class*="dropdown"], [class*="menu"], [role="menu"]').forEach(el => {
      const cs = getComputedStyle(el);
      result.components.dropdowns.push({
        backgroundColor: rgbToHex(cs.backgroundColor),
        borderRadius: cs.borderRadius,
        padding: cs.padding,
        boxShadow: cs.boxShadow,
        border: cs.border,
        classes: el.classList.toString()
      });
    });

    // Badges/Tags
    document.querySelectorAll('[class*="badge"], [class*="tag"], [class*="chip"], [class*="label"]').forEach(el => {
      const cs = getComputedStyle(el);
      if (parseFloat(cs.fontSize) <= 14) {
        result.components.badges.push({
          backgroundColor: rgbToHex(cs.backgroundColor),
          textColor: rgbToHex(cs.color),
          borderRadius: cs.borderRadius,
          padding: cs.padding,
          fontSize: cs.fontSize,
          classes: el.classList.toString()
        });
      }
    });

    // Alerts/Notifications
    document.querySelectorAll('[role="alert"], [class*="alert"], [class*="notification"], [class*="toast"]').forEach(el => {
      const cs = getComputedStyle(el);
      result.components.alerts.push({
        backgroundColor: rgbToHex(cs.backgroundColor),
        textColor: rgbToHex(cs.color),
        borderRadius: cs.borderRadius,
        padding: cs.padding,
        border: cs.border,
        classes: el.classList.toString()
      });
    });
  };

  // Infer button variant from styles
  const inferButtonVariant = (el, cs) => {
    const bg = rgbToHex(cs.backgroundColor);
    const border = cs.border;
    const classes = el.classList.toString().toLowerCase();

    if (classes.includes('primary')) return 'primary';
    if (classes.includes('secondary')) return 'secondary';
    if (classes.includes('ghost') || classes.includes('link')) return 'ghost';
    if (classes.includes('outline') || classes.includes('bordered')) return 'outline';
    if (classes.includes('destructive') || classes.includes('danger')) return 'destructive';

    // Infer from styles
    if (!bg || bg === 'transparent' || bg === '#ffffff' || bg === '#000000') {
      if (border && border !== 'none' && !border.includes('0px')) return 'outline';
      return 'ghost';
    }

    return 'default';
  };

  // ============ MAIN DOM WALKER ============

  const walkDOM = () => {
    const colorData = { bg: [], text: [], border: [], accent: [] };
    const fontData = [];
    const spacingData = { padding: [], margin: [], gap: [] };
    const shadowData = [], radiusData = [], transitionData = [], containerWidths = [];
    const gradients = [];

    document.querySelectorAll('*').forEach(el => {
      const cs = getComputedStyle(el);
      const tag = el.tagName.toLowerCase();

      // Colors
      const bgColor = rgbToHex(cs.backgroundColor);
      const textColor = rgbToHex(cs.color);
      const borderColor = rgbToHex(cs.borderColor);

      if (bgColor) colorData.bg.push(bgColor);
      if (textColor) colorData.text.push(textColor);
      if (borderColor && borderColor !== bgColor) colorData.border.push(borderColor);

      // Accent colors from interactive elements
      if (['a', 'button', 'input', 'select'].includes(tag)) {
        if (bgColor && bgColor !== '#ffffff' && bgColor !== '#000000') {
          colorData.accent.push(bgColor);
        }
        if (textColor && textColor !== '#ffffff' && textColor !== '#000000' && tag === 'a') {
          colorData.accent.push(textColor);
        }
      }

      // Gradients
      const bgImage = cs.backgroundImage;
      if (bgImage && bgImage !== 'none') {
        const gradient = parseGradient(bgImage);
        if (gradient) gradients.push(gradient);
      }

      // Typography
      fontData.push({
        family: cs.fontFamily.split(',')[0].trim().replace(/['"]/g, ''),
        size: cs.fontSize,
        weight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing
      });

      // Spacing
      ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].forEach(prop => {
        if (cs[prop] && cs[prop] !== '0px') spacingData.padding.push(cs[prop]);
      });
      ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'].forEach(prop => {
        if (cs[prop] && cs[prop] !== '0px' && !cs[prop].includes('auto')) spacingData.margin.push(cs[prop]);
      });
      if (cs.gap && cs.gap !== 'normal') spacingData.gap.push(cs.gap);

      // Effects
      if (cs.boxShadow && cs.boxShadow !== 'none') shadowData.push(cs.boxShadow);
      if (cs.borderRadius && cs.borderRadius !== '0px') radiusData.push(cs.borderRadius);
      if (cs.transition && cs.transition !== 'all 0s ease 0s' && cs.transition !== 'none') {
        transitionData.push(cs.transition);
        // Extract durations
        const durationMatch = cs.transition.match(/(\d+\.?\d*m?s)/g);
        if (durationMatch) result.animations.durations.push(...durationMatch);
        // Extract easings including cubic-bezier
        const easingMatch = cs.transition.match(/(ease|ease-in|ease-out|ease-in-out|linear|cubic-bezier\([^)]+\))/g);
        if (easingMatch) {
          result.animations.easings.push(...easingMatch);
          // Also add to cubicBeziers with full parsing
          easingMatch.forEach(e => {
            const parsed = parseCubicBezier(e);
            if (parsed.length > 0) {
              result.animations.cubicBeziers.push(...parsed);
            }
          });
        }
      }

      // Container widths
      if (cs.maxWidth && cs.maxWidth !== 'none') {
        const width = parseFloat(cs.maxWidth);
        if (width > 200 && width < 2000) containerWidths.push(Math.round(width));
      }
    });

    // Process collected data
    result.colors.computed.backgrounds = countOccurrences(colorData.bg).slice(0, 20);
    result.colors.computed.text = countOccurrences(colorData.text).slice(0, 20);
    result.colors.computed.borders = countOccurrences(colorData.border).slice(0, 20);
    result.colors.computed.accents = countOccurrences(colorData.accent).slice(0, 10);
    result.colors.palette = countOccurrences([...colorData.bg, ...colorData.text, ...colorData.border, ...colorData.accent]).slice(0, 30);
    result.colors.gradients = [...new Map(gradients.map(g => [g.raw, g])).values()].slice(0, 10);

    // Infer color roles
    if (inferRoles) {
      inferColorRoles(colorData);
    }

    // Typography
    const uniqueFonts = [...new Set(fontData.map(f => f.family))];
    result.typography.fontFamilies = uniqueFonts.filter(f => f && !f.includes('inherit'));
    result.typography.scale = [...new Set(fontData.map(f => f.size))].sort((a, b) => parseFloat(a) - parseFloat(b));
    result.typography.fontWeights = [...new Set(fontData.map(f => f.weight))].sort((a, b) => parseInt(a) - parseInt(b));
    result.typography.lineHeights = countOccurrences(fontData.map(f => f.lineHeight)).slice(0, 10);
    result.typography.letterSpacing = countOccurrences(fontData.map(f => f.letterSpacing)).filter(x => x.value !== 'normal').slice(0, 10);
    result.typography.pairings = detectTypographyPairings(fontData);

    // Spacing
    const allSpacing = [...spacingData.padding, ...spacingData.margin, ...spacingData.gap];
    const spacingValues = [...new Set(allSpacing)].map(s => parseFloat(s)).filter(v => v > 0 && v < 500).sort((a, b) => a - b);
    result.spacing.scale = [...new Set(spacingValues.map(v => `${v}px`))];
    result.spacing.paddings = countOccurrences(spacingData.padding).slice(0, 15);
    result.spacing.margins = countOccurrences(spacingData.margin).slice(0, 15);
    result.spacing.gaps = countOccurrences(spacingData.gap).slice(0, 10);

    // Detect grid
    if (spacingValues.length > 3) {
      const diffs = [];
      for (let i = 1; i < Math.min(spacingValues.length, 10); i++) {
        diffs.push(spacingValues[i] - spacingValues[i - 1]);
      }
      const gridBase = countOccurrences(diffs.map(d => Math.round(d)))[0]?.value;
      if (gridBase && gridBase >= 4 && gridBase <= 16) {
        result.spacing.grid = `${gridBase}px`;
      }
    }

    // Effects
    result.shadows = countOccurrences(shadowData).slice(0, 10);
    result.borderRadius = countOccurrences(radiusData).slice(0, 10);
    result.animations.transitions = countOccurrences(transitionData).slice(0, 15);
    result.animations.durations = [...new Set(result.animations.durations)].slice(0, 5);
    result.animations.easings = [...new Set(result.animations.easings)].slice(0, 5);

    // Dedupe cubic beziers
    const seenBeziers = new Set();
    result.animations.cubicBeziers = result.animations.cubicBeziers.filter(b => {
      if (seenBeziers.has(b.value)) return false;
      seenBeziers.add(b.value);
      return true;
    }).slice(0, 10);

    result.breakpoints.detected = [...new Set(result.breakpoints.detected)].sort((a, b) => a - b);
    result.breakpoints.containerWidths = [...new Set(containerWidths)].sort((a, b) => a - b);
  };

  // ============ ICON DETECTION ============

  const detectIcons = () => {
    const iconSignatures = [
      { name: 'lucide', selector: '[data-lucide], .lucide, svg[class*="lucide"]' },
      { name: 'heroicons', selector: '[class*="heroicon"], svg[class*="h-"][class*="w-"]' },
      { name: 'fontawesome', selector: '[class*="fa-"], .fas, .far, .fab, .fal, .fad' },
      { name: 'material', selector: '.material-icons, .material-icons-outlined, .material-symbols' },
      { name: 'phosphor', selector: '[class*="ph-"], .ph' },
      { name: 'tabler', selector: '[class*="tabler-"], .tabler-icon' },
      { name: 'feather', selector: '[data-feather], .feather' },
      { name: 'bootstrap', selector: '[class*="bi-"]' },
      { name: 'radix', selector: '[data-radix-icon]' }
    ];

    for (const { name, selector } of iconSignatures) {
      const found = document.querySelectorAll(selector);
      if (found.length > 0) {
        result.icons.library = name;

        found.forEach(el => {
          const cs = getComputedStyle(el);
          const size = cs.width !== 'auto' ? cs.width : cs.fontSize;
          if (size) result.icons.sizes.push(size);
          const color = rgbToHex(cs.color) || rgbToHex(cs.fill);
          if (color) result.icons.colors.push(color);
        });

        result.icons.sizes = [...new Set(result.icons.sizes)].slice(0, 5);
        result.icons.colors = [...new Set(result.icons.colors)].slice(0, 5);
        break;
      }
    }
  };

  // ============ FONT API ============

  const extractLoadedFonts = () => {
    if (document.fonts) {
      const loadedFonts = [];
      document.fonts.forEach(font => {
        if (font.status === 'loaded') {
          loadedFonts.push({
            family: font.family.replace(/['"]/g, ''),
            weight: font.weight,
            style: font.style
          });
        }
      });

      const seen = new Set();
      result.typography.fontFamilies = loadedFonts.filter(f => {
        const key = `${f.family}-${f.weight}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).map((f, i) => {
        let role = 'body';
        const name = f.family.toLowerCase();
        if (name.includes('display') || name.includes('heading') || name.includes('title')) {
          role = 'display';
        } else if (name.includes('mono') || name.includes('code')) {
          role = 'mono';
        } else if (name.includes('serif') && !name.includes('sans')) {
          role = 'serif';
        } else if (i === 0) {
          role = 'primary';
        }
        return { ...f, role };
      }).slice(0, 20);
    }
  };

  // ============ DEDUPE COMPONENTS ============

  const dedupeComponents = () => {
    const dedupe = arr => {
      const seen = new Set();
      return arr.filter(item => {
        const key = JSON.stringify(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 10);
    };

    Object.keys(result.components).forEach(key => {
      result.components[key] = dedupe(result.components[key]);
    });
  };

  // ============ DESIGN CHARACTER INFERENCE ============

  const inferDesignCharacter = () => {
    const traits = [];

    // Theme
    if (result.meta.detectedTheme === 'dark') {
      traits.push('Dark-mode-first');
    } else if (result.meta.detectedTheme === 'light') {
      traits.push('Light-mode-first');
    } else if (result.meta.detectedTheme === 'both') {
      traits.push('Dual-theme');
    }

    // Typography character
    const fonts = result.typography.fontFamilies.map(f => (f.family || f).toLowerCase());
    if (fonts.some(f => f.includes('serif') && !f.includes('sans'))) {
      traits.push('serif typography');
    }
    if (fonts.some(f => f.includes('mono'))) {
      traits.push('monospace accents');
    }
    if (fonts.some(f => f.includes('inter') || f.includes('geist') || f.includes('sf pro'))) {
      traits.push('modern sans-serif');
    }

    // Spacing
    if (result.spacing.grid) {
      traits.push(`${result.spacing.grid} grid`);
    }

    // Color character
    const bgColor = result.colors.semantic.background.primary;
    if (bgColor) {
      const lum = getLuminance(bgColor);
      if (lum > 0.9) traits.push('high-contrast whites');
      if (lum < 0.1) traits.push('deep blacks');
    }

    // Accent color
    const accent = result.colors.semantic.accent;
    if (accent) {
      traits.push(`${accent} accent`);
    }

    // Animation character
    if (result.animations.cubicBeziers.some(b => b.name !== 'custom' && b.name !== 'linear')) {
      traits.push('custom easing curves');
    }
    if (result.animations.cubicBeziers.some(b => b.name === 'spring-like')) {
      traits.push('spring animations');
    }

    // Focus indicators
    if (result.focusIndicators.hasVisibleFocus) {
      traits.push('visible focus indicators');
    }

    result.meta.designCharacter = traits.join('. ') + '.';
  };

  // ============ SCROLL CAPTURE ============

  const scrollCaptureFn = async () => {
    if (!scrollCapture) return;

    const scrollHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    const scrollSteps = Math.ceil(scrollHeight / viewportHeight);

    for (let i = 0; i < scrollSteps; i++) {
      window.scrollTo(0, i * viewportHeight);
      await new Promise(r => setTimeout(r, 100));
    }

    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 200));
  };

  // ============ EXECUTE ============

  if (detectThemes) detectTheme();
  extractCSSRules();
  walkDOM();
  if (captureComponents) extractComponents();
  extractInteractionStates();
  extractFocusIndicators();
  detectIcons();
  extractLoadedFonts();
  dedupeComponents();
  inferDesignCharacter();

  return result;
};

// Self-executing for browser injection, or export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { extractDesignSystem };
} else {
  extractDesignSystem();
}
