---
title: Keiba Vision ドキュメント
description: 競馬予想アプリ Keiba Vision の予想と推論を、数学の言葉で一歩ずつ解き明かすドキュメント。
---

<section class="hero">
<p class="crumb">Keiba Vision ドキュメント</p>
<h1>予想の中身を、<br><em>数式で</em>読み解く。</h1>
<p>競馬予想アプリ Keiba Vision が「どの馬が勝ちそうか」をどうやって計算しているのか。中学数学から始めて、確率モデル、モンテカルロ法、微分、そして専門家が使う最尤推定やケリー基準まで。すべての数式を実際のコードと結びつけて説明します。</p>
<div class="hero-actions">
<a class="btn primary" href="/learn">学びはじめる</a>
<a class="btn ghost" href="/learn/monte-carlo">いちばん大事なページへ</a>
<a class="btn ghost" href="/reference">数式一覧</a>
</div>
</section>

## このドキュメントで分かること

<div class="cards">
<a class="card" href="/learn/probability"><span class="num">01</span><h3>確率の基本</h3><p>期待値・分散・正規分布・中心極限定理を、アプリで使う分だけ最短で。</p></a>
<a class="card" href="/learn/random"><span class="num">02</span><h3>乱数のつくり方</h3><p>xorshift32 の 3 行が周期 2³²−1 の乱数を生む理由。</p></a>
<a class="card" href="/learn/scoring"><span class="num">03</span><h3>予想エンジン</h3><p>加重平均で点数をつける仕組みと、その「勝率」が確率ではない理由。</p></a>
<a class="card" href="/learn/monte-carlo"><span class="num">04</span><h3>モンテカルロ法</h3><p>10 万回走らせて確率を数える。誤差 ±0.15 ポイントの根拠。</p></a>
<a class="card" href="/learn/rating"><span class="num">05</span><h3>能力値と適性</h3><p>平方根と対数で戦績を数値化し、順位で 45〜99 に配る。</p></a>
<a class="card" href="/learn/kinematics"><span class="num">06</span><h3>3D の運動学</h3><p>着順から「走り」を逆算する式と、その単調性・連続性。</p></a>
<a class="card" href="/learn/track-geometry"><span class="num">07</span><h3>コースの幾何学</h3><p>スタジアム曲線、接線と法線、鏡映、atan2。</p></a>
<a class="card" href="/learn/animation"><span class="num">08</span><h3>カメラとアニメーション</h3><p>指数関数で、どの画面でも同じ速さで動くカメラ。</p></a>
<a class="card" href="/learn/pedigree"><span class="num">09</span><h3>血統の数学</h3><p>奇跡の血量 18.75% と Wright の近交係数を確率から導く。</p></a>
<a class="card" href="/learn/beyond"><span class="num">10</span><h3>本物の予想へ</h3><p>控除率、softmax、Harville の偏り、対数損失、ケリー基準。</p></a>
</div>

## このドキュメントの約束

- **数式はすべて実際のコードと 1 対 1** で対応し、コードの見出しから GitHub の実物に飛べます
- **数値の例は実際のアプリが出した値** です (有馬記念のサンプル出馬表など)
- **うまくいっていない所も書きます**。予想エンジンの「勝率」が確率になっていないこと、3D の逃げ馬のリードが大きすぎることなど、限界と直し方まで説明します
- 各ページに **対話型のデモ** と **練習問題** があります。モンテカルロのデモは、アプリと同じ Zig の WebAssembly を動かしています

<div class="demo" data-demo="mc"></div>
