/**
 * Dice helpers for Cyberpunk RED tabletop simulation.
 * Interface checks: Interface + 1d10 vs DV
 * CRITICAL: game simulation only — no real RNG exploits.
 */

/**
 * Roll a single d10 (1–10).
 */
export function d10() {
  return Math.floor(Math.random() * 10) + 1;
}

/**
 * Interface skill check vs DV.
 * Official-style: Interface + 1d10 vs DV.
 * @returns {{ total, roll, interface, dv, success, criticalSuccess, criticalFail, text }}
 */
export function interfaceCheck(interfaceRank, dv) {
  const iface = Number(interfaceRank) || 0;
  const target = Number(dv) || 0;
  const roll = d10();
  const total = iface + roll;
  const success = total >= target;
  const criticalFail = roll === 1 && !success;
  const criticalSuccess = roll === 10 && success;

  let text = `ROLL: Interface ${iface} + d10(${roll}) = ${total} vs DV ${target} → ${success ? 'SUCCESS' : 'FAIL'}`;
  if (criticalSuccess) text += ' (NAT 10)';
  if (criticalFail) text += ' (NAT 1)';

  return {
    total,
    roll,
    interface: iface,
    dv: target,
    success,
    criticalSuccess,
    criticalFail,
    text,
  };
}

/**
 * Opposed SPEED-style check (Netrunner vs ICE).
 * HOMEBREW presentation: Interface + d10 vs ICE speed + d10.
 * Marked for verification against official Black ICE tables.
 */
export function speedCheck(netrunnerInterface, iceSpeed = 4) {
  const rRoll = d10();
  const iRoll = d10();
  const rTotal = (Number(netrunnerInterface) || 0) + rRoll;
  const iTotal = (Number(iceSpeed) || 0) + iRoll;
  const success = rTotal >= iTotal;
  return {
    success,
    runner: { roll: rRoll, total: rTotal },
    ice: { roll: iRoll, total: iTotal, speed: iceSpeed },
    text: `SPEED: You ${rTotal} (IF+${rRoll}) vs ICE ${iTotal} (SPD ${iceSpeed}+${iRoll}) → ${success ? 'AVOIDED' : 'HIT'}`,
  };
}
