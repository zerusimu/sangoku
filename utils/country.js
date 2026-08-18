const { saveJSON } = require("./json");


// =====================
// 所有都市がない国を削除
// =====================
function cleanupCountries(countries, cities) {

  return countries.filter(country => {

    return cities.some(
      city => city.owner === country.id
    );

  });

}


// =====================
// 国滅亡チェック
// =====================
function checkCountryDestroyed(countryId, cities, generals, countries) {

  // その国の都市を取得
  const ownedCities = cities.filter(
    city => city.owner === countryId
  );

  // 都市が残っているなら何もしない
  if (ownedCities.length > 0) {
    return;
  }


  // =====================
  // 武将を無所属化
  // =====================
  generals.forEach(g => {

    if (g.countryId === countryId) {

      g.countryId = null;
      g.cityId = null;

      console.log(
        `${g.name} は無所属になった`
      );

    }

  });


  // =====================
  // 国を削除
  // =====================
  const index = countries.findIndex(
    country => country.id === countryId
  );

  if (index !== -1) {

    const destroyedCountry =
      countries[index];

    countries.splice(index, 1);

    console.log(
      `${destroyedCountry.name} は滅亡しました`
    );

  }


  // =====================
  // 保存
  // =====================
  saveJSON("countries.json", countries);
  saveJSON("generals.json", generals);

}


module.exports = {
  checkCountryDestroyed,
  cleanupCountries
};