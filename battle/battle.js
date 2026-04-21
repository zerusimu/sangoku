const { loadJSON } = require("../utils/json");
const skills = require("../data/skills.json");

// 兵種タイプ判定
function getType(id) {
  if (id.includes("infantry")) return "infantry";
  if (id.includes("cavalry")) return "cavalry";
  if (id.includes("archer")) return "archer";
  return "other";
}

function chance(percent) {
  return Math.random() * 100 < percent;
}






// 3すくみ補正
function getAdvantage(attackerType, defenderType) {
  if (
    (attackerType === "infantry" && defenderType === "cavalry") ||
    (attackerType === "cavalry" && defenderType === "archer") ||
    (attackerType === "archer" && defenderType === "infantry")
  ) {
    return 2; // 有利
  }
  return 0;
}

function simulateBattle(attacker, defender) {
  const heisyu = loadJSON("heisyu.json");

  const atkUnit = heisyu.find(h => h.id === attacker.army.type);
  const defUnit = heisyu.find(h => h.id === defender.army.type);

  const log = [];

  // =====================
  // 基本ステータス
  // =====================
  let atkPower = atkUnit.params.atk + Math.floor(attacker.str / 10);
  let atkDef = atkUnit.params.def + Math.floor(attacker.lea / 10)
   + Math.floor(attacker.kunren / 10)  ;

  let defPower = defUnit.params.atk + Math.floor(defender.str / 10);
  let defDef = defUnit.params.def + Math.floor(defender.lea / 10)
    + Math.floor(defender.kunren / 10) ;

  // 攻撃力差補正
  atkPower += Math.floor((attacker.str - defender.str) / 10);
  defPower += Math.floor((defender.str - attacker.str) / 10);

  // 最低1保証
  atkPower = Math.max(1, atkPower);
  defPower = Math.max(1, defPower);

  // =====================
  // 3すくみ
  // =====================
  const atkType = getType(attacker.army.type);
  const defType = getType(defender.army.type);

  const atkBonus = getAdvantage(atkType, defType);
  const defBonus = getAdvantage(defType, atkType);

  // =====================
  // 最大ダメージ
  // =====================
  const atkMax = Math.max(1, atkPower - defDef + atkBonus);
  const defMax = Math.max(1, defPower - atkDef + defBonus);

  // =====================
  // 初期ログ
  // =====================
  log.push(`⚔️ 戦闘開始`);
  log.push(`自分 攻撃:${atkPower} 防御:${atkDef}`);
  log.push(`相手 攻撃:${defPower} 防御:${defDef}`);
  log.push(`最大ダメージ 自:${atkMax} / 相:${defMax}`);

  let atkCount = attacker.army.count;
  let defCount = defender.army.count;

  let turn = 1;

  // =====================
  // 戦闘ループ
  // =====================
while (atkCount > 0 && defCount > 0) {

  let atkDamage = Math.floor(Math.random() * atkMax) + 1;
  let defDamage = Math.floor(Math.random() * defMax) + 1;

  // =====================
  // 忍術1（防御側ダメージ無効）
  // =====================
  if (defender.skills?.includes("ninzyutu1")) {
    const rate = defender.lea / 8;
    if (chance(rate)) {
      atkDamage = 0;
      log.push("🌀 忍術1発動！相手ダメージ無効！");
    }
  }

  // =====================
  // 忍術1（攻撃側も一応対応）
  // =====================
  if (attacker.skills?.includes("ninzyutu1")) {
    const rate = attacker.lea / 8;
    if (chance(rate)) {
      defDamage = 0;
      log.push("🌀 忍術1発動！自分ダメージ無効！");
    }
  }

  // =====================
  // ダメージ適用
  // =====================
  defCount -= atkDamage;
  atkCount -= defDamage;

  // =====================
  // 忍術3（反撃：防御側）
  // =====================
  if (defender.skills?.includes("ninzyutu3")) {
    const rate = defender.lea / 10;
    if (chance(rate)) {
      const counter = defDamage + atkDamage;
      atkCount -= counter;
      log.push(`⚡ 忍術3発動！反撃 ${counter}ダメージ！`);
    }
  }

  // =====================
  // ログ
  // =====================
  log.push(
    `${turn}ターン目 ▶ 自:${atkDamage}ダメ / 相:${defDamage}ダメ`
  );
  log.push(
    `残兵 ▶ 自:${Math.max(0, atkCount)} / 相:${Math.max(0, defCount)}`
  );

  turn++;
}

  // =====================
  // 勝敗
  // =====================
  let winner;

  if (atkCount <= 0 && defCount <= 0) {
    winner = "attacker"; // 相打ちは攻撃勝ち
  } else if (atkCount <= 0) {
    winner = "defender";
  } else {
    winner = "attacker";
  }

  log.push(
    winner === "attacker"
      ? "🏆 攻撃側の勝利！"
      : "💀 防御側の勝利！"
  );

// =====================
// 忍術2（戦闘後回復）
// =====================
const atkLost = attacker.army.count - Math.max(0, atkCount);
const defLost = defender.army.count - Math.max(0, defCount);

// 攻撃側
if (attacker.skills?.includes("ninzyutu2")) {
  const rate = 0.2 + Math.random() * 0.3;
  const heal = Math.floor(atkLost * rate);
  atkCount += heal;
  log.push(`🌿 忍術2発動！自軍 ${heal}回復`);
}

// 防御側
if (defender.skills?.includes("ninzyutu2")) {
  const rate = 0.2 + Math.random() * 0.3;
  const heal = Math.floor(defLost * rate);
  defCount += heal;
  log.push(`🌿 忍術2発動！敵軍 ${heal}回復`);
}







  return {
    winner,
    attackerRemaining: Math.max(0, atkCount),
    defenderRemaining: Math.max(0, defCount),
   log: log.join("\n") // ← 重要
  };
}

module.exports = { simulateBattle };