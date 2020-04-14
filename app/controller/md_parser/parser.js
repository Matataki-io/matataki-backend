'use strict';
const tokenizeRules = [
  {
    regexp: /[^\[]+/g,
    block: 'text',
  },
  {
    regexp: /\[read[^\]]+\](?!\()/g,
    block: 'readOpen',
  },
  {
    regexp: /\[\/read\](?!\()/g,
    block: 'readClose',
  },
  {
    regexp: /\[else\](?!\()/g,
    block: 'else',
  },
  {
    regexp: /\[/g,
    block: 'text',
  },
];

function regMatch(str, reg, pos) {
  reg.lastIndex = pos;
  const $ = reg.exec(str);
  return $ && $.index === pos ? $ : null;
}

function tokenize(text) {
  let α = 0,
    β = [];
  while (α < text.length) {
    for (const { regexp, block } of tokenizeRules) {
      const $ = regMatch(text, regexp, α);
      if ($) {
        α = regexp.lastIndex;
        β.push({ block, value: $[0] });
        break;
      }
    }
  }
  return β;
}

function look(tokens, n, type) {
  return tokens[n] && tokens[n].block === type;
}
function lookseq(tokens, n, ...types) {
  let α = 0;
  while (α < types.length) {
    if (!look(tokens, n + α, types[α])) return false;
    α++;
  }
  return true;
}

function mergeTextBlocks(tokens) {
  let α = 0,
    β = [];
  while (α < tokens.length) {
    if (!look(tokens, α, 'text')) {
      β.push(tokens[α]);
      α++;
      continue;
    }
    if (look(β, β.length - 1, 'text')) {
      β[β.length - 1].value += tokens[α].value;
      α++;
      continue;
    }
    β.push(tokens[α]);
    α++;
  }
  return β;
}

function parseReadOpen(readOpen) {
  const reg = /(\w+)\s*=\s*"([^"]*)"/g;
  let β = {};
  let $ = reg.exec(readOpen.value);
  while ($ != null) {
    β[$[1]] = $[2];
    $ = reg.exec(readOpen.value);
  }
  return β;
}

function parse(text) {
  let tokenized = mergeTextBlocks(tokenize(text));
  let α = 0,
    β = [];
  while (α < tokenized.length) {
    if (look(tokenized, α, 'text')) {
      β.push(tokenized[α]);
      α++;
      continue;
    }
    if (lookseq(tokenized, α, 'readOpen', 'text', 'readClose')) {
      β.push({
        block: 'read',
        innerText: tokenized[α + 1].value,
        elseText: "You don't have enough fan tickets to see this.",
        attributes: parseReadOpen(tokenized[α]),
      });
      α += 3;
      continue;
    }
    if (
      lookseq(tokenized, α, 'readOpen', 'text', 'else', 'text', 'readClose')
    ) {
      β.push({
        block: 'read',
        innerText: tokenized[α + 1].value,
        elseText: tokenized[α + 3].value,
        attributes: parseReadOpen(tokenized[α]),
      });
      α += 5;
      continue;
    }

    α++;
  }
  return β;
}

function attrBoolean(val, def) {
  return val
    ? val === 'false' || val === '0' || val === 'null'
      ? false
      : true
    : def;
}

function attrMines(val) {
  const reg = /([A-Z]+)\s*(\d*\.?\d*)/g;
  let β = [];
  if (val) {
    let $ = reg.exec(val);
    while ($ != null) {
      β.push({ token: $[1], amount: Number($[2]) * 10000 });
      $ = reg.exec(val);
    }
  }
  return β;
}

async function holdMines(user, mines, balanceOf) {
  let α = 0;
  while (α < mines.length) {
    const money = await balanceOf(user, mines[α].token);
    if (money < mines[α].amount) return false;
    α++;
  }
  return true;
}


async function showBalance(user,mines,balanceOf) {
  let α = "you have ";
  α += await balanceOf(user,mines[0].token);
  α += mines[0].token;
  return α;
}

async function execute(ast, { userId, balanceOf }) {
  let α = 0,
    β = '';
  while (α < ast.length) {
    if (ast[α].block === 'text') {
      β += ast[α].value;
      α++;
      continue;
    }
    if (ast[α].block === 'read') {
      const hide = attrBoolean(ast[α].attributes.hide, false);
      const hold = attrMines(ast[α].attributes.hold);
      const innerText = ast[α].innerText;
      const elseText = await showBalance(userId,hold,balanceOf);
      β += await holdMines(userId, hold, balanceOf) ? innerText : elseText;
    }
    α++;
    continue;
  }
  return β;
}

module.exports = {
  parse,
  execute,
};
/*
console.log(execute(parse('[read hold="LINK 1"]test [else] 2[/read]'),
{userId:111,balanceOf:(id,token) => 10000}));
console.log(execute(parse('[read hold="LINK 1"]test [else] 2[/read]'),
{userId:111,balanceOf:(id,token) => 1}));

*/
