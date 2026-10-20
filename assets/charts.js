/* Interactive charts of the project page, drawn as SVG from window.SITE_DATA (assets/data.js).
   Every chart has a hover/focus tooltip on hit areas larger than its marks and a table view that lists
   the same numbers, so no value is reachable through color or hover alone. */
(() => {
  const D = window.SITE_DATA;
  const NS = "http://www.w3.org/2000/svg";
  const state = { "methods-target": "all", "heatmap-view": "lesion", "cosine-task": "Cinderella" };
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const isDark = () => {
    const theme = document.documentElement.dataset.theme;
    return theme ? theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  };

  /* ---------- DOM and SVG helpers ---------- */
  function svg(tag, attrs = {}, parent) {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (parent) parent.appendChild(node);
    return node;
  }
  function label(parent, x, y, str, attrs = {}) {
    const t = svg("text", { x, y, ...attrs }, parent);
    t.textContent = str;
    return t;
  }
  function html(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) k === "class" ? (node.className = v) : node.setAttribute(k, v);
    for (const child of children.flat()) if (child != null) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    return node;
  }
  // A bar whose data end has a 4px rounded corner and whose baseline end is square.
  function barPath(x, y, w, h, r = 4) {
    if (w <= 0) return "";
    r = Math.min(r, w, h / 2);
    return `M${x},${y}h${w - r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 ${-r},${r}h${-(w - r)}z`;
  }
  function columnPath(x, y, w, h, r = 4) {
    if (h <= 0) return "";
    r = Math.min(r, h, w / 2);
    return `M${x},${y + h}v${-(h - r)}a${r},${r} 0 0 1 ${r},${-r}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - r}z`;
  }
  const fmt = n => Number(n).toLocaleString("en-US");
  const pct = (x, digits = 0) => `${(100 * x).toFixed(digits)}%`;

  /* ---------- Tooltip: values lead, labels follow ---------- */
  const tip = document.getElementById("chart-tip");
  function setTip(lines) {
    tip.replaceChildren(...lines.map((line, i) => {
      if (i === 0) {
        const row = html("div", {});
        if (line.key) row.append(html("span", { class: "tip-key", style: `--c: ${line.key}` }));
        row.append(html("span", { class: "tip-value" }, line.value), " ", html("span", {}, line.label || ""));
        return row;
      }
      return html("div", { class: "tip-sub" }, line);
    }));
  }
  function placeTip(x, y) {
    const box = tip.getBoundingClientRect();
    const left = Math.min(window.innerWidth - box.width - 8, Math.max(8, x + 14));
    const top = y - box.height - 12 < 8 ? y + 18 : y - box.height - 12;
    tip.style.transform = `translate(${left}px, ${top}px)`;
  }
  function bindTip(node, lines, ariaLabel) {
    node.setAttribute("tabindex", "0");
    node.setAttribute("role", "img");
    node.setAttribute("aria-label", ariaLabel || [lines[0].value, lines[0].label, ...lines.slice(1)].join(", "));
    node.addEventListener("pointermove", e => { setTip(lines); tip.classList.add("on"); placeTip(e.clientX, e.clientY); });
    node.addEventListener("pointerleave", () => tip.classList.remove("on"));
    node.addEventListener("focus", () => {
      const r = node.getBoundingClientRect();
      setTip(lines); tip.classList.add("on"); placeTip(r.left + r.width / 2, r.top);
    });
    node.addEventListener("blur", () => tip.classList.remove("on"));
  }

  /* ---------- Legend and table view ---------- */
  function legend(items) {
    return html("div", { class: "chart-legend" }, items.map(([text, color, shape]) =>
      html("span", {}, html("i", { class: `sw ${shape || "block"}`, style: color ? `--c: ${color}` : "" }), text)));
  }
  function table(head, rows) {
    const t = html("table", {},
      html("thead", {}, html("tr", {}, head.map(c => html("th", { scope: "col" }, c)))),
      html("tbody", {}, rows.map(r => html("tr", {}, r.map(c => html("td", {}, c))))));
    return html("div", { class: "data-table" }, t);
  }

  /* ---------- Chart registry ---------- */
  const charts = {};
  function draw(name) {
    const body = document.querySelector(`[data-chart="${name}"]`);
    if (!body || !charts[name]) return;
    const style = getComputedStyle(body);
    const width = Math.max(260, body.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
    body.replaceChildren();
    charts[name](body, Math.floor(width));
  }
  const drawAll = () => Object.keys(charts).forEach(draw);

  /* =====================================================================
     1. Lesion methods (Table 2): emphasis bars, classifier-guided vs corpus-guided
     ===================================================================== */
  charts.methods = (body, W) => {
    const key = state["methods-target"];
    const max = key === "all" ? 42 : 14;
    const groups = [["Guided by corpus statistics", "corpus", "var(--muted-mark)"], ["Guided by the classifier", "classifier", "var(--accent-mark)"]];
    body.append(legend(groups.map(([text, , color]) => [text, color])));
    const labelW = Math.min(132, W * 0.34), right = 34, rowH = 26, barH = 16, groupH = 22;
    const plotW = W - labelW - right;
    const x = v => labelW + (v / max) * plotW;
    const nRows = D.methods.length, H = 8 + groups.length * groupH + nRows * rowH + 22;
    const s = svg("svg", { class: "chart-svg", viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "group", "aria-label": "Settings in which each lesion method finds a working lesion" }, body);
    const ticks = key === "all" ? [0, 10, 20, 30, 40] : [0, 5, 10];
    let y = 8;
    const plotTop = y;
    const headers = [];
    for (const [title, group, color] of groups) {
      headers.push([title, y]);
      y += groupH;
      for (const m of D.methods.filter(m => m.group === group)) {
        const value = m[key], cy = y + (rowH - barH) / 2;
        const ours = m.name === "CLAMP";
        label(s, labelW - 10, cy + barH / 2 + 4, ours ? "CLAMP (ours)" : m.name, { class: "row-label" + (ours ? " strong" : ""), "text-anchor": "end" });
        svg("path", { d: barPath(labelW, cy, x(value) - labelW, barH), class: "mark grow-x", style: `--c: ${color}` }, s);
        label(s, x(value) + 6, cy + barH / 2 + 4, String(value), { class: "val" + (ours ? " strong" : "") });
        const hit = svg("rect", { x: 0, y, width: W, height: rowH, class: "hit" }, s);
        bindTip(hit, [{ value: `${value} of ${max}`, label: m.name, key: color },
          `settings in which it finds a working lesion${key === "all" ? "" : ` (${key} target)`}`,
          `Aphasia ${m.aphasia} · Broca ${m.broca} · Wernicke ${m.wernicke}`]);
        y += rowH;
      }
    }
    for (const t of ticks) {
      svg("line", { x1: x(t), x2: x(t), y1: plotTop, y2: y, class: "grid" }, s).parentNode.insertBefore(s.lastChild, s.firstChild);
      label(s, x(t), y + 15, String(t), { class: "tick", "text-anchor": "middle" });
    }
    svg("line", { x1: labelW, x2: labelW, y1: plotTop, y2: y, class: "axis" }, s);
    // group headings sit on a surface-colored band so the gridlines and axis do not cross them
    for (const [title, top] of headers) {
      svg("rect", { x: 0, y: top, width: W, height: groupH, style: "fill: var(--card)" }, s);
      label(s, 0, top + 14, title, { class: "group-label" });
    }
    body.append(table(["Method", "Guided by", "Aphasia", "Broca", "Wernicke", "All"],
      D.methods.map(m => [m.name, m.group === "corpus" ? "corpus statistics" : "classifier", m.aphasia, m.broca, m.wernicke, m.all])));
  };

  /* =====================================================================
     2. CLAMP lesions and steering vectors in 11 models: sequential heatmap
     ===================================================================== */
  const RAMP = ["#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281", "#0d366b"];
  const hexToRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  function rampColor(t) {
    // light mode: more is darker; dark mode flips the anchor so more is brighter against the dark surface
    const steps = isDark() ? [...RAMP].reverse() : RAMP;
    const pos = Math.min(1, Math.max(0, t)) * (steps.length - 1), i = Math.floor(pos), f = pos - i;
    const a = hexToRgb(steps[i]), b = hexToRgb(steps[Math.min(i + 1, steps.length - 1)]);
    return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(",")})`;
  }
  const luminance = rgb => {
    const [r, g, b] = rgb.match(/\d+/g).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const CAPTIONS = {
    lesion: [["CLAMP generalizes to all 11 models, including Qwen3.5 with linear attention: "], ["54 of 66 settings", "b"],
      [". A cell gives the number of heads knocked out, and its color the classifier's target probability for the lesioned answer; a hatched cell marks a setting where no lesion reaches the target (Figure 4)."]],
    steer: [["One direction per type steers an intact model. "], ["Broca: all 22 model–task pairs; Wernicke: 12 of 22.", "b"],
      [" A cell gives the number of the 8 swept layers at which some strength pushes the classifier's probability of the vector's target above 0.5; a hatched cell marks a vector that works at no layer (Table 24)."]],
  };
  charts.heatmap = (body, W) => {
    const view = state["heatmap-view"];
    const caption = document.getElementById("heatmap-caption");
    caption.replaceChildren(...CAPTIONS[view].map(([text, tag]) => tag ? html(tag, {}, text) : text));
    document.documentElement.style.setProperty("--ramp-lo", rampColor(0));
    document.documentElement.style.setProperty("--ramp-hi", rampColor(1));
    body.append(legend(view === "lesion"
      ? [["P(target): 0.40 → 1.00", null, "ramp"], ["no lesion reaches the target", null, "hatch"]]
      : [["layers that work: 1 → 8", null, "ramp"], ["no layer works", null, "hatch"]]));
    const cols = D.clamp.columns;
    const labelW = Math.min(150, W * 0.27), gap = 14, cellGap = 3;
    const cellW = (W - labelW - gap) / cols.length, cellH = 30, top = 44;
    const families = D.models.map(m => D.families[m]);
    const H = top + D.models.length * (cellH + cellGap) + 3 * 8 + 4;
    const s = svg("svg", { class: "chart-svg", viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "group", "aria-label": view === "lesion" ? "CLAMP lesions in 11 models" : "Steering sweep in 11 models" }, body);
    const pattern = svg("pattern", { id: "hatch", width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, svg("defs", {}, s));
    svg("rect", { width: 6, height: 6, style: "fill: var(--neutral-cell)" }, pattern);
    svg("line", { x1: 0, y1: 0, x2: 0, y2: 6, style: "stroke: var(--axis); stroke-width: 1.5" }, pattern);
    const colX = j => labelW + j * cellW + (j >= 3 ? gap : 0);
    for (const [g, task] of [[0, "Cinderella"], [3, "Sandwich"]]) {
      label(s, colX(g) + 1.5 * cellW, 14, task, { class: "col-group", "text-anchor": "middle" });
      svg("line", { x1: colX(g) + 4, x2: colX(g) + 3 * cellW - 4, y1: 21, y2: 21, class: "axis" }, s);
    }
    cols.forEach((c, j) => label(s, colX(j) + cellW / 2, 36, c.target === "Aphasia" ? "Aph." : c.target === "Wernicke" ? "Wern." : "Broca", { class: "col-label", "text-anchor": "middle" }));
    let y = top;
    D.models.forEach((model, i) => {
      if (i && families[i] !== families[i - 1]) y += 8;
      label(s, labelW - 10, y + cellH / 2 + 4, labelW < 130 ? model.replace("-chat", "") : model, { class: "row-label", "text-anchor": "end" });
      cols.forEach((c, j) => {
        let fill, txt, lines;
        if (view === "lesion") {
          const cell = D.clamp.rows[i][j];
          if (cell.works) {
            fill = rampColor((cell.p - 0.4) / 0.6); txt = fmt(cell.heads);
            lines = [{ value: `${fmt(cell.heads)} heads`, label: `${model} · ${c.task} · ${c.target}` },
              `P(${c.target === "Aphasia" ? "aphasia" : c.target}) = ${cell.p.toFixed(3)}`,
              `TAB short answer, lesioned: ${cell.shortAnswer}/15`,
              `LLM-judge features per answer: ${cell.features[0].toFixed(1)} → ${cell.features[1].toFixed(1)}`];
          } else {
            fill = "url(#hatch)"; txt = "";
            lines = [{ value: "no lesion", label: `${model} · ${c.task} · ${c.target}` },
              `best prefix: ${fmt(cell.heads)} heads, P = ${cell.p.toFixed(3)}`];
          }
        } else {
          const cell = D.sweep[i].cells.find(x => x.task === c.task && x.vector === c.target);
          if (cell.layers > 0) {
            fill = rampColor((cell.layers - 1) / 7); txt = String(cell.layers);
            lines = [{ value: `${cell.layers} of 8 layers`, label: `${model} · ${c.task} · ${c.target} vector` },
              `median smallest strength r = ${cell.r}`];
          } else {
            fill = "url(#hatch)"; txt = "0";
            lines = [{ value: "0 of 8 layers", label: `${model} · ${c.task} · ${c.target} vector` }, "no strength reaches the target"];
          }
        }
        const rect = svg("rect", { x: colX(j) + cellGap / 2, y, width: cellW - cellGap, height: cellH, rx: 4, class: "cell hot", style: `fill: ${fill}` }, s);
        bindTip(rect, lines);
        if (txt) {
          const dark = fill.startsWith("rgb") && luminance(fill) < 0.36;
          label(s, colX(j) + cellW / 2, y + cellH / 2 + 4, txt, { class: "cell-text", "text-anchor": "middle", style: `fill: ${fill.startsWith("rgb") ? (dark ? "#ffffff" : "#111827") : "var(--ink-3)"}` });
        }
      });
      y += cellH + cellGap;
    });
    const head = ["Model", ...cols.map(c => `${c.task} ${c.target}`)];
    body.append(table(head, D.models.map((model, i) => [model, ...cols.map((c, j) => {
      if (view === "lesion") { const cell = D.clamp.rows[i][j]; return cell.works ? `${fmt(cell.heads)} heads, P = ${cell.p.toFixed(3)}` : `none (best ${cell.p.toFixed(3)})`; }
      const cell = D.sweep[i].cells.find(x => x.task === c.task && x.vector === c.target);
      return `${cell.layers} of 8${cell.r != null ? `, r = ${cell.r}` : ""}`;
    })])));
  };

  /* =====================================================================
     3. What the experts call the steered answers (Figure 5): stacked bars
     ===================================================================== */
  const CLASS_INFO = {
    broca: ["Broca", "var(--cls-broca)"], wernicke: ["Wernicke", "var(--cls-wernicke)"],
    "conduction/anomic": ["Cond./Anomic", "var(--cls-anomic)"], control: ["Control", "var(--cls-control)"],
    model_scrambles: ["Model scrambles", "var(--cls-scrambles)"],
  };
  charts.human = (body, W) => {
    body.append(legend(Object.values(CLASS_INFO).map(([name, color]) => [name, color])));
    const rows = [];
    for (const target of ["Broca", "Wernicke"]) for (const [group, name] of [["own", "source task"], ["other", "other prompts"]]) {
      const d = D.human[target][group];
      const first = target.toLowerCase(), second = target === "Broca" ? "wernicke" : "broca";
      rows.push({ target, name, d, order: [first, second, "conduction/anomic", "control", "model_scrambles"] });
    }
    const labelW = Math.min(118, W * 0.3), right = 44, rowH = 34, barH = 20, groupH = 22;
    const plotW = W - labelW - right, H = rows.length * rowH + 2 * groupH + 26;
    const s = svg("svg", { class: "chart-svg", viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "group", "aria-label": "Expert labels of the steered answers" }, body);
    let y = 4;
    rows.forEach((row, i) => {
      if (i % 2 === 0) { label(s, 0, y + 15, `Steered toward ${row.target}'s aphasia`, { class: "group-label" }); y += groupH; }
      const cy = y + (rowH - barH) / 2;
      label(s, labelW - 10, cy + 9, row.name, { class: "row-label", "text-anchor": "end" });
      label(s, labelW - 10, cy + 21, `n = ${row.d.n}`, { class: "tick", "text-anchor": "end" });
      let x = labelW;
      row.order.forEach((cls, k) => {
        const share = (row.d.percent[cls] || 0) / 100;
        if (share <= 0) return;
        const w = share * plotW;
        const [name, color] = CLASS_INFO[cls];
        const segW = Math.max(0, w - 2);                  // 2px surface gap between segments
        svg("rect", { x, y: cy, width: segW, height: barH, rx: k === 0 ? 0 : 0, class: "mark grow-x", style: `--c: ${color}` }, s);
        if (k === 0 && segW > 34) label(s, x + segW - 6, cy + barH / 2 + 4, `${Math.round(row.d.percent[cls])}%`, { class: "cell-text", "text-anchor": "end", style: "fill: #ffffff" });
        const hit = svg("rect", { x, y: cy - 4, width: Math.max(w, 6), height: barH + 8, class: "hit" }, s);
        bindTip(hit, [{ value: `${row.d.percent[cls].toFixed(1)}%`, label: name, key: color },
          `${row.target}-steered answers, ${row.name}`, `${fmt(row.d.counts[cls])} of ${row.d.n} answers`]);
        x += w;
      });
      y += rowH;
    });
    for (const t of [0, 25, 50, 75, 100]) {
      const x = labelW + (t / 100) * plotW;
      label(s, x, y + 16, `${t}%`, { class: "tick", "text-anchor": "middle" });
    }
    body.append(table(["Answers", "Broca", "Wernicke", "Cond./Anomic", "Control", "Model scrambles", "n"],
      rows.map(r => [`${r.target}, ${r.name}`, ...["broca", "wernicke", "conduction/anomic", "control", "model_scrambles"].map(c => `${(r.d.percent[c] || 0).toFixed(1)}%`), r.d.n])));
  };

  /* =====================================================================
     4. Heads shared by Broca and Wernicke lesions: bar + chance tick
     ===================================================================== */
  charts.overlap = (body, W) => {
    body.append(legend([["shared heads, as a share of the smaller lesion", "var(--accent-mark)"], ["expected by chance", "var(--ink-2)", "tick"]]));
    const rows = D.overlap.map(o => {
      const small = Math.min(o.broca, o.wernicke);
      return { ...o, small, share: o.shared / small, chanceShare: o.chance / small };
    }).sort((a, b) => b.share - a.share);
    const labelW = Math.min(158, W * 0.42), right = 40, rowH = 24, barH = 14;
    const plotW = W - labelW - right, H = rows.length * rowH + 30;
    const s = svg("svg", { class: "chart-svg", viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "group", "aria-label": "Heads shared by Broca and Wernicke lesions" }, body);
    const x = v => labelW + v * plotW;
    for (const t of [0, 0.25, 0.5, 0.75, 1]) svg("line", { x1: x(t), x2: x(t), y1: 2, y2: rows.length * rowH + 4, class: "grid" }, s);
    rows.forEach((o, i) => {
      const y = 4 + i * rowH, cy = y + (rowH - barH) / 2;
      label(s, labelW - 10, cy + barH / 2 + 4, `${o.model.replace("-chat", "")} · ${o.task.toLowerCase()}`, { class: "row-label", "text-anchor": "end" });
      svg("path", { d: barPath(labelW, cy, x(o.share) - labelW, barH), class: "mark grow-x", style: "--c: var(--accent-mark)" }, s);
      svg("line", { x1: x(o.chanceShare), x2: x(o.chanceShare), y1: cy - 3, y2: cy + barH + 3, class: "refline" }, s);
      label(s, Math.max(x(o.share), x(o.chanceShare)) + 6, cy + barH / 2 + 4, pct(o.share), { class: "val" });
      const hit = svg("rect", { x: 0, y, width: W, height: rowH, class: "hit" }, s);
      bindTip(hit, [{ value: `${o.shared} shared heads`, label: `${o.model} · ${o.task}`, key: "var(--accent-mark)" },
        `Broca lesion ${fmt(o.broca)} heads, Wernicke lesion ${fmt(o.wernicke)}`,
        `${pct(o.share)} of the smaller lesion; chance ${o.chance.toFixed(2)} heads (${pct(o.chanceShare)})`, `one-sided p ${o.p.startsWith("<") ? o.p : "= " + o.p}`]);
    });
    const yAxis = rows.length * rowH + 4;
    for (const t of [0, 0.25, 0.5, 0.75, 1]) label(s, x(t), yAxis + 16, pct(t), { class: "tick", "text-anchor": "middle" });
    body.append(table(["Model", "Task", "Broca heads", "Wernicke heads", "Shared", "Chance", "p"],
      D.overlap.map(o => [o.model, o.task, fmt(o.broca), fmt(o.wernicke), o.shared, o.chance.toFixed(2), o.p])));
  };

  /* =====================================================================
     5. Cosines of the Broca and Wernicke vectors: dot plot on [-1, 1]
     ===================================================================== */
  charts.cosine = (body, W) => {
    const task = state["cosine-task"];
    body.append(legend([["Broca vs Wernicke", "var(--accent-mark)", "dot"], ["after shuffling the labels", "var(--muted-mark)", "ring"],
      ["type-specific parts", "var(--ink-2)", "diamond"]]));
    const labelW = Math.min(130, W * 0.32), right = 14, rowH = 22;
    const plotW = W - labelW - right, H = D.cosine.length * rowH + 48;
    const s = svg("svg", { class: "chart-svg", viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "group", "aria-label": `Cosine similarity of steering vectors, ${task} task` }, body);
    const x = v => labelW + ((v + 1) / 2) * plotW;
    const bottom = D.cosine.length * rowH + 6;
    for (const t of [-1, -0.5, 0, 0.5, 1]) {
      svg("line", { x1: x(t), x2: x(t), y1: 2, y2: bottom, class: t === 0 ? "zero" : "grid" }, s);
      label(s, x(t), bottom + 16, t === 0 ? "0" : t.toFixed(1).replace("-", "−"), { class: "tick", "text-anchor": "middle" });
    }
    D.cosine.forEach((c, i) => {
      const cy = 6 + i * rowH + rowH / 2;
      label(s, labelW - 10, cy + 4, c.model, { class: "row-label", "text-anchor": "end" });
      const bw = c.bw[task], shuf = c.shuffled[task], parts = c.parts[task];
      svg("line", { x1: x(bw), x2: x(shuf), y1: cy, y2: cy, class: "link" }, s);
      svg("circle", { cx: x(shuf), cy, r: 4.5, style: "fill: var(--card); stroke: var(--muted-mark); stroke-width: 2" }, s);
      svg("circle", { cx: x(bw), cy, r: 5, style: "fill: var(--accent-mark); stroke: var(--card); stroke-width: 2" }, s);
      svg("rect", { x: x(parts) - 4.5, y: cy - 4.5, width: 9, height: 9, transform: `rotate(45 ${x(parts)} ${cy})`, style: "fill: var(--ink-2); stroke: var(--card); stroke-width: 1.5" }, s);
      const hit = svg("rect", { x: 0, y: cy - rowH / 2, width: W, height: rowH, class: "hit" }, s);
      bindTip(hit, [{ value: `cos ${bw.toFixed(2)}`, label: `${c.model} · ${task}`, key: "var(--accent-mark)" },
        `after shuffling the Broca and Wernicke labels: ${shuf.toFixed(2)}`,
        `type-specific parts: ${parts.toFixed(2).replace("-", "−")}`,
        `same type across tasks: Broca ${c.acrossTasks.Broca.toFixed(2)}, Wernicke ${c.acrossTasks.Wernicke.toFixed(2)}`]);
    });
    label(s, labelW + plotW / 2, H - 2, "cosine similarity (median over layers)", { class: "axis-label", "text-anchor": "middle" });
    body.append(table(["Model", `Broca vs Wernicke (${task})`, "Shuffled labels", "Type-specific parts", "Broca across tasks", "Wernicke across tasks"],
      D.cosine.map(c => [c.model, c.bw[task].toFixed(2), c.shuffled[task].toFixed(2), c.parts[task].toFixed(2), c.acrossTasks.Broca.toFixed(2), c.acrossTasks.Wernicke.toFixed(2)])));
  };

  /* =====================================================================
     6. Targeted type on new prompts: lesions vs steering
     ===================================================================== */
  charts.carry = (body, W) => {
    const rows = [
      { name: "Lesions", sub: "Broca and Wernicke lesions", k: 1, n: 139 },
      { name: "Steering", sub: "Broca and Wernicke directions", k: 67, n: 153 },
    ];
    const labelW = Math.min(118, W * 0.3), right = 100, rowH = 46, barH = 22;
    const plotW = W - labelW - right, H = rows.length * rowH + 30;
    const s = svg("svg", { class: "chart-svg", viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "group", "aria-label": "Share of answers to new prompts with the targeted type" }, body);
    const x = v => labelW + v * plotW;
    for (const t of [0, 0.25, 0.5, 0.75, 1]) svg("line", { x1: x(t), x2: x(t), y1: 2, y2: rows.length * rowH + 4, class: "grid" }, s);
    rows.forEach((r, i) => {
      const y = 4 + i * rowH, cy = y + (rowH - barH) / 2, share = r.k / r.n;
      label(s, labelW - 10, cy + 10, r.name, { class: "row-label strong", "text-anchor": "end" });
      label(s, labelW - 10, cy + 23, r.n === 139 ? "found on 1 narrative" : "chosen on 1 narrative", { class: "tick", "text-anchor": "end" });
      svg("path", { d: barPath(labelW, cy, Math.max(2, x(share) - labelW), barH), class: "mark grow-x", style: "--c: var(--accent-mark)" }, s);
      label(s, x(share) + 8, cy + barH / 2 + 4, `${pct(share, share < 0.05 ? 1 : 0)} · ${r.k} of ${r.n}`, { class: "val strong" });
      const hit = svg("rect", { x: 0, y, width: W, height: rowH, class: "hit" }, s);
      bindTip(hit, [{ value: pct(share, 1), label: r.sub, key: "var(--accent-mark)" },
        `${r.k} of ${r.n} scored answers to new prompts`, "labeled with the targeted type by the classifier"]);
    });
    const yAxis = rows.length * rowH + 4;
    for (const t of [0, 0.25, 0.5, 0.75, 1]) label(s, x(t), yAxis + 16, pct(t), { class: "tick", "text-anchor": "middle" });
    body.append(table(["Intervention", "Answers with the targeted type", "Scored answers", "Share"],
      rows.map(r => [r.sub, r.k, r.n, pct(r.k / r.n, 1)])));
  };

  /* =====================================================================
     7. Aphasia features before and after the lesion, by family: dumbbells
     ===================================================================== */
  charts.beyond = (body, W) => {
    body.append(legend([["intact model", "var(--muted-mark)", "ring"], ["lesioned model", "var(--accent-mark)", "dot"]]));
    const labelW = Math.min(110, W * 0.3), right = 30, rowH = 30, max = 5;
    const plotW = W - labelW - right, H = D.beyond.length * rowH + 54;
    const s = svg("svg", { class: "chart-svg", viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "group", "aria-label": "Aphasia features per connected-text answer, intact and lesioned" }, body);
    const x = v => labelW + (v / max) * plotW;
    const bottom = D.beyond.length * rowH + 10;
    for (const t of [0, 1, 2, 3, 4, 5]) {
      svg("line", { x1: x(t), x2: x(t), y1: 2, y2: bottom, class: "grid" }, s);
      label(s, x(t), bottom + 16, String(t), { class: "tick", "text-anchor": "middle" });
    }
    D.beyond.forEach((b, i) => {
      const cy = 8 + i * rowH + rowH / 2 + (b.family === "All" ? 6 : 0);
      if (b.family === "All") svg("line", { x1: 0, x2: W, y1: cy - rowH / 2 - 2, y2: cy - rowH / 2 - 2, class: "grid" }, s);
      label(s, labelW - 10, cy + 4, b.family === "All" ? "All lesions" : b.family, { class: "row-label" + (b.family === "All" ? " strong" : ""), "text-anchor": "end" });
      svg("line", { x1: x(b.featuresIntact), x2: x(b.featuresLesioned), y1: cy, y2: cy, class: "link" }, s);
      svg("circle", { cx: x(b.featuresIntact), cy, r: 4.5, style: "fill: var(--card); stroke: var(--muted-mark); stroke-width: 2" }, s);
      svg("circle", { cx: x(b.featuresLesioned), cy, r: 5.5, style: "fill: var(--accent-mark); stroke: var(--card); stroke-width: 2" }, s);
      label(s, x(b.featuresLesioned) + 10, cy + 4, b.featuresLesioned.toFixed(1), { class: "val" + (b.family === "All" ? " strong" : "") });
      const hit = svg("rect", { x: 0, y: cy - rowH / 2, width: W, height: rowH, class: "hit" }, s);
      bindTip(hit, [{ value: `${b.featuresIntact.toFixed(1)} → ${b.featuresLesioned.toFixed(1)}`, label: b.family === "All" ? "all lesions" : b.family, key: "var(--accent-mark)" },
        "median aphasia features per connected-text answer", `TAB short-answer items right, lesioned: ${b.shortAnswer} of 15`, `MMLU log-probability drop: ${b.mmluDrop.toFixed(2)} nats`]);
    });
    label(s, labelW + plotW / 2, H - 2, "aphasia features per answer, of 19", { class: "axis-label", "text-anchor": "middle" });
    body.append(table(["Family", "Features, intact", "Features, lesioned", "Short answer, lesioned (of 15)", "MMLU drop (nats)"],
      D.beyond.map(b => [b.family, b.featuresIntact.toFixed(1), b.featuresLesioned.toFixed(1), b.shortAnswer, b.mmluDrop.toFixed(2)])));
  };

  /* =====================================================================
     8. Steering back: what removing the own direction does to the 54 lesions, and how often pushes undo them
     ===================================================================== */
  charts.rescue = (body, W) => {
    const outcomes = [
      { name: "model scrambles", n: 52, color: "var(--cls-scrambles)" },
      { name: "another aphasia type", n: 1, color: "var(--cls-aphasia)" },
      { name: "too short to score", n: 1, color: "url(#hatch-r)", swatch: "hatch" },
    ];
    body.append(legend([...outcomes.map(o => [`${o.name} (${o.n})`, o.swatch ? null : o.color, o.swatch || "block"]), ["control speech (0)", "var(--cls-control)"]]));
    const cols = W >= 420 ? 18 : 9, size = Math.min(26, Math.floor((W - (cols - 1) * 3) / cols)), gap = 3;
    const nRows = Math.ceil(54 / cols), waffleH = nRows * (size + gap);
    const bars = [
      { group: "Remove the direction after every block", name: "own direction", value: 53 / 54, text: "53 of 54", own: true, note: "lesions whose answer no longer reaches the target" },
      { name: "random direction", value: 50 / 54, extra: 51 / 54, text: "50 or 51 of 54", note: "lesions undone by each of three random directions" },
      { group: "Push with it at one layer", name: "own direction", value: 0.95, text: "95% of pushes", own: true, note: "pushes that undo the lesion" },
      { name: "random direction", value: 0.91, text: "91% of pushes", note: "pushes with a random direction of the same norm that undo the lesion" },
    ];
    const barTop = waffleH + 44, rowH = 26, barH = 14, groupH = 22, labelW = Math.min(124, W * 0.36), right = 98;
    const H = barTop + bars.length * rowH + 2 * groupH + 10;
    const s = svg("svg", { class: "chart-svg", viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "group", "aria-label": "Outcomes of steering back the 54 lesions" }, body);
    const pattern = svg("pattern", { id: "hatch-r", width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, svg("defs", {}, s));
    svg("rect", { width: 6, height: 6, style: "fill: var(--neutral-cell)" }, pattern);
    svg("line", { x1: 0, y1: 0, x2: 0, y2: 6, style: "stroke: var(--axis); stroke-width: 1.5" }, pattern);
    let k = 0;
    for (const o of outcomes) for (let j = 0; j < o.n; j++, k++) {
      const cx = (k % cols) * (size + gap), cy = Math.floor(k / cols) * (size + gap);
      const cell = svg("rect", { x: cx, y: cy, width: size, height: size, rx: 3, class: "cell hot", style: `fill: ${o.color}` }, s);
      bindTip(cell, [{ value: o.name, label: "", key: o.color.startsWith("url") ? "var(--axis)" : o.color },
        o.name === "model scrambles" ? "52 of the 53 undone answers" : o.name === "another aphasia type" ? "1 of the 53 undone answers; none is control speech" : "the Llama-2-13B-chat sandwich Wernicke lesion"]);
    }
    label(s, 0, waffleH + 26, "How often does steering back undo a lesion?", { class: "col-group" });
    const x = v => labelW + v * (W - labelW - right);
    let y = barTop;
    bars.forEach(b => {
      if (b.group) { label(s, 0, y + 15, b.group, { class: "group-label" }); y += groupH; }
      const cy = y + (rowH - barH) / 2;
      const color = b.own ? "var(--accent-mark)" : "var(--muted-mark)";
      label(s, labelW - 10, cy + barH / 2 + 4, b.name, { class: "row-label", "text-anchor": "end" });
      svg("path", { d: barPath(labelW, cy, x(b.value) - labelW, barH), class: "mark grow-x", style: `--c: ${color}` }, s);
      if (b.extra) svg("path", { d: barPath(x(b.value), cy, x(b.extra) - x(b.value), barH), class: "mark grow-x", style: `--c: ${color}; opacity: .45` }, s);
      label(s, x(b.extra || b.value) + 6, cy + barH / 2 + 4, b.text, { class: "val" });
      const hit = svg("rect", { x: 0, y, width: W, height: rowH, class: "hit" }, s);
      bindTip(hit, [{ value: b.text, label: b.name, key: color }, b.note]);
      y += rowH;
    });
    body.append(table(["Outcome", "Lesions or pushes"], [
      ...outcomes.map(o => [`Own direction removed: ${o.name}`, o.n]), ["Own direction removed: control speech", 0],
      ...bars.map((b, i) => [`${i < 2 ? "Remove after every block" : "Push at one layer"}, ${b.name}: undoes the lesion`, b.text])]));
  };

  /* =====================================================================
     9. Agreement with the experts (Table 4): grouped columns + expert reference
     ===================================================================== */
  charts.agreement = (body, W) => {
    const a = D.agreement;
    body.append(legend([["Five-way classifier", "var(--accent-mark)"], ["LLM judge", "var(--muted-mark)"], ["two experts with each other", "var(--ink-2)", "tick"]]));
    const left = 30, H = 230, top = 16, plotH = H - top - 30;
    const s = svg("svg", { class: "chart-svg", viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "group", "aria-label": "Agreement with the experts" }, body);
    const y = v => top + plotH - (v / 100) * plotH;
    for (const t of [0, 25, 50, 75, 100]) {
      svg("line", { x1: left, x2: W, y1: y(t), y2: y(t), class: "grid" }, s);
      label(s, left - 6, y(t) + 4, String(t), { class: "tick", "text-anchor": "end" });
    }
    const groupW = (W - left) / a.columns.length, colW = Math.min(24, groupW / 4);
    a.columns.forEach((col, g) => {
      const cx = left + g * groupW + groupW / 2;
      const series = [["Classifier", a.classifier[g], "var(--accent-mark)"], ["LLM judge", a.judge[g], "var(--muted-mark)"]];
      series.forEach(([name, v, color], k) => {
        const x0 = cx - colW - 1 + k * (colW + 2);
        svg("path", { d: columnPath(x0, y(v), colW, y(0) - y(v)), class: "mark grow-y", style: `--c: ${color}` }, s);
        label(s, x0 + colW / 2, y(v) - 5, String(v), { class: "val" + (k === 0 ? " strong" : ""), "text-anchor": "middle" });
        const hit = svg("rect", { x: x0 - 1, y: top, width: colW + 2, height: plotH, class: "hit" }, s);
        bindTip(hit, [{ value: `${v}%`, label: name, key: color }, `${col} answers: agreement with either expert`]);
      });
      const ey = y(a.experts[g]);
      svg("line", { x1: cx - colW - 10, x2: cx + colW + 10, y1: ey, y2: ey, class: "refline" }, s);
      const hit = svg("rect", { x: cx - colW - 12, y: ey - 7, width: 2 * colW + 24, height: 14, class: "hit" }, s);
      bindTip(hit, [{ value: `${a.experts[g]}%`, label: "two experts", key: "var(--ink-2)" }, `${col}: agreement with each other, Cohen's κ = ${a.kappa[g].toFixed(2)}`]);
      label(s, cx, H - 8, col, { class: "col-label", "text-anchor": "middle" });
    });
    svg("line", { x1: left, x2: W, y1: y(0), y2: y(0), class: "axis" }, s);
    body.append(table(["Labeler", ...a.columns], [["Five-way classifier", ...a.classifier], ["LLM judge", ...a.judge],
      ["Two experts with each other", ...a.experts], ["Two experts, Cohen's κ", ...a.kappa.map(k => k.toFixed(2))]]));
  };

  /* ---------- Controls, table toggles, resize, theme ---------- */
  document.querySelectorAll("[data-control]").forEach(group => {
    const name = group.dataset.control;
    const buttons = [...group.querySelectorAll("button[data-value]")];
    buttons.forEach(button => button.addEventListener("click", () => {
      buttons.forEach(b => b.setAttribute("aria-selected", String(b === button)));
      state[name] = button.dataset.value;
      draw(group.closest("[data-figure]").dataset.figure);
    }));
  });
  document.querySelectorAll(".table-toggle").forEach(button => button.addEventListener("click", () => {
    const body = button.closest("[data-figure]").querySelector(".chart-body");
    const on = body.classList.toggle("show-table");
    button.setAttribute("aria-pressed", String(on));
  }));
  let lastWidths = new Map();
  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const name = entry.target.dataset.chart, width = Math.round(entry.contentRect.width);
      if (lastWidths.get(name) !== width) { lastWidths.set(name, width); requestAnimationFrame(() => draw(name)); }
    }
  });
  document.querySelectorAll("[data-chart]").forEach(body => observer.observe(body));
  document.addEventListener("themechange", drawAll);
  drawAll();
})();
