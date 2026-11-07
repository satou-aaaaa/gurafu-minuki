// SNS 用の絵 og.png（1200×630）を作る。今日の問題は入れない（見本の架空のグラフだけ）。
// 使い方: node tools/make-og.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
const G = require(path.join(__dirname, "..", "gen.js"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const spec = { type: "bar", cats: ["北店", "南店", "駅前店"], vals: [200, 192, 179], ymin: 170, ymax: 200, ticks: [170, 180, 190, 200], wave: true };
  await p.setContent(`<body style="margin:0;width:1200px;height:630px;background:#f6f1e6;font-family:'Noto Sans CJK JP',sans-serif;color:#1f2a44;display:flex;align-items:center;gap:40px;padding:0 60px;box-sizing:border-box">
    <div style="flex:1"><div style="font-size:84px;font-weight:900;line-height:1.2">グラフの<span style="color:#b3261e">ウソ</span><br>見抜き</div>
    <div style="font-size:34px;margin-top:24px;line-height:1.6">そのグラフ、大げさじゃない？<br>おかしい所を押して見抜く<br>1日5問の学習ゲーム</div></div>
    <div style="width:520px;background:#fffdf8;border:2px solid #1f2a4433;padding:22px;transform:rotate(-1.5deg);box-shadow:0 10px 30px #1f2a4433">
      <div style="font-size:30px;font-weight:900;border-bottom:5px double #1f2a44;padding-bottom:8px;margin-bottom:8px">北店は駅前店の3倍！？</div>${G.svg(spec)}</div></body>`);
  await p.screenshot({ path: path.join(__dirname, "..", "og.png") });
  await b.close();
})();
