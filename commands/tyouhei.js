const { recruit } = require("../logic/army");
const heisyuList = require("../data/heisyu.json");
const { getRankExp, applyRankExp } = require("../utils/rankSystem");


function getRankIndex(rank) {
  const order = ["D", "C", "B", "A", "S"];
  return order.indexOf(rank);
}

function getRankByPoint(point) {
  if (point >= 20000) return "S";
  if (point >= 15000) return "A";
  if (point >= 10000) return "B";
  if (point >= 5000) return "C";
  return "D";
}


module.exports = {
  execute(general, cmd) {

// ★ 最初に経験値
const exp = getRankExp("tyouhei");
applyRankExp(general, exp);


    console.log("cmd:", cmd);

    const data = cmd.data || {
      heisyuId: cmd.detail,
      count: cmd.count
    };



    
    if (!data || !data.heisyuId || Number(data.count) <= 0) {
      return {
        success: false,
        message: "徴兵データ不足"
      };
    }

    // ★ 兵種ID → 日本語名
    const heisyu = heisyuList.find(
      h => h.id === String(data.heisyuId).trim()
    );

    const heisyuName = heisyu
      ? heisyu.name
      : data.heisyuId;

    const addCount = Number(data.count);

const playerRankIndex = Math.floor(general.rankPoint / 5000) + 1;
const heisyuRankIndex = heisyu.requiredRank;

const req = heisyu.requirements || {};

if (req.str && general.str < req.str) {
  return { success: false, message: "武力が足りない" };
}

if (req.int && general.int < req.int) {
  return { success: false, message: "知力が足りない" };
}

if (req.lea && general.lea < req.lea) {
  return { success: false, message: "統率が足りない" };
}

if (req.cha && general.cha < req.cha) {
  return { success: false, message: "魅力が足りない" };
}

const maxReserveRank = playerRankIndex + 1;

if (heisyuRankIndex > maxReserveRank) {
  return {
    success: false,
    message: "この兵種は予約もできない"
  };
}

// 🔶 予約状態（まだ徴兵できない）
if (cmd.isReserve) {
  return {
    success: false,
    message: "ランクが足りません"
  };
}



// 予約
if (heisyuRankIndex > playerRankIndex) {
  return {
    success: true,
    isReserve: true,
  };
}




    // =========================
    // 🔥 ここから追加ロジック
    // =========================




    
    // 初期化（念のため）
    if (!general.army) {
      general.army = {
        type: data.heisyuId,
        count: 0
      };
    }

    // 🔥 兵種変更ならリセット
    if (general.army.type !== data.heisyuId) {
      general.army = {
        type: data.heisyuId,
        count: 0
      };
    }

    const max = general.lea; // 統率が上限
    const current = general.army.count;

    // 上限考慮
    const canAdd = Math.min(addCount, max - current);

    if (canAdd <= 0) {
      return {
        success: false,
        message: `これ以上徴兵できない（最大 ${max}）階級ポイント＋${exp}`
      };
    }

    // =========================
    // 既存のrecruit処理
    // =========================
    const result = recruit(
      general,
      data.heisyuId,
      canAdd
    );

    if (!result.success) {
      return {
        success: false,
        message: result.reason || "徴兵失敗"
      };
    }

    // 🔥 最終的な兵数更新
    general.army.type = data.heisyuId;
    general.army.count += canAdd;
    const loss =  Math.max(0, general.kunren - canAdd );
general.kunren = loss;
    return {
      success: true,
      message: `${heisyuName} を ${canAdd} 人徴兵（${general.army.count}/${max}） 訓練値-${loss} 階級ポイント＋${exp}`
    };
  }
};