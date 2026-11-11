# AGENTS.md

グラフのウソ見抜き：大げさな見出しとグラフを見て、ウソの手口（目盛りの省略・期間の切り取り・絵の大きさ・%の合計など）がある所を押して見抜く1日5問の学習ゲーム。`index.html` と `gen.js`（手口と問題の作り方・グラフの絵）を GitHub Pages で公開する。

## 準備（最初に一度）

```bash
bash scripts/setup.sh   # Node.js（版は .nvmrc）を確かめ、検査の依存とブラウザを入れる。何度実行してもよい
```

## push する前の確認

```bash
node qa/run.mjs   # 手口ごとに3000問を数え直す（見せたグラフはウソ・直したグラフと「本当は」は正しい）・今日の5問と上級（3年分）・通しで遊ぶ・まちがい・ヒント・続きから・上級・練習・とことん（300回）・自信・2段目「どんな手口？」・復習・手口帳・実績・カレンダー・あとから・古いタブ・幅320px・PWA・引き継ぎ・見やすさ（CI の QA と同じ）
```

## このリポジトリの決まり

- 1問＝見出し＋題名＋グラフ＋注記。押せる所は「縦の目盛り y・横の目盛り x・グラフの形 g・題名 t・注記 n・ウソは無い ok」。答えの所は `KINDS` の `ans`。押せる所は幅320pxでも44px以上（`zonesOf`。QA が見る）。
- 手口（`KINDS`）は公的機関の資料に書いてあるものだけにし、`src` に出どころ（`SRC`）を付ける。足すときは資料で確かめ、`MAKE` に作り方、`qa/run.mjs` に「見せたグラフはウソ・直したグラフは正しい」を数で確かめる検査を足す。手口帳（`BOOK`）にも足す。
- 数える物（人・店・か所・台など、`CNT`）の値は整数にする（`stepOf`・`roundS` に単位を渡す。2026-11-07 CodeRabbit が「店の数 57.1」を見つけた。QA が全部の手口で見る）。
- グラフの数字・町・店はすべて架空（注記に「架空」）。実在の調査・会社・新聞の名前を使わない。正しいグラフ（`ok0`〜`ok2`）の見出しは数字どおりにする（QA が見る）。
- 今日の5問（やさしい2・ふつう2・むずかしい1。1問目は必ずウソあり）・上級（今日のむずかしいと別の3つ）は日本時間の日付から作る種（`seedOf`・`rng`）で決まり、だれでも同じ。`Math.random()` は練習・とことんの種だけ（QA が数を見る）。乱数は `sort` の比較の中で引かない。`gen.js` の `KINDS`・`MAKE`・題材の表を変えると過去の日の問題も変わるので、変えた PR に一言書く。題材は最後に足す。
- ★はまちがい＋ヒントの数（0で★3・1で★2・2以上で★1）。ヒントは1回目が「見るところ」、2回目がのこりを2つにしぼる。上級はヒントなし。時間制限は付けない。
- 好きなだけ遊べる：チケット・回数制限・🔒で開くモードを入れない（2026-11-06 satou さん）。上級・とことん・練習は最初から遊べる。とことん（`runs.e`）は、やさしい5→ふつうまで10→全部の手口を毎回ちがう種で出し、使い切ったら `moreList` で50問ずつ足す（1回の中で同じ問題・同じ手口を続けない。QA が300回見る）。まちがえても終わらず「ここで降りる」まで続く。自己ベスト `ebest` は一度で見抜いた数。今日の記録・連続・Ko-fi・シェアには数えない。
- 記録 `gurafu-v1`：`days`・`hdays`・`adays`（あとから）・`dex`（手口帳）・`runs`（`d`・`h`・`p`・`e`・`r`・`a:日付`）・`ach`・`kofi`・`ebest`。保存の前に読み直し、`load` は両側を `fresh()` で補って合わせる。答える前に保存した進み具合が画面と同じ問題か確かめる（`same`。古いタブで二重に数えない）。途中の保存（`keep`）は別のタブのヒント・まちがいを減らさない（shared-workflows `incidents/2026-11-04-daily-game-save-gaps.md`）。
- 1問を深くする（shared-workflows `routines/game-dev.md`「1問を深くする」、2026-11-11）：`depth.js` と `qa/depth-check.mjs` は shared-workflows `template/` の写しで、ここでは直さない。答える前に「🎯 自信あり？」を押せる（失うものは無い。この回の数は `runs.*.ds`）。ウソのあるグラフは、見抜いたら2段目「どんな手口？」を `gen.js` の `GROUPS` の3つ（目盛りのごまかし／切り取り・比べ方／形と合計）から選ぶ。手口と分け方の対応は `GRP`（手口を足したら `GRP` にも足す。QA が見る）。正しいグラフには2段目は無い。途中は `cur.step`・`cur.w2`・`cur.h2`。2段目のまちがい・ヒントも★に数え、2段目のヒントはちがう分け方を1つ消す。まちがい・ヒントがあった問題は `Depth.mark` で復習へ入り、1→3→7日後にホームの「復習」（`runs.r`）に戻る。復習は今日の記録・連続・Ko-fi・シェアに数えない。起動時に `Depth.setValid` で作り直せない鍵を数えない。
- 実績（`ACH`、14個）は記録から毎回数える。続けるは合計の日数。連続の日は1以上のときだけ出す。取りこぼした日（きのう〜7日前、`EPOCH` から）はカレンダーからあとから遊べる（連続・今日の記録・Ko-fi・シェアには数えない）。
- 共有は遊ぶ人が押したときに開くリンク（X・LINE・Web Share・コピー）だけ。シェアの文は 🟢🔶🔺 だけで、見出し・題名（答え）を出さない。
- 感想は「感想を送る」から GitHub の Issue フォーム（`.github/ISSUE_TEMPLATE/feedback.yml`）を開くだけ。名前・メールは聞かない。
- 応援は Ko-fi（https://ko-fi.com/satouaaaaa）へのただのリンクだけ。今日の5問・上級を初めて全部まちがいなしで終えたときだけ、結果の画面の下に1行。遊ぶのは無料のまま。
- 文字は少なめ・一画面一問。お笑いの言葉は入れない（QA が見る）。ほかの作品の名前・キャラ・見た目は使わない。
- 外へ通信しない。外から読むのは Google Fonts の文字だけ（CSP の `connect-src 'self'` を広げない）。出どころのリンクは押したときに開くだけ。
- 見やすさ：`</head>` の前の見やすさの設定（`<!-- a11y:begin -->`〜`end`）は shared-workflows `template/a11y/a11y.html` の写し、`qa/a11y.mjs` は `template/qa/a11y.mjs` の写しで、ここでは直さない。色だけで分けない（まちがいは ✕ と破線、見抜いた所は「✓ ここ」と太い枠、ヒントで消した所は点線、円グラフは番号、取れない星は ☆）。グラフは `aria-label` に中身を言葉で持つ（`descOf`）。
- 引き継ぎ：`transfer.js` と `qa/transfer-check.mjs` は shared-workflows `template/` の写しで、ここでは直さない。`data-keys` は `gurafu-v1,gurafu-depth`。記録の形を変えたら QA の `sample` も合わせる。
- 一行の式の途中にコメント `//` を足さない。少し遅れて動く処理（setTimeout）は、画面が替わっていたら何もしない。機能を足す・直すたびに `qa/run.mjs` に検査を足す（shared-workflows `incidents/2026-10-31-roppo-empty-village.md`）。
- PWA（`manifest.webmanifest`・`sw.js`・`icon-*.png`）：画面のファイルを足したら `sw.js` の `SHELL` にも足し、中身を大きく変えたら `CACHE` の版を上げる。アイコンは `node tools/make-icons.cjs`、SNS 用の絵 `og.png` は `node tools/make-og.cjs`（今日の問題を入れない）。
- 公開リポジトリなので、個人情報・鍵を入れない。

## 公開

- GitHub Pages は `main` のルート（`/`）を公開する。PR の QA と Secret scan が ✅ になると `automerge.yml` が自動でマージする。止めたいときは下書きにするか、ラベル「自動マージしない」を付ける。
- `sw.js`・`manifest.webmanifest` を変える PR は自動ではマージされない（`hold_paths`）。CodeRabbit のレビューを待ち、手でマージする直前に今の head へのレビューを読み直す（shared-workflows `incidents/2026-11-01-roppo-merged-before-review.md`）。CodeRabbit は PR に `@coderabbitai review` とコメントして頼む。

## 共通のきまり

- PR の作り方・マージの仕方は satou-aaaaa/shared-workflows の `routines/pr.md`、全体のきまりは `routines/common.md` に従う。
- CI の部品は shared-workflows の共通部品を呼ぶ。リポジトリ側の .github/workflows には呼び出しと設定値だけを書く。
- Claude 以外の AI・人が作業するときは、shared-workflows の `routines/tool-map.md` と `routines/without-claude.md` を読む。
