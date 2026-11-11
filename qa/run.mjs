// グラフのウソ見抜きの検査。問題の作り方（手口ごとに3000問：見出しがウソ／本当になっているかを数で確かめる）・今日の5問と上級の組み方（3年分）・
// 通しで遊ぶ・まちがい・ヒント・続きから・上級・練習・とことん（何百回作って重ならない）・手口帳・実績・カレンダー・あとから・スマホ幅・PWA・引き継ぎ・見やすさ。
// 使い方: node qa/run.mjs   失敗があれば終了コード 1。結果は qa-report/report.md。
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { checkTransfer } from "./transfer-check.mjs";
import { checkDepth } from "./depth-check.mjs";
import { checkSwStall } from "./sw-check.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail: String(detail).slice(0, 400) });
const G = createRequire(import.meta.url)(path.join(root, "gen.js"));
const sum = (a) => a.reduce((x, y) => x + y, 0);

// ---- 1. 問題の作り方（ブラウザを使わない）----
// 手口ごとに「見せたグラフはウソ」「直したグラフ・本当はの数が正しい」ことを、ゲームとは別に数え直す
{
  const bad = {}, N = 3000, seen = new Set();
  const no = (k, m) => (bad[`${k}:${m}`] = (bad[`${k}:${m}`] || 0) + 1);
  for (const k of G.KINDS) for (let i = 0; i < N; i++) {
    const P = G.make(`${k.id}|qa${i}`), S = P.spec, F = P.fix;
    seen.add(P.head + JSON.stringify(S));
    if (/NaN|undefined|Infinity|null/.test(P.head + P.real + P.note + JSON.stringify(S) + (F ? JSON.stringify(F) : ""))) no(k.id, "空の値");
    if (P.head.length > 40) no(k.id, "見出しが40字より長い");
    if (!/架空/.test(P.note + (P.fixNote || ""))) no(k.id, "注記に「架空」が無い");
    if (!!k.ok !== !F) no(k.id, "正しいグラフだけ直したグラフが無い");
    const zs = new Set(P.zones.map((z) => z.id));
    if (!P.ans.every((a) => a === "ok" || a === "t" || a === "n" || zs.has(a))) no(k.id, "答えの所が押せない");
    if (["bar", "line"].includes(S.type) && (Math.max(...S.vals) > S.ymax || S.ticks[0] !== S.ymin || S.ticks[S.ticks.length - 1] !== S.ymax)) no(k.id, "目盛りの外に出る");
    if (S.type === "pie" && S.pcts.some((v) => !(v > 0))) no(k.id, "円に0以下");
    if (/^(人|店|か所|台|個|本|冊|杯|束)$/.test(P.unit) && [S, P.fixUnit ? null : F].filter(Boolean).flatMap((g) => [g, ...(g.sub || [])]).some((g) => g.vals && g.vals.some((v) => !Number.isInteger(v)))) no(k.id, "数える物（店・か所など）に小数");
    switch (k.id) {
      case "cut": { const mx = Math.max(...S.vals), mn = Math.min(...S.vals), vis = (mx - S.ymin) / (mn - S.ymin), said = +P.head.match(/の(\d+)倍/)[1];
        if (!(S.wave && S.ymin > 0 && S.ymin < mn)) no(k.id, "波線で省いていない");
        if (!(vis >= 2.5 && Math.abs(said - vis) <= 0.6)) no(k.id, "見た目の倍と見出しが合わない");
        if (!(mx / mn < 1.2)) no(k.id, "本当の差が大きすぎる");
        if (F.ymin !== 0) no(k.id, "直したグラフが0から"); break; }
      case "cutl": { if (!(S.ymin > 0 && S.ymin <= Math.min(...S.vals))) no(k.id, "0から始まっている"); if (F.ymin !== 0) no(k.id, "直したグラフが0から");
        if (!(S.vals[S.vals.length - 1] / S.vals[0] < 1.15)) no(k.id, "本当に急に増えている"); break; }
      case "area": { const k2 = (S.vals[1] / S.vals[0]) ** 2, said = +P.head.match(/([\d.]+)倍/)[1]; if (Math.abs(said - k2) > 0.1) no(k.id, "見出しの倍が面積の倍でない"); if (F.scale !== "area" || S.scale !== "hw") no(k.id, "絵の大きさの付け方"); break; }
      case "pie": { const sh = sum(S.pcts); if (!(sh < 100 && S.pcts[0] < 50 && S.pcts[0] / sh >= 0.5)) no(k.id, "かくした残りで半分以上に見せていない"); if (sum(F.pcts) !== 100) no(k.id, "直した円が100%でない"); break; }
      case "multi": if (!(sum(S.pcts) > 100)) no(k.id, "足して100%を超えない"); if (F.type !== "bar") no(k.id, "直したのが棒グラフでない"); if (!/いくつでも/.test(P.note)) no(k.id, "注記に「いくつでも」が無い"); break;
      case "period": { const v = F.vals, n = v.length, sv = S.vals; if (!(n >= 10 && sv.length <= 5 && JSON.stringify(v.slice(n - sv.length)) === JSON.stringify(sv))) no(k.id, "切り取りの形");
        if (!(v[n - 1] < v[0])) no(k.id, "長く見るとへっていない"); if (!sv.every((x, i) => i === 0 || x > sv[i - 1])) no(k.id, "見せた期間で増え続けていない"); break; }
      case "pair": { const [a, b] = S.sub, ta = sum(a.vals), tb = sum(b.vals), look = (s) => s.vals[0] / s.ymax;
        if (!(ta > tb && look(b) > look(a) && a.ymax !== b.ymax)) no(k.id, "目盛りで多い方を逆に見せていない"); if (F.sub[0].ymax !== F.sub[1].ymax) no(k.id, "直したグラフの目盛りがそろわない");
        if (!P.head.startsWith(b.name)) no(k.id, "見出しが少ない町を多いと言っていない"); break; }
      case "sample": { const n = +P.note.match(/(\d+)人/)[1]; if (!(n <= 30 && S.pcts[0] >= 80 && F.pcts[0] < S.pcts[0] && sum(F.pcts) === 100 && sum(S.pcts) === 100)) no(k.id, "少ない人・かたよりの形"); break; }
      case "ratio": { const c = S.vals, r = F.vals; if (!(c[2] > Math.max(c[0], c[1]) && r[2] < Math.min(r[0], r[1]))) no(k.id, "件数と割合で順位が逆にならない"); if (!/人口/.test(P.note)) no(k.id, "注記に人口が無い"); break; }
      case "ok0": { const mx = Math.max(...S.vals), mn = Math.min(...S.vals); if (S.ymin !== 0) no(k.id, "0から始まらない"); const m = P.head.match(/約([\d.]+)倍/); if (m && Math.abs(+m[1] - mx / mn) > 0.06) no(k.id, "見出しの倍がちがう"); if (!m && !P.head.startsWith(S.cats[S.vals.indexOf(mx)])) no(k.id, "見出しの店がちがう"); break; }
      case "ok1": { if (S.ymin !== 0 || S.vals.length < 10) no(k.id, "0から・長い期間でない"); const p = +P.head.match(/(\d+)%/)[1], v = S.vals; if (Math.abs(p - Math.abs(v[v.length - 1] / v[0] - 1) * 100) > 0.6) no(k.id, "見出しの%がちがう");
        if ((v[v.length - 1] > v[0]) !== /増えた/.test(P.head)) no(k.id, "増えた・へったが逆"); break; }
      case "ok2": { if (sum(S.pcts) !== 100) no(k.id, "100%でない"); const m = P.head.match(/「(.+)」で(\d+)%/); if (!m || +m[2] !== Math.max(...S.pcts) || S.labels[S.pcts.indexOf(+m[2])] !== m[1]) no(k.id, "見出しがちがう"); if (+P.note.match(/([\d,]+)人/)[1].replace(/,/g, "") < 500) no(k.id, "聞いた人が少ない"); break; }
    }
    if (!G.svg(S).startsWith("<svg") || (F && !G.svg(F).startsWith("<svg"))) no(k.id, "絵が作れない");
  }
  check(`手口ごとに${N}問作り、見せたグラフはウソ・直したグラフと「本当は」は正しい（数え直し）`, Object.keys(bad).length === 0, JSON.stringify(bad));
  check("問題の種類が十分にある（300種類以上。好きなだけ遊べる）", seen.size >= 300 * G.KINDS.length, seen.size);
  check("手口帳は手口9つ＋正しいグラフ", G.BOOK.length === 10 && G.BOOK.every((b) => b === "ok" || G.BY[b]));
  check("どの手口にも出どころ（公的機関の資料）がある", G.KINDS.every((k) => k.src.length && k.src.every((s) => G.SRC[s] && /^https:\/\//.test(G.SRC[s][1]))));
  check("同じ種なら同じ問題（どの端末でも同じ）", G.KINDS.every((k) => JSON.stringify(G.make(k.id + "|z")) === JSON.stringify(G.make(k.id + "|z"))));
  // 押せる所は幅320pxの画面（グラフの幅 約264px）でも44px以上
  const sc = 264 / G.W, tooSmall = [];
  for (const k of G.KINDS) for (const z of G.make(k.id + "|z").zones) if (z.w * sc < 44 || z.h * sc < 44) tooSmall.push(`${k.id}:${z.id}`);
  check("グラフの押せる所は幅320pxでも44px以上", tooSmall.length === 0, tooSmall.join(","));
}
{ // 今日の5問・上級（3年分）
  const bad = []; let honest = 0;
  for (let d = 0; d < 1100; d++) {
    const k = new Date(Date.UTC(2026, 10, 7) + d * 864e5).toISOString().slice(0, 10), t = G.dailyTags(k), h = G.hardTags(k), ids = t.map((x) => x.split("|")[0]), hs = h.map((x) => x.split("|")[0]);
    const lv = ids.map((id) => G.BY[id].lv).join("");
    if (t.length !== 5 || lv !== "00112" || new Set(ids).size !== 5) bad.push(k + " 今日の組み方");
    if (G.BY[ids[0]].ok) bad.push(k + " 1問目が正しいグラフ");
    if (h.length !== 3 || new Set(hs).size !== 3 || hs.includes(ids[4]) || hs.some((x) => G.BY[x].lv !== 2)) bad.push(k + " 上級の組み方");
    if (JSON.stringify(t) !== JSON.stringify(G.dailyTags(k))) bad.push(k + " 同じ日でちがう");
    honest += ids.filter((x) => G.BY[x].ok).length;
    for (const x of [...t, ...h]) G.make(x);
  }
  check("今日の5問（やさしい2・ふつう2・むずかしい1、1問目はウソあり）と上級（今日と別のむずかしい3）を3年分作れる", bad.length === 0, bad.slice(0, 5).join(" / "));
  check("正しいグラフも混ざる（1日に平均0.5〜2問）", honest / 1100 >= 0.5 && honest / 1100 <= 2, (honest / 1100).toFixed(2));
}

// ---- 2. ファイルの中身 ----
const html = readFileSync(path.join(root, "index.html"), "utf8"), gen = readFileSync(path.join(root, "gen.js"), "utf8");
const ext = [...html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map((m) => m[1]).filter((u) => !/^https:\/\/fonts\.googleapis\.com(\/|$)|^https:\/\/ko-fi\.com\/satouaaaaa$/.test(u));
check("外から読むのは文字（Google Fonts）だけ。スクリプト・広告・解析を入れない", ext.length === 0 && ![...html.matchAll(/<script[^>]+src="([^"]+)"/g)].some((m) => /^https?:/.test(m[1])), ext.join(","));
check("CSP で通信先を自分だけにしている", /connect-src 'self'/.test(html) && !/connect-src[^;"]*https/.test(html));
check("Math.random は練習・とことんの種だけ（今日の5問・上級は日付の乱数。gen.js には無い）", (html.match(/Math\.random/g) || []).length === 2 && !/Math\.random/.test(gen));
check("乱数は sort の比較の中で引かない（ブラウザで引く回数が変わる）", !/\.sort\(\s*\([^)]*\)\s*=>[^\n;]*\b(R|rng|rand|Math\.random)\s*\(/.test(html + gen));
check("一行の式の途中にコメント // を足さない（行の残りが消える。rosen-hitofude 2026-11-04）", !/;\s*\/\/[^\n]*;\s*\w/.test((html + gen).split("\n").filter((l) => !l.trim().startsWith("//")).join("\n")));
check("画面にお笑いの言葉を入れない（本物っぽく）", !/お笑い|ギャグ|ツッコミ|なんでやねん|（うそ）/.test(html + gen));
check("チケット・回数制限・鍵で開くモードを入れない（好きなだけ遊べる）", !/🎫|チケット|🔒|すると開く|あとで開く|ライフ/.test(html));
check("実在の会社・ニュース名を使わない（題材は架空の町・店）", !/株式会社|新聞社|NHK|朝日|読売|毎日新聞|日経|総務省[^統]/.test(gen.replace(/SRC = \{[\s\S]*?\};/, "")));
check("引き継ぎ：transfer.js をゲームの script より前に、このゲームの記録のキー（記録・復習）だけで読む・depth.js も前に読む", /<script src="transfer\.js" data-game="gurafu-minuki" data-keys="gurafu-v1,gurafu-depth"><\/script>\s*<script src="depth\.js" data-game="gurafu-minuki" data-key="gurafu-depth"><\/script>\s*<\/head>/.test(html) && html.indexOf('src="transfer.js"') < html.indexOf('src="gen.js"') && /data-hk/.test(html) && existsSync(path.join(root, "transfer.js")));
{ const og = (k) => (html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]+)"`)) || [])[1] || "";
  const png = readFileSync(path.join(root, "og.png"));
  check("SNS で貼ると絵と題が出る（OGP・1200×630・絶対URL）", og("og:title") && og("og:description") && og("og:image") === "https://satou-aaaaa.github.io/gurafu-minuki/og.png" && og("twitter:card") === "summary_large_image" && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630); }
{ const fy = readFileSync(path.join(root, ".github/ISSUE_TEMPLATE/feedback.yml"), "utf8");
  check("感想フォームの name が3字以上（2字だとフォームが出ない）", [...((fy.match(/^name:\s*(.+)$/m) || [])[1] || "").trim()].length >= 3);
  check("感想フォームは名前・メールを聞かない", !/id: (name|email|mail)/.test(fy)); }
check("README の URL のすぐ後ろに全角の字を続けない（Link check が URL の一部と読む）", !/https?:\/\/[\x21-\x7e]*[^\x00-\x7f]/.test(readFileSync(path.join(root, "README.md"), "utf8").replace(/\]\(https?:\/\/[^)\s]+\)/g, "").replace(/<https?:\/\/[^>\s]+>/g, "")));
{ const sw = readFileSync(path.join(root, "sw.js"), "utf8"), mf = JSON.parse(readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  { const st = await checkSwStall(sw); check("PWA：通信が止まっても4秒ほどで保存した画面に切り替わり、少しずつ届く受信は待ち、何も無ければ60秒で返す（shared-workflows template/qa/sw-check.mjs）", st.ok, JSON.stringify(st)); }
  const shell = JSON.parse(sw.match(/SHELL = (\[[^\]]+\])/)[1]);
  check("PWA：sw.js は画面のファイルを全部保存し（引き継ぎの transfer.js・深さの depth.js も）、取り直して入れ、外へ何も送らない", ["./index.html", "./gen.js", "./transfer.js", "./depth.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"].every((f) => shell.includes(f)) && /cache: "reload"/.test(sw) && !/https?:\/\//.test(sw.replace(/^\/\/.*$/gm, "")));
  check("PWA：manifest にアイコン2つと名前がある", mf.name === "グラフのウソ見抜き" && mf.icons.length >= 2 && mf.start_url === "./"); }

// ---- 3. ブラウザで遊ぶ ----
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname), f = path.join(root, p === "/" ? "index.html" : p);
  if (!f.startsWith(root) || !existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(readFileSync(f));
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [], outside = [];
const TODAY = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const dayBefore = (n) => new Date(Date.parse(TODAY) - n * 864e5).toISOString().slice(0, 10);
async function newPage(w = 390, ctx) {
  const c = ctx || await browser.newContext({ viewport: { width: w, height: 800 } });
  await c.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/ERR_FAILED|net::/.test(m.text())) errors.push(m.text()); });
  p.on("request", (r) => { const u = r.url(); if (!u.startsWith(url) && !/^data:|fonts\.(googleapis|gstatic)\.com/.test(u)) outside.push(u); });
  await p.goto(url); await p.waitForTimeout(200);
  return p;
}
const closeHow = async (p) => { if (await p.locator("#howto[open]").count()) await p.click("#howto-ok"); };
const curOf = (p) => p.evaluate(() => { const c = __gm.cur(); return { ans: c.P.ans, ch: __gm.choicesOf(c.P), wrong: c.wrong, kind: c.P.kind, head: c.P.head, title: c.P.title, ok: c.P.ok }; });
const mem = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("gurafu-v1") || "{}"));
async function solve(p, { wrong = 0 } = {}) {
  for (let i = 0; i < wrong; i++) { const c = await curOf(p), z = c.ch.find((x) => !c.ans.includes(x) && !c.wrong.includes(x)); await p.click(`[data-z="${z}"]:not([disabled])`); }
  const c = await curOf(p);
  await p.click(`[data-z="${c.ans[0]}"]`);
  await why(p);
  await p.waitForSelector(".verdict");
}
// 2段目「どんな手口？」が出たら、正しい分け方を押す（正しいグラフには出ない）
async function why(p) { await p.waitForSelector(".verdict, .why button"); if (await p.locator(".verdict").count()) return; await p.click(`.why button[data-g="${await p.evaluate(() => __gm.cur().P.grp)}"]`); }
const noHScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
const smallBtns = (p) => p.evaluate(() => [...document.querySelectorAll("button,a,.zone,.tz")].filter((b) => { const r = b.getBoundingClientRect(); return r.width && r.height && r.height < 44 && getComputedStyle(b).visibility !== "hidden" && !b.closest(".cal") && !b.closest("svg"); }).map((b) => (b.id || b.className || b.textContent).slice(0, 20)));

try {
  const p = await newPage();
  check("はじめて開くと遊び方が出る", await p.locator("#howto[open]").count() === 1);
  { const c = await browser.newContext(); const r = await c.newPage(); await r.goto(url); await r.waitForTimeout(200); let again = 0;
    for (let i = 0; i < 10; i++) { await r.evaluate(() => localStorage.clear()); await r.reload(); await r.waitForTimeout(200); await r.keyboard.press("Escape"); await r.reload(); await r.waitForTimeout(200); again += await r.locator("#howto[open]").count(); }
    check("遊び方を Esc で閉じてすぐ読み直しても出ない（10回）", again === 0);
  { const c = await browser.newContext(); const r = await c.newPage(); const big = []; // 題が h1{flex:1} で縦に伸び（伸びない形と比べて4pxより高ければ失敗）、iPad の縦で大きなすき間が出た（shared-workflows incidents/2026-11-07-title-stretched.md）
    for (const [w, h] of [[820, 1180], [390, 844], [1280, 800]]) { await r.setViewportSize({ width: w, height: h }); await r.goto(url); await r.waitForTimeout(200); await r.keyboard.press("Escape"); await r.waitForTimeout(100);
      const v = await r.evaluate(() => { const e = [...document.querySelectorAll(".title")].find((x) => x.offsetParent); if (!e) return null; const h = e.getBoundingClientRect().height; const f = e.style.flex; e.style.flex = "none"; const n = e.getBoundingClientRect().height; e.style.flex = f; return h - n; });
      if (v === null || v > 4) big.push(`${w}x${h}:${v === null ? "題なし" : "+" + Math.round(v) + "px"}`); }
    check("ホームの題は縦長の画面でも縦に伸びない（820×1180・390×844・1280×800）", big.length === 0, big.join(" ")); await c.close(); }
    await r.evaluate(() => localStorage.clear()); await r.reload(); await r.waitForTimeout(200);
    check("「わかった」を押したその場で「見た」が残る", await r.locator("#howto-ok").evaluate((b) => { b.click(); return Object.keys(localStorage).some((k) => { try { return JSON.parse(localStorage.getItem(k)).tut === true; } catch { return false; } }); }));
    await r.reload(); await r.waitForTimeout(200); check("遊び方を「わかった」で閉じてすぐ読み直しても出ない（その場で残す）", await r.locator("#howto[open]").count() === 0); await c.close(); }
  await p.click("#howto-ok");
  { const q = await newPage(); await q.keyboard.press("Escape"); await q.waitForTimeout(100); await q.reload(); await q.waitForTimeout(150);
    check("遊び方は Esc で閉じても次から出ない", await q.locator("#howto[open]").count() === 0); await q.context().close(); }
  check("ホームに見抜くポイントと、上級・とことん・練習が最初からある", (await p.textContent(".points")).includes("0から") && await p.locator("#go-h:not([disabled])").count() === 1 && await p.locator("#go-e").count() === 1 && await p.locator("#go-p").count() === 1);
  await p.click("#go-d");
  const tags = await p.evaluate(() => __gm.load().runs.d.list);
  check("今日の5問は日付から決まる（gen.js の dailyTags と同じ）", JSON.stringify(tags) === JSON.stringify(G.dailyTags(TODAY)));
  check("問題の画面：見出し・題名・グラフ・注記・押せる所（読み上げの名前つき）・「ウソは無い」", await p.locator(".head").count() === 1 && await p.locator(".chartbox svg[aria-label]").count() === 1 && await p.locator(".zone").count() >= 1 && (await p.$$eval(".zone", (z) => z.filter((x) => !x.getAttribute("aria-label")).length)) === 0 && await p.locator('.tz[data-z="t"]').count() === 1 && await p.locator('.tz[data-z="n"]').count() === 1 && await p.locator("#okbtn").count() === 1);
  // 1問目：まちがえる
  { const c = await curOf(p), z = c.ch.find((x) => !c.ans.includes(x)); await p.click(`[data-z="${z}"]`);
    check("まちがえると ✕ の印と文字（色だけで分けない）・知らせは role=status", await p.locator(".ng").count() >= 1 && (await p.evaluate(() => getComputedStyle(document.querySelector(".ng"), "::after").content)).includes("✕") && (await p.textContent("#msg")).includes("✕") && await p.getAttribute("#msg", "role") === "status"); }
  await p.reload(); await p.waitForTimeout(150); await p.click("#go-d");
  check("開き直しても、まちがえた所は残る（続きから）", (await curOf(p)).wrong.length === 1 && await p.locator(".ng").count() >= 1);
  await solve(p);
  check("見抜くと手口の名前・なぜ・本当は・直したグラフ・出どころが出る", (await p.textContent(".verdict")).includes("本当は") && await p.locator(".verdict .srcs a").count() >= 1 && ((await curOf(p)).ok || await p.locator(".verdict .fixbox svg").count() === 1));
  check("まちがい1回で★2", (await p.textContent(".verdict .stars")).startsWith("★★☆"));
  await p.click("#next");
  // 2問目：ヒント2回
  await p.click("#hint");
  check("ヒント1：見るところを出す（答えの所を言わない）", (await p.textContent("#hintbox")).includes("💡"));
  await p.click("#hint");
  const left = await p.$$eval("[data-z]:not([disabled])", (b) => new Set(b.map((x) => x.dataset.z)).size);
  check("ヒント2：のこりを2つにしぼる", left === 2, left);
  check("ヒント2：「のこりはNつ」が押せる数と同じ", (await p.textContent("#hintbox")).includes(`のこりは${left}つ`), await p.textContent("#hintbox"));
  check("問題の画面にも見やすさの設定を開くボタン（Aa）がある", await p.locator(".a11y-float:visible").count() === 1);
  await p.evaluate(() => { const c = __gm.cur(); [...document.querySelectorAll("[data-z]:not([disabled])")].find((b) => !c.P.ans.includes(b.dataset.z)).click(); });
  await p.waitForTimeout(50);
  { const n = await p.$$eval("[data-z]:not([disabled])", (b) => new Set(b.map((x) => x.dataset.z)).size);
    check("ヒント2のあとに残ったまちがいを押すと、答えだけが残る（消した所が戻らない。shared-workflows incidents/2026-11-07-hint-cut-comes-back.md）", n === 1, n); }
  await solve(p);
  check("ヒント2回で★1", (await p.textContent(".verdict .stars")).startsWith("★☆☆"));
  await p.click("#next");
  check("次の問題へ進むと、フォーカスが問題（#head）に移る", await p.evaluate(() => document.activeElement && document.activeElement.id) === "head");
  for (let i = 2; i < 5; i++) { await solve(p); await p.click("#next"); }
  const s1 = await mem(p);
  check("5問で結果へ・今日の記録がつく・手口帳に載る", (await p.textContent(".big")).length > 0 && s1.days[TODAY] && s1.days[TODAY].m.join() === "1,3,0,0,0" && Object.keys(s1.dex).length >= 1);
  const share = await p.textContent(".share");
  const heads = tags.map((t) => G.make(t)).flatMap((P) => [P.head, P.title]);
  check("シェアの文に見出し・題名（答え）を出さない", share.includes("第") && !heads.some((h) => share.includes(h)), share);
  check("まちがいのある日は Ko-fi の1行を出さない", await p.locator(".kofi").count() === 0);
  check("結果の画面に「続けて遊ぶ：とことん」", await p.locator("#go-e").count() === 1);
  check("結果の画面に「あと少しの実績」1つ", await p.locator("#achnext").count() <= 1);
  await p.click("#back");
  check("今日の分を終えると、ホームは今日の結果を見るボタンになる", (await p.textContent("#go-d")).includes("結果"));

  // 上級：ヒントなし
  await p.click("#go-h");
  check("上級はヒントなし・3問・今日のむずかしいとは別", await p.locator("#hint").count() === 0 && (await p.evaluate(() => __gm.load().runs.h.list.length)) === 3);
  for (let i = 0; i < 3; i++) { await solve(p); await p.click("#next"); }
  const s2 = await mem(p);
  check("上級をまちがいなしで終えると記録がつき、初めてなら Ko-fi の1行（結果の画面だけ）", s2.hdays[TODAY] && await p.locator(".kofi").count() === 1);

  // 練習：記録を増やさない
  await p.click("#back"); await p.click("#go-p"); await p.click('.lv button[data-t="1"]');
  for (let i = 0; i < 5; i++) { await solve(p); await p.click("#next"); }
  const s3 = await mem(p);
  check("練習は今日の記録を増やさない（手口帳には載る）", Object.keys(s3.days).length === 1 && sum(Object.values(s3.dex)) === 13);

  // 手口帳
  await p.click("#back"); await p.click("#go-dex");
  check("手口帳：見つけた手口に説明と出どころ、まだのものは「まだ」", await p.locator(".bk:not(.no) .srcs a").count() >= 1 && await p.locator(".bk").count() === 10);
  await p.click(".bk button");
  const pk = await p.evaluate(() => __gm.load().runs.p.list.map((t) => t.split("|")[0]));
  check("手口帳から、その手口だけで練習できる", pk.length === 5 && new Set(pk.map((x) => G.bookId(x))).size === 1);
  await p.click("#back");

  // とことん：まちがえても続く・ここで降りる・自己ベストは一度で見抜いた数
  await p.click("#go-e");
  await solve(p); await p.click("#next");
  await solve(p, { wrong: 2 }); await p.click("#next");
  await p.click("#hint"); await p.click("#hint");
  check("とことん：まちがえてもヒントを使っても続く（何も減らない）", await p.locator("#quit").count() === 1 && await p.locator(".verdict").count() === 0);
  await solve(p); await p.click("#next");
  await p.reload(); await p.waitForTimeout(150);
  check("とことん：閉じても続きから", (await p.textContent("#go-e")).includes("続きから"));
  await p.click("#go-e"); await solve(p); await p.click("#next");
  await p.click("#quit");
  const s4 = await mem(p);
  check("とことん：「ここで降りる」で終わり、一度で見抜いた数が自己ベスト（今日の記録は増えない）", s4.ebest === 2 && !s4.runs.e && Object.keys(s4.days).length === 1 && (await p.textContent("#eres")).includes("4問"), JSON.stringify([s4.ebest, (await p.textContent("#eres"))]));
  // とことんの並びを何百回作る：1回の中で同じ問題を出さず、続けて同じ手口を出さない
  const er = await p.evaluate(() => { const bad = []; for (let i = 0; i < 300; i++) { const l = __gm.endlessList(); const more = __gm.moreList({ list: l }); const all = l.concat(more); if (new Set(all).size !== all.length) bad.push("重なり"); if (all.some((t, j) => j && t.split("|")[0] === all[j - 1].split("|")[0])) bad.push("同じ手口が続く"); if (l.slice(0, 5).some((t) => __gm.G.BY[t.split("|")[0]].lv !== 0)) bad.push("はじめがやさしくない"); } return bad; });
  check("とことんの並びを300回作り、1回の中で同じ問題・同じ手口が続かない（はじめの5問はやさしい）", er.length === 0, er.slice(0, 3).join(","));
  await p.click("#back");

  // 実績・カレンダー・あとから
  await p.click("#go-ach");
  check("実績は10〜14個で、まだのものは「いま/目標」を出す", await p.locator(".ach").count() >= 10 && await p.locator(".ach").count() <= 14 && await p.locator(".ach:not(.got) .bar").count() >= 1);
  await p.click("#back");
  await p.evaluate(() => __gm.save((s) => { s.days = {}; s.hdays = {}; }));
  await p.click("#go-cal").catch(() => {});
  await p.evaluate(() => __gm.cal());
  const late = await p.evaluate(() => __gm.lateDays(__gm.load()));
  check("カレンダー：取りこぼした日（第1回より後・過去7日）だけ ▶ で遊べる", (await p.locator(".cal .miss").count()) === late.length && late.every((d) => d >= "2026-11-07" && d < TODAY));
  // あとからの日を記録に作って、今日の記録・連続に数えないことを見る
  const yd = dayBefore(1);
  if (yd >= "2026-11-07") {
    await p.click(`.cal .miss[data-k="${yd}"]`);
    for (let i = 0; i < 5; i++) { await solve(p); await p.click("#next"); }
    const s5 = await mem(p);
    check("あとから遊んだ日は adays に入り、今日の記録・連続には数えない", s5.adays[yd] && !s5.days[yd] && await p.evaluate(() => __gm.streak(__gm.load().days)) === 0);
  } else {
    const ok = await p.evaluate((yd) => { __gm.save((s) => { s.adays[yd] = { m: [0, 0, 0, 0, 0], k: [] }; }); return __gm.streak(__gm.load().days) === 0 && __gm.tally(__gm.load()).late === 1; }, yd);
    check("あとから遊んだ日は adays に入り、今日の記録・連続には数えない", ok);
  }

  // 1日1回：別のタブで終えた今日の分は、もう一度は始めない
  await p.evaluate((t) => __gm.save((s) => { s.days[t] = { m: [0, 0, 0, 0, 0], k: [] }; s.runs.d = null; }), TODAY);
  await p.evaluate(() => __gm.home()); await p.click("#go-d");
  check("今日の5問は1日1回（終えた日は結果を見せる）", await p.locator(".share").count() >= 1 && !(await p.evaluate(() => __gm.load().runs.d)));

  // 古いタブ：別のタブで先に進んだら、この画面では書き込まない
  { const q = await newPage(); await closeHow(q); await q.click("#go-e");
    const q2 = await q.context().newPage(); await q2.goto(url); await q2.waitForTimeout(150); await closeHow(q2); await q2.click("#go-e"); await solve(q2);
    const c = await curOf(q); await q.click(`[data-z="${c.ans[0]}"]`); await q.waitForTimeout(150);
    const r = await q.evaluate(() => __gm.load().runs.e.res.length);
    check("古いタブで答えても二重に数えない", r === 1, r);
    await q.context().close(); }

  // 幅320px：横にはみ出さない・押せる所44px以上（どの手口の画面でも）
  { const q = await newPage(320); await closeHow(q);
    check("幅320px：ホームが横にはみ出さない・押せる所44px以上", await noHScroll(q) && (await smallBtns(q)).length === 0, (await smallBtns(q)).join(","));
    const badK = [];
    for (const k of G.KINDS) {
      await q.evaluate((id) => { __gm.save((s) => { s.runs.p = { mode: "p", date: __gm.todayKey(), list: [id + "|w320"], res: [], cur: null, id: "w" + id }; }); __gm.play("p"); }, k.id);
      await q.waitForTimeout(30);
      const sb = await smallBtns(q); if (!(await noHScroll(q)) || sb.length) badK.push(k.id + ":" + sb.join("/"));
      await solve(q);
      if (!(await noHScroll(q))) badK.push(k.id + ":答えのあと");
    }
    check("幅320px：どの手口の問題でも横にはみ出さず、押せる所44px以上", badK.length === 0, badK.join(" "));
    await q.screenshot({ path: path.join(root, "qa-report/w320.png"), fullPage: true });
    await q.context().close(); }

  // 1問を深くする（shared-workflows routines/game-dev.md「1問を深くする」）：自信をかける・2段目「どんな手口？」・復習
  {
    const q = await newPage(); await closeHow(q);
    await q.evaluate((tags) => __gm.save((s) => { s.runs.p = { mode: "p", date: __gm.todayKey(), list: tags, res: [], cur: null, id: "dp" }; }), ["cut|dp1", "period|dp2", "ok0|dp3"]);
    await q.evaluate(() => { Depth.runStart(); __gm.play("p"); });
    const sb = await q.$eval("#dp-sure", (b) => [b.getBoundingClientRect().height, b.getAttribute("aria-pressed"), b.textContent]);
    check("自信のボタン：高さ44px以上・はじめは押していない", sb[0] >= 44 && sb[1] === "false", sb.join(","));
    await q.click("#dp-sure");
    check("自信のボタンを押すと ✓ が出る（色だけで分けない）", (await q.getAttribute("#dp-sure", "aria-pressed")) === "true" && (await q.textContent("#dp-sure")).includes("✓"));
    { const c = await curOf(q); await q.click(`[data-z="${c.ch.find((x) => !c.ans.includes(x))}"]`); }
    check("自信ありでまちがえると、知らせに「思いこみ」と出て、自信は変えられない", (await q.textContent("#msg")).includes("思いこみ") && await q.locator("#dp-sure:disabled").count() === 1);
    await q.click(`[data-z="${(await curOf(q)).ans[0]}"]`);
    check("ウソを見抜くと、2段目「どんな手口？」が3つ出る（押せる所は44px以上）", await q.locator(".why button").count() === 3 && await q.locator(".verdict").count() === 0 && (await q.$$eval(".why button", (b) => b.every((x) => x.getBoundingClientRect().height >= 44))));
    check("2段目の間は、グラフの押せる所は押せない", await q.evaluate(() => [...document.querySelectorAll("[data-z]")].every((b) => b.disabled)));
    await q.reload(); await q.waitForTimeout(150); await q.evaluate(() => __gm.play("p"));
    check("2段目の途中で閉じても、2段目から続く", await q.locator(".why button").count() === 3);
    const wg = await q.evaluate(() => Object.keys(__gm.G.GROUPS).find((x) => x !== __gm.cur().P.grp));
    await q.click(`.why button[data-g="${wg}"]`);
    check("2段目でまちがえると ✕ ちがう（破線）・もう一度選べる", await q.locator(".why button.ng").count() === 1 && (await q.textContent("#msg")).includes("✕"));
    await q.click("#hint");
    const ng1 = await q.locator(".why button:disabled").count();
    await q.reload(); await q.waitForTimeout(150); await q.evaluate(() => __gm.play("p"));
    check("2段目のヒントで消した分け方は、閉じて開き直しても消えたまま（ヒントも押せないまま）", await q.locator(".why button:disabled").count() === ng1 && ng1 >= 1 && await q.locator("#hint:disabled").count() === 1 && (await q.textContent("#hintbox")).includes("消しました"));
    await why(q); await q.waitForSelector(".verdict");
    const m0 = await q.evaluate(() => __gm.load().runs.p.res[0].m);
    check("★は1段目と2段目のまちがい・ヒントを合わせて数える（1＋1＋1＝3）", m0 === 3, m0);
    check("見抜いた画面に、分け方と、自信ありでまちがえたことが出る", (await q.textContent(".verdict")).includes("目盛りのごまかし") && (await q.textContent(".verdict")).includes("自信ありでまちがえた"));
    await q.click("#next");
    await q.click(`[data-z="${(await curOf(q)).ans[0]}"]`); await why(q); await q.click("#next");
    await q.click('[data-z="ok"]'); await q.waitForSelector(".verdict");
    check("正しいグラフは2段目を出さずに終わる", await q.locator(".why button").count() === 0);
    await q.click("#next"); await q.waitForTimeout(150);
    check("終えた直後の結果に「自信ありの当たり」が出る", (await q.textContent("#surestat")).includes("0/1"));
    const dp = await q.evaluate(() => JSON.parse(localStorage.getItem("gurafu-depth") || "{}"));
    check("まちがえた・ヒントを使った問題だけ復習に入る", Object.keys(dp.rv || {}).join() === "cut|dp1", Object.keys(dp.rv || {}).join(","));
    await q.evaluate(() => { const d = JSON.parse(localStorage.getItem("gurafu-depth")); for (const k in d.rv) d.rv[k].due = "2026-01-01"; localStorage.setItem("gurafu-depth", JSON.stringify(d)); });
    await q.goto(url); await q.waitForTimeout(150);
    check("日の来た復習があると、ホームに「復習 1問」", (await q.textContent("#go-r")).includes("復習 1問"));
    const before = await mem(q);
    await q.click("#go-r");
    check("復習の画面は「復習」と出る・同じ問題", (await q.textContent("header")).includes("復習") && await q.evaluate(() => __gm.cur().tag) === "cut|dp1");
    await solve(q); await q.click("#next"); await q.waitForTimeout(150);
    const after = await mem(q), dp2 = await q.evaluate(() => JSON.parse(localStorage.getItem("gurafu-depth")));
    check("復習を終えると結果は「復習」・今日の記録は増えない・シェアは出ない", (await q.textContent("h1")).includes("復習") && JSON.stringify(after.days) === JSON.stringify(before.days) && await q.locator("#share").count() === 0);
    check("復習で一度で正解すると、次は3日後へ進む", Object.values(dp2.rv).every((x) => x.s === 1 && x.due > TODAY));
    await q.goto(url); await q.waitForTimeout(150);
    check("復習を終えたら、ホームの「復習」は消える", await q.locator("#go-r").count() === 0);
    await q.evaluate(() => { const d = JSON.parse(localStorage.getItem("gurafu-depth")); d.rv["nai|1"] = { s: 0, due: "2026-01-01", t: 1 }; d.rv["constructor|x"] = { s: 0, due: "2026-01-01", t: 2 }; localStorage.setItem("gurafu-depth", JSON.stringify(d)); });
    await q.goto(url); await q.waitForTimeout(150);
    check("作り直せない鍵（無い手口・constructor）は復習に数えず、ホームも出る", await q.locator("#go-d").count() === 1 && await q.locator("#go-r").count() === 0);
    await q.context().close();
  }

  // キーボードだけで遊べる（Tab と Enter）
  { const q = await newPage(); await closeHow(q);
    await q.focus("#go-e"); await q.keyboard.press("Enter"); await q.waitForTimeout(100);
    const c = await curOf(q); await q.focus(`[data-z="${c.ans[0]}"]`); await q.keyboard.press("Enter"); await q.waitForTimeout(100);
    if (await q.locator(".why button").count()) { await q.focus(`.why button[data-g="${await q.evaluate(() => __gm.cur().P.grp)}"]`); await q.keyboard.press("Enter"); await q.waitForTimeout(100); }
    check("キーボードだけで押して答えられる（2段目もキーボードで）", await q.locator(".verdict").count() === 1);
    await q.context().close(); }
  check("画面の文字に ${ が出ない（式がそのまま出ていない）", !/\$\{/.test(await p.evaluate(() => document.body.innerText)));
  check("外へ通信しない（自分のサイトと文字だけ）", outside.length === 0, outside.slice(0, 3).join(","));
} catch (e) { check("ブラウザでの検査が最後まで動く", false, e.stack.split("\n").slice(0, 3).join(" ")); }

// 引き継ぎコード（shared-workflows template/qa/transfer-check.mjs）
try {
  const sample = { "gurafu-v1": JSON.stringify({ v: 1, tut: true, days: { "2026-11-07": { m: [0, 1, 0, 0, 2], k: ["cut", "area", "period", "pair", "ratio"] } }, hdays: {}, adays: {}, dex: { cut: 1, area: 1, period: 1, pair: 1, ratio: 1 }, runs: {}, kofi: {}, ach: {}, ebest: 7, t: 1 }) };
  await checkTransfer({ browser, url, game: "gurafu-minuki", sample, check, open: async (pg) => { if (await pg.locator("#howto[open]").count()) await pg.click("#howto-ok"); } });
} catch (e) { check("引き継ぎの検査が最後まで動く", false, e.message.split("\n")[0]); }
await browser.close();
server.close();
// 深さの部品（shared-workflows template/qa/depth-check.mjs）
{ const e = await checkDepth(readFileSync(path.join(root, "depth.js"), "utf8")); check("depth.js（自信をかける・復習）の動き", e.length === 0, e.join(" / ")); }
// 2段目の分け方：ウソのある手口には全部あり（3つのどれか）、正しいグラフには無い
{ const bad = G.KINDS.filter((k) => { const P = G.make(`${k.id}|grp`); return k.ok ? P.grp != null : !G.GROUPS[P.grp]; }).map((k) => k.id);
  check("2段目「どんな手口？」の分け方：ウソのある手口は全部3つのどれか・正しいグラフには無い", bad.length === 0 && Object.keys(G.GROUPS).length === 3 && Object.keys(G.GROUPS).every((g) => Object.values(G.GRP).includes(g)), bad.join(",")); }
check("画面のエラーが無い", errors.length === 0, errors.slice(0, 3).join(" | "));

{ // 見やすさ・読みやすさ・偏り（shared-workflows template/qa/a11y.mjs の写し）
  const { spawnSync } = await import("node:child_process");
  const a = spawnSync(process.execPath, [path.join(root, "qa", "a11y.mjs")], { encoding: "utf8", env: process.env });
  check("見やすさ・読みやすさの検査（qa/a11y.mjs。中身は qa-report/a11y.md）", a.status === 0, (a.stdout.match(/^- ❌.*$/gm) || []).join(" / ") || (a.status ? a.stderr.slice(-300) : ""));
}

const ng = results.filter((r) => !r.ok);
const md = `# グラフのウソ見抜き QA\n\n${results.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? `（${r.detail}）` : ""}`).join("\n")}\n\n${ng.length ? `❌ ${ng.length}件` : `✅ ${results.length}項目すべて通過`}\n`;
mkdirSync(path.join(root, "qa-report"), { recursive: true });
writeFileSync(path.join(root, "qa-report/report.md"), md);
console.log(md);
process.exit(ng.length ? 1 : 0);
