function recruit(general, heisyuId, count) {
  if (!general.soldiers) general.soldiers = {};

  general.soldiers[heisyuId] ||= 0;
  general.soldiers[heisyuId] += count;

  return {
    success: true,
    heisyuName: heisyuId
  };
}

module.exports = { recruit };
