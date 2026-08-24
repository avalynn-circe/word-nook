/**
 * Re-derive every level through the shipped rules. Run with `npm test`.
 */
const path = require('path');
const G = require(path.join(__dirname, '..', '.probe', 'game.js'));

let bad = 0;
const fail = (...a) => { bad++; console.log('FAIL', ...a); };

console.log(`${G.LEVEL_COUNT} levels, ${G.DICTIONARY.size} dictionary words`);

for (const lv of G.LEVELS) {
  const id = `level ${lv.index + 1}`;
  const empty = new Set();

  // the letter wheel must be exactly the longest word's letters
  const longest = Math.max(...lv.words.map(w => w.word.length));
  if (lv.letters.length !== longest) fail(id, 'wheel size does not match longest word');

  for (const w of lv.words) {
    if (!G.buildable(w.word, lv.letters)) fail(id, w.word, 'not buildable from the wheel');
    if (!G.DICTIONARY.has(w.word)) fail(id, w.word, 'not in the dictionary');
    for (const c of G.cellsOf(w)) {
      if (c.row < 0 || c.col < 0 || c.row >= lv.rows || c.col >= lv.cols) {
        fail(id, w.word, 'runs off the sheet');
      }
    }
    // every sheet word must be accepted, and rejected as a repeat second time
    const v1 = G.judge(lv, w.word, empty, empty);
    if (v1.kind !== 'onSheet') fail(id, w.word, `judged ${v1.kind}, expected onSheet`);
    const v2 = G.judge(lv, w.word, new Set([w.word]), empty);
    if (v2.kind !== 'already') fail(id, w.word, `repeat judged ${v2.kind}`);
  }

  // crossing squares must agree on their letter
  const s = G.sheet(lv);
  for (const w of lv.words) {
    for (const c of G.cellsOf(w)) {
      const cell = s.get(G.cellKey(c.row, c.col));
      if (!cell || cell.letter !== c.letter) fail(id, 'letters clash at', c.row, c.col);
    }
  }

  // solving everything must complete the level and reveal every square
  const all = new Set(lv.words.map(w => w.word));
  if (!G.isComplete(lv, all)) fail(id, 'not complete after solving every word');
  if (G.revealed(lv, all, empty).size !== s.size) fail(id, 'squares left hidden');
  if (G.hintTargets(lv, all, empty).length !== 0) fail(id, 'hints offered on a solved sheet');
  if (G.hintTargets(lv, empty, empty).length !== s.size) fail(id, 'hint targets != sheet size');

  // the celebration must fire exactly once, on the word that finishes the sheet
  {
    const so_far = new Set();
    let fired = 0;
    for (const w of lv.words) {
      so_far.add(w.word);
      if (G.isComplete(lv, so_far)) fired++;
    }
    if (fired !== 1) fail(id, `win condition fired ${fired} times, expected 1`);
    // and never before the last word
    const allButOne = new Set(lv.words.slice(0, -1).map(w => w.word));
    if (G.isComplete(lv, allButOne)) fail(id, 'win fired with a word still missing');
  }

  // rubbish must be rejected
  for (const junk of ['zzz', 'qq', '', 'aaaaaaaa']) {
    const v = G.judge(lv, junk, empty, empty);
    if (v.kind === 'onSheet' || v.kind === 'bonus') fail(id, `accepted "${junk}"`);
  }
}

// bonus words: real, buildable, and not already on the sheet
let bonusTotal = 0;
for (const lv of G.LEVELS) {
  const bonus = G.allBonusWords(lv);
  bonusTotal += bonus.length;
  const onSheet = new Set(lv.words.map(w => w.word));
  for (const b of bonus) {
    if (onSheet.has(b)) fail(`level ${lv.index + 1}`, b, 'bonus word is on the sheet');
    if (!G.buildable(b, lv.letters)) fail(`level ${lv.index + 1}`, b, 'bonus not buildable');
    const v = G.judge(lv, b, new Set(), new Set());
    if (v.kind !== 'bonus') fail(`level ${lv.index + 1}`, b, `judged ${v.kind}`);
  }
}
console.log(`${Math.round(bonusTotal / G.LEVEL_COUNT)} bonus words available per level on average`);
console.log(bad ? `${bad} FAILURES` : 'all clear');
process.exit(bad ? 1 : 0);
