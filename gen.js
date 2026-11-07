// グラフのウソ見抜き：問題を作る（ブラウザと node の両方で使う）。
// 1問＝見出し（言いたいこと）＋グラフ。グラフには「ウソの手口」が1つあるか、何も無い（正しいグラフ）。
// 遊ぶ人はグラフの「おかしい所」（縦の目盛り・横の目盛り・グラフの形・題名・注記）を押すか、「ウソは無い」を押す。
// 数字はすべて架空。手口とその説明は公的機関の資料による（SRC）。
// 乱数 R は呼ぶ回数が毎回同じになるように使う（sort の比較の中では引かない）。同じ種なら、どの端末でも同じ問題になる。
(function (root) {
  "use strict";
  const LV = ["やさしい", "ふつう", "むずかしい"];
  const ri = (R, a, b) => a + Math.floor(R() * (b - a + 1));
  const pick = (R, a) => a[Math.floor(R() * a.length)];
  const pickN = (R, arr, n) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
  const fmt = (v) => { const r = Math.round(v * 10) / 10, s = String(Math.abs(r) >= 100 ? Math.round(r) : r); const [i, d] = s.split("."); return i.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (d ? "." + d : ""); };
  const r1 = (v) => Math.round(v * 10) / 10;
  const roundTo = (v, step) => Math.round(v / step) * step;
  const CNT = /^(人|店|か所|台|個|本|冊|杯|束)$/;
  const stepOf = (v, u) => (v < 100 ? (CNT.test(u || "") ? 1 : 0.1) : magOf(v));
  const roundS = (v, S, u) => { const st = stepOf(S, u); return st < 1 ? Math.round(v * 10) / 10 : roundTo(v, st); };
  const magOf = (v) => (v >= 5000 ? 100 : v >= 1000 ? 10 : v >= 200 ? 5 : 1);
  // 目盛りの幅：きりのよい数（1・2・2.5・5 の10のべき）
  function niceStep(range, n = 4) { const raw = range / n, mag = Math.pow(10, Math.floor(Math.log10(raw))); for (const m of [1, 2, 2.5, 5, 10]) if (m * mag >= raw - 1e-9) return m * mag; return 10 * mag; }
  const r6 = (v) => Math.round(v * 1e6) / 1e6;
  function axis(lo, hi, n = 4) { const st = niceStep(hi - lo, n), i0 = Math.floor(lo / st + 1e-9), i1 = Math.ceil(hi / st - 1e-9), ticks = []; for (let i = i0; i <= i1; i++) ticks.push(r6(i * st)); return { ymin: ticks[0], ymax: ticks[ticks.length - 1], ticks }; }

  // 出どころ（手口の説明はこの資料に書いてあること）
  const SRC = {
    tokyo: ["東京都総務局統計部「統計グラフの見方」", "https://www.toukei.metro.tokyo.lg.jp/kurasi/2025/2025pdf/ku25rf2400.pdf"],
    shimane: ["島根県統計調査課「統計グラフ」出前講座の資料", "https://www.pref.shimane.lg.jp/admin/pref/toukei/hukyu/demae.data/R2haihusiryou.pdf"],
    okayama: ["岡山県統計分析課「作品のチェックポイント」", "https://www.pref.okayama.jp/uploaded/life/983414_9472150_misc.pdf"],
    statk: ["総務省統計局 なるほど統計学園「グラフ作成の基本」", "https://www.stat.go.jp/naruhodo/9_graph/kihon.html"],
    state: ["総務省統計局 なるほど統計学園「絵グラフ」", "https://www.stat.go.jp/naruhodo/4_graph/shokyu/e-graph.html"],
    fukushima: ["福島県統計課「クイズ！統計グラフの見せ方・見え方」", "https://www.pref.fukushima.lg.jp/sec/11045b/kuizu-gurahu.html"],
    google: ["Google for Developers「可視化のトラップ」", "https://developers.google.com/machine-learning/guides/data-traps/visualization-traps?hl=ja"],
  };
  // 押せる所の名前
  const ZONE = { y: "縦の目盛り", x: "横の目盛り", g: "グラフの形", t: "題名", n: "注記", ok: "ウソは無い" };

  // ---- 題材（すべて架空の町・店） ----
  const CATS = {
    shop: ["北店", "南店", "駅前店", "本店"], town: ["東町", "西町", "南町", "北町"], route: ["1番の路線", "2番の路線", "3番の路線", "4番の路線"],
    cls: ["1組", "2組", "3組", "4組"], farm: ["A畑", "B畑", "C畑", "D畑"], fac: ["第1工場", "第2工場", "第3工場", "第4工場"], street: ["本通り", "中通り", "川通り", "駅通り"],
  };
  const BAR = [
    ["1日のお弁当の売上", "個", "shop", 300, 900], ["図書館の1か月の利用者", "人", "town", 1000, 5000], ["パン屋の1日のお客さん", "人", "shop", 80, 300],
    ["市民プールの夏の入場者", "人", "town", 2000, 9000], ["駐輪場の1日の利用", "台", "town", 100, 600], ["スーパーの1日の牛乳の売上", "本", "shop", 200, 800],
    ["公園で集めたごみの量", "kg", "town", 20, 90], ["バスの1日の乗客", "人", "route", 500, 3000], ["学級文庫の1か月の貸し出し", "冊", "cls", 40, 160],
    ["畑のじゃがいもの収穫", "kg", "farm", 100, 700], ["工場の1日の生産", "台", "fac", 200, 1200], ["商店街の1時間の通行人", "人", "street", 150, 900],
    ["ラーメン店の1日の売上", "杯", "shop", 100, 400], ["花屋の1週間の花束の売上", "束", "shop", 30, 120], ["体育館の1か月の利用者", "人", "town", 500, 3000],
  ];
  const LINE = [
    ["町の人口", "人", 8000, 30000], ["商店街の店の数", "店", 40, 150], ["バスの1年の乗客", "万人", 20, 90], ["駅の1日の乗り降り", "人", 3000, 20000],
    ["町の1年の観光客", "万人", 5, 60], ["田んぼの広さ", "ha", 100, 600], ["図書館の1年の貸し出し", "万冊", 3, 30], ["市民マラソンの参加者", "人", 500, 3000],
    ["お祭りの来場者", "万人", 2, 20], ["町の工場の数", "か所", 30, 120], ["道の駅の1年の売上", "百万円", 50, 400], ["温泉の1年の入浴客", "万人", 4, 40],
  ];
  const ASK = [
    ["新しい公園にほしいもの", ["遊具", "ベンチ", "花だん", "運動場", "木かげ"]], ["好きな朝ごはん", ["ごはん", "パン", "めん", "シリアル", "くだもの"]],
    ["通勤・通学のしかた", ["歩き", "自転車", "バス", "電車", "車"]], ["休みの日の過ごし方", ["家で休む", "買い物", "運動", "旅行", "勉強"]],
    ["町の図書館でよく借りる本", ["小説", "料理", "旅行", "歴史", "絵本"]], ["好きな季節", ["春", "夏", "秋", "冬"]],
    ["町に足りないと思うもの", ["病院", "お店", "バス", "公園", "働く場所"]], ["よく飲む飲みもの", ["お茶", "水", "コーヒー", "牛乳", "ジュース"]],
  ];
  const SAT = [
    ["新しいバスの時刻表", "バス停", "毎日乗る人"], ["駅前の広場", "広場のカフェ", "常連のお客さん"], ["町のお祭り", "お祭りの本部", "実行委員の人"],
    ["商店街のポイントカード", "商店街の店先", "カードを持っている人"], ["市の図書館", "図書館の中", "本を借りに来た人"], ["新しい公園", "公園の入口", "遊びに来た家族"],
    ["ごみの出し方の決まり", "町内会の集まり", "役員の人"], ["市民プールの料金", "プールの受付", "毎週来る人"],
  ];
  const PICT = [["集めた古紙", "t", "box"], ["売れたお米", "袋", "bag"], ["植えた木", "本", "tree"], ["送った荷物", "個", "box"], ["配ったエコバッグ", "枚", "bag"], ["育てた苗", "本", "tree"]];
  const RATIO = [
    ["自転車の事故", "件", "いちばん危ない町"], ["火事", "件", "いちばん火事が起きやすい町"], ["図書館の貸し出し", "千冊", "いちばん本を読む町"],
    ["出たごみ", "t", "いちばんごみを出す町"], ["119番の通報", "件", "いちばん救急車を呼ぶ町"], ["市民講座の参加者", "人", "いちばん学ぶ町"],
  ];
  const YEARS = (end, n) => Array.from({ length: n }, (_, i) => String(end - n + 1 + i) + "年");

  // ---- 手口の種類 ----
  // id・難しさ・手口帳の名前・答えの押す所・見るところ（ヒント1）・なぜ（答えのあとに出す）・出どころ
  const KINDS = [
    { id: "cut", lv: 0, name: "縦の目盛りの省略", ans: ["y"], look: "縦の目盛りの、いちばん下の数を見てみよう。", why: "縦の目盛りが0から始まらず、波線で下を省いています。差が本当より大きく見えます。棒グラフの目盛りは0から始めます。", src: ["tokyo", "shimane"] },
    { id: "area", lv: 0, name: "絵の大きさ", ans: ["g"], look: "絵の縦と横、両方が大きくなっていないかな。", why: "絵の縦と横を両方のばすと、面積は何倍にもなります。絵の大きさで量を表すときは、面積で比べます。", src: ["state"] },
    { id: "pie", lv: 0, name: "100%にならない円", ans: ["g"], look: "円グラフの%を、全部足してみよう。", why: "足しても100%になりません。「その他」などの残りがかくれていて、残った項目が大きく見えます。円グラフは合計を100%にします。", src: ["okayama", "tokyo"] },
    { id: "ok0", lv: 0, name: "正しいグラフ", ans: ["ok"], ok: true, look: "目盛りは0から？ 期間・注記・%の合計はそろっている？", why: "目盛りは0から始まり、見出しも数字どおりです。ウソはありません。", src: ["statk"] },
    { id: "period", lv: 1, name: "期間の切り取り", ans: ["x"], look: "横の目盛りは、何年から何年までかな。", why: "都合のよい最近の数年だけを切り取っています。長い期間で見ると、ちがう動きが見えます。", src: ["shimane"] },
    { id: "pair", lv: 1, name: "左右でちがう目盛り", ans: ["y"], look: "左と右のグラフの、縦の目盛りの数を比べよう。", why: "左と右で縦の目盛りがちがいます。目盛りをそろえて比べると、多いのは逆の町です。", src: ["fukushima"] },
    { id: "sample", lv: 1, name: "かたよった少ない調べ", ans: ["n"], look: "だれに、何人に聞いたのかな。", why: "聞いた人が少なく、使っている人だけにかたよっています。町の人みんなの考えとは言えません。", src: ["shimane"] },
    { id: "ok1", lv: 1, name: "正しいグラフ", ans: ["ok"], ok: true, look: "目盛りは0から？ 期間・注記・%の合計はそろっている？", why: "目盛りは0から、期間も長く取っていて、見出しも数字どおりです。ウソはありません。", src: ["statk"] },
    { id: "cutl", lv: 2, name: "0から始まらない折れ線", ans: ["y"], look: "縦の目盛りの数は、いくつからいくつまでかな。", why: "縦の目盛りが0から始まらず、上下に引きのばしています。少しの変化が急な変化に見えます。", src: ["statk", "google"] },
    { id: "ratio", lv: 2, name: "件数と割合", ans: ["n"], look: "町ごとに、住んでいる人の数は同じかな。", why: "人口がちがう町を、件数のまま比べています。人口1万人あたりにすると、順位が変わります。「実数」と「割合」の両方を見ます。", src: ["shimane"] },
    { id: "multi", lv: 2, name: "いくつでも選べる質問の円", ans: ["g", "n"], look: "円グラフの%を全部足すと、いくつになるかな。", why: "いくつでも選べる質問は、足すと100%を超えます。円グラフにはできないので、棒グラフで表します。", src: ["okayama"] },
    { id: "ok2", lv: 2, name: "正しいグラフ", ans: ["ok"], ok: true, look: "目盛りは0から？ 期間・注記・%の合計はそろっている？", why: "%の合計は100%で、多くの人にかたよりなく聞いています。ウソはありません。", src: ["statk"] },
  ];
  const BY = Object.fromEntries(KINDS.map((k) => [k.id, k]));
  const kindsOf = (lv) => KINDS.filter((k) => k.lv === lv).map((k) => k.id);
  // 手口帳：正しいグラフは3つを1つにまとめる
  const BOOK = ["cut", "area", "pie", "period", "pair", "sample", "cutl", "ratio", "multi", "ok"];
  const bookId = (id) => (BY[id] && BY[id].ok ? "ok" : id);

  // ---- 1つずつの作り方：{ head:見出し, title, unit, spec:見せるグラフ, fix:直したグラフ, note, fixNote, real:本当は } ----
  function barVals(R, n, lo, hi, spread) { const base = roundTo(ri(R, lo, hi), magOf(hi)); return Array.from({ length: n }, () => Math.max(1, roundTo(base * (1 + ri(R, -spread[0], spread[1]) / 100), magOf(base) >= 5 ? magOf(base) : 1))); }
  function distinctTop(vals) { const mx = Math.max(...vals); return vals.filter((v) => v === mx).length === 1; }
  const MAKE = {
    cut(R) {
      const [title, unit, cat, lo, hi] = pick(R, BAR), cats = pickN(R, CATS[cat], 3);
      let vals; do { vals = barVals(R, 3, lo, hi, [3, 12]); } while (!distinctTop(vals) || Math.min(...vals) === Math.max(...vals));
      const mx = Math.max(...vals), mn = Math.min(...vals), A = cats[vals.indexOf(mx)], B = cats[vals.indexOf(mn)];
      let ax = null, vis = 0;
      for (let t = ri(R, 3, 5); t < 30; t++) { const a = axis(mn - (mx - mn) / (t - 1), mx); if (a.ymin <= 0 || a.ymin >= mn) continue; vis = (mx - a.ymin) / (mn - a.ymin); if (vis >= 2.5) { ax = a; break; } }
      if (!ax) { ax = axis(mn - 1, mx); vis = (mx - ax.ymin) / Math.max(1e-9, mn - ax.ymin); }
      const real = mx / mn, fx = axis(0, mx);
      return { title, unit, head: `${A}は${B}の${Math.round(vis)}倍！`, spec: { type: "bar", cats, vals, ...ax, wave: true },
        fix: { type: "bar", cats, vals, ...fx }, note: "数字は架空です。", real: `${A}は${B}の約${r1(real)}倍（${Math.round((real - 1) * 100)}%多いだけ）。` };
    },
    ok0(R) {
      const [title, unit, cat, lo, hi] = pick(R, BAR), cats = pickN(R, CATS[cat], ri(R, 3, 4));
      let vals; do { vals = barVals(R, cats.length, lo, hi, [40, 60]); } while (!distinctTop(vals));
      const mx = Math.max(...vals), mn = Math.min(...vals), A = cats[vals.indexOf(mx)], B = cats[vals.indexOf(mn)], ax = axis(0, mx);
      const head = mx / mn >= 1.8 ? `${A}は${B}の約${r1(mx / mn)}倍` : `${A}がいちばん多い`;
      return { title, unit, head, spec: { type: "bar", cats, vals, ...ax }, fix: null, note: "数字は架空です。", real: `${A}は${fmt(mx)}${unit}、${B}は${fmt(mn)}${unit}。見出しどおりです。` };
    },
    area(R) {
      const [what, unit, icon] = pick(R, PICT), k = pick(R, [1.5, 2, 2.5, 3]), v1 = roundTo(ri(R, 20, 400), 10), v2 = Math.round(v1 * k);
      const cats = R() < 0.5 ? ["2014年", "2024年"] : ["去年", "今年"], k2 = k * k;
      return { title: `${what}`, unit, head: `${what}が${r1(k2)}倍に増えた！`, spec: { type: "pict", icon, cats, vals: [v1, v2], scale: "hw" },
        fix: { type: "pict", icon, cats, vals: [v1, v2], scale: "area" }, note: "数字は架空です。", real: `${fmt(v1)}${unit}から${fmt(v2)}${unit}なので、本当は${r1(k)}倍。縦と横を両方${r1(k)}倍にしたので、絵は${r1(k2)}倍に見えます。` };
    },
    pie(R) {
      const [q, all] = pick(R, ASK), opts = pickN(R, all, ri(R, 2, 3) + 1), top = ri(R, 38, 46), other = Math.max(ri(R, 18, 26), 2 * (50 - top) + 2);
      const rest = 100 - top - other, n = opts.length - 1, parts = []; let left = rest;
      for (let i = 0; i < n; i++) { const v = i === n - 1 ? left : Math.max(3, Math.min(left - 3 * (n - 1 - i), Math.round(rest / n + ri(R, -4, 4)))); parts.push(v); left -= v; }
      if (parts.some((v) => v >= top)) { parts.length = 0; let l2 = rest; for (let i = 0; i < n; i++) { const v = i === n - 1 ? l2 : Math.floor(rest / n); parts.push(v); l2 -= v; } }
      const pcts = [top, ...parts], shown = pcts.reduce((a, b) => a + b, 0), drawn = Math.round((top / shown) * 100);
      return { title: q, unit: "%", head: `「${opts[0]}」が半分以上！`, spec: { type: "pie", labels: opts, pcts }, fix: { type: "pie", labels: [...opts, "その他・答えない"], pcts: [...pcts, other] },
        note: `町の人${fmt(roundTo(ri(R, 400, 1500), 10))}人に聞きました（数字は架空）。`, real: `足すと${shown}%。残りの${other}%（その他・答えない）がかくれています。「${opts[0]}」は${top}%で、半分に届きません（円の上では${drawn}%に見えます）。` };
    },
    period(R) {
      const [title, unit, lo, hi] = pick(R, LINE), N = 12, S = ri(R, lo, hi), bot = ri(R, 55, 70) / 100, endR = ri(R, 72, 85) / 100, vals = [];
      for (let i = 0; i < N; i++) { const f = i <= 7 ? 1 - (1 - bot) * (i / 7) : bot + (endR - bot) * ((i - 7) / 4); vals.push(Math.max(0.1, roundS(S * f * (1 + ri(R, -15, 15) / 1000), S, unit))); }
      for (let i = 8; i < N; i++) if (vals[i] <= vals[i - 1]) vals[i] = roundS(vals[i - 1] + stepOf(S, unit), S, unit);
      const yrs = YEARS(2024, N), sh = 4, sv = vals.slice(N - sh), ax = axis(0, Math.max(...sv)), fx = axis(0, Math.max(...vals)), drop = Math.round((1 - vals[N - 1] / vals[0]) * 100);
      return { title, unit, head: `${title}は増え続けている！`, spec: { type: "line", cats: yrs.slice(N - sh), vals: sv, ...ax }, fix: { type: "line", cats: yrs, vals, ...fx },
        note: "数字は架空です。", real: `この${sh - 1}年は増えていますが、${yrs[0]}からの${N - 1}年で見ると${drop}%へっています。` };
    },
    ok1(R) {
      const [title, unit, lo, hi] = pick(R, LINE), N = 12, S = ri(R, lo, hi), up = R() < 0.5, g = ri(R, 15, 45) / 100, vals = [];
      for (let i = 0; i < N; i++) vals.push(Math.max(0.1, roundS(S * (1 + (up ? g : -g) * (i / (N - 1))) * (1 + ri(R, -20, 20) / 1000), S, unit)));
      const yrs = YEARS(2024, N), ax = axis(0, Math.max(...vals)), p = Math.round(Math.abs(vals[N - 1] / vals[0] - 1) * 100);
      return { title, unit, head: `${title}は${N - 1}年で${p}%${up ? "増えた" : "へった"}`, spec: { type: "line", cats: yrs, vals, ...ax }, fix: null, note: "数字は架空です。",
        real: `${yrs[0]}は${fmt(vals[0])}${unit}、${yrs[N - 1]}は${fmt(vals[N - 1])}${unit}。見出しどおりです。` };
    },
    pair(R) {
      const [title, unit, , lo, hi] = pick(R, BAR.filter((b) => b[2] === "town" || b[2] === "shop")), two = pickN(R, CATS.town, 2), yrs = YEARS(2024, 3);
      const big = roundTo(ri(R, lo, hi), magOf(hi)), small = roundTo(big * ri(R, 45, 70) / 100, magOf(hi));
      const va = yrs.map(() => roundTo(big * (1 + ri(R, -6, 6) / 100), magOf(hi))), vb = yrs.map(() => roundTo(small * (1 + ri(R, -6, 6) / 100), magOf(hi)));
      const axA = axis(0, Math.max(...va) * 2.2), axB = axis(0, Math.max(...vb) * 1.05), axS = axis(0, Math.max(...va, ...vb));
      const ta = va.reduce((a, b) => a + b, 0), tb = vb.reduce((a, b) => a + b, 0);
      return { title, unit, head: `${two[1]}のほうが${title.replace(/^1日の|^1か月の|^夏の/, "")}が多い！`, spec: { type: "pair", cats: yrs, sub: [{ name: two[0], vals: va, ...axA }, { name: two[1], vals: vb, ...axB }] },
        fix: { type: "pair", cats: yrs, sub: [{ name: two[0], vals: va, ...axS }, { name: two[1], vals: vb, ...axS }] }, note: "数字は架空です。",
        real: `3年を合わせると${two[0]}は${fmt(ta)}${unit}、${two[1]}は${fmt(tb)}${unit}。多いのは${two[0]}です。` };
    },
    sample(R) {
      const [what, place, group] = pick(R, SAT), n = ri(R, 8, 30), p = ri(R, 8, 9) * 10 + ri(R, 0, 6), mid = ri(R, 2, 100 - p - 1), low = 100 - p - mid;
      const N = roundTo(ri(R, 800, 2000), 10), p2 = ri(R, 35, 60), m2 = ri(R, 20, 100 - p2 - 5), l2 = 100 - p2 - m2;
      return { title: `${what}に満足？`, unit: "%", head: `町の人の${Math.floor(p / 10)}割が満足！`, spec: { type: "pie", labels: ["満足", "ふつう", "不満"], pcts: [p, mid, low] },
        fix: { type: "pie", labels: ["満足", "ふつう", "不満"], pcts: [p2, m2, l2] }, note: `${place}で、${group}${n}人に聞きました（数字は架空）。`,
        fixNote: `町の人から${fmt(N)}人を、かたよりなく選んで聞いた場合（架空）。`, real: `${group}${n}人だけの答えです。かたよりなく${fmt(N)}人に聞くと、満足は${p2}%でした（架空）。` };
    },
    cutl(R) {
      const [title, unit, lo, hi] = pick(R, LINE.filter((x) => x[2] >= 20)), N = 6, S = ri(R, CNT.test(unit) ? Math.max(lo, 80) : lo, hi), g = ri(R, 4, 10) / 100, vals = [];
      for (let i = 0; i < N; i++) vals.push(Math.max(0.1, roundS(S * (1 + g * (i / (N - 1))) * (1 + ri(R, -8, 8) / 1000), S, unit)));
      for (let i = 1; i < N; i++) if (vals[i] <= vals[i - 1]) vals[i] = roundS(vals[i - 1] + stepOf(S, unit), S, unit);
      const mn = Math.min(...vals), mx = Math.max(...vals), fx = axis(0, mx), yrs = YEARS(2024, N); let ax = axis(mn, mx);
      for (let n = 5; ax.ymin <= 0 && n <= 10; n++) ax = axis(mn, mx, n);
      const p = Math.round((vals[N - 1] / vals[0] - 1) * 100);
      return { title, unit, head: `${title}が急に増えている！`, spec: { type: "line", cats: yrs, vals, ...ax }, fix: { type: "line", cats: yrs, vals, ...fx }, note: "数字は架空です。",
        real: `${fmt(vals[0])}${unit}から${fmt(vals[N - 1])}${unit}なので、${N - 1}年で${p}%増えただけです。` };
    },
    ratio(R) {
      const [what, unit, claim] = pick(R, RATIO), towns = pickN(R, CATS.town, 3), pops = [ri(R, 2, 3), ri(R, 3, 5), ri(R, 10, 16)];
      // 人口のいちばん多い町は件数がいちばん多いが、1万人あたりはいちばん少ない
      const base = ri(R, 12, 60), rates = [base * (1 + ri(R, 25, 60) / 100), base * (1 + ri(R, 10, 20) / 100), base].map((v) => Math.round(v * 10) / 10);
      const cnt = pops.map((p, i) => Math.round(p * rates[i])), bi = 2, ax = axis(0, Math.max(...cnt));
      const rr = cnt.map((c, i) => Math.round((c / pops[i]) * 10) / 10);
      return { title: what, unit, head: `${towns[bi]}は${what}がいちばん多い。${claim}！`, spec: { type: "bar", cats: towns, vals: cnt, ...ax }, fix: { type: "bar", cats: towns, vals: rr, ...axis(0, Math.max(...rr)) }, fixUnit: `${unit}（人口1万人あたり）`,
        note: `人口：${towns.map((t, i) => `${t} ${pops[i]}万人`).join("・")}（数字は架空）`, real: `人口1万人あたりにすると、${towns[bi]}は${rr[bi]}${unit}で、いちばん少なくなります。` };
    },
    multi(R) {
      const [q, all] = pick(R, ASK), opts = pickN(R, all, 4); let pcts;
      do { pcts = opts.map(() => ri(R, 20, 70)); } while (pcts.reduce((a, b) => a + b, 0) < 150);
      const sum = pcts.reduce((a, b) => a + b, 0), top = opts[pcts.indexOf(Math.max(...pcts))];
      return { title: q, unit: "%", head: `${q}：答えの内わけ`, spec: { type: "pie", labels: opts, pcts }, fix: { type: "bar", cats: opts, vals: pcts, ymin: 0, ymax: 100, ticks: [0, 25, 50, 75, 100] }, fixUnit: "%",
        note: `いくつでも選べる質問。町の人${fmt(roundTo(ri(R, 400, 1500), 10))}人に聞きました（数字は架空）。`, real: `足すと${sum}%。いくつでも選べるので、ひとりが2つ以上答えています。たとえば「${top}」は${Math.max(...pcts)}%の人が選びました。` };
    },
    ok2(R) {
      const [q, all] = pick(R, ASK), opts = pickN(R, all, 4), pcts = []; let left = 100;
      for (let i = 0; i < 4; i++) { const v = i === 3 ? left : Math.max(4, Math.min(left - 4 * (3 - i), ri(R, 10, 40))); pcts.push(v); left -= v; }
      const top = Math.max(...pcts), A = opts[pcts.indexOf(top)], N = roundTo(ri(R, 800, 2000), 10);
      return { title: q, unit: "%", head: `いちばん多いのは「${A}」で${top}%`, spec: { type: "pie", labels: opts, pcts }, fix: null, note: `町の人から${fmt(N)}人をかたよりなく選んで聞きました（数字は架空）。`,
        real: `%を足すと100%。${fmt(N)}人にかたよりなく聞いた結果で、見出しどおりです。` };
    },
  };

  // ---- 種と乱数 ----
  function seedOf(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // 問題：tag = "種類|種"
  function make(tag) {
    const id = String(tag).split("|")[0], k = BY[id];
    if (!k) throw new Error("知らない種類: " + id);
    const p = MAKE[id](rng(seedOf(tag)));
    const zones = zonesOf(p.spec);
    return Object.assign(p, { tag, kind: id, lv: k.lv, name: k.name, ans: k.ans, look: k.look, why: k.why, src: k.src.map((s) => SRC[s]), ok: !!k.ok, zones });
  }
  // 今日の5問（やさしい2・ふつう2・むずかしい1）
  function dailyTags(date) {
    const R = rng(seedOf("day:" + date)), e = pickN(R, kindsOf(0), 2), n = pickN(R, kindsOf(1), 2), h = pickN(R, kindsOf(2), 1);
    if (BY[e[0]].ok) e.reverse(); // 1問目はウソのあるグラフにする（はじめての人が仕組みをつかめるように）
    return [...e, ...n, ...h].map((id, i) => `${id}|${date}:d${i}`);
  }
  // 上級の3問（むずかしいだけ・今日の5問のむずかしいとは別の種類）
  function hardTags(date) {
    const dh = dailyTags(date)[4].split("|")[0], R = rng(seedOf("hard:" + date)), h = pickN(R, kindsOf(2).filter((x) => x !== dh), 3);
    return h.map((id, i) => `${id}|${date}:h${i}`);
  }

  // ---- 絵（SVG）。viewBox 300×236。押せる所の四角も同じ座標で返す ----
  const W = 300, H = 236, L = 56, RR = 292, T = 16, B = 178;
  const COL = ["#0072b2", "#e69f00", "#009e73", "#cc79a7", "#56b4e9", "#d55e00"];
  const INK = "#1f2a44", SUB = "#4a5468", GRID = "#d9dde6";
  const tx = (x, y, s, o = {}) => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${o.fs || 11}" fill="${o.fill || INK}" text-anchor="${o.a || "middle"}"${o.w ? ` font-weight="${o.w}"` : ""}>${String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`;
  const short = (v) => fmt(v);
  function yAxis(ax, x0, x1, top, bot, wave) {
    const yOf = (v) => bot - ((v - ax.ymin) / (ax.ymax - ax.ymin)) * (bot - top);
    let s = "";
    for (const t of ax.ticks) { const y = yOf(t); s += `<line x1="${x0}" x2="${x1}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${GRID}" stroke-width="1"/>` + tx(x0 - 5, y + 3.5, short(t), { a: "end", fs: 10.5 }); }
    s += `<line x1="${x0}" x2="${x0}" y1="${top - 4}" y2="${bot}" stroke="${INK}" stroke-width="1.4"/><line x1="${x0}" x2="${x1}" y1="${bot}" y2="${bot}" stroke="${INK}" stroke-width="1.4"/>`;
    if (wave) { const y = bot - 7; s += `<path d="M${x0 - 7} ${y + 3} l3.5 -4 l3.5 4 l3.5 -4 l3.5 4" fill="none" stroke="#fff" stroke-width="5"/><path d="M${x0 - 7} ${y + 3} l3.5 -4 l3.5 4 l3.5 -4 l3.5 4" fill="none" stroke="${INK}" stroke-width="1.4"/>`; }
    return { s, yOf };
  }
  function bars(spec, x0, x1, top, bot, col) {
    const ax = { ymin: spec.ymin, ymax: spec.ymax, ticks: spec.ticks }, A = yAxis(ax, x0, x1, top, bot, spec.wave), n = spec.vals.length, cw = (x1 - x0) / n, bw = Math.min(46, cw * 0.58);
    let s = A.s;
    spec.vals.forEach((v, i) => { const cx = x0 + cw * (i + 0.5), y = Math.max(top - 2, A.yOf(Math.max(v, ax.ymin))); s += `<rect x="${(cx - bw / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${(bot - y).toFixed(1)}" fill="${col || COL[i % COL.length]}" stroke="${INK}" stroke-width="1"/>` + tx(cx, y - 4, short(v), { fs: 10.5, w: 700 }); });
    return s;
  }
  function catLabels(cats, x0, x1, y, every = 1) { const cw = (x1 - x0) / cats.length; return cats.map((c, i) => (i % every === 0 || i === cats.length - 1 ? tx(x0 + cw * (i + 0.5), y, c, { fs: cats.length > 6 ? 9.5 : 10.5 }) : "")).join(""); }
  const ICON = {
    box: `<path d="M3 12 L20 4 L37 12 L37 34 L20 40 L3 34 Z" fill="#c98a4b" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><path d="M3 12 L20 19 L37 12 M20 19 L20 40" fill="none" stroke="${INK}" stroke-width="1.4"/><path d="M11 8 L28 16" stroke="#f3e1b7" stroke-width="4"/>`,
    bag: `<path d="M13 13 C13 3 27 3 27 13" fill="none" stroke="${INK}" stroke-width="2.2"/><path d="M5 13 L35 13 L37 39 L3 39 Z" fill="#009e73" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`,
    tree: `<rect x="16.5" y="26" width="7" height="14" fill="#8a5a2b" stroke="${INK}" stroke-width="1.4"/><circle cx="20" cy="17" r="15" fill="#3f9b52" stroke="${INK}" stroke-width="1.6"/>`,
  };
  function svg(spec, o = {}) {
    let s = "";
    if (spec.type === "bar" || spec.type === "line") {
      if (spec.type === "bar") s += bars(spec, L, RR, T, B);
      else {
        const A = yAxis(spec, L, RR, T, B, false), n = spec.vals.length, cw = (RR - L) / n, pts = spec.vals.map((v, i) => [L + cw * (i + 0.5), A.yOf(v)]);
        s += A.s + `<polyline points="${pts.map((p) => p.map((q) => q.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="${COL[0]}" stroke-width="3" stroke-linejoin="round"/>` + pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.6" fill="#fff" stroke="${COL[0]}" stroke-width="2"/>`).join("");
        if (n <= 6) s += pts.map((p, i) => tx(p[0], p[1] - 8, short(spec.vals[i]), { fs: 10, w: 700 })).join("");
        else s += tx(pts[0][0] + 4, pts[0][1] - 8, short(spec.vals[0]), { fs: 10, w: 700, a: "start" }) + tx(pts[n - 1][0], pts[n - 1][1] - 8, short(spec.vals[n - 1]), { fs: 10, w: 700, a: "end" });
      }
      s += catLabels(spec.cats, L, RR, B + 17, spec.cats.length > 6 ? 3 : 1);
    } else if (spec.type === "pair") {
      const P = [[52, 144], [204, 296]];
      spec.sub.forEach((sb, j) => { const [a, b] = P[j]; s += tx((a + b) / 2, T - 4, sb.name, { fs: 11, w: 700 }) + bars({ vals: sb.vals, ymin: sb.ymin, ymax: sb.ymax, ticks: sb.ticks }, a, b, T + 8, B, COL[j]) + catLabels(spec.cats.map((c) => c.replace("年", "")), a, b, B + 17); });
      s += tx(150, B + 32, "（年）", { fs: 9.5, fill: SUB });
    } else if (spec.type === "pie") {
      const cx = 88, cy = 98, r = 78, tot = spec.pcts.reduce((a, b) => a + b, 0); let ang = -Math.PI / 2;
      spec.pcts.forEach((p, i) => {
        const a2 = ang + (p / tot) * Math.PI * 2, big = a2 - ang > Math.PI ? 1 : 0, x1 = cx + r * Math.cos(ang), y1 = cy + r * Math.sin(ang), x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2), mid = (ang + a2) / 2;
        s += `<path d="M${cx} ${cy} L${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${big} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${COL[i % COL.length]}" stroke="#fff" stroke-width="2"/>`;
        if (p / tot > 0.06) s += `<circle cx="${(cx + r * 0.62 * Math.cos(mid)).toFixed(1)}" cy="${(cy + r * 0.62 * Math.sin(mid)).toFixed(1)}" r="9" fill="#fff"/>` + tx(cx + r * 0.62 * Math.cos(mid), cy + r * 0.62 * Math.sin(mid) + 4, i + 1, { fs: 11, w: 700 });
        ang = a2;
      });
      spec.labels.forEach((l, i) => { const y = 30 + i * 30; s += `<rect x="174" y="${y - 11}" width="15" height="15" rx="2" fill="#fff" stroke="${COL[i % COL.length]}" stroke-width="3"/>` + tx(181.5, y + 0.5, i + 1, { fs: 10, w: 700 }) + tx(194, y, l, { a: "start", fs: l.length > 5 ? 9.5 : 11 }) + tx(296, y, spec.pcts[i] + "%", { a: "end", fs: 12, w: 700 }); });
    } else if (spec.type === "pict") {
      const mx = Math.max(...spec.vals), mn = Math.min(...spec.vals), k = mx / mn, cw = (RR - L + 40) / spec.vals.length, maxS = Math.min(B - T - 20, cw - 10);
      const sizes = spec.vals.map((v) => (spec.scale === "hw" ? (v / mx) * maxS : Math.sqrt(v / mx) * maxS));
      spec.vals.forEach((v, i) => { const cx = L - 20 + cw * (i + 0.5), z = sizes[i]; s += `<g transform="translate(${(cx - z / 2).toFixed(1)} ${(B - z).toFixed(1)}) scale(${(z / 40).toFixed(3)})">${ICON[spec.icon]}</g>` + tx(cx, B - z - 6, short(v), { fs: 12, w: 700 }); });
      s += `<line x1="${L - 20}" x2="${RR}" y1="${B}" y2="${B}" stroke="${INK}" stroke-width="1.4"/>` + catLabels(spec.cats, L - 20, RR + 20, B + 17);
      void k;
    }
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${(o.label || descOf(spec)).replace(/"/g, "&quot;")}" class="chart" font-family="inherit">${s}</svg>`;
  }
  // 押せる所（viewBox の座標）：同じ id の四角が2つあることもある（左右のグラフ）
  function zonesOf(spec) {
    if (spec.type === "bar" || spec.type === "line") return [{ id: "y", x: 0, y: 4, w: 52, h: 178 }, { id: "x", x: 52, y: 182, w: 248, h: 52 }, { id: "g", x: 58, y: 6, w: 240, h: 170 }];
    if (spec.type === "pair") return [{ id: "y", x: 0, y: 14, w: 50, h: 168, sub: "左" }, { id: "y", x: 150, y: 14, w: 52, h: 168, sub: "右" }, { id: "x", x: 0, y: 184, w: 300, h: 50 }, { id: "g", x: 52, y: 22, w: 96, h: 154, sub: "左" }, { id: "g", x: 204, y: 22, w: 94, h: 154, sub: "右" }];
    if (spec.type === "pie") return [{ id: "g", x: 6, y: 6, w: 288, h: 196 }];
    if (spec.type === "pict") return [{ id: "x", x: 0, y: 182, w: 300, h: 52 }, { id: "g", x: 6, y: 6, w: 288, h: 172 }];
    return [];
  }
  // 読み上げ用：グラフの中身を言葉にする
  function descOf(spec) {
    if (spec.type === "bar") return `棒グラフ。${spec.cats.map((c, i) => `${c} ${fmt(spec.vals[i])}`).join("、")}。縦の目盛りは${fmt(spec.ymin)}から${fmt(spec.ymax)}${spec.wave ? "（波線で下を省略）" : ""}。`;
    if (spec.type === "line") return `折れ線グラフ。${spec.cats[0]}から${spec.cats[spec.cats.length - 1]}まで。${spec.cats.map((c, i) => `${c.replace("年", "")} ${fmt(spec.vals[i])}`).join("、")}。縦の目盛りは${fmt(spec.ymin)}から${fmt(spec.ymax)}。`;
    if (spec.type === "pair") return `左右2つの棒グラフ。${spec.sub.map((s) => `${s.name}：${s.vals.map((v, i) => `${spec.cats[i]} ${fmt(v)}`).join("、")}（縦の目盛り ${fmt(s.ymin)}から${fmt(s.ymax)}）`).join("。")}。`;
    if (spec.type === "pie") return `円グラフ。${spec.labels.map((l, i) => `${l} ${spec.pcts[i]}%`).join("、")}。`;
    if (spec.type === "pict") return `絵グラフ。${spec.cats.map((c, i) => `${c} ${fmt(spec.vals[i])}`).join("、")}。${spec.scale === "hw" ? "絵は数に合わせて縦と横を両方のばしている。" : "絵は面積が数に合うように描いている。"}`;
    return "グラフ";
  }

  const GRAPH = { LV, KINDS, BY, BOOK, bookId, ZONE, SRC, kindsOf, seedOf, rng, make, dailyTags, hardTags, svg, zonesOf, descOf, axis, fmt, pickN, W, H, _T: { BAR, LINE, ASK, SAT, PICT, RATIO } };
  if (typeof module !== "undefined" && module.exports) module.exports = GRAPH; else root.GRAPH = GRAPH;
})(typeof self !== "undefined" ? self : this);
