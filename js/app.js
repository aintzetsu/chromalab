(function () {
  "use strict";

  const PRESETS = [
    { name: "Electric Cobalt", hex: "#2563EB" },
    { name: "Botanical Emerald", hex: "#059669" },
    { name: "Terracotta Vermilion", hex: "#EA580C" },
    { name: "Royal Iris", hex: "#7C3AED" },
    { name: "Rose Crimson", hex: "#E11D48" },
    { name: "Obsidian Teal", hex: "#0D9488" }
  ];

  const MATRIX_STEPS = [50, 100, 300, 500, 600, 700, 900, 950];

  const colorPicker = document.getElementById("colorPicker");
  const hexInput = document.getElementById("hexInput");
  const hueSlider = document.getElementById("hueSlider");
  const satSlider = document.getElementById("satSlider");
  const lightSlider = document.getElementById("lightSlider");
  const hueVal = document.getElementById("hueVal");
  const satVal = document.getElementById("satVal");
  const lightVal = document.getElementById("lightVal");
  const tokenNameInput = document.getElementById("tokenNameInput");

  const brandSwatch = document.getElementById("brandSwatch");
  const presetsStrip = document.getElementById("presetsStrip");
  const rampGrid = document.getElementById("rampGrid");
  const fgSelect = document.getElementById("fgSelect");
  const bgSelect = document.getElementById("bgSelect");
  const swapPairBtn = document.getElementById("swapPairBtn");
  const autoFixBtn = document.getElementById("autoFixBtn");
  const pairPreview = document.getElementById("pairPreview");
  const pairRatio = document.getElementById("pairRatio");
  const wcagPills = document.getElementById("wcagPills");
  const matrixTable = document.getElementById("matrixTable");
  const exportCode = document.getElementById("exportCode");
  const copyCodeBtn = document.getElementById("copyCodeBtn");
  const downloadTokensBtn = document.getElementById("downloadTokensBtn");
  const randomHueBtn = document.getElementById("randomHueBtn");
  const cvdSelect = document.getElementById("cvdSelect");
  const simulationSurface = document.getElementById("simulationSurface");
  const livePreviewCard = document.getElementById("livePreviewCard");
  const toastEl = document.getElementById("toast");

  const state = {
    hsl: { h: 221, s: 83, l: 53 },
    hex: "#2563EB",
    tokenName: "brand",
    ramp: [],
    fgKey: "white",
    bgKey: "600",
    exportFormat: "css"
  };

  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
    }, 2200);
  }

  function resolveColorKey(key) {
    if (key === "white") return "#FFFFFF";
    if (key === "dark") return "#0F172A";
    const found = state.ramp.find((s) => String(s.step) === String(key));
    return found ? found.hex : "#2563EB";
  }

  function applyRootTokens() {
    const root = document.documentElement;
    state.ramp.forEach((item) => {
      root.style.setProperty(`--brand-${item.step}`, item.hex);
      root.style.setProperty(`--brand-${item.step}-ink`, item.ink);
    });
    brandSwatch.style.background = state.hex;
  }

  function renderPresets() {
    presetsStrip.innerHTML = "";
    PRESETS.forEach((preset) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "preset-chip";
      const dot = document.createElement("span");
      dot.className = "preset-dot";
      dot.style.background = preset.hex;
      const text = document.createElement("span");
      text.textContent = preset.name;
      btn.appendChild(dot);
      btn.appendChild(text);
      btn.addEventListener("click", () => setFromHex(preset.hex));
      presetsStrip.appendChild(btn);
    });
  }

  function renderRamp() {
    rampGrid.innerHTML = "";
    state.ramp.forEach((item) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "swatch-card";
      card.title = `Click to copy ${item.hex}`;

      const top = document.createElement("div");
      top.className = "swatch-color";
      top.style.background = item.hex;
      top.style.color = item.ink;

      const stepSpan = document.createElement("span");
      stepSpan.textContent = String(item.step);
      const badge = document.createElement("span");
      badge.textContent = item.onWhite >= 4.5 ? "AA White" : item.onDark >= 4.5 ? "AA Dark" : "Low";
      top.appendChild(stepSpan);
      top.appendChild(badge);

      const meta = document.createElement("div");
      meta.className = "swatch-meta";
      const hexEl = document.createElement("div");
      hexEl.className = "swatch-hex";
      hexEl.textContent = item.hex;
      const ratioEl = document.createElement("div");
      ratioEl.className = "swatch-ratios";
      ratioEl.textContent = `W:${item.onWhite.toFixed(1)} D:${item.onDark.toFixed(1)}`;
      meta.appendChild(hexEl);
      meta.appendChild(ratioEl);

      card.appendChild(top);
      card.appendChild(meta);

      card.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(item.hex);
        } catch (_e) {
          // Clipboard fallback ignored
        }
        showToast(`Copied ${item.step}: ${item.hex}`);
      });

      rampGrid.appendChild(card);
    });
  }

  function populateSelects() {
    const buildOptions = (selectEl, selectedKey) => {
      selectEl.innerHTML = "";
      const specials = [
        { key: "white", label: "White (#FFFFFF)" },
        { key: "dark", label: "Slate Ink (#0F172A)" }
      ];
      specials.forEach((sp) => {
        const opt = document.createElement("option");
        opt.value = sp.key;
        opt.textContent = sp.label;
        selectEl.appendChild(opt);
      });
      state.ramp.forEach((item) => {
        const opt = document.createElement("option");
        opt.value = String(item.step);
        opt.textContent = `${state.tokenName}-${item.step} (${item.hex})`;
        selectEl.appendChild(opt);
      });
      selectEl.value = selectedKey;
    };

    buildOptions(fgSelect, state.fgKey);
    buildOptions(bgSelect, state.bgKey);
  }

  function renderPairInspector() {
    const fgHex = resolveColorKey(state.fgKey);
    const bgHex = resolveColorKey(state.bgKey);
    const ratio = window.ChromaEngine.contrastRatio(fgHex, bgHex);

    pairPreview.style.color = fgHex;
    pairPreview.style.background = bgHex;
    pairRatio.textContent = `${ratio.toFixed(2)} : 1`;

    const checks = [
      { label: "AA Normal (4.5)", pass: ratio >= 4.5 },
      { label: "AA Large (3.0)", pass: ratio >= 3.0 },
      { label: "AAA Normal (7.0)", pass: ratio >= 7.0 }
    ];

    wcagPills.innerHTML = "";
    checks.forEach((c) => {
      const span = document.createElement("span");
      span.className = "wcag-badge " + (c.pass ? "wcag-pass" : "wcag-fail");
      span.textContent = `${c.pass ? "PASS" : "FAIL"} · ${c.label}`;
      wcagPills.appendChild(span);
    });
  }

  function renderMatrix() {
    const subset = state.ramp.filter((r) => MATRIX_STEPS.includes(r.step));
    const entries = [{ step: "W", hex: "#FFFFFF" }].concat(subset);

    matrixTable.innerHTML = "";
    const thead = document.createElement("thead");
    const hRow = document.createElement("tr");
    const corner = document.createElement("th");
    corner.textContent = "BG \\ FG";
    hRow.appendChild(corner);

    entries.forEach((col) => {
      const th = document.createElement("th");
      th.textContent = String(col.step);
      hRow.appendChild(th);
    });
    thead.appendChild(hRow);
    matrixTable.appendChild(thead);

    const tbody = document.createElement("tbody");
    entries.forEach((rowEntry) => {
      const tr = document.createElement("tr");
      const rHead = document.createElement("th");
      rHead.textContent = String(rowEntry.step);
      tr.appendChild(rHead);

      entries.forEach((colEntry) => {
        const td = document.createElement("td");
        if (rowEntry.step === colEntry.step) {
          td.textContent = "--";
          td.style.color = "var(--text-muted)";
        } else {
          const r = window.ChromaEngine.contrastRatio(rowEntry.hex, colEntry.hex);
          const chip = document.createElement("span");
          chip.className = "cell-chip";
          chip.textContent = r.toFixed(1);
          if (r >= 7.0) {
            chip.style.background = "#dcfce7";
            chip.style.color = "#166534";
          } else if (r >= 4.5) {
            chip.style.background = "#e0f2fe";
            chip.style.color = "#075985";
          } else if (r >= 3.0) {
            chip.style.background = "#fef3c7";
            chip.style.color = "#92400e";
          } else {
            chip.style.color = "#94a3b8";
          }
          td.appendChild(chip);
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    matrixTable.appendChild(tbody);
  }

  function buildExportSnippet() {
    const prefix = state.tokenName.replace(/[^a-zA-Z0-9_-]/g, "") || "brand";
    if (state.exportFormat === "css") {
      const lines = state.ramp.map((r) => `  --color-${prefix}-${r.step}: ${r.hex};`);
      return `:root {\n${lines.join("\n")}\n}`;
    }
    if (state.exportFormat === "tailwind") {
      const lines = state.ramp.map((r) => `  --color-${prefix}-${r.step}: ${r.hex};`);
      return `@theme {\n${lines.join("\n")}\n}`;
    }
    const jsonObj = { [prefix]: {} };
    state.ramp.forEach((r) => {
      jsonObj[prefix][String(r.step)] = {
        $value: r.hex,
        $type: "color"
      };
    });
    return JSON.stringify(jsonObj, null, 2);
  }

  function renderExport() {
    exportCode.textContent = buildExportSnippet();
  }

  function syncSlidersUI() {
    colorPicker.value = state.hex;
    hexInput.value = state.hex;
    hueSlider.value = state.hsl.h;
    satSlider.value = state.hsl.s;
    lightSlider.value = state.hsl.l;
    hueVal.innerHTML = `${state.hsl.h}&deg;`;
    satVal.textContent = `${state.hsl.s}%`;
    lightVal.textContent = `${state.hsl.l}%`;
  }

  function recomputeAll() {
    state.ramp = window.ChromaEngine.generateRamp(state.hsl);
    syncSlidersUI();
    applyRootTokens();
    renderRamp();
    populateSelects();
    renderPairInspector();
    renderMatrix();
    renderExport();
  }

  function setFromHex(hex) {
    const norm = window.ChromaEngine.normalizeHex(hex);
    if (!norm) return;
    state.hex = norm;
    state.hsl = window.ChromaEngine.hexToHsl(norm);
    recomputeAll();
  }

  function setFromHsl() {
    state.hsl = {
      h: Number(hueSlider.value),
      s: Number(satSlider.value),
      l: Number(lightSlider.value)
    };
    state.hex = window.ChromaEngine.hslToHex(state.hsl.h, state.hsl.s, state.hsl.l);
    recomputeAll();
  }

  colorPicker.addEventListener("input", () => setFromHex(colorPicker.value));
  hexInput.addEventListener("change", () => {
    const norm = window.ChromaEngine.normalizeHex(hexInput.value);
    if (norm) setFromHex(norm);
    else hexInput.value = state.hex;
  });

  hueSlider.addEventListener("input", setFromHsl);
  satSlider.addEventListener("input", setFromHsl);
  lightSlider.addEventListener("input", setFromHsl);

  tokenNameInput.addEventListener("input", () => {
    state.tokenName = tokenNameInput.value.trim() || "brand";
    populateSelects();
    renderExport();
  });

  fgSelect.addEventListener("change", () => {
    state.fgKey = fgSelect.value;
    renderPairInspector();
  });

  bgSelect.addEventListener("change", () => {
    state.bgKey = bgSelect.value;
    renderPairInspector();
  });

  swapPairBtn.addEventListener("click", () => {
    const tmp = state.fgKey;
    state.fgKey = state.bgKey;
    state.bgKey = tmp;
    fgSelect.value = state.fgKey;
    bgSelect.value = state.bgKey;
    renderPairInspector();
  });

  autoFixBtn.addEventListener("click", () => {
    const bgHex = resolveColorKey(state.bgKey);
    const candidates = [{ key: "dark", hex: "#0F172A" }, { key: "white", hex: "#FFFFFF" }].concat(
      state.ramp.map((r) => ({ key: String(r.step), hex: r.hex }))
    );
    let best = null;
    for (let i = 0; i < candidates.length; i++) {
      const ratio = window.ChromaEngine.contrastRatio(candidates[i].hex, bgHex);
      if (ratio >= 4.5 && (!best || ratio < best.ratio)) {
        best = { key: candidates[i].key, ratio };
      }
    }
    if (best) {
      state.fgKey = best.key;
      fgSelect.value = best.key;
      renderPairInspector();
      showToast(`Adjusted foreground to ${best.key} (${best.ratio.toFixed(2)}:1)`);
    }
  });

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      state.exportFormat = btn.dataset.format;
      renderExport();
    });
  });

  copyCodeBtn.addEventListener("click", async () => {
    const text = buildExportSnippet();
    try {
      await navigator.clipboard.writeText(text);
    } catch (_e) {
      // ignore clipboard errors
    }
    showToast("Copied tokens to clipboard");
  });

  downloadTokensBtn.addEventListener("click", () => {
    const ext = state.exportFormat === "json" ? "json" : "css";
    const blob = new Blob([buildExportSnippet()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.tokenName}-tokens.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${a.download}`);
  });

  randomHueBtn.addEventListener("click", () => {
    const hue = Math.floor(Math.random() * 360);
    const sat = 68 + Math.floor(Math.random() * 24);
    const light = 44 + Math.floor(Math.random() * 14);
    state.hsl = { h: hue, s: sat, l: light };
    state.hex = window.ChromaEngine.hslToHex(hue, sat, light);
    recomputeAll();
  });

  cvdSelect.addEventListener("change", () => {
    const mode = cvdSelect.value;
    [simulationSurface, livePreviewCard, pairPreview].forEach((el) => {
      el.classList.remove(
        "cvd-filter-protanopia",
        "cvd-filter-deuteranopia",
        "cvd-filter-tritanopia",
        "cvd-filter-achromatopsia"
      );
      if (mode !== "none") {
        el.classList.add(`cvd-filter-${mode}`);
      }
    });
  });

  renderPresets();
  recomputeAll();
})();
