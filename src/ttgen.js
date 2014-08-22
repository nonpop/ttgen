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
    ++this.position;
    switch (next) {
        case "(":
            return { type: "lparen" };
        case ")":
            return { type: "rparen" };
        case "\\":
            return this.parseCommand();
        default:
            return this.parseIdentifier(next);
    }
};

ttgen.Tokenizer.prototype.parseIdentifier = function(first) {
    var res = first;
    while (this.position < this.input.length) {
        var next = this.input[this.position];
        if (next === "(" || next === ")" || next === "\\" || /\s/.test(next))
            break;
        
        res += next;
        ++this.position;
    }
    return { type: "id", value: res };
};

ttgen.Tokenizer.prototype.parseCommand = function() {
    var cmd = this.parseIdentifier("\\").value;
    switch (cmd) {
        case "\\land":
        case "\\wedge":
            return { type: "and" };
        case "\\lor":
        case "\\vee":
            return { type: "or" };
        case "\\lnot":
        case "\\neg":
            return { type: "not" };
        case "\\to":
            return { type: "implies" };
        case "\\leftrightarrow":
            return { type: "iff" };
        default:
            return { type: "id", value: cmd };
    }
};

