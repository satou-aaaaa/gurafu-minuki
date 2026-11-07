# グラフのウソ見抜き

大げさな見出しとグラフ。目盛りの省略・期間の切り取り・絵の大きさ・%の合計など、グラフの「ウソ」がある所を押して見抜く1日5問の学習ゲーム。

遊ぶ: <https://satou-aaaaa.github.io/gurafu-minuki/>

- 今日の5問（だれでも同じ・1日1回）・上級（むずかしい3問・ヒントなし）・練習・とことん（何問でも）
- 手口帳（見抜いた手口と説明・出どころ）・実績・カレンダー（取りこぼした7日はあとから遊べる）
- ウソが無い「正しいグラフ」も出る。なんでもうたがうのでなく、確かめて決める練習
- 時間制限なし。記録は遊ぶ人のブラウザ（localStorage）だけ。外へ何も送らない

## 数字と手口の出どころ

グラフの数字・町・店はすべて架空。手口と正しいかき方の決まりは、次の資料に書いてあることをもとにしている。

- 東京都総務局統計部「統計グラフの見方」（縦の目盛りの省略・円グラフの構成比）: <https://www.toukei.metro.tokyo.lg.jp/kurasi/2025/2025pdf/ku25rf2400.pdf>
- 島根県統計調査課「統計グラフ」出前講座の資料（基点は0・比べる範囲・実数と割合・どんな人に聞いたか）: <https://www.pref.shimane.lg.jp/admin/pref/toukei/hukyu/demae.data/R2haihusiryou.pdf>
- 岡山県統計分析課「作品のチェックポイント」（棒グラフは0から・円グラフは合計100%・複数回答は円グラフにしない）: <https://www.pref.okayama.jp/uploaded/life/983414_9472150_misc.pdf>
- 総務省統計局 なるほど統計学園「グラフ作成の基本」: <https://www.stat.go.jp/naruhodo/9_graph/kihon.html>
- 総務省統計局 なるほど統計学園「絵グラフ」（絵の大きさは面積で）: <https://www.stat.go.jp/naruhodo/4_graph/shokyu/e-graph.html>
- 福島県統計課「クイズ！統計グラフの見せ方・見え方」（左右で目盛りがちがう）: <https://www.pref.fukushima.lg.jp/sec/11045b/kuizu-gurahu.html>
- Google for Developers「可視化のトラップ」: <https://developers.google.com/machine-learning/guides/data-traps/visualization-traps?hl=ja>

## 開発

```bash
bash scripts/setup.sh   # 最初に一度
node qa/run.mjs         # 検査（CI の QA と同じ）
```

決まりは [AGENTS.md](AGENTS.md)。
