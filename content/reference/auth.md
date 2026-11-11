---
title: ログインの数学 — JWT と RSA 署名
description: Web 版の Google ログイン (Firebase Auth) で、サーバーが「本物のログイン」を見分ける仕組みを、RSA 署名の数学から説明します。予想とは別の話題ですが、確率や整数の性質が実際の安全を支えている例です。
group: リファレンス
order: 4
---

:::learn
- ID トークン (JWT) の 3 つの部分
- RSA 署名の仕組み (べき乗の余り) と、なぜ偽造できないのか
- サーバーが確かめている 7 つの項目
- 鍵の入れ替えとキャッシュ
:::

## ID トークン — 3 つに区切られた文字列

Google でログインすると、ブラウザは Firebase から **ID トークン** を受け取り、API を呼ぶたびに `Authorization: Bearer <トークン>` として送ります。トークンは `.` で区切られた 3 つの部分からなる JWT (JSON Web Token) です。

```text
eyJhbGciOiJSUzI1NiIsImtpZCI6...   .   eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2Vu...   .   Q2xh...
          ヘッダー                                   中身 (クレーム)                            署名
```

最初の 2 つは JSON を base64url で文字にしただけなので、**誰でも読めて、誰でも書き換えられます**。安全を保証しているのは 3 つ目の **署名** です。

## RSA 署名

Google は、次の性質を持つ 3 つの大きな整数 $n$, $e$, $d$ を用意しています。

- $n = pq$ ($p$, $q$ はそれぞれ約 1024 ビット = 約 309 桁の大きな素数。$n$ は 2048 ビット)
- $e$ と $d$ は $ed \equiv 1 \pmod{\varphi(n)}$ を満たす ($\varphi(n) = (p-1)(q-1)$)
- $(n, e)$ は **公開鍵** (誰でも見られる)、$d$ は **秘密鍵** (Google だけが持つ)

署名と検証は、どちらも「べき乗して $n$ で割った余り」です。

$$
\text{署名: } \sigma = m^d \bmod n, \qquad \text{検証: } \sigma^e \bmod n \overset{?}{=} m
$$

$m$ はヘッダーと中身を SHA-256 で要約 (**ハッシュ**) し、決まった形式 (PKCS#1 v1.5) に詰めた数です。$ed \equiv 1$ なので、オイラーの定理から $(m^d)^e = m^{ed} \equiv m \pmod n$ となり、正しい署名なら検証で元に戻ります。

### なぜ偽造できないのか

偽の中身 (例: 「私は管理者」) に合う署名 $\sigma'$ を作るには、$\sigma'^e \equiv m' \pmod n$ を解く必要があります。これは $d$ を知らなければ、$n$ を素因数分解するのと同じくらい難しいと考えられています。2048 ビット ($n$ が約 617 桁) の素因数分解は、現在の計算機では現実的な時間でできません。中身を 1 文字でも変えれば SHA-256 の値は全く別のものになるので、元の署名も使えなくなります。

## サーバーが確かめる 7 項目

```ts title="pages/lib/firebase-auth.ts"
if (header.alg !== "RS256" || typeof header.kid !== "string") return null;
// ... 署名の検証 ...
if (typeof p.exp !== "number" || p.exp + SKEW < now) return null;
if (typeof p.iat !== "number" || p.iat - SKEW > now) return null;
if (p.aud !== projectId || p.iss !== `https://securetoken.google.com/${projectId}`) return null;
if (typeof p.sub !== "string" || !p.sub || p.sub.length > 128) return null;
```

| 項目 | 確かめること | 防いでいること |
|---|---|---|
| `alg` | RS256 であること | `"alg": "none"` (署名なし) を通してしまう攻撃 |
| `kid` | Google の公開鍵のどれか | 自分で作った鍵での署名 |
| 署名 | $\sigma^e \bmod n$ が中身と一致 | 中身の書き換え |
| `exp` | 期限が切れていない | 盗まれた古いトークンの再利用 |
| `iat` | 未来に発行されていない | 時計をずらした偽造 |
| `aud`, `iss` | このアプリのプロジェクト宛て | 別のアプリのトークンの流用 |
| `sub` | 空でない (ユーザー ID) | ID のないトークン |

`SKEW` (60 秒) は、サーバーどうしの時計の小さなずれを許すための余裕です。どれか 1 つでも失敗したら、理由を返さずにまとめて「ログインしていない」として扱います (攻撃者に手がかりを与えないため)。

## 鍵の入れ替え

Google は公開鍵を数日ごとに入れ替えます。サーバーは公開鍵の一覧を HTTP の `Cache-Control: max-age` で示された時間だけ覚えておき、知らない `kid` が来たら一覧を取り直します。

:::note テストでの確かめ方
`pages/test-functions.mjs` では、その場で作った RSA 鍵で署名したトークンを使い、正しいトークンが通ることと、期限切れ・未来の発行・別プロジェクト・別の発行元・空の ID・別の鍵・知らない鍵 ID・`alg: none`・中身の書き換え・壊れた文字列の 10 種類がすべて拒否されることを確認しています。
:::
