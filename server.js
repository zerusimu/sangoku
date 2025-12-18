const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");

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

  const user = users.find(
    u => u.loginId === req.body.loginId && u.password === req.body.password
  );

  if (!user) return res.send("IDまたはパスワードが違います");

  // session 保存
  req.session.userId = user.id;
  req.session.generalId = user.generalId;

  res.redirect(`/user/${user.id}`);
});



app.get("/user/:id", (req, res) => {
  const users = loadJSON("users.json");
  const generals = loadJSON("generals.json");
  const countries = loadJSON("countries.json");

  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.send("ユーザーが存在しません");

  const general = generals.find(g => g.id === user.generalId);
  const country = countries.find(c => c.id === general.countryId);

  res.render("user", { user, general, country });
});


setInterval(() => {
  console.log("⏱ コマンド処理");

  const generals = loadJSON("generals.json");
  const cities = loadJSON("cities.json");

  const now = Date.now();

  generals.forEach(g => {
    if (!g.commandQueue || g.commandQueue.length === 0) return;

    // 1分に1回だけ
    if (now - g.lastExecuted < 60 * 1000) return;

    const command = g.commandQueue.shift(); // ★先頭を実行

    switch (command) {
      case "train":
        g.str += 1;
        break;

      case "develop":
        const city = cities.find(c => c.id === g.cityId);
        if (city) city.dev += 1;
        break;

      case "rest":
        // 何もしない
        break;
    }

    g.lastExecuted = now;
  });

  saveJSON("generals.json", generals);
  saveJSON("cities.json", cities);

}, 60 * 1000); // ★デバッグは1分



app.post("/command", (req, res) => {
  const generals = loadJSON("generals.json");
  const generalId = req.session.generalId;

  const general = generals.find(g => g.id === generalId);
  if (!general) return res.send("武将が存在しません");

  if (!general.commandQueue) general.commandQueue = [];

  // 上限60
  if (general.commandQueue.length >= 60) {
    return res.send("コマンドは最大60個までです");
  }

  general.commandQueue.push(req.body.command);

  saveJSON("generals.json", generals);

  res.redirect(`/user/${req.session.userId}`);
});





// =========================
// サーバー起動
// =========================
app.listen(3000, () => {
  console.log("http://localhost:3000/register でアクセスできます");
});
