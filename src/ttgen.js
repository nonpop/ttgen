"use strict";

var ttgen = {};

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
            return ttgen.rawGetSymbols(tree.lvalue).concat(ttgen.rawGetSymbols(tree.rvalue));
        default:
            return undefined;
    }
};

