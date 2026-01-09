function recruit(general, heisyuId, count) {
  general.army = {
    type: heisyuId,
    count: (general.army?.count || 0) + count
  };
}

module.exports = { recruit };
