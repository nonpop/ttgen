"use strict";

QUnit.module("Tokenizer");



QUnit.module("Parser");

QUnit.test("testEmpty", function(assert) {
    assert.deepEqual(ttgen.parse(""), undefined);
});

QUnit.test("testId", function(assert) {
    assert.deepEqual(ttgen.parse("p_0"), { type: "id", value: "p_0" });
    assert.deepEqual(ttgen.parse(" p_0  "), { type: "id", value: "p_0" });

    var e = ttgen.parse(")");
    assert.deepEqual(e.type, "error");
    assert.deepEqual(e.pos, 0);

    e = ttgen.parse("p_0)");
    assert.deepEqual(e.type, "error");
    assert.deepEqual(e.pos, 3);

    e = ttgen.parse("p_0 p_0");
    assert.deepEqual(e.type, "error");
    assert.deepEqual(e.pos, 4);
});

QUnit.test("testNot", function(assert) {
    assert.deepEqual(ttgen.parse("\\lnot A"), { type: "not", value: { type: "id", value: "A" } });
    assert.deepEqual(ttgen.parse("\\neg \\lnot A"), { type: "not", value: { type: "not", value: { type: "id", value: "A" } } });
    var e = ttgen.parse("\\lnot A B");
    assert.deepEqual(e.type, "error");
    assert.deepEqual(e.pos, 8);
});

QUnit.test("testAnd", function(assert) {
    var r = ttgen.parse("(A\\land B)");
    assert.deepEqual(r, { type: "and", lvalue: { type: "id", value: "A" }, rvalue: { type: "id", value: "B" } });

    r = ttgen.parse("(A\\land\\lnot B)");
    assert.deepEqual(r, {
        type: "and",
        lvalue: {
            type: "id",
            value: "A"
        },
        rvalue: {
            type: "not",
            value: {
                type: "id",
                value: "B"
            }
        }
    });

    r = ttgen.parse("(A\\land(B\\land C))");
    assert.deepEqual(r, {
        type: "and",
        lvalue: {
            type: "id",
            value: "A"
        },
        rvalue: {
            type: "and",
            lvalue: {
                type: "id",
                value: "B"
            },
            rvalue: {
                type: "id",
                value: "C"
            }
        }
    });
});

QUnit.test("testImplParens", function(assert) {
    var r = ttgen.parse("A\\land B");
    assert.deepEqual(r, { type: "and", lvalue: { type: "id", value: "A" }, rvalue: { type: "id", value: "B" } });
});

QUnit.test("test", function(assert) {
    var r = ttgen.parse("(A\\to B)");
    assert.deepEqual(r, { type: "implies", lvalue: { type: "id", value: "A" }, rvalue: { type: "id", value: "B" } });

    r = ttgen.parse("A\\to( ( B_{10}\\land Cee)\\leftrightarrow A)");
    assert.deepEqual(r, {
        type: "implies",
        lvalue: {
            type: "id",
            value: "A"
        },
        rvalue: {
            type: "iff",
            lvalue: {
                type: "and",
                lvalue: {
                    type: "id",
                    value: "B_{10}"
                },
                rvalue: {
                    type: "id",
                    value: "Cee"
                }
            },
            rvalue: {
                type: "id",
                value: "A"
            }
        }
    });
});

QUnit.test("testError", function(assert) {
    var r = ttgen.parse("A\\to B)");
    assert.deepEqual(r.type, "error");
    assert.deepEqual(r.pos, 6);

    r = ttgen.parse("\\lnot(A\\to B");
    assert.deepEqual(r.type, "error");
    assert.deepEqual(r.pos, 12);
});

QUnit.module("Evaluator");

QUnit.test("testUniq", function(assert) {
    assert.deepEqual([].uniq(), []);
    assert.deepEqual(["A","B"].uniq(), ["A","B"]);
    assert.deepEqual(["A","B","A","B"].sort().uniq(), ["A","B"]);
    assert.deepEqual(["C","B","A","A","B","C"].sort().uniq(), ["A","B","C"]);
});

QUnit.test("testSymbols", function(assert) {
    assert.deepEqual(ttgen.getSymbols(ttgen.parse("A")), ["A"]);
    assert.deepEqual(ttgen.getSymbols(ttgen.parse("A\\land B")), ["A","B"]);
    assert.deepEqual(ttgen.getSymbols(ttgen.parse("A\\land (B\\lor C)")), ["A","B","C"]);
    assert.deepEqual(ttgen.getSymbols(ttgen.parse("A\\land (\\lnot B\\lor C)")), ["A","B","C"]);
    assert.deepEqual(ttgen.getSymbols(ttgen.parse("B\\land (\\lnot A\\lor C)")), ["A","B","C"]);
    assert.deepEqual(ttgen.getSymbols(ttgen.parse("B\\land (\\lnot A\\lor B)")), ["A","B"]);
    assert.deepEqual(ttgen.getSymbols(ttgen.parse("A\\land A")), ["A"]);
});

QUnit.test("testValuation", function(assert) {
    var v = ttgen.getValuation(["A","B","C"], 0);
    assert.deepEqual(v["A"], false);
    assert.deepEqual(v["B"], false);
    assert.deepEqual(v["C"], false);

    var v = ttgen.getValuation(["A","B","C"], 2);
    assert.deepEqual(v["A"], false);
    assert.deepEqual(v["B"], true);
    assert.deepEqual(v["C"], false);

    var v = ttgen.getValuation(["A","B","C"], 7);
    assert.deepEqual(v["A"], true);
    assert.deepEqual(v["B"], true);
    assert.deepEqual(v["C"], true);
});

QUnit.test("testId", function(assert) {
    var tree = ttgen.parse("A");
    var sym = ttgen.getSymbols(tree);

    for (var i = 0; i < 2; ++i) {
        var val = ttgen.getValuation(sym, i);
        ttgen.evaluate(tree, val);
        assert.deepEqual(tree.truthValue, val["A"]);
    }
});

QUnit.test("testNot", function(assert) {
    var tree = ttgen.parse("\\lnot A");
    var sym = ttgen.getSymbols(tree);

    for (var i = 0; i < 2; ++i) {
        var val = ttgen.getValuation(sym, i);
        ttgen.evaluate(tree, val);
        assert.deepEqual(tree.truthValue, !val["A"]);
    }
});

QUnit.test("testAnd", function(assert) {
    var tree = ttgen.parse("A\\land B");
    var sym = ttgen.getSymbols(tree);

    for (var i = 0; i < 4; ++i) {
        var val = ttgen.getValuation(sym, i);
        ttgen.evaluate(tree, val);
        assert.deepEqual(tree.truthValue, val["A"] && val["B"]);
    }
});

QUnit.test("testOr", function(assert) {
    var tree = ttgen.parse("A\\lor B");
    var sym = ttgen.getSymbols(tree);

    for (var i = 0; i < 4; ++i) {
        var val = ttgen.getValuation(sym, i);
        ttgen.evaluate(tree, val);
        assert.deepEqual(tree.truthValue, val["A"] || val["B"]);
    }
});

QUnit.test("testImplies", function(assert) {
    var tree = ttgen.parse("A\\to B");
    var sym = ttgen.getSymbols(tree);

    for (var i = 0; i < 4; ++i) {
        var val = ttgen.getValuation(sym, i);
        ttgen.evaluate(tree, val);
        assert.deepEqual(tree.truthValue, !val["A"] || val["B"]);
    }
});

QUnit.test("testIff", function(assert) {
    var tree = ttgen.parse("A\\leftrightarrow B");
    var sym = ttgen.getSymbols(tree);

    for (var i = 0; i < 4; ++i) {
        var val = ttgen.getValuation(sym, i);
        ttgen.evaluate(tree, val);
        assert.deepEqual(tree.truthValue, val["A"] === val["B"]);
    }
});

QUnit.test("testNand", function(assert) {
    var tree = ttgen.parse("A\\mid B");
    var sym = ttgen.getSymbols(tree);

    for (var i = 0; i < 4; ++i) {
        var val = ttgen.getValuation(sym, i);
        ttgen.evaluate(tree, val);
        assert.deepEqual(tree.truthValue, !(val["A"] && val["B"]));
    }
});

QUnit.test("testNor", function(assert) {
    var tree = ttgen.parse("A\\downarrow B");
    var sym = ttgen.getSymbols(tree);

    for (var i = 0; i < 4; ++i) {
        var val = ttgen.getValuation(sym, i);
        ttgen.evaluate(tree, val);
        assert.deepEqual(tree.truthValue, !(val["A"] || val["B"]));
    }
});

QUnit.test("test", function(assert) {
    // (A -> (B -> C)) -> ((A -> B) -> (A -> C))
    var tree = ttgen.parse("(A\\to(B\\to C))\\to((A\\to B)\\to(A\\to C))");
    var sym = ttgen.getSymbols(tree);
    for (var i = 0; i < 8; ++i) {
        var val = ttgen.getValuation(sym, i);
        ttgen.evaluate(tree, val);
        assert.deepEqual(tree.truthValue, true);
    }

    // (A -> B) -> (!B -> !A)
    tree = ttgen.parse("(A\\to B)\\to(\\lnot B\\to\\lnot A)");
    sym = ttgen.getSymbols(tree);
    for (var i = 0; i < 4; ++i) {
        var val = ttgen.getValuation(sym, i);
        ttgen.evaluate(tree, val);
        assert.deepEqual(tree.truthValue, true);
    }
});

QUnit.test("testRepeat", function(assert) {
    assert.deepEqual("".repeat(0), "");
    assert.deepEqual("".repeat(1), "");
    assert.deepEqual("".repeat(2), "");
    assert.deepEqual("ab".repeat(0), "");
    assert.deepEqual("ab".repeat(1), "ab");
    assert.deepEqual("ab".repeat(2), "abab");
});

QUnit.module("TableGen");

var remakeString = function(tree) {
    var pars = function(par, s) {
        if (par < 0)
            return "(".repeat(-par) + s;
        if (par > 0)
            return s + ")".repeat(par);
        return s;
    };

    switch (tree.type) {
        case "id":
            return pars(tree.par, tree.value);
        case "not":
            return pars(tree.par, "!") + remakeString(tree.value);
        case "and":
            return remakeString(tree.lvalue) + " & " + remakeString(tree.rvalue);
        case "or":
            return remakeString(tree.lvalue) + " | " + remakeString(tree.rvalue);
        case "implies":
            return remakeString(tree.lvalue) + " -> " + remakeString(tree.rvalue);
        case "iff":
            return remakeString(tree.lvalue) + " <-> " + remakeString(tree.rvalue);
    }
};

QUnit.test("testParens", function(assert) {
    var tree = ttgen.parse("A");
    ttgen.evaluateParens(tree);
    assert.deepEqual(remakeString(tree), "A");

    tree = ttgen.parse("A\\land B");
    ttgen.evaluateParens(tree);
    assert.deepEqual(remakeString(tree), "(A & B)");

    tree = ttgen.parse("A\\land\\lnot B");
    ttgen.evaluateParens(tree);
    assert.deepEqual(remakeString(tree), "(A & !B)");

    tree = ttgen.parse("\\lnot A\\land B");
    ttgen.evaluateParens(tree);
    assert.deepEqual(remakeString(tree), "(!A & B)");

    tree = ttgen.parse("\\lnot(A\\land B)");
    ttgen.evaluateParens(tree);
    assert.deepEqual(remakeString(tree), "!(A & B)");

    tree = ttgen.parse("((\\lnot(A\\land B)\\lor(\\lnot A\\land\\lnot B))\\to\\lnot C)");
    ttgen.evaluateParens(tree);
    assert.deepEqual(remakeString(tree), "((!(A & B) | (!A & !B)) -> !C)");
});

QUnit.test("testLatexHeader", function(assert) {
    var tree = ttgen.parse("((\\lnot(A\\land B)\\lor(\\lnot A\\land\\lnot B))\\to\\lnot C)");
    var expected = "    A & B & C & ((\\lnot & (A & \\land & B) & \\lor & (\\lnot & A & \\land & \\lnot & B)) & \\to & \\lnot & C) ";
    assert.deepEqual(ttgen.makeLatexTableHeader(tree), expected);
});

QUnit.test("testLatexRows", function(assert) {
    var tree = ttgen.parse("A\\to B");
    ttgen.evaluateParens(tree);
    var sym = ttgen.getSymbols(tree);

    for (var i = 0; i < 4; ++i) {
        var val = ttgen.getValuation(sym, i);
        var values = [ val["A"], val["B"], val["A"], !val["A"] || val["B"], val["B"] ];
        var expected = "    " + values.map(function(v) { return v? "1" : "0" }).join(" & ") + " ";
        assert.deepEqual(ttgen.makeLatexTableRow(tree, i), expected);
    }
});

QUnit.module("tokenizer");

QUnit.test("empty", function(assert) {
    assert.deepEqual(ttgen.parser2.tokenize(""), []);
    assert.deepEqual(ttgen.parser2.tokenize(" "), []);
    assert.deepEqual(ttgen.parser2.tokenize("  "), []);
});

QUnit.test("parens", function(assert) {
    assert.deepEqual(ttgen.parser2.tokenize("("), [ { pos: 0, str: "(" } ]);
    assert.deepEqual(ttgen.parser2.tokenize(")"), [ { pos: 0, str: ")" } ]);
    assert.deepEqual(ttgen.parser2.tokenize("(("), [ { pos: 0, str: "(" }, { pos: 1, str: "(" } ]);
    assert.deepEqual(ttgen.parser2.tokenize("()"), [ { pos: 0, str: "(" }, { pos: 1, str: ")" } ]);
    assert.deepEqual(ttgen.parser2.tokenize(")("), [ { pos: 0, str: ")" }, { pos: 1, str: "(" } ]);
    assert.deepEqual(ttgen.parser2.tokenize("  )( "), [ { pos: 2, str: ")" }, { pos: 3, str: "(" } ]);
});

QUnit.test("identifiers", function(assert) {
    assert.deepEqual(ttgen.parser2.tokenize("hello"), [ { pos: 0, str: "hello" } ]);
    assert.deepEqual(ttgen.parser2.tokenize("  hello  "), [ { pos: 2, str: "hello" } ]);
    assert.deepEqual(ttgen.parser2.tokenize(" hello  hi "), [ { pos: 1, str: "hello" }, { pos: 8, str: "hi" } ]);
    assert.deepEqual(ttgen.parser2.tokenize("(hello )hi ( "), [
            { pos: 0, str: "(" },
            { pos: 1, str: "hello" },
            { pos: 7, str: ")" },
            { pos: 8, str: "hi" },
            { pos: 11, str: "(" }
    ]);
    assert.deepEqual(ttgen.parser2.tokenize("(A \\land B)"), [
            { pos: 0, str: "(" },
            { pos: 1, str: "A" },
            { pos: 3, str: "\\land" },
            { pos: 9, str: "B" },
            { pos: 10, str: ")" }
    ]);
    assert.deepEqual(ttgen.parser2.tokenize("(A& B)->C)-> C"), [
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
            ttgen.parser2.classifyToken({ str: ")" }),
            { str: ")", type: ")" });
    assert.deepEqual(
            ttgen.parser2.classifyToken({ str: "&" }),
            { str: "&", type: "and" });
    assert.deepEqual(
            ttgen.parser2.classifyToken({ str: "\\land" }),
            { str: "\\land", type: "and" });
    assert.deepEqual(
            ttgen.parser2.classifyToken({ str: "IFF" }),
            { str: "IFF", type: "iff" });
});

