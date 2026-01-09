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
  // ★ general を URL から直接探す
  const general = generals.find(g => g.id === req.params.id);
  if (!general) return res.send("武将が存在しません");

  const country = countries.find(c => c.id === general.countryId);

  // ===== 時間管理 =====
  const INTERVAL = 60 * 1000; // 1分
  const now = Date.now();

  // ===== スケジュール作成 =====
  const schedule = [];

  for (let i = 0; i < 60; i++) {
    const cmd = general.commandQueue?.[i];

    const executeAt = cmd
      ? cmd.executeAt
      : now + (i + 1) * INTERVAL;

    schedule.push({
      index: i,
      time: new Date(executeAt),
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
    heisyu
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
    if (!g.commandQueue || g.commandQueue.length === 0) return;

    while (
      g.commandQueue.length > 0 &&
      g.commandQueue[0].executeAt <= now
    ) {
      const cmd = g.commandQueue.shift();

      const handler = COMMANDS[cmd.type];
      if (!handler || !handler.execute) {
        console.log("未定義コマンド:", cmd.type);
        continue;
      }

      // ★ COMMANDS 方式で実行
      handler.execute(g, cmd.data || {});

      g.lastExecuted = cmd.executeAt;
      updated = true;
    }
  });

  if (updated) {
    saveJSON("generals.json", generals);
  }
};




setInterval(() => {
  const generals = loadJSON("generals.json");
  const now = Date.now();

  generals.forEach(general => {
    if (!general.commandQueue) return;

    const rest = [];

    general.commandQueue.forEach(cmd => {
      if (cmd.executeAt > now) {
        rest.push(cmd);
        return;
      }

      const handler = COMMANDS[cmd.type];
      if (!handler) {
        general.logs ||= [];
        general.logs.push(`未定義コマンド: ${cmd.type}`);
        return;
      }

      const result = handler.execute(general, cmd.data);

      general.logs ||= [];

      if (result?.success) {
        general.logs.push(
          `${cmd.slot + 1}コマ目：${result.message}`
        );
      } else {
        general.logs.push(
          `${cmd.slot + 1}コマ目：${result?.reason || "失敗"}`
        );
      }
    });

    general.commandQueue = rest;
  });

  saveJSON("generals.json", generals);
}, 60 * 1000); // 1分ごと



app.post("/command/update", (req, res) => {
  const generals = loadJSON("generals.json");
  const general = generals.find(g => g.id === req.session.generalId);
  if (!general) return res.redirect("/login");

  const commands = req.body.commands;
  const heisyuIds = req.body.tyouhei_heisyu || [];
  const counts = req.body.tyouhei_count || [];

  const INTERVAL = 60 * 1000;
  const now = Date.now();

  general.commandQueue = [];

  commands.forEach((cmd, i) => {
    if (!cmd) return;

    const entry = {
      type: cmd,
      executeAt: now + (i + 1) * INTERVAL,
      slot: i
    };

    if (cmd === "tyouhei") {
      entry.data = {
        heisyuId: heisyuIds[i],
        count: Number(counts[i])
      };
    }

    general.commandQueue.push(entry);
  });

  saveJSON("generals.json", generals);
 res.redirect(`/user/${req.session.generalId}`);
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

  if (!general) {
    return res.redirect("/login");
  }

  const duration = getRecruitTimeByIndex(index);
  const finishAt = Date.now() + duration;

  if (!general.recruitQueue) general.recruitQueue = [];

  general.recruitQueue.push({
    heisyuId,
    count: Number(count),
    finishAt
  });

  saveJSON("generals.json", generals);

  // 👇 ここが重要
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









app.listen(3000, () => {
  console.log("http://localhost:3000/register でアクセスできます");

  // 起動時に即処理
  processCommands();
});
