// アプリのアイコン（icon-192.png・icon-512.png）を作る。生成りの紙に棒グラフと赤い虫めがね。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const s of [192, 512]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#f6f1e6"/>
      <line x1="20" y1="18" x2="20" y2="80" stroke="#1f2a44" stroke-width="3"/><line x1="20" y1="80" x2="84" y2="80" stroke="#1f2a44" stroke-width="3"/>
      <path d="M14 70 l3 -4 l3 4 l3 -4" fill="none" stroke="#1f2a44" stroke-width="2.4"/>
      <rect x="28" y="58" width="12" height="22" fill="#0072b2" stroke="#1f2a44" stroke-width="1.6"/>
      <rect x="46" y="44" width="12" height="36" fill="#e69f00" stroke="#1f2a44" stroke-width="1.6"/>
      <rect x="64" y="22" width="12" height="58" fill="#009e73" stroke="#1f2a44" stroke-width="1.6"/>
      <circle cx="58" cy="42" r="15" fill="#ffffff99" stroke="#b3261e" stroke-width="5"/><line x1="69" y1="53" x2="84" y2="68" stroke="#b3261e" stroke-width="7" stroke-linecap="round"/></svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", `icon-${s}.png`), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();
