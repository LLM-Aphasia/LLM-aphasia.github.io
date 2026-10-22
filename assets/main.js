/* =====================================================================
   CONFIG: authors, affiliations, links and citation. An empty link
   renders as a "soon" placeholder; fill in arxiv once the paper is up.
   ===================================================================== */
const CONFIG = {
  authors: [
    { name: "Muxuan He", url: "https://muxuanhe.github.io/", affil: [1], corresponding: true },
    { name: "Wang Bill Zhu", url: "https://billzhu.me", affil: [2], corresponding: true },
    { name: "Yue Chen", url: "https://yue-chen-yc.github.io/", affil: [1], corresponding: true },
    { name: "Elsi Kaiser", url: "https://elsikaiser.com/", affil: [1] },
    { name: "Weizhi Du", url: "https://www.linkedin.com/in/weizhi-eric-du-b67a22142/", affil: [3] },
    { name: "Yao Du", url: "https://dornsife.usc.edu/ccls/yao-du/", affil: [1] },
    { name: "Samuel Nastase", url: "https://snastase.github.io/", affil: [1] },
    { name: "Yanjun Gao", url: "https://serenayj.github.io/", affil: [4] },
  ],
  affiliations: [
    "University of Southern California",
    "University of California, Berkeley",
    "Independent Researcher",
    "University of Colorado Anschutz Medical Campus",
  ],
  contact: ["muxuanhe@usc.edu", "wangzhu@berkeley.edu", "ychen249@usc.edu"],
  links: {
    arxiv: "https://arxiv.org/abs/2610.28992",              // arXiv abstract page
    pdf: "https://arxiv.org/pdf/2610.28992",                // the paper's PDF on arXiv
    code: "https://github.com/Bill1235813/llm_aphasia",     // GitHub repository
  },
  bibtex: {
    key: "he2026language",
    title: "Language Impairment as a Lens onto Large Language Models",
    author: "He, Muxuan and Zhu, Wang Bill and Chen, Yue and Kaiser, Elsi and\n                   Du, Weizhi and Du, Yao and Nastase, Samuel and Gao, Yanjun",
    year: "2026",
    eprint: "2610.28992",
    archivePrefix: "arXiv",
    primaryClass: "cs.CL",
    url: "https://arxiv.org/abs/2610.28992",
  },
};

const ICONS = {
  arxiv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 4l14 16M19 4L12 12M5 20l4.5-5"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z"/></svg>',
};
ICONS.pdf = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M6 2.5h8l4 4v15H6z"/><path d="M14 2.5v4h4M9 12.5h6M9 16h6"/></svg>';
const LINK_LABELS = { arxiv: "arXiv", pdf: "PDF", code: "Code" };

/* Small DOM helper: element with attributes and text, never parsed as HTML. */
function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "style") node.setAttribute("style", v);
    else if (k === "class") node.className = v;
    else node.setAttribute(k, v);
  }
  for (const child of children.flat()) {
    if (child == null) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/* ============ Header: authors, affiliations, links ============ */
function renderHeader() {
  const authors = document.getElementById("authors");
  for (const person of CONFIG.authors) {
    const sup = (person.affil || []).join(",") + (person.corresponding ? "†" : "");
    const name = person.url ? h("a", { href: person.url, target: "_blank", rel: "noopener" }, person.name) : person.name;
    authors.append(h("span", {}, name, h("sup", {}, sup)));
  }
  const affils = document.getElementById("affils");
  CONFIG.affiliations.forEach((x, i) => affils.append(h("span", {}, h("sup", {}, String(i + 1)), x)));
  const contact = h("span", { class: "contact" }, h("sup", {}, "†"), "Corresponding authors: ");
  CONFIG.contact.forEach((email, i) => {
    if (i) contact.append(", ");
    contact.append(h("a", { href: `mailto:${email}` }, email));
  });
  affils.append(contact);

  const links = document.getElementById("links");
  for (const [key, url] of Object.entries(CONFIG.links)) {
    const button = url
      ? h("a", { class: "btn", href: url, target: "_blank", rel: "noopener" })
      : h("span", { class: "btn is-empty", "aria-disabled": "true" });
    button.innerHTML = ICONS[key];                      // static icon markup from this file
    button.append(LINK_LABELS[key]);
    if (!url) button.append(h("span", { class: "soon" }, "soon"));
    links.append(button);
  }
}

/* ============ 01: the lens demo (Figure 1 of the paper) ============ */
const CASES = {
  lesion: {
    intact: "Once upon a time, there was a beautiful and kind girl named Cinderella who …",
    action: "knock out attention heads",
    outLabel: "lesioned model",
    out: "tell a tale, so let's begin! In this world of wonder, where, in a land, far, out, and, or …",
    verdict: [["--cls-broca", "Broca's aphasia-like"], [null, "fragmented and incoherent"]],
  },
  steer: {
    intact: "The story of Cinderella is one of the most enduring tales in world literature …",
    action: "add the Wernicke direction v",
    outLabel: "steered model",
    out: "be a part of it, to get that kind of information in there and then have them go back …",
    verdict: [["--cls-wernicke", "Wernicke's aphasia-like"], [null, "fluent but irrelevant"]],
  },
};

function renderDemo(name, animate) {
  const c = CASES[name];
  document.getElementById("demo-intact").textContent = c.intact;
  document.getElementById("demo-action").textContent = c.action;
  document.getElementById("demo-out-label").textContent = c.outLabel;
  const out = document.getElementById("demo-out");
  out.textContent = c.out;
  document.getElementById("demo-dot").style.setProperty("--c", `var(${c.verdict[0][0]})`);
  const verdict = document.getElementById("demo-verdict");
  verdict.replaceChildren(...c.verdict.map(([color, label]) => color
    ? h("span", { class: "pill", style: `--c: var(${color})` }, label)
    : h("span", { class: "pill plain" }, label)));
  if (animate) { out.classList.remove("flash"); void out.offsetWidth; out.classList.add("flash"); }
}

function bindTabs(container, attr, onChange) {
  const buttons = [...container.querySelectorAll(`button[${attr}]`)];
  buttons.forEach(button => button.addEventListener("click", () => {
    buttons.forEach(b => b.setAttribute("aria-selected", String(b === button)));
    onChange(button.getAttribute(attr));
  }));
}

/* ============ 01: the classifier's five classes ============ */
const CLASSES = [
  ["--cls-control", "Control speech", "Speech of neurologically healthy speakers.", null],
  ["--cls-anomic", "Conduction / anomic aphasia", "Fluent speech with relatively good comprehension, but poor repetition or trouble finding words. Free speech cannot tell the two apart, so they form one class.", null],
  ["--cls-broca", "Broca's aphasia", "Nonfluent speech in short, effortful phrases that drop function words and inflections (agrammatism).", "a target"],
  ["--cls-wernicke", "Wernicke's aphasia", "Fluent, even abundant speech that carries little content, with substituted words and sounds (paraphasias).", "a target"],
  ["--cls-scrambles", "Model scrambles", "Non-human machine artifacts, such as tokenizer loops, stray brackets or formulaic repetitions.", "machine failure"],
];

function renderClasses() {
  const grid = document.getElementById("classes");
  for (const [color, name, text, tag] of CLASSES) {
    grid.append(h("div", { class: "cls-card", style: `--c: var(${color})` },
      h("h4", {}, name), h("p", {}, text), tag ? h("span", { class: "tag" }, tag) : null));
  }
}

/* ============ 08: example answers (Tables 15 and 32) ============ */
const LABEL_COLOR = {
  Aphasia: "--cls-aphasia", Aphasic: "--cls-aphasia", Broca: "--cls-broca", Wernicke: "--cls-wernicke",
  "Conduction or anomic": "--cls-anomic", "Model scrambles": "--cls-scrambles", Control: "--cls-control",
};
const pill = (label, prefix) => h("span", { class: "pill", style: `--c: var(${LABEL_COLOR[label] || "--ink-3"})` },
  prefix ? `${prefix}: ${label}` : label);

function textBlock(label, text, intact) {
  const p = h("p", { class: "ex-text" + (intact ? " intact" : "") }, text);
  const block = h("div", {}, h("div", { class: "ex-label" }, label), p);
  if (text.length > 260) {
    p.classList.add("long");
    const more = h("button", { class: "ex-more", type: "button", "aria-expanded": "false" }, "show all");
    more.addEventListener("click", () => {
      const open = p.classList.toggle("open");
      more.textContent = open ? "show less" : "show all";
      more.setAttribute("aria-expanded", String(open));
    });
    block.append(more);
  }
  return block;
}

function renderExamples(set) {
  const grid = document.getElementById("examples-grid");
  const examples = window.SITE_DATA.examples[set];
  grid.replaceChildren(...examples.map(e => {
    if (set === "lesion") {
      return h("article", { class: "ex-card" },
        h("div", { class: "ex-head" }, h("span", { class: "model" }, e.model), h("span", {}, `${e.task} task`),
          h("span", {}, `${e.heads} heads knocked out`)),
        h("div", { class: "ex-body" },
          e.intact ? textBlock("intact answer", e.intact, true) : null,
          textBlock("lesioned answer", e.lesioned, false)),
        h("div", { class: "ex-foot" }, pill(e.target, "Target"),
          h("span", { class: "pill plain" }, `P(${e.target === "Aphasia" ? "aphasia" : e.target}) = ${e.p.toFixed(3)}`)));
    }
    // e.experts is the table's group heading, e.g. "Steered toward Broca's aphasia, labeled Broca by both experts"
    const target = /^Steered toward aphasia,/.test(e.experts) ? "Aphasia" : /^Steered toward Broca/.test(e.experts) ? "Broca" : "Wernicke";
    const experts = /model scrambles/.test(e.experts) ? "Model scrambles" : target === "Aphasia" ? "Aphasic" : target;
    return h("article", { class: "ex-card" },
      h("div", { class: "ex-head" }, h("span", { class: "model" }, e.model), h("span", {}, `${e.vector} vector`),
        h("span", {}, `prompt: ${e.prompt}${e.sourceTask ? " (source task)" : ""}`)),
      h("div", { class: "ex-body" }, textBlock(`steered toward ${target === "Aphasia" ? "aphasia" : target + "'s aphasia"}`, e.answer, false)),
      h("div", { class: "ex-foot" }, pill(experts, "Both experts"),
        pill(e.classifier, `Classifier (${e.p.toFixed(2)})`), pill(e.judge, "LLM judge")));
  }));
}

/* ============ Citation ============ */
function renderBib() {
  const b = CONFIG.bibtex;
  const text = `@misc{${b.key},\n  title         = {${b.title}},\n  author        = {${b.author}},\n  year          = {${b.year}},\n` +
    `  eprint        = {${b.eprint}},\n  archivePrefix = {${b.archivePrefix}},\n  primaryClass  = {${b.primaryClass}},\n  url           = {${b.url}}\n}`;
  document.getElementById("bib-text").textContent = text;
  const button = document.getElementById("copy-bib");
  button.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(text); button.textContent = "copied"; }
    catch { button.textContent = "select & copy"; }
    setTimeout(() => (button.textContent = "copy"), 1600);
  });
}

/* ============ Theme toggle: follows the system until the viewer picks ============ */
function initTheme() {
  const root = document.documentElement;
  try { const saved = localStorage.getItem("theme"); if (saved) root.dataset.theme = saved; } catch { /* storage blocked */ }
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch { /* storage blocked */ }
    document.dispatchEvent(new Event("themechange"));
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => document.dispatchEvent(new Event("themechange")));
}

/* ============ Math, reveal ============ */
function renderMath() {
  if (!window.katex) return;
  document.querySelectorAll(".tex").forEach(el => katex.render(el.textContent, el, { throwOnError: false }));
  document.querySelectorAll(".tex-block").forEach(el => katex.render(el.textContent, el, { throwOnError: false, displayMode: true }));
}

function initReveal() {
  const targets = document.querySelectorAll("main > section:not(.hero) .sec-head, .fig, .steps li, .callout, .classes, .examples, .stats.compact");
  if (!("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add("in"); observer.unobserve(entry.target); }
  }), { rootMargin: "0px 0px -8% 0px" });
  targets.forEach(t => { t.classList.add("reveal"); observer.observe(t); });
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  renderHeader();
  renderDemo("lesion", false);
  bindTabs(document.querySelector("#lens .demo-tabs"), "data-case", name => renderDemo(name, true));
  renderClasses();
  renderExamples("lesion");
  bindTabs(document.querySelector("#examples .demo-tabs"), "data-set", renderExamples);
  renderBib();
  renderMath();
  initReveal();
});
