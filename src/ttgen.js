"use strict";

var ttgen = {};

ttgen.options = {
    reverseCols: false,
    reverseRows: false,
    trueSymbol: "1",
    falseSymbol: "0"
};

ttgen.parser = {
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
            ids: [ "FALSE", "0", "\\bot" ],
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
            ids: [ "NAND", "\\mid", "\\uparrow" ],
            arity: 2,
            eval: function(a, b) { return !(a && b); }
        },
        "nor": {
            ids: [ "NOR", "\\downarrow" ],
            arity: 2,
            eval: function(a, b) { return !(a || b); }
        },
        "xor": {
            ids: [ "XOR", "\\oplus" ],
            arity: 2,
            eval: function(a, b) { return a !== b; }
        }
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
        tokens.map(function(t) { ttgen.parser.classifyToken(t); });

        // Since every binary connective needs a pair of parentheses
        // and nothing else does, we just count both and check if they match.
        var lparenCount = 0, binopCount = 0;
        $.each(tokens, function(i, t) {
            if (t.type === "(")
                ++lparenCount;
            else {
                var tokData = ttgen.parser.tokenTypes[t.type];
                if (tokData && tokData.arity === 2)
                    ++binopCount;
            }
        });
        if (lparenCount < binopCount) {
            tokens.unshift({ pos: -1, str: "(", type: "(" });
            tokens.push({ pos: input.length, str: ")", type: ")" });
        }
        return tokens;
    },

    // Builds the syntax tree for the given tokens, if possible.
    // - A node in the tree is an object with a property "type" which is either "symbol",
    //   "error", or a key into tokenTypes.
    // - If type is "symbol", then the node has a property "name" which is the name
    //   (identifier in the input) of the symbol.
    // - If type is "error", then "token" is the erroneous token, and "desc" a string 
    //   describing the error.
    // - If type describes a unary connective, then "sub" is a subtree.
    // - If type describes a binary connective, then "lsub" and "rsub" are subtrees.
    // - The nodes also have a "str" property which is the string the user gave for
    //   the connective (for symbols str === name).
    // Returns the root of the finished tree, or an error object.
    buildSyntaxTree: function(tokens) {
        // Parse a subexpression. Returns { newIdx, tree } or { null, error }.
        // newIdx is one past the end of the parsed subexpression.
        var recursiveBuildTree = function(tokIdx) {
            if (tokIdx >= tokens.length)
                return { newIdx: null, tree: { type: "error", token: null, desc: "unexpected end of input" } };

            var token = tokens[tokIdx];
            if (token.type === ")") {
                // does not begin an expression
                return { newIdx: null, tree: { type: "error", token: token, desc: "unexpected ')' at " + token.pos } };
            } else if (token.type === "symbol") {
                // a single proposition symbol
                return { newIdx: tokIdx + 1, tree: { type: "symbol", name: token.str, str: token.str } };
            } else if (token.type === "(") {
                // a binary connective
                var lsub = recursiveBuildTree(tokIdx + 1);
                if (!lsub.newIdx)    // could not parse subexpression
                    return lsub;

                if (lsub.newIdx >= tokens.length)
                    return { newIdx: null, tree: { type: "error", token: null, desc: "unexpected end of input" } };

                var connective = tokens[lsub.newIdx];
                if (!ttgen.parser.tokenTypes[connective.type] || ttgen.parser.tokenTypes[connective.type].arity !== 2)
                    return { newIdx: null, tree: { type: "error", token: connective,
                        desc: "expected binary connective at " + connective.pos + " but got '" + connective.str + "'" } };

                var rsub = recursiveBuildTree(lsub.newIdx + 1);
                if (!rsub.newIdx)
                    return rsub;

                if (rsub.newIdx >= tokens.length || tokens[rsub.newIdx].type !== ")")
                    return { newIdx: null, tree: { type: "error", token: null, desc: "expected ')' at " + rsub.newIdx } };

                return { newIdx: rsub.newIdx + 1, tree: {
                    type: connective.type, lsub: lsub.tree, rsub: rsub.tree, str: connective.str } };
            } else {
                // a nullary or unary connective
                var arity = ttgen.parser.tokenTypes[token.type].arity;
                if (arity === 0) {
                    return { newIdx: tokIdx+1, tree: { type: token.type, str: token.str } };
                } else if (arity === 1) {
                    var sub = recursiveBuildTree(tokIdx + 1);
                    if (!sub.newIdx)
                        return sub;
                    else
                        return { newIdx: sub.newIdx, tree: { type: token.type, sub: sub.tree, str: token.str } };
                } else {
                    return { newIdx: null, tree: { type: "error", token: token,
                        desc: "unexpected binary connective '" + token.str + "' at " + token.pos } };
                }
            }
        };

        var tree = recursiveBuildTree(0);
        if (!tree.newIdx) {
            // parse failed
            return tree.tree;
        } else if (tree.newIdx < tokens.length) {
            // there is still input left
            var token = tokens[tree.newIdx];
            return { type: "error", token: token, desc: "unexpected '" + token.str + "' at " + token.pos };
        } else {
            // succeeded
            return tree.tree;
        }
    },

    parse: function(input) {
        var tokens = this.tokenize(input);
        if (tokens.length === 0)
            return null;
        return this.buildSyntaxTree(tokens);
    }
};

// remove duplicates from a sorted array
Array.prototype.uniq = function() {
    if (this.length === 0)
        return this;
    var res = [ this[0] ];
    for (var i = 1; i < this.length; ++i) {
        if (this[i - 1] !== this[i])
            res.push(this[i]);
    }
    return res;
};

// repeat a string
String.prototype.repeat = function(n) {
    return new Array(n + 1).join(this);
}

ttgen.evaluator = {
    // return a sorted set of all the symbols in tree
    getSymbols: function(tree) {
        function recursiveGetSymbols(tree) {
            switch (tree.type) {
                case "symbol":
                    return [ tree.name ];
                case "true":
                case "false":
                    return [];
                case "not":
                    return recursiveGetSymbols(tree.sub);
                default:
                    return recursiveGetSymbols(tree.lsub).concat(recursiveGetSymbols(tree.rsub));
            }
        }
        return recursiveGetSymbols(tree).sort().uniq();
    },

    // Assign a truth value to each symbol in "symbols",
    // according to which tableRow we are considering.
    getValuation: function(symbols, tableRow) {
        var res = {};
        for (var i = 0; i < symbols.length; ++i) {
            var col;
            if (!ttgen.options.reverseCols)
                col = i;
            else
                col = (symbols.length - 1) - i;

            // TODO: how compatible are these bit operations?
            var bit = tableRow & (1 << col);
            if (ttgen.options.reverseRows)
                bit = !bit;

            res[symbols[i]] = bit? true : false;
        }
        return res;
    },

    // Add a "value" property to each node in "tree" describing
    // the truth of each subtree accoring to "val".
    evaluate: function(tree, val) {
        if (tree.type === "symbol") {
            tree.value = val[tree.name];
        } else {
            var tokenData = ttgen.parser.tokenTypes[tree.type];
            if (tokenData.arity === 0) {
                tree.value = tokenData.eval();
            } else if (tokenData.arity === 1) {
                this.evaluate(tree.sub, val);
                tree.value = tokenData.eval(tree.sub.value);
            } else {
                // arity === 2
                this.evaluate(tree.lsub, val);
                this.evaluate(tree.rsub, val);
                tree.value = tokenData.eval(tree.lsub.value, tree.rsub.value);
            }
        }
    }
};

ttgen.tablegen = {
    // To each node in the tree associate a property "par"
    // which tells how many parentheses should be printed before/after
    // this node. Negative "par" means print before, positive means print after.
    evaluateParens: function(tree) {
        var recursiveEvaluateParens = function(tree, par) {
            switch (tree.type) {
                case "symbol":
                case "true":
                case "false":
                    tree.par = par;
                    break;

                case "not":
                    if (par < 0) {
                        tree.par = par;
                        recursiveEvaluateParens(tree.sub, 0);
                    } else {
                        tree.par = 0;
                        recursiveEvaluateParens(tree.sub, par);
                    }
                    break;

                default:
                    tree.par = 0;
                    if (par < 0) {
                        recursiveEvaluateParens(tree.lsub, par - 1);
                        recursiveEvaluateParens(tree.rsub, 1);
                    } else {
                        recursiveEvaluateParens(tree.lsub, -1);
                        recursiveEvaluateParens(tree.rsub, par + 1);
                    }
                    break;
            }
        };
        recursiveEvaluateParens(tree, 0);
    },

    // Attach "par" parens to "str"
    parStr: function(par, str) {
        if (par < 0)
            return "(".repeat(-par) + str;
        if (par > 0)
            return str + ")".repeat(par);
        return str;
    },

    // TODO: extract common stuff from make*Table*
    makeLatexTableHeader: function(tree) {
        var res = "    " + ttgen.evaluator.getSymbols(tree).join(" & ") + " ";

        // map input token to latex version
        var entry = function(tree) {
            switch (tree.type) {
                case "true": return tree.str;
                case "false": return tree.str;
                case "not": return "\\lnot";
                case "and": return "\\land";
                case "or": return "\\lor";
                case "implies":
                    if (tree.str === "=>" ||
                            tree.str === "\\Rightarrow" ||
                            tree.str === "\\implies")
                    { return "\\Rightarrow"; }
                    else return "\\to";
                case "iff":
                    if (tree.str === "<=>" ||
                            tree.str === "\\Leftrightarrow" ||
                            tree.str === "\\iff")
                    { return "\\Leftrightarrow"; }
                    else return "\\leftrightarrow";
                case "nand":
                    if (tree.str === "\\uparrow")
                        return "\\uparrow";
                    else
                        return "\\mid";
                case "nor": return "\\downarrow";
                case "xor": return "\\oplus";
            }
        };

        this.evaluateParens(tree);
        var treeToHdr = function(tree) {
            if (tree.type === "symbol")
                return "& " + ttgen.tablegen.parStr(tree.par, tree.str) + " ";
            else if (tree.type === "true" || tree.type === "false")
                return "& " + ttgen.tablegen.parStr(tree.par, entry(tree)) + " ";
            else if (tree.type === "not")
                return "& " + ttgen.tablegen.parStr(tree.par, entry(tree)) + " " + treeToHdr(tree.sub);
            else
                return treeToHdr(tree.lsub) + "& " + entry(tree) + " " + treeToHdr(tree.rsub);
        };
        res += treeToHdr(tree);
        return res;
    },

    makeLatexTableRow: function(tree, row) {
        var res = "    ";
        var sym = ttgen.evaluator.getSymbols(tree);
        var val = ttgen.evaluator.getValuation(sym, row);
        var tmp = [];
        $.each(sym, function(i, s) {
            tmp.push(val[s]? ttgen.options.trueSymbol : ttgen.options.falseSymbol);
        });
        res += tmp.join(" & ") + " ";

        var entry = function(tree) {
            return "& " + (tree.value? ttgen.options.trueSymbol : ttgen.options.falseSymbol) + " ";
        };

        ttgen.evaluator.evaluate(tree, val);
        var recursiveMakeRow = function(tree) {
            if (tree.type === "symbol" || tree.type === "true" || tree.type === "false")
                return entry(tree);
            else if (tree.type === "not")
                return entry(tree) + recursiveMakeRow(tree.sub);
            else
                return recursiveMakeRow(tree.lsub) + entry(tree) + recursiveMakeRow(tree.rsub);
        };
        res += recursiveMakeRow(tree);
        return res;
    },

    makeLatexTable: function(tree) {
        var res = "\\[\n  \\begin{array}";

        var sym = ttgen.evaluator.getSymbols(tree);
        res += "{" + "c".repeat(sym.length) + "|";
        var treeSize = function(tree) {
            if (tree.type === "symbol" || tree.type === "true" || tree.type === "false")
                return 1;
            else if (tree.type === "not")
                return 1 + treeSize(tree.sub);
            else
                return 1 + treeSize(tree.lsub) + treeSize(tree.rsub);
        };
        res += "c".repeat(treeSize(tree)) + "}\n";
        res += this.makeLatexTableHeader(tree);
        res += "\\\\\n    \\hline\n";
        
        for (var i = 0; i < Math.pow(2, sym.length); ++i) {
            res += this.makeLatexTableRow(tree, i);
            if (i + 1 < Math.pow(2, sym.length)) {
                res += "\\\\\n";
            } else {
                res += "\n";
            }
        }

        res += "  \\end{array}\n\\]";
        return res;
    }
};

