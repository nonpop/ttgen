"use strict";

QUnit.module("tokenizer");

QUnit.test("empty", function(assert) {
    assert.deepEqual(ttgen.parser.getTokens(""), []);
    assert.deepEqual(ttgen.parser.getTokens(" "), []);
    assert.deepEqual(ttgen.parser.getTokens("  "), []);
});

QUnit.test("parens", function(assert) {
    assert.deepEqual(ttgen.parser.getTokens("("), [ { pos: 0, str: "(" } ]);
    assert.deepEqual(ttgen.parser.getTokens(")"), [ { pos: 0, str: ")" } ]);
    assert.deepEqual(ttgen.parser.getTokens("(("), [ { pos: 0, str: "(" }, { pos: 1, str: "(" } ]);
    assert.deepEqual(ttgen.parser.getTokens("()"), [ { pos: 0, str: "(" }, { pos: 1, str: ")" } ]);
    assert.deepEqual(ttgen.parser.getTokens(")("), [ { pos: 0, str: ")" }, { pos: 1, str: "(" } ]);
    assert.deepEqual(ttgen.parser.getTokens("  )( "), [ { pos: 2, str: ")" }, { pos: 3, str: "(" } ]);
});

QUnit.test("identifiers", function(assert) {
    assert.deepEqual(ttgen.parser.getTokens("hello"), [ { pos: 0, str: "hello" } ]);
    assert.deepEqual(ttgen.parser.getTokens("  hello  "), [ { pos: 2, str: "hello" } ]);
    assert.deepEqual(ttgen.parser.getTokens(" hello  hi "), [ { pos: 1, str: "hello" }, { pos: 8, str: "hi" } ]);
    assert.deepEqual(ttgen.parser.getTokens("(hello )hi ( "), [
            { pos: 0, str: "(" },
            { pos: 1, str: "hello" },
            { pos: 7, str: ")" },
            { pos: 8, str: "hi" },
            { pos: 11, str: "(" }
    ]);
    assert.deepEqual(ttgen.parser.getTokens("(A \\land B)"), [
            { pos: 0, str: "(" },
            { pos: 1, str: "A" },
            { pos: 3, str: "\\land" },
            { pos: 9, str: "B" },
            { pos: 10, str: ")" }
    ]);
    assert.deepEqual(ttgen.parser.getTokens("(A& B)->C)-> C"), [
            { pos: 0, str: "(" },
            { pos: 1, str: "A&" },
            { pos: 4, str: "B" },
            { pos: 5, str: ")" },
            { pos: 6, str: "->C" },
            { pos: 9, str: ")" },
            { pos: 10, str: "->" },
            { pos: 13, str: "C" }
    ]);
});

QUnit.test("classifier", function(assert) {
    assert.deepEqual(
            ttgen.parser.classifyToken({ str: ")" }),
            { str: ")", type: ")" });
    assert.deepEqual(
            ttgen.parser.classifyToken({ str: "&" }),
            { str: "&", type: "and" });
    assert.deepEqual(
            ttgen.parser.classifyToken({ str: "\\land" }),
            { str: "\\land", type: "and" });
    assert.deepEqual(
            ttgen.parser.classifyToken({ str: "IFF" }),
            { str: "IFF", type: "iff" });
    assert.deepEqual(
            ttgen.parser.classifyToken({ str: "p_{0}" }),
            { str: "p_{0}", type: "symbol" });
    assert.deepEqual(
            ttgen.parser.classifyToken({ str: "FALSE" }),
            { str: "FALSE", type: "false" });
});

QUnit.test("tokenizer", function(assert) {
    assert.deepEqual(ttgen.parser.tokenize(""), []);
    assert.deepEqual(ttgen.parser.tokenize("p_{0}"), [ { pos: 0, str: "p_{0}", type: "symbol" } ]);
    assert.deepEqual(ttgen.parser.tokenize("(p_0 \\to q)"),
            [ { pos: 0, str: "(", type: "(" },
              { pos: 1, str: "p_0", type: "symbol" },
              { pos: 5, str: "\\to", type: "implies" },
              { pos: 9, str: "q", type: "symbol" },
              { pos: 10, str: ")", type: ")" } ]);
    assert.deepEqual(ttgen.parser.tokenize(" p_0 \\to q"),
            [ { pos: -1, str: "(", type: "(" },
              { pos: 1, str: "p_0", type: "symbol" },
              { pos: 5, str: "\\to", type: "implies" },
              { pos: 9, str: "q", type: "symbol" },
              { pos: 10, str: ")", type: ")" } ]);
});

QUnit.module("parser");

QUnit.test("errors", function(assert) {
    function testErr(input, desc) {
        var e = ttgen.parser.parse(input);
        assert.equal(e.type, "error");
        if (desc)
            assert.equal(e.desc, desc);
    }
    testErr("(");
    testErr("()");
    testErr(")");
    testErr("p q");
    testErr("(p)");
    testErr("(p &");
    testErr("(p ! q)");
    testErr("!(p)");
});

QUnit.test("empty", function(assert) {
    assert.deepEqual(ttgen.parser.parse(""), null);
});

// TODO: maybe this could be moved to some test setup thing?
var makeSymbol = function(name) {
    return { type: "symbol", name: name, str: name };
};

QUnit.test("identifier", function(assert) {
    assert.deepEqual(ttgen.parser.parse("p"), makeSymbol("p"));
});

QUnit.test("constant", function(assert) {
    assert.deepEqual(ttgen.parser.parse("1"), { type: "true", str: "1" });
    assert.deepEqual(ttgen.parser.parse("\\top"), { type: "true", str: "\\top" });
    assert.deepEqual(ttgen.parser.parse("FALSE"), { type: "false", str: "FALSE" });
});

QUnit.test("unary", function(assert) {
    assert.deepEqual(ttgen.parser.parse("! A"), { type: "not", str: "!",
        sub: makeSymbol("A") });
    assert.deepEqual(ttgen.parser.parse("NOT p_{3}"), { type: "not", str: "NOT",
        sub: makeSymbol("p_{3}") });
    assert.deepEqual(ttgen.parser.parse("! ! A"), {
        type: "not",
        str: "!",
        sub: {
            type: "not",
            str: "!",
            sub: makeSymbol("A")
        }
    });
});

QUnit.test("binary", function(assert) {
    assert.deepEqual(ttgen.parser.parse("(A & B)"), {
        type: "and",
        str: "&",
        lsub: makeSymbol("A"),
        rsub: makeSymbol("B")
    });
    assert.deepEqual(ttgen.parser.parse("!(A & B)"), {
        type: "not",
        str: "!",
        sub: {
            type: "and",
            str: "&",
            lsub: makeSymbol("A"),
            rsub: makeSymbol("B")
        }
    });
    assert.deepEqual(ttgen.parser.parse("! A & B"), {
        type: "and",
        str: "&",
        lsub: {
            type: "not",
            str: "!",
            sub: makeSymbol("A")
        },
        rsub: makeSymbol("B")
    });
    assert.deepEqual(ttgen.parser.parse("A & ! B"), {
        type: "and",
        str: "&",
        lsub: makeSymbol("A"),
        rsub: {
            type: "not",
            str: "!",
            sub: makeSymbol("B")
        }
    });
    assert.deepEqual(ttgen.parser.parse("(A & B) & C"), {
        type: "and",
        str: "&",
        lsub: {
            type: "and",
            str: "&",
            lsub: makeSymbol("A"),
            rsub: makeSymbol("B")
        },
        rsub: makeSymbol("C")
    });
    assert.deepEqual(ttgen.parser.parse("A & (B & C)"), {
        type: "and",
        str: "&",
        lsub: makeSymbol("A"),
        rsub: {
            type: "and",
            str: "&",
            lsub: makeSymbol("B"),
            rsub: makeSymbol("C")
        }
    });
});

QUnit.module("evaluator");

QUnit.test("testUniq", function(assert) {
    assert.deepEqual([].uniq(), []);
    assert.deepEqual(["A","B"].uniq(), ["A","B"]);
    assert.deepEqual(["A","B","A","B"].sort().uniq(), ["A","B"]);
    assert.deepEqual(["C","B","A","A","B","C"].sort().uniq(), ["A","B","C"]);
});

QUnit.test("testRepeat", function(assert) {
    assert.deepEqual("".repeat(0), "");
    assert.deepEqual("".repeat(1), "");
    assert.deepEqual("".repeat(2), "");
    assert.deepEqual("ab".repeat(0), "");
    assert.deepEqual("ab".repeat(1), "ab");
    assert.deepEqual("ab".repeat(2), "abab");
});

QUnit.test("testSymbols", function(assert) {
    assert.deepEqual(ttgen.evaluator.getSymbols(ttgen.parser.parse("A")), ["A"]);
    assert.deepEqual(ttgen.evaluator.getSymbols(ttgen.parser.parse("A \\land B")), ["A","B"]);
    assert.deepEqual(ttgen.evaluator.getSymbols(ttgen.parser.parse("A \\land (B \\lor C)")), ["A","B","C"]);
    assert.deepEqual(ttgen.evaluator.getSymbols(ttgen.parser.parse("A \\land (\\lnot B \\lor C)")), ["A","B","C"]);
    assert.deepEqual(ttgen.evaluator.getSymbols(ttgen.parser.parse("B \\land (\\lnot A \\lor C)")), ["A","B","C"]);
    assert.deepEqual(ttgen.evaluator.getSymbols(ttgen.parser.parse("B \\land (\\lnot A \\lor B)")), ["A","B"]);
    assert.deepEqual(ttgen.evaluator.getSymbols(ttgen.parser.parse("A \\land A")), ["A"]);
});

QUnit.test("testValuation", function(assert) {
    var v = ttgen.evaluator.getValuation(["A","B","C"], 0);
    assert.deepEqual(v["A"], false);
    assert.deepEqual(v["B"], false);
    assert.deepEqual(v["C"], false);

    var v = ttgen.evaluator.getValuation(["A","B","C"], 2);
    assert.deepEqual(v["A"], false);
    assert.deepEqual(v["B"], true);
    assert.deepEqual(v["C"], false);

    var v = ttgen.evaluator.getValuation(["A","B","C"], 7);
    assert.deepEqual(v["A"], true);
    assert.deepEqual(v["B"], true);
    assert.deepEqual(v["C"], true);
});

QUnit.test("testSymbol", function(assert) {
    var tree = ttgen.parser.parse("A");
    var sym = ttgen.evaluator.getSymbols(tree);

    for (var i = 0; i < 2; ++i) {
        var val = ttgen.evaluator.getValuation(sym, i);
        ttgen.evaluator.evaluate(tree, val);
        assert.deepEqual(tree.value, val["A"]);
    }
});

QUnit.test("testNot", function(assert) {
    var tree = ttgen.parser.parse("\\lnot A");
    var sym = ttgen.evaluator.getSymbols(tree);

    for (var i = 0; i < 2; ++i) {
        var val = ttgen.evaluator.getValuation(sym, i);
        ttgen.evaluator.evaluate(tree, val);
        assert.deepEqual(tree.value, !val["A"]);
    }
});

QUnit.test("testAnd", function(assert) {
    var tree = ttgen.parser.parse("A \\land B");
    var sym = ttgen.evaluator.getSymbols(tree);

    for (var i = 0; i < 4; ++i) {
        var val = ttgen.evaluator.getValuation(sym, i);
        ttgen.evaluator.evaluate(tree, val);
        assert.deepEqual(tree.value, val["A"] && val["B"]);
    }
});

QUnit.test("testOr", function(assert) {
    var tree = ttgen.parser.parse("A \\lor B");
    var sym = ttgen.evaluator.getSymbols(tree);

    for (var i = 0; i < 4; ++i) {
        var val = ttgen.evaluator.getValuation(sym, i);
        ttgen.evaluator.evaluate(tree, val);
        assert.deepEqual(tree.value, val["A"] || val["B"]);
    }
});

QUnit.test("testImplies", function(assert) {
    var tree = ttgen.parser.parse("A \\to B");
    var sym = ttgen.evaluator.getSymbols(tree);

    for (var i = 0; i < 4; ++i) {
        var val = ttgen.evaluator.getValuation(sym, i);
        ttgen.evaluator.evaluate(tree, val);
        assert.deepEqual(tree.value, !val["A"] || val["B"]);
    }
});

QUnit.test("testIff", function(assert) {
    var tree = ttgen.parser.parse("A \\leftrightarrow B");
    var sym = ttgen.evaluator.getSymbols(tree);

    for (var i = 0; i < 4; ++i) {
        var val = ttgen.evaluator.getValuation(sym, i);
        ttgen.evaluator.evaluate(tree, val);
        assert.deepEqual(tree.value, val["A"] === val["B"]);
    }
});

QUnit.test("testNand", function(assert) {
    var tree = ttgen.parser.parse("A \\mid B");
    var sym = ttgen.evaluator.getSymbols(tree);

    for (var i = 0; i < 4; ++i) {
        var val = ttgen.evaluator.getValuation(sym, i);
        ttgen.evaluator.evaluate(tree, val);
        assert.deepEqual(tree.value, !(val["A"] && val["B"]));
    }
});

QUnit.test("testNor", function(assert) {
    var tree = ttgen.parser.parse("A \\downarrow B");
    var sym = ttgen.evaluator.getSymbols(tree);

    for (var i = 0; i < 4; ++i) {
        var val = ttgen.evaluator.getValuation(sym, i);
        ttgen.evaluator.evaluate(tree, val);
        assert.deepEqual(tree.value, !(val["A"] || val["B"]));
    }
});

QUnit.test("testXor", function(assert) {
    var tree = ttgen.parser.parse("A XOR B");
    var sym = ttgen.evaluator.getSymbols(tree);

    for (var i = 0; i < 4; ++i) {
        var val = ttgen.evaluator.getValuation(sym, i);
        ttgen.evaluator.evaluate(tree, val);
        assert.deepEqual(tree.value, (val["A"] !== val["B"]));
    }
});

QUnit.test("test", function(assert) {
    var tree = ttgen.parser.parse("(A -> (B -> C)) -> ((A -> B) -> (A -> C))");
    var sym = ttgen.evaluator.getSymbols(tree);
    for (var i = 0; i < 8; ++i) {
        var val = ttgen.evaluator.getValuation(sym, i);
        ttgen.evaluator.evaluate(tree, val);
        assert.deepEqual(tree.value, true);
    }

    tree = ttgen.parser.parse("(A -> B) -> (! B -> ! A)");
    sym = ttgen.evaluator.getSymbols(tree);
    for (var i = 0; i < 4; ++i) {
        var val = ttgen.evaluator.getValuation(sym, i);
        ttgen.evaluator.evaluate(tree, val);
        assert.deepEqual(tree.value, true);
    }
});

QUnit.module("tablegen");

// TODO: Move somewhere?
var defStrs = {
    "not": "!",
    "and": "&",
    "or": "|",
    "implies": "->",
    "iff": "<->",
    "nand": "NAND",
    "nor": "NOR",
    "xor": "XOR"
};

// TODO: Move somewhere?
var remakeString = function(tree) {
    if (tree.type === "symbol")
        return ttgen.tablegen.parStr(tree.par, tree.name);
    else if (tree.type === "not")
        return ttgen.tablegen.parStr(tree.par, defStrs[tree.type]) + " " + remakeString(tree.sub);
    else
        return remakeString(tree.lsub) + 
            " " + ttgen.tablegen.parStr(tree.par, defStrs[tree.type]) + " " +
            remakeString(tree.rsub);
};

QUnit.test("testParens", function(assert) {
    var testString = function(input) {
        var tree = ttgen.parser.parse(input);
        ttgen.tablegen.evaluateParens(tree);
        assert.deepEqual(remakeString(tree), input);
    };

    testString("A");
    testString("(A & B)");
    testString("(A & ! B)");
    testString("(! A & B)");
    testString("! (A & B)");
    testString("((! (A & B) | (! A & ! B)) -> ! C)");
});

QUnit.test("testLatexHeader", function(assert) {
    var tree = ttgen.parser.parse("((\\lnot(A \\land B)\\lor(\\lnot A \\land \\lnot B))\\to \\lnot C)");
    var expected = "    A & B & C & ((\\lnot & (A & \\land & B) & \\lor & (\\lnot & A & \\land & \\lnot & B)) & \\to & \\lnot & C) ";
    assert.deepEqual(ttgen.tablegen.makeLatexTableHeader(tree), expected);
});

QUnit.test("testLatexRows", function(assert) {
    var tree = ttgen.parser.parse("A \\to B");
    ttgen.tablegen.evaluateParens(tree);
    var sym = ttgen.evaluator.getSymbols(tree);

    for (var i = 0; i < 4; ++i) {
        var val = ttgen.evaluator.getValuation(sym, i);
        var values = [ val["A"], val["B"], val["A"], !val["A"] || val["B"], val["B"] ];
        var expected = "    " + values.map(function(v) { return v? "1" : "0" }).join(" & ") + " ";
        assert.deepEqual(ttgen.tablegen.makeLatexTableRow(tree, i), expected);
    }
});

