# Keiba Vision ドキュメント

競馬予想アプリ [Keiba Vision](https://github.com/TatsuyaM2667/keiba-predictor) の予想・推論・3D の数学を、初心者から専門家レベルまで一歩ずつ説明するドキュメントサイトです。

**公開中: https://keiba-vision-docs.pages.dev**

- 全 18 ページ (学ぶ 11 + リファレンス 5 + トップ)
- 数式はすべてアプリの実際のコードと 1 対 1 で対応し、数値の例は実際の計算結果
- 対話型デモ 8 つ (モンテカルロと血量計算は、アプリと同じ Zig / Odin の WebAssembly を動かす)
- 各ページに練習問題

## 構成

React の公式ドキュメント (react.dev) のレイアウトを手本にしています。Markdown の原稿から、ビルド時に静的 HTML を作ります (ブラウザ側で数式やコードを処理しないので軽い)。

```text
content/           原稿 (Markdown)
  index.md           トップページ
  learn/             学ぶ (確率の基本 → 予想 → 3D → 血統 → 発展)
  reference/         リファレンス (数式一覧・定数一覧・用語集・ログインの数学・データ)
assets/
  site.css           レイアウトとデザイン (ライト / ダーク)
  site.js            テーマ切替・目次の現在位置・検索 (Ctrl+K)
  demos.js           対話型デモ
wasm/              アプリ本体でビルドした WebAssembly (montecarlo.wasm, pedigree.wasm)
build.mjs          content/ → dist/ の変換 (marked + KaTeX + Shiki)
wrangler.jsonc     Cloudflare Pages の設定
```

## 原稿の書き方

| 書き方 | 意味 |
|---|---|
| 先頭の `---` で囲んだ部分 | `title` `description` `group` (サイドバーの見出し) `order` (並び順) |
| `$x$` / `$$ ... $$` | 数式 (KaTeX) |
| ` ```kotlin title="src/.../A.kt" ` | コード。`title` はアプリ本体のリポジトリへのリンクになる |
| `:::note 見出し` 〜 `:::` | 囲み記事。`note` `pitfall` `deepdive` (開閉式) `recap` `challenge` `learn` |
| `challenge` 内の `---答え---` | それより後ろが「答えを見る」で開く解答になる |
| `<div class="demo" data-demo="mc"></div>` | 対話型デモ (`irwin-hall` `mc` `pairwise` `progress` `percentile` `smoothing` `blood` `track`) |

## ビルドと公開

Node.js 22 以上が必要です。

```sh
npm install
npm run build     # dist/ を作る
npm run deploy    # Cloudflare Pages (プロジェクト名 keiba-vision-docs) に公開
```

初回だけ `npx wrangler login` で Cloudflare にログインしてください。

アプリ本体の Zig / Odin のコードを変えたときは、アプリ側で `native/build.sh` を実行し、できた `montecarlo.wasm` と `pedigree.wasm` をこのリポジトリの `wasm/` にコピーしてください。

## ライセンスとクレジット

- 数式の表示: [KaTeX](https://katex.org/) (MIT)
- コードの色付け: [Shiki](https://shiki.style/) (MIT)
- Markdown の変換: [marked](https://marked.js.org/) (MIT)
