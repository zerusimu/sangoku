function setDefense(city, general, count) {
  if (general.army.count < count) return false;

  general.army.count -= count;

  const d = city.defenders.find(d => d.generalId === general.id);
  if (d) d.count += count;
  else city.defenders.push({ generalId: general.id, count });

  return true;
}

module.exports = { setDefense };
