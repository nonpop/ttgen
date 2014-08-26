"use strict";

QUnit.test("Tokenizer.empty", function(assert) {
    var t = new ttgen.Tokenizer("");
    assert.deepEqual(t.input, "");
    assert.deepEqual(t.position, 0);
    assert.deepEqual(t.next(), undefined);
});

QUnit.test("Tokenizer.testEmpty2", function(assert) {
    var t = new ttgen.Tokenizer("   ");
    assert.deepEqual(t.next(), undefined);
});

QUnit.test("Tokenizer.testParens", function(assert) {
    var t = new ttgen.Tokenizer("())()");
    assert.deepEqual(t.next().type, "lparen");
    assert.deepEqual(t.next().type, "rparen");
    assert.deepEqual(t.next().type, "rparen");
    assert.deepEqual(t.next().type, "lparen");
    assert.deepEqual(t.next().type, "rparen");
    assert.deepEqual(t.next(), undefined);
});

QUnit.test("Tokenizer.testId", function(assert) {
    var t = new ttgen.Tokenizer("hello");
    var next = t.next();
    assert.deepEqual(next.type, "id");
    assert.deepEqual(next.value, "hello");
    assert.deepEqual(t.next(), undefined);
});

QUnit.test("Tokenizer.testId2", function(assert) {
    var t = new ttgen.Tokenizer("  hello hi() hey   ");
    assert.deepEqual(t.next(), { type: "id", value: "hello", pos: 2 });
    assert.deepEqual(t.next(), { type: "id", value: "hi", pos: 8 });
    assert.deepEqual(t.next(), { type: "lparen", pos: 10 });
    assert.deepEqual(t.next(), { type: "rparen", pos: 11 });
    assert.deepEqual(t.next(), { type: "id", value: "hey", pos: 13 });
    assert.deepEqual(t.next(), undefined);
});

QUnit.test("Tokenizer.testCmd", function(assert) {
    var t = new ttgen.Tokenizer("\\vee");
    assert.deepEqual(t.next().type, "or");
    assert.deepEqual(t.next(), undefined);
});

QUnit.test("Tokenizer.testCmd2", function(assert) {
    var t = new ttgen.Tokenizer("\\veee");
    assert.deepEqual(t.next(), { type: "id", value: "\\veee", pos: 0});
    assert.deepEqual(t.next(), undefined);
});

QUnit.test("Tokenizer.test", function(assert) {
    var t = new ttgen.Tokenizer("  (p_0\\land(p_1\\to\\p_{2}) ) ");
    assert.deepEqual(t.next(), { type: "lparen", pos: 2 });
    assert.deepEqual(t.next(), { type: "id", value: "p_0", pos: 3 });
    assert.deepEqual(t.next(), { type: "and", pos: 6 });
    assert.deepEqual(t.next(), { type: "lparen", pos: 11 });
    assert.deepEqual(t.next(), { type: "id", value: "p_1", pos: 12 });
    assert.deepEqual(t.next(), { type: "implies", pos: 15 });
    assert.deepEqual(t.next(), { type: "id", value: "\\p_{2}", pos: 18 });
    assert.deepEqual(t.next(), { type: "rparen", pos: 24 });
    assert.deepEqual(t.next(), { type: "rparen", pos: 26 });
    assert.deepEqual(t.next(), undefined);
});

QUnit.test("Parser.testEmpty", function(assert) {
    assert.deepEqual(ttgen.parse(""), undefined);
});

QUnit.test("Parser.testId", function(assert) {
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

QUnit.test("Parser.testNot", function(assert) {
    assert.deepEqual(ttgen.parse("\\lnot A"), { type: "not", value: { type: "id", value: "A" } });
    assert.deepEqual(ttgen.parse("\\neg \\lnot A"), { type: "not", value: { type: "not", value: { type: "id", value: "A" } } });
    var e = ttgen.parse("\\lnot A B");
    assert.deepEqual(e.type, "error");
    assert.deepEqual(e.pos, 8);
});

QUnit.test("Parser.testAnd", function(assert) {
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

QUnit.test("Parser.testImplParens", function(assert) {
    var r = ttgen.parse("A\\land B");
    assert.deepEqual(r, { type: "and", lvalue: { type: "id", value: "A" }, rvalue: { type: "id", value: "B" } });
});

QUnit.test("Parser.test", function(assert) {
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

QUnit.test("Parser.testError", function(assert) {
    var r = ttgen.parse("A\\to B)");
    assert.deepEqual(r.type, "error");
    assert.deepEqual(r.pos, 6);

    r = ttgen.parse("\\lnot(A\\to B");
    assert.deepEqual(r.type, "error");
    assert.deepEqual(r.pos, 12);
});

QUnit.test("Evaluator.testUniq", function(assert) {
    assert.deepEqual([].uniq(), []);
    assert.deepEqual(["A","B"].uniq(), ["A","B"]);
    assert.deepEqual(["A","B","A","B"].sort().uniq(), ["A","B"]);
    assert.deepEqual(["C","B","A","A","B","C"].sort().uniq(), ["A","B","C"]);
});

QUnit.test("Evaluator.testSymbols", function(assert) {
    assert.deepEqual(ttgen.getSymbols(ttgen.parse("A")), ["A"]);
    assert.deepEqual(ttgen.getSymbols(ttgen.parse("A\\land B")), ["A","B"]);
    assert.deepEqual(ttgen.getSymbols(ttgen.parse("A\\land (B\\lor C)")), ["A","B","C"]);
    assert.deepEqual(ttgen.getSymbols(ttgen.parse("A\\land (\\lnot B\\lor C)")), ["A","B","C"]);
    assert.deepEqual(ttgen.getSymbols(ttgen.parse("B\\land (\\lnot A\\lor C)")), ["A","B","C"]);
    assert.deepEqual(ttgen.getSymbols(ttgen.parse("B\\land (\\lnot A\\lor B)")), ["A","B"]);
    assert.deepEqual(ttgen.getSymbols(ttgen.parse("A\\land A")), ["A"]);
});

QUnit.test("Evaluator.testValuation", function(assert) {
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

QUnit.test("Evaluator.testId", function(assert) {
    var tree = ttgen.parse("A");
    var sym = ttgen.getSymbols(tree);

    for (var i = 0; i < 2; ++i) {
        var val = ttgen.getValuation(sym, i);
        ttgen.evaluate(tree, val);
        assert.deepEqual(tree.truthValue, val["A"]);
    }
});

QUnit.test("Evaluator.testNot", function(assert) {
    var tree = ttgen.parse("\\lnot A");
    var sym = ttgen.getSymbols(tree);

    for (var i = 0; i < 2; ++i) {
        var val = ttgen.getValuation(sym, i);
        ttgen.evaluate(tree, val);
        assert.deepEqual(tree.truthValue, !val["A"]);
    }
});

QUnit.test("Evaluator.testAnd", function(assert) {
    var tree = ttgen.parse("A\\land B");
    var sym = ttgen.getSymbols(tree);

    for (var i = 0; i < 4; ++i) {
        var val = ttgen.getValuation(sym, i);
        ttgen.evaluate(tree, val);
        assert.deepEqual(tree.truthValue, val["A"] && val["B"]);
    }
});

QUnit.test("Evaluator.testOr", function(assert) {
    var tree = ttgen.parse("A\\lor B");
    var sym = ttgen.getSymbols(tree);

    for (var i = 0; i < 4; ++i) {
        var val = ttgen.getValuation(sym, i);
        ttgen.evaluate(tree, val);
        assert.deepEqual(tree.truthValue, val["A"] || val["B"]);
    }
});

QUnit.test("Evaluator.testImplies", function(assert) {
    var tree = ttgen.parse("A\\to B");
    var sym = ttgen.getSymbols(tree);

    for (var i = 0; i < 4; ++i) {
        var val = ttgen.getValuation(sym, i);
        ttgen.evaluate(tree, val);
        assert.deepEqual(tree.truthValue, !val["A"] || val["B"]);
    }
});

QUnit.test("Evaluator.testIff", function(assert) {
    var tree = ttgen.parse("A\\leftrightarrow B");
    var sym = ttgen.getSymbols(tree);

    for (var i = 0; i < 4; ++i) {
        var val = ttgen.getValuation(sym, i);
        ttgen.evaluate(tree, val);
        assert.deepEqual(tree.truthValue, val["A"] === val["B"]);
    }
});

QUnit.test("Evaluator.testNand", function(assert) {
    var tree = ttgen.parse("A\\mid B");
    var sym = ttgen.getSymbols(tree);

    for (var i = 0; i < 4; ++i) {
        var val = ttgen.getValuation(sym, i);
        ttgen.evaluate(tree, val);
        assert.deepEqual(tree.truthValue, !(val["A"] && val["B"]));
    }
});

QUnit.test("Evaluator.testNor", function(assert) {
    var tree = ttgen.parse("A\\downarrow B");
    var sym = ttgen.getSymbols(tree);

    for (var i = 0; i < 4; ++i) {
        var val = ttgen.getValuation(sym, i);
        ttgen.evaluate(tree, val);
        assert.deepEqual(tree.truthValue, !(val["A"] || val["B"]));
    }
});

QUnit.test("Evaluator.test", function(assert) {
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

QUnit.test("Evaluator.testRepeat", function(assert) {
    assert.deepEqual("".repeat(0), "");
    assert.deepEqual("".repeat(1), "");
    assert.deepEqual("".repeat(2), "");
    assert.deepEqual("ab".repeat(0), "");
    assert.deepEqual("ab".repeat(1), "ab");
    assert.deepEqual("ab".repeat(2), "abab");
});

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

QUnit.test("TableGen.testParens", function(assert) {
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

QUnit.test("TableGen.testLatexHeader", function(assert) {
    var tree = ttgen.parse("((\\lnot(A\\land B)\\lor(\\lnot A\\land\\lnot B))\\to\\lnot C)");
    var expected = "    A & B & C & ((\\lnot & (A & \\land & B) & \\lor & (\\lnot & A & \\land & \\lnot & B)) & \\to & \\lnot & C) ";
    assert.deepEqual(ttgen.makeLatexTableHeader(tree), expected);
});

QUnit.test("TableGen.testLatexRows", function(assert) {
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

