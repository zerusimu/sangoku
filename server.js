const express = require("express");
const COMMANDS = require("./commands");
const fs = require("fs");
const bodyParser = require("body-parser");
const { setDefense } = require("./logic/defense");
const { battle } = require("./logic/battle");
const { recruit } = require("./logic/army");
const { getRecruitTimeByIndex } = require("./logic/recruit");


const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

const session = require("express-session");

app.use(session({
  secret: "secret-key",
  resave: false,
  saveUninitialized: false
}));





// =========================
// JSON 読み書き共通関数
// =========================
const loadJSON = (file) => {
  return JSON.parse(fs.readFileSync(`data/${file}`, "utf8"));
};

const saveJSON = (file, data) => {
  fs.writeFileSync(`data/${file}`, JSON.stringify(data, null, 2));
};

// =========================
// 武将登録画面
// =========================
app.get("/register", (req, res) => {
  const cities = loadJSON("cities.json");
  const countries = loadJSON("countries.json");

  const citiesWithCountry = cities.map(city => {
    const country = countries.find(c => c.id === city.owner);
    return {
      ...city,
      countryName: country ? country.name : null
    };
  });

  res.render("createuser", {
    cities: citiesWithCountry
  });
});

// =========================
// 武将登録処理（士官 or 建国）
// =========================
app.post("/register", (req, res) => {
  const users = loadJSON("users.json");
  const generals = loadJSON("generals.json");
  const countries = loadJSON("countries.json");
  const cities = loadJSON("cities.json");

  const {
    loginId,
    password,
    name,
    str, int, lea, cha,
    mode,
    joinCity,
    countryName,
    city
  } = req.body;

  // ===== ログインID重複 =====
  if (users.find(u => u.loginId === loginId)) {
    return res.send("このログインIDは使われています");
  }

  // ===== 能力チェック =====
  if (+str + +int + +lea + +cha !== 175) {
    return res.send("能力合計は175にしてください");
  }

  let countryId = null;

  // ===== 建国 =====
  if (mode === "create") {
    const newCountryId = "country_" + Date.now();

    countries.push({
      id: newCountryId,
      name: countryName,
      ruler: name,
      alive: true,
      cities: [city]
    });

    const targetCity = cities.find(c => c.id === city);
    targetCity.owner = newCountryId;

    countryId = newCountryId;
  }

  // ===== 士官 =====
  if (mode === "join") {
    const targetCity = cities.find(c => c.id === joinCity);
    if (!targetCity || !targetCity.owner) {
      return res.send("士官先が不正です");
    }
    countryId = targetCity.owner;
  }

  // ===== 武将作成 =====
  const generalId = "general_" + Date.now();

  generals.push({
    id: generalId,
    name,
    str: +str,
    int: +int,
    lea: +lea,
    cha: +cha,
    countryId
  });

  // ===== ユーザー作成 =====
  users.push({
    id: "user_" + Date.now(),
    loginId,
    password,
    generalId
  });

  saveJSON("users.json", users);
  saveJSON("generals.json", generals);
  saveJSON("countries.json", countries);
  saveJSON("cities.json", cities);

  res.send("登録完了！<a href='/login'>ログインへ</a>");
});





app.get("/countries", (req, res) => {
  const countries = loadJSON("countries.json");
  const cities = loadJSON("cities.json");
  const generals = loadJSON("generals.json"); // ★変更

  const countryViews = countries.map(country => {
    return {
      ...country,
      cityList: cities.filter(c => country.cities.includes(c.id)),
      generals: generals.filter(g => g.countryId === country.id) // ★変更
    };
  });

  res.render("countries", { countries: countryViews });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  const users = loadJSON("users.json");

  const user = users.find(u =>
    u.name === req.body.name &&
    u.password === req.body.password
  );

  if (!user) {
    return res.send("ログイン失敗");
  }

  // セッションに保存
  req.session.userId = user.id;
  req.session.generalId = user.generalId;

  // ★ ここが最重要
  res.redirect(`/user/${user.generalId}`);
});




app.get("/user/:id", (req, res) => {
  const generals = loadJSON("generals.json");
  const countries = loadJSON("countries.json");
  const cities = loadJSON("cities.json");
  const heisyu = loadJSON("heisyu.json");
  const INTERVAL = 60 * 1000;

  // ✅ ① まず general を取得
  const general = generals.find(g => g.id === req.params.id);
  if (!general) return res.send("武将が存在しません");

  // 👇ここに入れる
const alignedNow =
  Math.floor(Date.now() / INTERVAL) * INTERVAL;

general.scheduleBaseTime = alignedNow;
saveJSON("generals.json", generals);



// ===== 表示前に追いつき処理 =====
const now = Date.now();

if (Array.isArray(general.commandQueue)) {
  general.commandQueue = general.commandQueue.filter(cmd => {
    if (
      cmd &&
      typeof cmd.executeAt === "number" &&
      cmd.executeAt <= now
    ) {
      const handler = COMMANDS[cmd.type];
      if (handler?.execute) {
        handler.execute(general, cmd.data || {});
      }

      // ログ保存
      general.commandLog.push({
        type: cmd.type,
        data: cmd.data || {},
        slot: cmd.slot,
        executeAt: cmd.executeAt,
        executedAt: now
      });

      return false; // 実行済みなので消す
    }
    return true;
  });

  saveJSON("generals.json", generals);
}

  const country = countries.find(c => c.id === general.countryId);
  const baseTime = Number(general.scheduleBaseTime);

  const schedule = [];

  for (let i = 0; i < 60; i++) {
    const cmd = (general.commandQueue || []).find(
      c => c && typeof c.slot === "number" && c.slot === i
    );

    const executeAt =
      cmd?.executeAt ?? baseTime + (i + 1) * INTERVAL;

 schedule.push({
  index: i,
  command: cmd?.type ?? "",
  heisyuId: cmd?.data?.heisyuId ?? "",
  count: cmd?.data?.count ?? 0
});

  }

  res.render("user", {
    general,
    country,
    cities,
    schedule,
    heisyu,
    commandLog: general.commandLog,
      intervalMinutes: 1 // 1分
  });
});





// =========================
// コマンド自動処理（全ユーザー）
// =========================
const processCommands = () => {
  const generals = loadJSON("generals.json");
  const now = Date.now();
  let updated = false;

  generals.forEach(g => {
    if (!Array.isArray(g.commandQueue) || g.commandQueue.length === 0) return;

    // 🔽 ログ配列初期化
    if (!Array.isArray(g.commandLog)) {
      g.commandLog = [];
    }

    while (
      g.commandQueue.length > 0 &&
      g.commandQueue[0] &&
      typeof g.commandQueue[0].executeAt === "number" &&
      g.commandQueue[0].executeAt <= now
    ) {
      const cmd = g.commandQueue.shift();

      const handler = COMMANDS[cmd.type];
      if (handler?.execute) {
        handler.execute(g, cmd.data || {});
      }

      // ✅ 実行ログ保存
      g.commandLog.push({
        type: cmd.type,
        data: cmd.data || {},
        slot: cmd.slot,
        executeAt: cmd.executeAt,
        executedAt: now
      });

      g.lastExecuted = cmd.executeAt;
      updated = true;
    }
  });

  if (updated) {
    saveJSON("generals.json", generals);
  }
};





app.post("/command/update", (req, res) => {
  const generals = loadJSON("generals.json");
  const general = generals.find(g => g.id === req.session.generalId);
  if (!general) return res.redirect("/login");

  const INTERVAL = 60 * 1000;

  // ===== 基準時刻（最初の1回だけ・秒を揃える）=====
  if (!general.scheduleBaseTime || isNaN(general.scheduleBaseTime)) {
    // 例：12:34:56 → 12:34:00 に揃う
    const alignedBaseTime =
      Math.floor(Date.now() / INTERVAL) * INTERVAL;

    general.scheduleBaseTime = alignedBaseTime;
  }

  const baseTime = Number(general.scheduleBaseTime);

  const commands = req.body.commands || [];
  const heisyuIds = req.body.tyouhei_heisyu || [];
  const counts = req.body.tyouhei_count || [];

  // ✅ null・壊れたデータ完全排除
  const oldQueue = (general.commandQueue || []).filter(
    c =>
      c &&
      typeof c.slot === "number" &&
      typeof c.executeAt === "number"
  );

  general.commandQueue = [];

  commands.forEach((cmd, i) => {
    if (!cmd) return;

    const old = oldQueue.find(c => c.slot === i);

    const entry = {
      type: cmd,
      slot: i,
      executeAt: old
        ? old.executeAt // 既存は絶対に維持
        : baseTime + (i + 1) * INTERVAL // 秒が必ず揃う
    };

    if (cmd === "tyouhei") {
      entry.data = {
        heisyuId: heisyuIds[i],
        count: Number(counts[i]) || 0
      };
    }

    general.commandQueue.push(entry);
  });

  saveJSON("generals.json", generals);
  res.redirect(`/user/${general.id}`);
});






app.get("/recruit/:index", (req, res) => {
  const index = Number(req.params.index);

  const generals = loadJSON("generals.json");
  const heisyu = loadJSON("heisyu.json");

  // ✅ セッションから直接 general を取る
  const general = generals.find(g => g.id === req.session.generalId);
  if (!general) return res.redirect("/login");

  res.render("recruit", {
    index,
    general,
    heisyu
  });
});




app.post("/recruit/:index", (req, res) => {
  const index = Number(req.params.index);
  const { heisyuId, count } = req.body;

  const generals = loadJSON("generals.json");
  const general = generals.find(g => g.id === req.session.generalId);
  if (!general) return res.redirect("/login");

  const INTERVAL = 60 * 1000;

  const baseTime = Number(general.scheduleBaseTime);

const executeAt = baseTime + (index + 1) * INTERVAL;

  if (!general.commandQueue) general.commandQueue = [];

  // ★ ここが最重要
  general.commandQueue[index] = {
    type: "tyouhei",
    slot: index,
    executeAt,
    data: {
      heisyuId,
      count: Number(count)
    }
  };

  saveJSON("generals.json", generals);

  res.redirect(`/user/${general.id}`);
});


app.post("/command/recruit", (req, res) => {
  const generals = loadJSON("generals.json");
  const general = generals.find(g => g.id === req.session.generalId);

  if (!general) return res.send("武将が存在しません");

  const index = Number(req.body.index);   // コマ番号
  const heisyuId = req.body.heisyuId;
  const count = Number(req.body.count);

  const INTERVAL = 60 * 1000;
  const executeAt = Date.now() + (index + 1) * INTERVAL;

  if (!general.commandQueue) general.commandQueue = [];

  general.commandQueue[index] = {
    type: "徴兵",
    detail: heisyuId,
    count,
    executeAt
  };

  saveJSON("generals.json", generals);

  res.redirect(`/user/${general.id}`);
});


function getGameNow(general) {
  return Date.now();
}




app.listen(3000, () => {
  console.log("http://localhost:3000/register でアクセスできます");

  // 起動時に即処理
  processCommands();
});
