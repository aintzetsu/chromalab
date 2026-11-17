(function (global) {
  "use strict";

  const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const TARGET_LIGHTNESS = {
    50: 97,
    100: 93,
    200: 85,
    300: 74,
    400: 62,
    500: 50,
    600: 42,
    700: 34,
    800: 26,
    900: 19,
    950: 12
  };

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function normalizeHex(hex) {
    let cleaned = String(hex || "").trim().replace(/^#/, "");
    if (cleaned.length === 3) {
      cleaned = cleaned.split("").map((c) => c + c).join("");
    }
    if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
    return `#${cleaned.toUpperCase()}`;
  }

  function hexToRgb(hex) {
    const clean = normalizeHex(hex);
    if (!clean) return { r: 37, g: 99, b: 235 };
    const n = parseInt(clean.slice(1), 16);
    return {
      r: (n >> 16) & 255,
      g: (n >> 8) & 255,
      b: n & 255
    };
  }

  function rgbToHex(r, g, b) {
    const toHex = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0").toUpperCase();
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function hexToHsl(hex) {
    const { r, g, b } = hexToRgb(hex);
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
      else if (max === gn) h = (bn - rn) / d + 2;
      else h = (rn - gn) / d + 4;
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  function hslToHex(h, s, l) {
    const hn = ((h % 360) + 360) % 360 / 360;
    const sn = clamp(s, 0, 100) / 100;
    const ln = clamp(l, 0, 100) / 100;

    if (sn === 0) {
      const v = Math.round(ln * 255);
      return rgbToHex(v, v, v);
    }

    const hue2rgb = (p, q, t) => {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };

    const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
    const p = 2 * ln - q;
    const r = hue2rgb(p, q, hn + 1 / 3) * 255;
    const g = hue2rgb(p, q, hn) * 255;
    const b = hue2rgb(p, q, hn - 1 / 3) * 255;
    return rgbToHex(r, g, b);
  }

  function relativeLuminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    const linear = [r, g, b].map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  }

  function contrastRatio(hexA, hexB) {
    const l1 = relativeLuminance(hexA);
    const l2 = relativeLuminance(hexB);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function bestInk(bgHex) {
    const onWhite = contrastRatio(bgHex, "#FFFFFF");
    const onDark = contrastRatio(bgHex, "#0F172A");
    return onWhite >= onDark ? "#FFFFFF" : "#0F172A";
  }

  function generateRamp(baseHsl) {
    const ramp = [];
    const offsetL = baseHsl.l - 50;

    STEPS.forEach((step) => {
      let targetL = TARGET_LIGHTNESS[step];
      if (step === 500) targetL = clamp(baseHsl.l, 32, 68);
      else if (step === 400 || step === 600) {
        targetL = clamp(targetL + offsetL * 0.35, 16, 90);
      }

      // Slightly higher saturation in midtones, gentle desaturation at extremes
      const satCurve = step <= 100 || step >= 900 ? 0.78 : step >= 400 && step <= 700 ? 1.04 : 0.94;
      const s = clamp(Math.round(baseHsl.s * satCurve), 6, 100);
      const hex = hslToHex(baseHsl.h, s, targetL);

      ramp.push({
        step,
        hex,
        ink: bestInk(hex),
        onWhite: contrastRatio(hex, "#FFFFFF"),
        onDark: contrastRatio(hex, "#0F172A")
      });
    });

    return ramp;
  }

  global.ChromaEngine = {
    STEPS,
    normalizeHex,
    hexToHsl,
    hslToHex,
    contrastRatio,
    bestInk,
    generateRamp
  };
})(window);
