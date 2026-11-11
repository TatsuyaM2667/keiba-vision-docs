---
title: 天気と馬場 — 規則で推定する
description: 全国 25 場の現在の天気から「推定の馬場状態」を出す仕組みです。統計モデルではなく単純な規則ですが、どんな情報を使い、何を使っていないかを知ることで、推定の限界が分かります。
group: 血統と天気
order: 2
---

:::learn
- 天気の数値データ (WMO 天気コード) の読み方
- 天気コードと降水量から馬場状態を決める規則
- 25 場の天気を 1 回の通信で取る方法とキャッシュ
- この推定が使っていない情報 (と、本物の馬場発表との違い)
:::

## データ — Open-Meteo の現在の天気

天気は無料の気象 API [Open-Meteo](https://open-meteo.com/) から、競馬場の緯度・経度を指定して取得しています。使う値は 4 つです。

| 項目 | 意味 |
|---|---|
| `temperature_2m` | 地上 2m の気温 (℃) |
| `precipitation` | 直近の降水量 (mm) |
| `weather_code` | WMO (世界気象機関) の天気コード |
| `wind_speed_10m` | 地上 10m の風速 (km/h) |

25 場ぶんを 1 回で取るため、緯度と経度をカンマ区切りで並べて送ります (`latitude=43.07,41.78,...`)。結果は 10 分間キャッシュし、同じ問い合わせを繰り返さないようにしています。

## 規則 — 天気コード → 馬場

```kotlin title="src/main/kotlin/com/example/keiba/service/WeatherService.kt"
0 -> Triple("快晴", "sun", TrackCondition.FIRM)
1, 2 -> Triple("晴れ", "cloud-sun", TrackCondition.FIRM)
3 -> Triple("曇り", "cloud", TrackCondition.FIRM)
45, 48 -> Triple("霧", "cloud-fog", TrackCondition.GOOD)
51, 53, 55 -> Triple("小雨", "cloud-drizzle", if (precip > 1.5) TrackCondition.YIELDING else TrackCondition.GOOD)
71, 73, 75, 77, 85, 86 -> Triple("雪", "cloud-snow", TrackCondition.YIELDING)
61, 63, 65 -> Triple("雨", "cloud-rain", TrackCondition.YIELDING)
80, 81, 82 -> Triple("強い雨", "cloud-lightning", TrackCondition.SOFT)
else -> Triple("曇り", "cloud", TrackCondition.FIRM)
```

| 天気コード | 天気 | 推定馬場 |
|---|---|---|
| 0〜3 | 快晴・晴れ・曇り | 良 |
| 45, 48 | 霧 | 稍重 |
| 51〜55 | 霧雨 (小雨) | 降水量 1.5mm 超なら重、それ以外は稍重 |
| 61〜65 | 雨 | 重 |
| 71〜86 (雪) | 雪 | 重 |
| 80〜82 | にわか雨 (強い雨) | 不良 |

これは **if 文の規則** (決定表) で、データから学習したものではありません。

## 推定の限界

本物の馬場状態は、競馬場が芝やダートの **含水率** (土にどれだけ水が含まれているか) を測って発表します。含水率は「今」の天気よりも、**過去数日の雨の量**、日差し、風、気温、そして芝の種類や水はけで決まります。

このアプリの推定は「今の天気」しか見ていないので、

- 昨日まで大雨で今日は晴れ → 実際は重でも「良」と出る
- 乾いた馬場に今降り始めた雨 → 実際は良でも「重」と出る

という食い違いが起きます。精度を上げるなら、Open-Meteo の過去の降水量 (`past_days`) を使って「直近 72 時間の累積降水量」を説明変数にし、過去の馬場発表を目的変数にして学習する、といった方法が考えられます。

:::note 予想への影響
推定馬場はレース予想エンジンの「馬場」の点数 (良 85、稍重 82、重・不良は馬体重しだいで 72 か 90) にだけ使われます。[モンテカルロ](/learn/monte-carlo) と 3D シミュレーションの着順には影響しません。
:::

:::recap
- Open-Meteo から気温・降水量・天気コード・風速を取り、25 場を 1 回で取得、10 分キャッシュ
- 天気コードと降水量の決定表で、良・稍重・重・不良を推定
- 本物の馬場は含水率で決まり、過去数日の雨が重要。今の天気だけでは限界がある
:::
