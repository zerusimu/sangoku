const { saveJSON } = require("./json");




function cleanupCountries(countries, cities) {

  return countries.filter(country => {

    return cities.some(
      city => city.owner === country.id
    );
  });
}






function checkCountryDestroyed(countryId, cities, generals) {

  // その国の都市を取得
  const ownedCities = cities.filter(
    city => city.owner === countryId
  );

  // 都市が残っているなら終了
  if (ownedCities.length > 0) return;

  // 武将を無所属化
  generals.forEach(g => {

    if (g.countryId === countryId) {

      g.countryId = null;
      g.cityId = null;

      console.log(`${g.name} は無所属になった`);
    }
  });

  console.log(`${countryId} は滅亡しました`);

  saveJSON("generals.json", generals);
}

module.exports = {
  checkCountryDestroyed,
  cleanupCountries
};