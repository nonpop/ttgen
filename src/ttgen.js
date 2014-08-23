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

ttgen.Parser = function(tok) {
    this.tok = tok;
};

