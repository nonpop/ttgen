"use strict";

var ttgen = {};

ttgen.options = {
    reverseCols : false,
    reverseRows : false,
    trueSymbol : "1",
    falseSymbol : "0",
};

ttgen.Tokenizer = function(input) {
    this.input = input;
    this.position = 0;
};

ttgen.Tokenizer.prototype.next = function() {
    // skip whitespace
    while (this.position < this.input.length) {
        if (!/\s/.test(this.input[this.position]))
            break;
        ++this.position;
    }
    if (this.position >= this.input.length)
        return undefined;

    var next = this.input[this.position];
    var pos = this.position;
    ++this.position;
    switch (next) {
        case "(":
            return { type: "lparen", pos: pos };
        case ")":
            return { type: "rparen", pos: pos };
        case "\\":
            return this.parseCommand(pos);
        default:
            return this.parseIdentifier(next, pos);
    }
};

ttgen.Tokenizer.prototype.parseIdentifier = function(first, pos) {
    var res = first;
    while (this.position < this.input.length) {
        var next = this.input[this.position];
        if (next === "(" || next === ")" || next === "\\" || /\s/.test(next))
            break;
        
        res += next;
        ++this.position;
    }
    return { type: "id", value: res, pos: pos };
};

ttgen.Tokenizer.prototype.parseCommand = function(pos) {
    var cmd = this.parseIdentifier("\\", pos).value;
    switch (cmd) {
        case "\\land":
        case "\\wedge":
            return { type: "and", pos: pos };
        case "\\lor":
        case "\\vee":
            return { type: "or", pos: pos };
        case "\\lnot":
        case "\\neg":
            return { type: "not", pos: pos };
        case "\\to":
            return { type: "implies", pos: pos };
        case "\\leftrightarrow":
            return { type: "iff", pos: pos };
        case "\\mid":
        //case "\\uparrow":
            return { type: "nand", pos: pos };
        case "\\downarrow":
            return { type: "nor", pos: pos };
        default:
            return { type: "id", value: cmd, pos: pos };
    }
};

ttgen.parse = function(input, extra_outer) {
    if (extra_outer)
        input = "(" + input + ")";

    var tok = new ttgen.Tokenizer(input);
    var res = ttgen.parse_sub(tok);
    if (!res)
        return undefined;

    // Now there are four possibilites:
    // 1. parse succeeded and input is exhausted -> we're done
    // 2. parse succeeded but there is more in the input:
    // 2a. extra_outer is false -> try with extra outer parentheses
    // 2b. extra_outer is true -> another extra pair of parens won't help; fail
    // 3. parse failed -> extra parentheses won't help; we're doomed
    var next = tok.next();
    if (res.type === "error" || !next)
        return res;
    else {
        if (!extra_outer) {
            var res2 = ttgen.parse(input, true);
            if (res2.type === "error") {
                // we should adjust the position of error by -1 here; also in the error description...
                --res2.pos;
            }
            return res2;
        } else {
            --next.pos;
            return { type: "error", pos: next.pos, desc: "unexpected stuff at " + next.pos };
        }
    }
};


ttgen.parse_sub = function(tok) {
    var next = tok.next();
    if (!next)
        return undefined;

    switch (next.type) {
        case "lparen":
            return ttgen.parse_binop(tok);
        case "not":
            return ttgen.parse_not(tok);
        case "id":
            return { type: "id", value: next.value };
        default:
            return { type: "error", pos: next.pos, desc: "syntax error at " + next.pos };
    }
};

ttgen.parse_not = function(tok) {
    var sub = ttgen.parse_sub(tok);
    if (!sub || sub.type === "error")
        return sub;
    else
        return { type: "not", value: sub };
};

ttgen.parse_binop = function(tok) {
    var lsub = ttgen.parse_sub(tok);
    if (!lsub || lsub.type === "error")
        return lsub;

    var op = tok.next();
    switch (op.type) {
        case "and":
        case "or":
        case "implies":
        case "iff":
        case "nand":
        case "nor":
            break;
        default:
            return { type: "error", pos: op.pos, desc: "syntax error at " + op.pos };
    }
    var rsub = ttgen.parse_sub(tok);
    if (!rsub || rsub.type === "error")
        return rsub;

    var next = tok.next();  // eat ')'
    if (!next)
        return { type: "error", pos: tok.position, desc: "missing ) at " + tok.position };
    if (next.type !== "rparen")
        return { type: "error", pos: next.position, desc: "missing ) at " + next.position };

    return { type: op.type, lvalue: lsub, rvalue: rsub };
};

// remove duplicates from a sorted array
Array.prototype.uniq = function() {
    if (this.length === 0)
        return this;
    var res = [ this[0] ];
    for (var i = 1; i < this.length; ++i) {
        if (this[i-1] !== this[i])
            res.push(this[i]);
    }
    return res;
};

ttgen.getSymbols = function(tree) {
    return ttgen.rawGetSymbols(tree).sort().uniq();
};

ttgen.rawGetSymbols = function(tree) {
    switch (tree.type) {
        case "id":
            return [ tree.value ];
        case "not":
            return ttgen.rawGetSymbols(tree.value);
        case "and":
        case "or":
        case "implies":
        case "iff":
        case "nand":
        case "nor":
            return ttgen.rawGetSymbols(tree.lvalue).concat(ttgen.rawGetSymbols(tree.rvalue));
        default:
            return undefined;
    }
};

ttgen.getValuation = function(symbols, tableLine) {
    var res = {};
    for (var i = 0; i < symbols.length; ++i) {
        var col;
        if (!ttgen.options.reverseCols)
            col = i;
        else
            col = (symbols.length-1) - i;

        var bit = tableLine & (1 << col);
        if (ttgen.options.reverseRows)
            bit = !bit;

        res[symbols[i]] = bit? true : false;
    }
    return res;
};

ttgen.evaluate = function(tree, val) {
    switch (tree.type) {
        case "id":
            tree.truthValue = val[tree.value];
            break;
        case "not":
            ttgen.evaluate(tree.value, val);
            tree.truthValue = !tree.value.truthValue;
            break;
        case "and":
        case "or":
        case "implies":
        case "iff":
        case "nand":
        case "nor":
            ttgen.evaluate(tree.lvalue, val);
            ttgen.evaluate(tree.rvalue, val);
            var l = tree.lvalue.truthValue;
            var r = tree.rvalue.truthValue;
            var p;
            switch (tree.type) {
                case "and": p = l && r; break;
                case "or": p = l || r; break;
                case "implies": p = !l || r; break;
                case "iff": p = l === r; break;
                case "nand": p = !(l && r); break;
                case "nor": p = !(l || r); break;
            }
            tree.truthValue = p;
            break;
    }
};

String.prototype.repeat = function(n) {
    return new Array(n+1).join(this);
}

// To each node in the tree associate a property "par"
// which tells how many parentheses should be printed before/after
// this node. Negative "par" means print before, positive means print after.
ttgen.evaluateParens = function(tree) {
    var helper = function(tree, par) {
        switch (tree.type) {
            case "id":
                tree.par = par;
                break;

            case "not":
                if (par < 0) {
                    tree.par = par;
                    helper(tree.value, 0);
                } else {
                    tree.par = 0;
                    helper(tree.value, par);
                }
                break;

            case "and":
            case "or":
            case "implies":
            case "iff":
            case "nand":
            case "nor":
                tree.par = 0;
                if (par < 0) {
                    helper(tree.lvalue, par-1);
                    helper(tree.rvalue, 1);
                } else {
                    helper(tree.lvalue, -1);
                    helper(tree.rvalue, par+1);
                }
                break;
        }
    };
    helper(tree, 0);
};

ttgen.parHelper = function(par, s) {
    if (par < 0)
        return "(".repeat(-par) + s;
    if (par > 0)
        return s + ")".repeat(par);
    return s;
};

// TODO: extract common stuff from make*Table*
ttgen.makeLatexTableHeader = function(tree) {
    var res = "    " + ttgen.getSymbols(tree).join(" & ") + " ";

    ttgen.evaluateParens(tree);
    var treeToHdr = function(tree) {
        switch (tree.type) {
            case "id":
                return "& " + ttgen.parHelper(tree.par, tree.value) + " ";
            case "not":
                return "& " + ttgen.parHelper(tree.par, "\\lnot") + " " + treeToHdr(tree.value);
            case "and":
            case "or":
            case "implies":
            case "iff":
            case "nand":
            case "nor":
                var tmp = treeToHdr(tree.lvalue);
                tmp += "& ";
                switch (tree.type) {
                    case "and": tmp += "\\land"; break;
                    case "or": tmp += "\\lor"; break;
                    case "implies": tmp += "\\to"; break;
                    case "iff": tmp += "\\leftrightarrow"; break;
                    case "nand": tmp += "\\mid"; break;
                    case "nor": tmp += "\\downarrow"; break;
                }
                tmp += " ";
                tmp += treeToHdr(tree.rvalue);
                return tmp;
        }
    };
    res += treeToHdr(tree);
    return res;
};

ttgen.makeLatexTableRow = function(tree, line) {
    var res = "    ";
    var sym = ttgen.getSymbols(tree);
    var val = ttgen.getValuation(sym, line);
    var tmp = [];
    sym.forEach(function(s) {
        tmp.push(val[s]? ttgen.options.trueSymbol : ttgen.options.falseSymbol);
    });
    res += tmp.join(" & ") + " ";

    var entry = function(tree) {
        return "& " + (tree.truthValue? ttgen.options.trueSymbol : ttgen.options.falseSymbol) + " ";
    };

    ttgen.evaluate(tree, val);
    var helper = function(tree) {
        switch (tree.type) {
            case "id":
                return entry(tree);
            case "not":
                return entry(tree) + helper(tree.value);
            case "and":
            case "or":
            case "implies":
            case "iff":
            case "nand":
            case "nor":
                return helper(tree.lvalue) + entry(tree) + helper(tree.rvalue);

        }
    };
    res += helper(tree);
    return res;
};

ttgen.makeLatexTable = function(tree) {
    var res = "\\[\n  \\begin{array}";

    var sym = ttgen.getSymbols(tree);
    res += "{" + "c".repeat(sym.length) + "|";
    var treeSize = function(tree) {
        switch (tree.type) {
            case "id": return 1;
            case "not": return 1 + treeSize(tree.value);
            case "and":
            case "or":
            case "implies":
            case "iff":
            case "nand":
            case "nor":
                        return 1 + treeSize(tree.lvalue) + treeSize(tree.rvalue);
        }
    };
    res += "c".repeat(treeSize(tree)) + "}\n";
    res += ttgen.makeLatexTableHeader(tree);
    res += "\\\\\n    \\hline\n";
    
    for (var i = 0; i < Math.pow(2, sym.length); ++i) {
        res += ttgen.makeLatexTableRow(tree, i);
        if (i+1 < Math.pow(2, sym.length)) {
            res += "\\\\\n";
        } else {
            res += "\n";
        }
    }

    res += "  \\end{array}\n\\]";
    return res;
};


ttgen.parser2 = {
    // A very simple tokenizer. The parentheses '(' and ')'
    // and space ' ' are punctuation. The input is split into
    // identifiers separated by punctuation, and space is removed.
    // The return value is an array of objects { pos: x, str: y },
    // where y is a token (parenthesis or identifier) and x its
    // start position in the input.
    getTokens: function(string) {
        var len = string.length;
        var res = [];
        var i = 0;
        for (; i < len; ++i) {
            var c = string[i];
            if (c === "(" || c === ")") {
                res.push({ pos: i, str: string[i] });
            } else if (c !== " ") {
                var pos = i;
                for (; i < len; ++i) {
                    c = string[i];
                    if (c === " " || c === "(" || c === ")")
                        break;
                }
                res.push({ pos: pos, str: string.slice(pos, i) });
                --i;    // otherwise the ++i in the for loop skips the punctuation
            }
        }
        return res;
    },

    // In the following map the key is a connective and the value contains the
    // identifiers and truth function for that connective.
    tokenTypes: {
        "true": {
            ids: [ "TRUE", "1", "\\top" ],
            arity: 0,
            eval: function() { return true; }
        },
        "false": {
            cds: [ "FALSE", "0", "\\bot" ],
            arity: 0,
            eval: function() { return false; }
        },
        "not": {
            ids: [ "NOT", "!", "~", "\\lnot", "\\neg" ],
            arity: 1,
            eval: function(a) { return !a; }
        },
        "and": {
            ids: [ "AND", "&", "\\land", "\\wedge" ],
            arity: 2,
            eval: function(a, b) { return a && b; }
        },
        "or": {
            ids: [ "OR", "|", "\\lor", "\\vee" ],
            arity: 2,
            eval: function(a, b) { return a || b; }
        },
        "implies": {
            ids: [ "IMPLIES", "->", "=>", "\\to", "\\rightarrow", "\\Rightarrow", "\\implies" ],
            arity: 2,
            eval: function(a, b) { return !a || b; }
        },
        "iff": {
            ids: [ "IFF", "<->", "<=>", "\\leftrightarrow", "\\Leftrightarrow", "\\iff" ],
            arity: 2,
            eval: function(a, b) { return a === b; }
        },
        "nand": {
            ids: [ "NAND", "\\mid" ],
            arity: 2,
            eval: function(a, b) { return !(a && b); }
        },
        "nor": {
            ids: [ "NOR", "\\downarrow" ],
            arity: 2,
            eval: function(a, b) { return !(a || b); }
        },
        "xor": {
            ids: [ "XOR" ],
            arity: 2,
            eval: function(a, b) { return a !== b; }
        },
    },

    // Classifies a token by adding a 'type' property. Returns the modified token.
    classifyToken: function(token) {
        if (token.str === "(" || token.str === ")") {
            token.type = token.str;
        } else {
            $.each(this.tokenTypes, function(k, v) {
                if ($.inArray(token.str, v.ids) !== -1) {
                    token.type = k;
                    return false;   // break from $.each loop
                }
            });
            if (!token.type)
                token.type = "symbol";
        }
        return token;
    },

    // This function first tokenizes 'input', then classifies
    // the tokens, and finally adds extra outer parentheses if needed.
    // Returns the resulting list of tokens.
    // The position of the possible extra beginning parenthesis is -1.
    tokenize: function(input) {
        var tokens = this.getTokens(input);
        tokens.map(function(t) { ttgen.parser2.classifyToken(t); });

        // Since every binary connective needs a pair of parentheses
        // and nothing else does, we just count both and check if they match.
        var lparenCount = 0, binopCount = 0;
        $.each(tokens, function(i, t) {
            if (t.type === "(")
                ++lparenCount;
            else {
                var tokData = ttgen.parser2.tokenTypes[t.type];
                if (tokData && tokData.arity === 2)
                    ++binopCount;
            }
        });
        if (lparenCount < binopCount) {
            tokens.unshift({ pos: -1, str: "(", type: "(" });
            tokens.push({ pos: input.length, str: ")", type: ")" });
        }
        return tokens;
    }
};

