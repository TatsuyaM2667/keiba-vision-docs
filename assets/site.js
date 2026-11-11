// サイト共通の動き: テーマ切り替え / スマホのメニュー / 目次の現在位置 / 検索 (Ctrl+K)
(() => {
  const $ = s => document.querySelector(s);

  // テーマ (ライト / ダーク)。選んだものを覚える
  $("#theme-btn").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("kvd-theme", next); } catch (_) {}
  });

  // スマホではサイドバーを引き出しにする
  $("#menu-btn").addEventListener("click", () => document.body.classList.toggle("menu-open"));
  $("#content").addEventListener("click", () => document.body.classList.remove("menu-open"));
  document.querySelector(".sidebar a.on")?.scrollIntoView({ block: "center" });

  // 目次: いま読んでいる見出しを強調する (画面上部から 1/3 までに入った最後の見出し)
  const tocLinks = [...document.querySelectorAll(".toc a")];
  if (tocLinks.length) {
    const heads = tocLinks.map(a => document.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean);
    const update = () => {
      let current = heads[0];
      for (const h of heads) if (h.getBoundingClientRect().top < innerHeight / 3) current = h;
      tocLinks.forEach(a => a.classList.toggle("on", decodeURIComponent(a.hash.slice(1)) === current?.id));
    };
    addEventListener("scroll", update, { passive: true });
    update();
  }

  // 検索: 初めて開いたときに search-index.json を読み、タイトル > 見出し > 本文 の順に点数を付ける
  const modal = $("#search-modal"), input = $("#search-input"), list = $("#search-results");
  let index = null, active = 0, hits = [];
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const mark = (text, q) => esc(text).replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), m => `<mark>${m}</mark>`);
  async function open() {
    modal.hidden = false;
    input.value = "";
    input.focus();
    if (!index) index = await (await fetch("/search-index.json")).json();
    search();
  }
  const close = () => { modal.hidden = true; };
  function search() {
    const q = input.value.trim().toLowerCase();
    hits = [];
    for (const p of index || []) {
      if (!q) { hits.push({ score: 0, title: p.title, url: p.url, sub: "" }); continue; }
      if (p.title.toLowerCase().includes(q)) hits.push({ score: 3, title: p.title, url: p.url, sub: "" });
      for (const h of p.headings) if (h.text.toLowerCase().includes(q)) hits.push({ score: 2, title: h.text, url: `${p.url}#${h.id}`, sub: p.title });
      const i = p.text.toLowerCase().indexOf(q);
      if (i >= 0) hits.push({ score: 1, title: p.title, url: p.url, sub: "…" + p.text.slice(Math.max(0, i - 30), i + 50) + "…" });
    }
    const seen = new Set();
    hits = hits.sort((a, b) => b.score - a.score).filter(h => !seen.has(h.url) && seen.add(h.url)).slice(0, 20);
    active = 0;
    list.innerHTML = hits.length
      ? hits.map((h, i) => `<li><a href="${h.url}" class="${i === active ? "on" : ""}">${q ? mark(h.title, q) : esc(h.title)}${h.sub ? `<small>${q ? mark(h.sub, q) : esc(h.sub)}</small>` : ""}</a></li>`).join("")
      : `<li class="empty">「${esc(input.value)}」に一致するページはありません</li>`;
  }
  $("#search-btn").addEventListener("click", open);
  input.addEventListener("input", search);
  modal.addEventListener("click", e => { if (e.target === modal) close(); });
  addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); modal.hidden ? open() : close(); }
    if (modal.hidden) return;
    if (e.key === "Escape") close();
    const links = [...list.querySelectorAll("a")];
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + links.length) % Math.max(1, links.length);
      links.forEach((a, i) => a.classList.toggle("on", i === active));
      links[active]?.scrollIntoView({ block: "nearest" });
    }
    if (e.key === "Enter" && links[active]) location.href = links[active].href;
  });
})();
