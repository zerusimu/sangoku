const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");

const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

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

  res.render("createGeneral", {
    cities: citiesWithCountry
  });
});

// =========================
// 武将登録処理（士官 or 建国）
// =========================
app.post("/register", (req, res) => {
  const generals = loadJSON("generals.json");
  const countries = loadJSON("countries.json");
  const cities = loadJSON("cities.json"); // ← 追加

  const name = req.body.name;
  const str = Number(req.body.str);
  const int = Number(req.body.int);
  const lea = Number(req.body.lea);
  const cha = Number(req.body.cha);

  if (str + int + lea + cha !== 175) {
    return res.send("能力合計は175にしてください");
  }

  let countryId = null;

  // ===== 建国処理 =====
  if (req.body.countryName) {
    const countryIdNew = "country_" + Date.now();
    const capitalCityId = req.body.city;

    // 国を作成
    const newCountry = {
      id: countryIdNew,
      name: req.body.countryName,
      ruler: name,
      alive: true,
      cities: [capitalCityId]
    };
    countries.push(newCountry);

    // 🔥 都市の owner を設定
    const city = cities.find(c => c.id === capitalCityId);
    if (!city) return res.send("都市が見つかりません");

    city.owner = countryIdNew;

    countryId = countryIdNew;
  } 
  // ===== 士官処理 =====
  else if (req.body.joinCity) {
    const city = cities.find(c => c.id === req.body.joinCity);
    if (!city || !city.owner) {
      return res.send("士官先が不正です");
    }
    countryId = city.owner;
  }

  // ===== 武将作成 =====
  const newGeneral = {
    id: "general_" + Date.now(),
    name,
    str, int, lea, cha,
    countryId
  };

  generals.push(newGeneral);

  // ===== 保存 =====
  saveJSON("generals.json", generals);
  saveJSON("countries.json", countries);
  saveJSON("cities.json", cities); // ← これが超重要

  res.send("登録完了！<br><a href='/register'>戻る</a>");
});




app.get("/countries", (req, res) => {
  const countries = loadJSON("countries.json");
  const cities = loadJSON("cities.json");
  const generals = loadJSON("generals.json");

  // 国ごとに情報を合成
  const countryViews = countries.map(country => {
    return {
      ...country,
      cityList: cities.filter(c => country.cities.includes(c.id)),
      generals: generals.filter(g => g.countryId === country.id)
    };
  });

  res.render("countries", { countries: countryViews });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  const generals = loadJSON("generals.json");

  const { loginId, password } = req.body;

  const general = generals.find(
    g => g.loginId === loginId && g.password === password
  );

  if (!general) {
    return res.send("IDまたはパスワードが違います");
  }

  // ログイン成功 → 個人画面へ
  res.redirect(`/general/${general.id}`);
});


app.get("/general/:id", (req, res) => {
  const generals = loadJSON("generals.json");
  const countries = loadJSON("countries.json");

  const general = generals.find(g => g.id === req.params.id);
  if (!general) return res.send("武将が存在しません");

  const country = countries.find(c => c.id === general.countryId);

  res.render("general", { general, country });
});






// =========================
// サーバー起動
// =========================
app.listen(3000, () => {
  console.log("http://localhost:3000/register でアクセスできます");
});
