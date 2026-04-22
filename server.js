const express = require("express");
const commandHandlers = require("./commands");
const fs = require("fs");
const bodyParser = require("body-parser");
const { setDefense } = require("./logic/defense");
const { battle } = require("./logic/battle");
const { recruit } = require("./logic/army");
const { getRecruitTimeByIndex } = require("./logic/recruit");
const { loadJSON, saveJSON } = require("./utils/json");

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

function getRankByPoint(point) {
  if (point >= 20000) return "S";
  if (point >= 15000) return "A";
  if (point >= 10000) return "B";
  if (point >= 5000) return "C";
  return "D";
}


// =========================
// JSON 読み書き共通関数
// =========================




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
    city,
  
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

// 都市ID決定
let cityId = null;

if (mode === "create") {
  cityId = city;
  console.log(cityId);
}

if (mode === "join") {
  cityId = joinCity;
  console.log(cityId);
}

generals.push({
  id: generalId,
  name,
  str: +str,
  int: +int,
  lea: +lea,
  cha: +cha,

  countryId,
  cityId,            // ★都市ID
   kunren:0,         // 訓練値      
  money: 1000,       // ★初期資金
  rice: 500,         // ★兵糧
  rankPoint: 0,    // ランクポイントの初期値
   rank: "D", // 初期ランク
skills: [],
skillPoints: 0,


  commandQueue: [],

  army: {
    name: "農民",
    count: 0
  }
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

console.log("新規武将作成:", {
  id: generalId,
  name,
  countryId,
  cityId
});
console.log("現在の武将数:", generals.length);

});

function getRankIndex(rank) {
  const order = ["D", "C", "B", "A", "S"];
  return order.indexOf(rank);
}






function processCommands(general, generals) {

  if (!general.cityId) {
    console.log("⚠ cityId消えてる:", general);
  }

  if (!general) return;

  // 🔥 初期化（安全対策）
  if (!Array.isArray(general.commandQueue)) {
    general.commandQueue = new Array(60).fill(null);
  }

  const now = Date.now();

  for (let i = 0; i < general.commandQueue.length; i++) {
    const cmd = general.commandQueue[i];

    if (!cmd) continue;
    if (cmd.executed) continue;
    if (!cmd.executeAt) continue;

    if (now >= Number(cmd.executeAt)) {

      const handler = commandHandlers[cmd.type];

      if (handler && typeof handler.execute === "function") {

       const result = handler.execute(general, cmd, generals);

        // ✅ ログ
        if (result && result.message && !cmd.logged) {
          if (!general.commandLog) general.commandLog = [];

          general.commandLog.unshift({
            type: cmd.type,
            message: result.message,
            executeAt: Date.now()
          });

          cmd.logged = true;

          if (general.commandLog.length > 50) {
            general.commandLog.pop();
          }
        }

        // 🔥 予約処理
        if (result && result.isReserve && !cmd.isReserve) {
          cmd.isReserve = true;
          cmd.executed = false;
          continue;
        }

        if (cmd.isReserve) {
          if (!result.isReserve && result.success) {
            cmd.isReserve = false;
            cmd.executed = true;
          } else {
            cmd.executed = true;
          }
        }
      }

      cmd.executed = true;
    }
  }

  // 🔥🔥🔥 ここが超重要（詰める処理）

  const active = general.commandQueue
    .filter(cmd => cmd && !cmd.executed) // ← 未実行だけ残す
  

  // 空で埋める
  while (active.length < 60) {
    active.push(null);
  }

  general.commandQueue = active;
}

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



  // 武将取得
  const general = generals.find(
    g => String(g.id) === String(req.params.id)
  );

  if (!general) return res.send("武将が存在しません");

  const country = countries.find(c => c.id === general.countryId);
 processCommands(general, generals);

saveJSON("generals.json", generals);

  // ============================
  // RTS：executeAt完全同期表示
  // ============================

  const queue = general.commandQueue || [];
  const schedule = [];

  for (let i = 0; i < 60; i++) {
    const cmd = queue[i];

    if (cmd) {
      schedule.push({
        index: i,
        command: cmd.type || "",
        heisyuId: cmd?.data?.heisyuId ?? "",
        count: cmd?.data?.count ?? 0,
         targetCity: cmd?.data?.targetCity ?? "", // ★追加
        executeAt: cmd.executeAt || null
      });
    } else {
      schedule.push({
        index: i,
        command: "",
        heisyuId: "",
        count: 0,
         targetCity:  "", // ★追加
        executeAt: null
      });
    }
  }
 if (!general.battleLog) general.battleLog = [];

  res.render("user", {
    general,
    generals,
    countries,
    country,
    cities,
    schedule,
    heisyu,
    commandLog: general.commandLog || []
  });

  console.log("表示中の武将ID:", general.id);
  console.log("ログ件数:", general.commandLog?.length);
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

function normalizeQueue(queue) {
  const result = queue.map(cmd => {
    if (!cmd) return null;

    return {
      type: cmd.type,
      executeAt: cmd.executeAt,
      executed: cmd.executed,
      data: cmd.data // ←🔥 これ追加
    };
  });

  while (result.length < 60) {
    result.push(null);
  }

  return result;
}




app.post("/command/update", (req, res) => {
console.log("moveTargets:", req.body.move_targetCity);
console.log("moveTargets:", req.body.move_targetCity); // ←ここ追加


  const generals = loadJSON("generals.json");
  const general = generals.find(g => g.id === req.session.generalId);
  if (!general) return res.redirect("/login");

  const commands = req.body.commands || {};
  const heisyuIds = req.body.tyouhei_heisyu || {};
  const counts = req.body.tyouhei_count || {};
const moveTargets = req.body.move_targetCity || {};
  const INTERVAL = 60 * 1000;

  // 秒固定
  if (general.fixedSecond === undefined) {
    general.fixedSecond = Math.floor(Math.random() * 60);
  }

  function getBaseTimeWithFixedSecond(fixedSecond) {
    const now = new Date();
    now.setSeconds(fixedSecond);
    now.setMilliseconds(0);

    if (now.getTime() <= Date.now()) {
      now.setMinutes(now.getMinutes() + 1);
    }

    return now.getTime();
  }

  // 🔥 完全に新しく作り直す
  let queue = [];

  let baseTime = getBaseTimeWithFixedSecond(general.fixedSecond);

  for (let i = 0; i < 60; i++) {
    const cmd = commands[i];
    if (!cmd) continue;

    baseTime += INTERVAL;

    let entry = {
      type: cmd,
      executed: false,
      executeAt: baseTime
    };


if (cmd === "move" || cmd === "move_safe") {
  entry.data = {
    targetCity: moveTargets[i] || null
  };

  console.log("セットされた都市:", i, entry.data.targetCity); // ★追加
}


    if (cmd === "tyouhei") {
      entry.data = {
        heisyuId: heisyuIds[i],
        count: Number(counts[i]) || 0
      };
    }

    queue.push(entry);
  }

  // 整形
  general.commandQueue = normalizeQueue(queue);

  saveJSON("generals.json", generals);
  res.redirect(`/user/${general.id}`);
});






function getRandomSecond() {
  return Math.floor(Math.random() * 60); // 0〜59
}

function getBaseTimeWithFixedSecond(fixedSecond) {
  const now = new Date();

  now.setSeconds(fixedSecond);
  now.setMilliseconds(0);

  // 過去なら次の分へ
  if (now.getTime() <= Date.now()) {
    now.setMinutes(now.getMinutes() + 1);
  }

  return now.getTime();
}





function getGameNow(general) {
  return Date.now();
}


function executeCommand(cmd, general, generals, cities) {
  if (!cmd || !cmd.type) return;

  const handler = commandHandlers[cmd.type];

  if (!handler) {
    console.log("未実装コマンド:", cmd.type);
    return;
  }

  try {
   handler.execute(general, cmd);
  } catch (err) {
    console.error("コマンド実行エラー:", err);
  }
}

function handleMoveAndBattle(attacker, city, log) {
  const defenders = generals.filter(g => g.defendingCity === city.id);

  if (defenders.length > 0) {
    const defender = defenders[0];

    log.push(`⚔️ ${attacker.name} が ${city.name} に出撃！`);
    log.push(`守備：${defender.name} と戦闘発生！`);

    const result = simulateBattle(attacker, defender);

    // ★修正①
    addBattleLog(attacker, result.log);
    addBattleLog(defender, result.log);

    // ★修正②
    if (result.winner === "attacker") {
      log.push(`🏆 ${attacker.name} の勝利！`);
    } else {
      log.push(`💀 ${attacker.name} の敗北…`);
    }

  } else {
    log.push(`${city.name} に到着（守備なし）`);
  }
}

function addBattleLog(general, logText) {
  if (!general.battleLog) general.battleLog = [];

  general.battleLog.unshift({
    message: logText,
    time: Date.now()
  });

  if (general.battleLog.length > 50) {
    general.battleLog.pop();
  }
}








// =========================
// ログアウト
// =========================
app.get("/logout", (req, res) => {

  req.session.destroy(err => {
    if (err) {
      console.log("ログアウトエラー:", err);
      return res.send("ログアウト失敗");
    }

    res.redirect("/login");
  });
});
const INTERVAL = 60 * 1000;

setInterval(() => {
  const generals = loadJSON("generals.json");

  generals.forEach(g => {
   processCommands(g, generals);
  });

  saveJSON("generals.json", generals); // ← これ追加
}, 1000); // デバッグ中は1秒がおすすめ


commandHandlers.declareWar = {
 execute: (general, cmd, generals) => {
    const countries = loadJSON("countries.json");

    const myCountry = countries.find(c => c.id === general.countryId);
    const target = countries.find(c => c.id === cmd.targetCountryId);

    if (!myCountry || !target) {
      return { success: false, message: "対象国が存在しない" };
    }

    if (!myCountry.wars) myCountry.wars = [];
    if (!target.wars) target.wars = [];

    // すでに戦争中なら何もしない
    if (myCountry.wars.includes(target.id)) {
      return { success: false, message: "すでに戦争中" };
    }

    myCountry.wars.push(target.id);
    target.wars.push(myCountry.id);

    saveJSON("countries.json", countries);

    // 🔥 全体ログ用
    return {
      success: true,
      message: `⚔️ ${myCountry.name} が ${target.name} に宣戦布告！`,
      global: true // ← これ重要
    };
  }
};

commandHandlers.move = require("./commands/move");


const skills = require('./data/skills.json');

app.get("/skills", (req, res) => {
  const generals = loadJSON("generals.json");

  const general = generals.find(g => g.id === req.session.generalId);

  if (!general) return res.redirect("/login");

  if (!general.skills) general.skills = [];
  if (!general.skillPoints) general.skillPoints = 0;

  res.render("skills", {
    general,
    skills
  });
});

app.post("/learn-skill", (req, res) => {
  const generals = loadJSON("generals.json");

  const general = generals.find(g => g.id === req.session.generalId);

  if (!general) return res.redirect("/login");

  if (!general.skills) general.skills = [];
  if (!general.skillPoints) general.skillPoints = 0;

  const skillId = req.body.skillId;
  const skill = skills[skillId];

  let message = "";

  if (!skill) {
    message = "スキルが存在しません";
  } else if (general.skills.includes(skillId)) {
    message = "習得済みです";
  } else if (skill.prev && !general.skills.includes(skill.prev)) {
    message = "前提スキルが必要です";
  } else if (general.skillPoints < skill.cost) {
    message = "ポイント不足";
  } else {
    general.skillPoints -= skill.cost;
    general.skills.push(skillId);
    message = `${skill.name}を習得しました`;
  }



  saveJSON("generals.json", generals);

  res.redirect("/skills");
});

app.post("/buy-skill-point", (req, res) => {
  const generals = loadJSON("generals.json");

  const general = generals.find(g => g.id === req.session.generalId);
  if (!general) return res.redirect("/login");

  // 初期化
  if (!general.skillPoints) general.skillPoints = 0;

  // デバッグ用：0円で+1
  general.skillPoints += 1;



  saveJSON("generals.json", generals);

  res.redirect("/skills");
});




function addGlobalLog(message) {
  const generals = loadJSON("generals.json");

  generals.forEach(g => {
    if (!g.commandLog) g.commandLog = [];

    g.commandLog.unshift({
      message,
      time: Date.now()
    });

    if (g.commandLog.length > 50) {
      g.commandLog.pop();
    }
  });

  saveJSON("generals.json", generals);
}

function addBattleLog(general, logArray) {
  if (!general.battleLog) general.battleLog = [];

  logArray.forEach(text => {
    general.battleLog.unshift({
      message: text,
      time: Date.now()
    });
  });

  // 最大件数制限
  while (general.battleLog.length > 50) {
    general.battleLog.pop();
  }
}









app.post("/declare-war", (req, res) => {
  const generals = loadJSON("generals.json");
  const countries = loadJSON("countries.json");

  const general = generals.find(g => g.id === req.session.generalId);
  if (!general) return res.redirect("/login");

  const myCountry = countries.find(c => c.id === general.countryId);
  const target = countries.find(c => c.id === req.body.targetCountryId);

  if (!myCountry || !target) {
    return res.send("国が見つかりません");
  }

  // 🔥 君主チェック
  if (myCountry.ruler !== general.name) {
    return res.send("君主のみ実行できます");
  }

  if (!myCountry.wars) myCountry.wars = [];
  if (!target.wars) target.wars = [];

  // すでに戦争中
  if (myCountry.wars.includes(target.id)) {
    return res.send("すでに戦争中です");
  }

  // 🔥 戦争開始
  myCountry.wars.push(target.id);
  target.wars.push(myCountry.id);

  saveJSON("countries.json", countries);

  // 🔥 全体ログ
  addGlobalLog(`⚔️ ${myCountry.name} が ${target.name} に宣戦布告しました！`);

  res.redirect(`/user/${general.id}`);
});







app.listen(3000, () => {
  console.log("http://localhost:3000/register でアクセスできます");

});