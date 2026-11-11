---
title: 数式一覧
description: Keiba Vision で使っているすべての数式を 1 ページにまとめた早見表です。詳しい説明は各リンク先のページにあります。
group: リファレンス
order: 1
---

## モンテカルロ (勝率) — `native/zig/montecarlo.zig`

| 量 | 式 | 説明 |
|---|---|---|
| 出来 | $X_i = \mu_i + \varepsilon_i$ | [モンテカルロ法](/learn/monte-carlo) |
| 平均的な出来 | $\mu_i = \dfrac{\mathrm{SI}_i}{100}\, m(\text{脚質}, \pi)\,(0.85 + 0.15\,s_i)$ | $s_i$ はスタミナ (0〜1) |
| 脚質の相性 | $m_\text{逃} = 1.04 - 0.30\delta$, $m_\text{先} = 1.02 - 0.12\delta$, $m_\text{差} = 1.00 + 0.15\delta$, $m_\text{追} = 0.98 + 0.30\delta$ | $\delta = \pi - 1$ |
| 揺らぎ | $\varepsilon_i = 0.11\,(U_1 + U_2 + U_3 + U_4 - 2)$ | 標準偏差 $0.11/\sqrt3 \approx 0.0635$ |
| 勝率の推定 | $\hat p_i = W_i / N$ | $N = 100{,}000$ |
| 標準誤差 | $\sqrt{p(1-p)/N}$ | 95% 区間は $\pm 1.96$ 倍 |
| 2 頭の先着確率 | $\Phi\!\big(\Delta\mu / (\sigma\sqrt2)\big)$ | 検算用の解析解 |
| 1 着確率 (正規近似) | $\displaystyle p_i = \int \tfrac1\sigma\varphi\!\left(\tfrac{x - \mu_i}{\sigma}\right)\prod_{j\ne i}\Phi\!\left(\tfrac{x - \mu_j}{\sigma}\right)dx$ | 手では解けない |

## 乱数 — [乱数のつくり方](/learn/random)

| 量 | 式 |
|---|---|
| xorshift32 | $s \leftarrow s \oplus (s \ll 13)$, $s \leftarrow s \oplus (s \gg 17)$, $s \leftarrow s \oplus (s \ll 5)$ |
| $[0, 1)$ への変換 | $U = \lfloor s / 2^8 \rfloor / 2^{24}$ |
| 名前のハッシュ | $h = \sum_k c_k\,31^{n-k} \bmod 2^{32}$、脚質は $\lvert h \rvert \bmod 100$ で 12/40/33/15% |

## 予想エンジン — [予想エンジン](/learn/scoring)

| 量 | 式 |
|---|---|
| スピード | $\operatorname{clamp}\big((\mathrm{SI} - 60)/60 \times 100,\ 10,\ 98\big)$ |
| 騎手 | $\operatorname{clamp}(400w,\ 40,\ 98)$ |
| 総合スコア | $\operatorname{clamp}(0.35x_\text{spd} + 0.20x_\text{pace} + 0.15x_\text{ped} + 0.15x_\text{jky} + 0.10x_\text{cond} + b_\text{枠} + b_\text{調教},\ 15,\ 99.5)$ |
| 画面の「勝率」 | $\operatorname{clamp}(2.8\,S / O,\ 2,\ 68)$ (確率ではない) |
| 妙味指数 | $\operatorname{clamp}(75\,\hat p\,O / 100,\ 30,\ 99) = 2.1\,S$ (切られない範囲) |
| 馬連の想定オッズ | $\max(4,\ o_1 o_2 / 2.2)$ |

## 能力値 — [能力値と適性](/learn/rating)

| 量 | 式 |
|---|---|
| 素点 | $R = 18\sqrt{w} + 3\min(g_1, 9) + 0.6\min(g, 15) + \min(3\log_{10}(1 + E),\ 15)$ |
| 順位 | $p = r / (N - 1)$ |
| 能力値 | $\operatorname{round}(45 + 54p^2)$ |
| 分布 | $P(\text{能力値} \le x) = \sqrt{(x - 45)/54}$ |
| SI への換算 | $70 + 0.5 \times \text{能力値} - 4[\text{馬場不得意}] - \min(6,\ \lvert D - D^* \rvert / 250)$ |

## 3D の運動 — [3D の運動学](/learn/kinematics)

| 量 | 式 |
|---|---|
| 走破タイム | $T_i = (D / \bar v)\,\big(1 + 0.12\,(x_\text{max} - x_i)\big)$ |
| 時間のゆがみ | $\tau(t) = t - a(1 - e^{-t/a})$, $a = 1.1$ |
| 進み具合 | $u = \tau / (T - a)$ |
| 位置 | $x = D\big(u + s\,u(1 - u)\big)$ |
| 単調である条件 | $\lvert s \rvert < 1$ |
| 最大リード | $D(s_A - s_B)/4$ (同タイムのとき、$u = 1/2$) |
| ゴール後 | $x = D + 5v_\text{end}(1 - e^{-\Delta/5})$, $v_\text{end} = D(1 - s)/(T - a)$ |
| ゴール時刻の補間 | $t^* = t - \Delta t\,(x - G)/(x - x_\text{prev})$ |
| 着差 (馬身) | $\ell = \Delta t \cdot (D / T_1) / 2.4$ |

## コースとカメラ — [コースの幾何学](/learn/track-geometry)・[カメラ](/learn/animation)

| 量 | 式 |
|---|---|
| コーナー半径 | $R = 110 + 0.1S$ |
| 1 周 | $L = 2S + 2\pi R$ |
| コーナー上の点 | $(S/2 + r\cos p,\ r\sin p)$, $p = \pi/2 - (s - S)/R$ |
| 進行方向 | $(\sin p,\ -\cos p)$ |
| スタート | $s_\text{start} = (0.85S - D) \bmod L$ |
| 回転角 | 前方 $+z$: $\operatorname{atan2}(d_x, d_z)$、長辺 $+x$: $\operatorname{atan2}(-v_z, v_x)$ |
| カメラ追従 | $k = 1 - e^{-\lambda\Delta t}$, $\lambda = 2.5$, 半減期 $\ln 2 / \lambda \approx 0.28$ 秒 |

## 血統 — [血統の数学](/learn/pedigree)

| 量 | 式 |
|---|---|
| 血量 | $2^{-g_1} + 2^{-g_2}$ |
| 近交係数 | $(1/2)^{g_1 + g_2 - 1}(1 + F_A)$ (アプリは $F_A = 0$) |
| 評価 | 血量 ≥ 25% 濃い、≥ 12.5% ほどよい |

## 発展 — [本物の予想へ](/learn/beyond)

| 量 | 式 |
|---|---|
| 控除率とオッズ | $\sum 1/O_i = 1/(1 - t)$ |
| 市場の確率 | $q_i = (1/O_i) / \sum_j (1/O_j)$ |
| softmax | $p_i = e^{\beta S_i} / \sum_j e^{\beta S_j}$ |
| Harville | $P(i, j) = p_i\,p_j / (1 - p_i)$ |
| Brier スコア | $\frac1R\sum_r\sum_i (p_{ri} - o_{ri})^2$ |
| 対数損失 | $-\frac1R\sum_r \ln p_{r,\text{勝ち馬}}$ |
| ケリー基準 | $f^* = (pO - 1)/(O - 1)$ |
