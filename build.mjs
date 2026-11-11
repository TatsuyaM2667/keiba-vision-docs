// =============================================================================
// ドキュメントサイトのビルド: content/**/*.md → dist/**/*.html
// =============================================================================
// React の公式ドキュメント (react.dev) の構成を手本にしている:
//   上部ナビ / 左のサイドバー / 本文 / 右の「このページの内容」/ 前後のページ / 検索
// 原稿の書き方 (Markdown の拡張):
//   ---                       先頭の front matter (title, description, order, learn)
//   $x$ / $$ ... $$           数式 (ビルド時に KaTeX で HTML にする。ブラウザで JS 不要)
//   ```kotlin title="a.kt"    コード (Shiki で色付け。title はファイル名の見出し)
//   :::note 見出し … :::      注意 (note / pitfall / deepdive / recap / challenge / learn)
//   challenge の中の「---答え---」より後ろは、開くと見える解答になる
//   <div class="demo" data-demo="名前"></div>  対話型のデモ (assets/demos.js)
import { readFile, writeFile, mkdir, readdir, cp, rm } from "node:fs/promises";
import { join, dirname, relative } from "node:path";
import { Marked } from "marked";
import katex from "katex";
import { createHighlighter } from "shiki";

const ROOT = dirname(new URL(import.meta.url).pathname);
const OUT = join(ROOT, "dist");
// コード片の見出しはアプリ本体のリポジトリ、「このページを編集」はこのドキュメントのリポジトリへリンクする
const REPO = "https://github.com/TatsuyaM2667/keiba-predictor";
const DOCS_REPO = "https://github.com/TatsuyaM2667/keiba-vision-docs";
const SITE_TITLE = "Keiba Vision ドキュメント";

// サイドバーの並び (front matter の section と order で決まる)
const SECTIONS = [
  { id: "learn", title: "学ぶ", groups: ["入門", "予想のしくみ", "3D と映像の数学", "血統と天気", "発展"] },
  { id: "reference", title: "リファレンス", groups: ["リファレンス"] },
];

const highlighter = await createHighlighter({
  themes: ["github-light", "github-dark-dimmed"],
  langs: ["kotlin", "zig", "odin", "c", "ts", "js", "sql", "sh", "json", "text"],
});

// サイドバーと前後のページでは、題名の「—」より前だけを使う (react.dev のように短く)
const short = t => (t ?? "").split(" — ")[0];
const escapeHtml = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const slug = text => text.toLowerCase().replace(/<[^>]+>/g, "").replace(/[\s　]+/g, "-").replace(/[^\p{L}\p{N}\-]/gu, "");

/** front matter (--- key: value ---) を読む */
function frontMatter(src) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(src);
  if (!m) return [{}, src];
  const meta = Object.fromEntries(m[1].split("\n").map(l => l.split(/:\s*(.*)/s)).map(([k, v]) => [k.trim(), v?.trim() ?? ""]));
  return [meta, src.slice(m[0].length)];
}

/**
 * 数式の処理。KaTeX の出力を Markdown 変換に通すと、数式の中の _ や * が強調記号と誤解されるので、
 *   1. コード (``` と `) を退避 (コード中の $ を数式と誤解しないため)
 *   2. 数式を「KXM番号KX」という目印に置き換え、コードを戻す
 *   3. Markdown → HTML に変換したあと、目印を KaTeX の HTML に差し替える
 * の順で処理する。
 */
function extractMath(md) {
  const codes = [], maths = [];
  md = md.replace(/^```[\s\S]*?^```/gm, s => `\u0000${codes.push(s) - 1}\u0000`).replace(/`[^`\n]+`/g, s => `\u0000${codes.push(s) - 1}\u0000`);
  md = md.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => `\n\nKXMD${maths.push(tex.trim()) - 1}KX\n\n`);
  md = md.replace(/(?<![\\$\w])\$([^$\n]+?)\$(?!\d)/g, (_, tex) => `KXMI${maths.push(tex) - 1}KX`);
  md = md.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[i]);
  const opts = { throwOnError: true, strict: "ignore" };
  const restore = html => html
    .replace(/<p>KXMD(\d+)KX<\/p>/g, (_, i) => `<div class="math-block">${katex.renderToString(maths[i], { ...opts, displayMode: true })}</div>`)
    .replace(/KXMD(\d+)KX/g, (_, i) => `<div class="math-block">${katex.renderToString(maths[i], { ...opts, displayMode: true })}</div>`)
    .replace(/KXMI(\d+)KX/g, (_, i) => katex.renderToString(maths[i], opts));
  // 見出しの ID や検索用のテキストでは、数式を TeX の文字 (記号を除く) で代用する
  const plain = text => text.replace(/KXM[ID](\d+)KX/g, (_, i) => maths[i].replace(/\\[a-zA-Z]+|[{}\\^_]/g, ""));
  return { md, restore, plain };
}

const CALLOUTS = {
  note: ["注", "info"],
  pitfall: ["落とし穴", "alert"],
  deepdive: ["さらに深く", "layers"],
  recap: ["まとめ", "check"],
  challenge: ["練習問題", "pencil"],
  learn: ["このページで学ぶこと", "book"],
};
const ICONS = {
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  github: '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-14.93 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  arrowL: '<path d="m15 18-6-6 6-6"/>',
  arrowR: '<path d="m9 18 6-6-6-6"/>',
  external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
};
const icon = (name, cls = "icon") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

/** ::: で囲んだブロックを先に HTML に変換 (中身は Markdown として再帰的に処理) */
function renderCallouts(md, toHtml) {
  return md.replace(/^:::(\w+)[ \t]*(.*)\n([\s\S]*?)^:::[ \t]*$/gm, (_, kind, title, body) => {
    const [label, ic] = CALLOUTS[kind] ?? CALLOUTS.note;
    if (kind === "deepdive") {
      return `<details class="callout deepdive"><summary>${icon(ic)}<span class="label">${label}</span><span class="title">${escapeHtml(title)}</span></summary><div class="callout-body">${toHtml(body)}</div></details>\n`;
    }
    if (kind === "challenge") {
      const [q, a] = body.split(/^---答え---[ \t]*$/m);
      return `<div class="callout challenge"><div class="callout-head">${icon(ic)}<span class="label">${label}</span><span class="title">${escapeHtml(title)}</span></div><div class="callout-body">${toHtml(q)}${a ? `<details class="answer"><summary>答えを見る</summary>${toHtml(a)}</details>` : ""}</div></div>\n`;
    }
    return `<div class="callout ${kind}"><div class="callout-head">${icon(ic)}<span class="label">${title ? escapeHtml(title) : label}</span></div><div class="callout-body">${toHtml(body)}</div></div>\n`;
  });
}

function markdown(toc, plain = t => t) {
  const m = new Marked({ gfm: true });
  m.use({
    renderer: {
      heading({ tokens, depth }) {
        const html = this.parser.parseInline(tokens);
        const id = slug(plain(html)) || `h-${toc?.length ?? 0}`;
        if (toc && (depth === 2 || depth === 3)) toc.push({ depth, id, html, text: plain(html).replace(/<[^>]+>/g, "") });
        return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true">#</a>${html}</h${depth}>\n`;
      },
      code({ text, lang = "" }) {
        const [language, ...rest] = lang.split(/\s+/);
        const title = /title="([^"]+)"/.exec(rest.join(" "))?.[1];
        const known = highlighter.getLoadedLanguages().includes(language) ? language : "text";
        const html = highlighter.codeToHtml(text, { lang: known, themes: { light: "github-light", dark: "github-dark-dimmed" }, defaultColor: false });
        const head = title ? `<div class="code-title"><a href="${REPO}/blob/main/${title}" target="_blank" rel="noopener">${escapeHtml(title)}</a></div>` : "";
        return `<div class="code">${head}${html}</div>\n`;
      },
      table(token) {
        // 横に長い表はスクロールできるように包む
        const head = token.header.map(c => `<th${c.align ? ` style="text-align:${c.align}"` : ""}>${this.parser.parseInline(c.tokens)}</th>`).join("");
        const rows = token.rows.map(r => `<tr>${r.map(c => `<td${c.align ? ` style="text-align:${c.align}"` : ""}>${this.parser.parseInline(c.tokens)}</td>`).join("")}</tr>`).join("");
        return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>\n`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const external = /^https?:/.test(href);
        return `<a href="${href}"${title ? ` title="${escapeHtml(title)}"` : ""}${external ? ' target="_blank" rel="noopener"' : ""}>${text}${external ? icon("external", "icon ext") : ""}</a>`;
      },
    },
  });
  return m;
}

function render(md, toc) {
  const { md: src, restore, plain } = extractMath(md);
  const inner = part => markdown(null, plain).parse(part);
  const html = restore(markdown(toc, plain).parse(renderCallouts(src, inner)));
  toc.forEach(t => { t.html = restore(t.html); });
  return html;
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

// ---------------- ページを読む ----------------
const pages = [];
for (const file of await walk(join(ROOT, "content"))) {
  const [meta, body] = frontMatter(await readFile(file, "utf8"));
  const rel = relative(join(ROOT, "content"), file).replace(/\.md$/, "");
  const url = rel === "index" ? "/" : "/" + rel.replace(/\/index$/, "");
  const section = rel.split("/")[0];
  pages.push({ ...meta, file, rel, url, section, order: Number(meta.order ?? 0), body });
}
const ordered = SECTIONS.flatMap(s => s.groups.flatMap(g => pages.filter(p => p.section === s.id && p.group === g).sort((a, b) => a.order - b.order)));

function sidebar(current) {
  return SECTIONS.map(s => `<div class="nav-section"><p class="nav-title">${s.title}</p>${s.groups.map(g => {
    const list = ordered.filter(p => p.section === s.id && p.group === g);
    if (!list.length) return "";
    return `<p class="nav-group">${g}</p><ul>${list.map(p => `<li><a href="${p.url}"${p.url === current.url ? ' class="on" aria-current="page"' : ""}>${escapeHtml(short(p.title))}</a></li>`).join("")}</ul>`;
  }).join("")}</div>`).join("");
}

function layout(page, html, toc) {
  const i = ordered.indexOf(page);
  const prev = i > 0 ? ordered[i - 1] : null, next = i >= 0 && i < ordered.length - 1 ? ordered[i + 1] : null;
  const isHome = page.url === "/";
  const pager = isHome ? "" : `<nav class="pager">${prev ? `<a class="prev" href="${prev.url}"><span>前へ</span><strong>${escapeHtml(short(prev.title))}</strong></a>` : "<span></span>"}${next ? `<a class="next" href="${next.url}"><span>次へ</span><strong>${escapeHtml(short(next.title))}</strong></a>` : ""}</nav>`;
  const tocHtml = toc.length && !isHome ? `<aside class="toc" aria-label="このページの内容"><p>このページの内容</p><ul>${toc.map(t => `<li class="d${t.depth}"><a href="#${t.id}">${t.html}</a></li>`).join("")}</ul></aside>` : "";
  const crumb = isHome ? "" : `<p class="crumb">${SECTIONS.find(s => s.id === page.section)?.title ?? ""} ・ ${escapeHtml(page.group ?? "")}</p>`;
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${isHome ? SITE_TITLE : `${escapeHtml(page.title)} – ${SITE_TITLE}`}</title>
<meta name="description" content="${escapeHtml(page.description ?? "")}">
<script>(function(){var t=null;try{t=localStorage.getItem("kvd-theme")}catch(e){}if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t})();</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@400;500;700;800&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="/assets/katex/katex.min.css">
<link rel="stylesheet" href="/assets/site.css">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%23087ea4'/><path d='M9 7c-3 6-3 13 2 17 3 2 7 2 10 0 5-4 5-11 2-17' fill='none' stroke='white' stroke-width='3' stroke-linecap='round'/></svg>">
</head>
<body class="${isHome ? "home" : "doc"}">
<header class="topnav">
  <button class="icon-btn menu-btn" id="menu-btn" aria-label="メニュー">${icon("menu")}</button>
  <a class="logo" href="/"><span class="logo-mark"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 7c-3 6-3 13 2 17 3 2 7 2 10 0 5-4 5-11 2-17"/></svg></span><span>Keiba Vision</span><span class="logo-sub">Docs</span></a>
  <button class="search-btn" id="search-btn">${icon("search")}<span>検索</span><kbd>Ctrl K</kbd></button>
  <nav class="toplinks">
    <a href="/learn"${page.section === "learn" ? ' class="on"' : ""}>学ぶ</a>
    <a href="/reference"${page.section === "reference" ? ' class="on"' : ""}>リファレンス</a>
    <a href="https://keiba-vision.pages.dev" target="_blank" rel="noopener">アプリ</a>
  </nav>
  <button class="icon-btn" id="theme-btn" aria-label="ライト・ダーク切り替え">${icon("sun", "icon sun")}${icon("moon", "icon moon")}</button>
  <a class="icon-btn" href="${REPO}" target="_blank" rel="noopener" aria-label="GitHub">${icon("github")}</a>
</header>
<div class="frame">
  <aside class="sidebar" id="sidebar" aria-label="ページ一覧">${sidebar(page)}</aside>
  <main class="content" id="content">
    ${crumb}
    <article class="prose">${isHome ? "" : `<h1>${escapeHtml(page.title)}</h1>${page.description ? `<p class="intro">${escapeHtml(page.description)}</p>` : ""}`}${html}</article>
    ${pager}
    <footer class="foot">
      <a href="${DOCS_REPO}/blob/main/content/${page.rel}.md" target="_blank" rel="noopener">このページを GitHub で編集</a>
      <span>数式は KaTeX、コードは実際のリポジトリから引用しています。</span>
    </footer>
  </main>
  ${tocHtml}
</div>
<div class="search-modal" id="search-modal" hidden>
  <div class="search-box" role="dialog" aria-modal="true" aria-label="検索">
    <div class="search-input">${icon("search")}<input id="search-input" type="search" placeholder="ドキュメントを検索 (例: 標準誤差, xorshift, 近交係数)" autocomplete="off"><kbd>Esc</kbd></div>
    <ul id="search-results"></ul>
  </div>
</div>
<script src="/assets/site.js" defer></script>
<script type="module" src="/assets/demos.js"></script>
</body>
</html>`;
}

// ---------------- 書き出し ----------------
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
const index = [];
for (const page of pages) {
  const toc = [];
  const html = render(page.body, toc);
  const outFile = page.url === "/" ? join(OUT, "index.html") : join(OUT, page.rel.replace(/\/index$/, "") + ".html");
  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, layout(page, html, toc));
  const text = html.replace(/<span class="katex[\s\S]*?<\/annotation><\/semantics><\/math><\/span>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  index.push({ title: page.title ?? SITE_TITLE, url: page.url, headings: toc.map(t => ({ text: t.text, id: t.id })), text: text.slice(0, 6000) });
}
await mkdir(join(OUT, "assets"), { recursive: true });
await cp(join(ROOT, "assets"), join(OUT, "assets"), { recursive: true });
await cp(join(ROOT, "node_modules/katex/dist/katex.min.css"), join(OUT, "assets/katex/katex.min.css"));
await cp(join(ROOT, "node_modules/katex/dist/fonts"), join(OUT, "assets/katex/fonts"), { recursive: true });
// デモで本物の WebAssembly (Zig / Odin) を使う。アプリ本体でビルドしたものを wasm/ にコピーして同梱している
await cp(join(ROOT, "wasm"), join(OUT, "wasm"), { recursive: true });
await writeFile(join(OUT, "search-index.json"), JSON.stringify(index));
await writeFile(join(OUT, "404.html"), layout({ url: "/404", title: "ページが見つかりません", section: "", group: "", rel: "index", description: "" }, `<p>お探しのページは見つかりませんでした。<a href="/">トップページ</a>へ戻ってください。</p>`, []));
console.log(`${pages.length} ページを dist/ に書き出しました`);
