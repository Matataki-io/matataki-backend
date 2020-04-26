'use strict';

const Service = require('egg').Service;

const tokenizeRules = [
    {
        regexp: /[^\[]+/mg,
        block: 'text',
    },
    {
        regexp: /^\[read[^\]]+\](?!\()/mg,
        block: 'readOpen',
    },
    {
        regexp: /^\[\/read\](?!\()/mg,
        block: 'readClose',
    },
    {
        regexp: /^\[else\](?!\()/mg,
        block: 'else',
    },
    {
        regexp: /\[/mg,
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

        if (lookseq(tokenized, α, 'readOpen', 'text', 'readClose')) {
            β.push({
                block: 'read',
                innerText: tokenized[α + 1].value,
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
        β.push(tokenized[α]);
        α++;
    }
    return β;
}

function attrBoolean(val, def) {
    return val
        ? val === 'false' || val === '0' || val === 'null' || val === 'undefined'
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

/*
async function showBalance(user,mines,balanceOf) {
  let α = `${user} have `;
  α += await balanceOf(user,mines[0].token);
  α += mines[0].token;
  return α;
}
*/

async function execute(ast, { userId, balanceOf }) {
    let α = 0,
        β = '';
    while (α < ast.length) {
        if (ast[α].block === 'read') {
            const hide = attrBoolean(ast[α].attributes.hide, false);
            const hold = attrMines(ast[α].attributes.hold);
            const innerText = ast[α].innerText;
            const elseText = hide ? '' : markHold(hold, ast[α].elseText);
            β += userId && await holdMines(userId, hold, balanceOf) ? innerText : elseText;
            α++;
            continue;
        }
        β += ast[α].value;
        α++;
    }
    return β;
}

function markHold(hold, elseText) {
    return elseText ? elseText :
        (`持有足够Fan票后解锁本段内容 (` +
            hold.map(({ token, amount }) => `${amount / 10000} ${token}`).join(' ') + `)\n`)
}

class ExtMarkdown extends Service {
    transform(content, { userId }) {
        return execute(this.fromIpfs(content), {
            userId,
            balanceOf: async (user, symbol) =>
                this.service.token.mineToken.balanceOf(user,
                    (await this.service.token.mineToken.getToken({ symbol })).id)
        });
    }
    async shortContent(content) {
        return (await this.transform(content, { userId: null })).substring(0, 300);
    }
    toIpfs(content) {
        const parsed = parse(content);
        let α = 0, β = '';
        while (α < parsed.length) {
            if (parsed[α].block == 'read') {
                const hide = attrBoolean(parsed[α].attributes.hide, false);
                const holdCond = parsed[α].attributes.hold ?
                    parsed[α].attributes.hold : '';
                const hold = attrMines(parsed[α].attributes.hold);
                const elseText = hide ? '\n' : markHold(hold, parsed[α].elseText);
                β += `[read hold="${holdCond}" hide="${hide}"]`
                    + JSON.stringify(this.service.cryptography.encrypt(parsed[α].innerText))
                    + `\n[else]` + elseText + `[/read]`;
                α++; continue;
            }
            β += parsed[α].value;
            α++;
        }
        return β;
    }

    fromIpfs(content) {
        const parsed = parse(content);
        let α = 0;
        while (α < parsed.length) {
            if (parsed[α].block == 'text') {
                α++; continue;
            }
            if (parsed[α].block == 'read') {
                let innerText;
                try {
                    innerText = this.service.cryptography.decrypt(
                        JSON.parse(parsed[α].innerText));
                } catch (err) {
                    α++; continue;
                }
                parsed[α].innerText = innerText;
                α++; continue;
            }
            α++;
        }
        return parsed;
    }

    toEdit(content) {
        const parsed = parse(content);
        let α = 0, β = '';
        while (α < parsed.length) {
            if (parsed[α].block == 'read') {
                const hide = attrBoolean(parsed[α].attributes.hide, false);
                const holdCond = parsed[α].attributes.hold ?
                    parsed[α].attributes.hold : '';
                const hold = attrMines(parsed[α].attributes.hold);
                const elseText = hide ? '\n' : markHold(hold, parsed[α].elseText);
                let innerText = parsed[α].innerText;
                try {
                    innerText = this.service.cryptography.decrypt(
                        JSON.parse(parsed[α].innerText));
                } catch (err) {
                }
                β += `[read hold="${holdCond}" hide="${hide}"]`
                    + innerText
                    + `[else]` + elseText + `[/read]`;
                α++; continue;
            }
            β += parsed[α].value;
            α++;
        }
        return β;
    }
}

module.exports = ExtMarkdown;