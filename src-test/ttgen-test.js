"use strict";

var TokenizerTest = TestCase("TokenizerTest");

TokenizerTest.prototype.testEmpty = function() {
    var t = new ttgen.Tokenizer("");
    assertEquals("", t.input);
    assertEquals(0, t.position);
    assertEquals(undefined, t.next());
};

TokenizerTest.prototype.testEmpty2 = function() {
    var t = new ttgen.Tokenizer("   ");
    assertEquals(undefined, t.next());
};

TokenizerTest.prototype.testParens = function() {
    var t = new ttgen.Tokenizer("())()");
    assertEquals("lparen", t.next().type);
    assertEquals("rparen", t.next().type);
    assertEquals("rparen", t.next().type);
    assertEquals("lparen", t.next().type);
    assertEquals("rparen", t.next().type);
    assertEquals(undefined, t.next());
};

TokenizerTest.prototype.testId = function() {
    var t = new ttgen.Tokenizer("hello");
    var next = t.next();
    assertEquals("id", next.type);
    assertEquals("hello", next.value);
    assertEquals(undefined, t.next());
};

TokenizerTest.prototype.testId2 = function() {
    var t = new ttgen.Tokenizer("  hello hi() hey   ");
    assertEquals({ type: "id", value: "hello", pos: 2 }, t.next());
    assertEquals({ type: "id", value: "hi", pos: 8 }, t.next());
    assertEquals({ type: "lparen", pos: 10 }, t.next());
    assertEquals({ type: "rparen", pos: 11 }, t.next());
    assertEquals({ type: "id", value: "hey", pos: 13 }, t.next());
    assertEquals(undefined, t.next());
};

TokenizerTest.prototype.testCmd = function() {
    var t = new ttgen.Tokenizer("\\vee");
    assertEquals("or", t.next().type);
    assertEquals(undefined, t.next());
};

TokenizerTest.prototype.testCmd2 = function() {
    var t = new ttgen.Tokenizer("\\veee");
    assertEquals({ type: "id", value: "\\veee", pos: 0}, t.next());
    assertEquals(undefined, t.next());
};

TokenizerTest.prototype.test = function() {
    var t = new ttgen.Tokenizer("  (p_0\\land(p_1\\to\\p_{2}) ) ");
    assertEquals({ type: "lparen", pos: 2 }, t.next());
    assertEquals({ type: "id", value: "p_0", pos: 3 }, t.next());
    assertEquals({ type: "and", pos: 6 }, t.next());
    assertEquals({ type: "lparen", pos: 11 }, t.next());
    assertEquals({ type: "id", value: "p_1", pos: 12 }, t.next());
    assertEquals({ type: "implies", pos: 15 }, t.next());
    assertEquals({ type: "id", value: "\\p_{2}", pos: 18 }, t.next());
    assertEquals({ type: "rparen", pos: 24 }, t.next());
    assertEquals({ type: "rparen", pos: 26 }, t.next());
    assertEquals(undefined, t.next());
};

var ParserTest = TestCase("ParserTest");

ParserTest.prototype.testEmpty = function() {
    assertEquals(undefined, ttgen.parse(""));
};

ParserTest.prototype.testId = function() {
    assertEquals({ type: "id", value: "p_0" }, ttgen.parse("p_0"));
    assertEquals({ type: "id", value: "p_0" }, ttgen.parse(" p_0  "));

    var e = ttgen.parse(")");
    assertEquals("error", e.type);
    assertEquals(0, e.pos);

    e = ttgen.parse("p_0)");
    assertEquals("error", e.type);
    assertEquals(3, e.pos);

    e = ttgen.parse("p_0 p_0");
    assertEquals("error", e.type);
    assertEquals(4, e.pos);
};

ParserTest.prototype.testNot = function() {
    assertEquals({ type: "not", value: { type: "id", value: "A" } }, ttgen.parse("\\lnot A"));
    assertEquals({ type: "not", value: { type: "not", value: { type: "id", value: "A" } } }, ttgen.parse("\\neg \\lnot A"));
    var e = ttgen.parse("\\lnot A B");
    assertEquals("error", e.type);
    assertEquals(8, e.pos);
};

ParserTest.prototype.testAnd = function() {
    var r = ttgen.parse("(A\\land B)");
    assertEquals({ type: "and", lvalue: { type: "id", value: "A" }, rvalue: { type: "id", value: "B" } }, r);

    r = ttgen.parse("(A\\land\\lnot B)");
    assertEquals({
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
    }, r);

    r = ttgen.parse("(A\\land(B\\land C))");
    assertEquals({
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
    }, r);
};

ParserTest.prototype.testImplParens = function() {
    var r = ttgen.parse("A\\land B");
    assertEquals({ type: "and", lvalue: { type: "id", value: "A" }, rvalue: { type: "id", value: "B" } }, r);
};

ParserTest.prototype.test = function() {
    var r = ttgen.parse("(A\\to B)");
    assertEquals({ type: "implies", lvalue: { type: "id", value: "A" }, rvalue: { type: "id", value: "B" } }, r);

    r = ttgen.parse("A\\to( ( B_{10}\\land Cee)\\leftrightarrow A)");
    assertEquals({
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
    }, r);
};

ParserTest.prototype.testError = function() {
    var r = ttgen.parse("A\\to B)");
    assertEquals("error", r.type);
    assertEquals(6, r.pos);

    r = ttgen.parse("\\lnot(A\\to B");
    assertEquals("error", r.type);
    assertEquals(12, r.pos);
};

var EvaluatorTest = TestCase("EvaluatorTest");

EvaluatorTest.prototype.testUniq = function() {
    assertEquals([], [].uniq());
    assertEquals(["A","B"], ["A","B"].uniq());
    assertEquals(["A","B"], ["A","B","A","B"].sort().uniq());
    assertEquals(["A","B","C"], ["C","B","A","A","B","C"].sort().uniq());
};

EvaluatorTest.prototype.testSymbols = function() {
    assertEquals(["A"], ttgen.getSymbols(ttgen.parse("A")));
    assertEquals(["A","B"], ttgen.getSymbols(ttgen.parse("A\\land B")));
    assertEquals(["A","B","C"], ttgen.getSymbols(ttgen.parse("A\\land (B\\lor C)")));
    assertEquals(["A","B","C"], ttgen.getSymbols(ttgen.parse("A\\land (\\lnot B\\lor C)")));
    assertEquals(["A","B","C"], ttgen.getSymbols(ttgen.parse("B\\land (\\lnot A\\lor C)")));
    assertEquals(["A","B"], ttgen.getSymbols(ttgen.parse("B\\land (\\lnot A\\lor B)")));
    assertEquals(["A"], ttgen.getSymbols(ttgen.parse("A\\land A")));
};

EvaluatorTest.prototype.testValuation = function() {
    var v = ttgen.getValuation(["A","B","C"], 0);
    assertEquals(false, v["A"]);
    assertEquals(false, v["B"]);
    assertEquals(false, v["C"]);

    var v = ttgen.getValuation(["A","B","C"], 2);
    assertEquals(false, v["A"]);
    assertEquals(true, v["B"]);
    assertEquals(false, v["C"]);

    var v = ttgen.getValuation(["A","B","C"], 7);
    assertEquals(true, v["A"]);
    assertEquals(true, v["B"]);
    assertEquals(true, v["C"]);
};

EvaluatorTest.prototype.testId = function() {
    var tree = ttgen.parse("A");
    var sym = ttgen.getSymbols(tree);

    for (var i = 0; i < 2; ++i) {
        var val = ttgen.getValuation(sym, i);
        ttgen.evaluate(tree, val);
        assertEquals(val["A"], tree.truthValue);
    }
};

EvaluatorTest.prototype.testNot = function() {
    var tree = ttgen.parse("\\lnot A");
    var sym = ttgen.getSymbols(tree);

    for (var i = 0; i < 2; ++i) {
        var val = ttgen.getValuation(sym, i);
        ttgen.evaluate(tree, val);
        assertEquals(!val["A"], tree.truthValue);
    }
};

EvaluatorTest.prototype.testAnd = function() {
    var tree = ttgen.parse("A\\land B");
    var sym = ttgen.getSymbols(tree);

    for (var i = 0; i < 4; ++i) {
        var val = ttgen.getValuation(sym, i);
        ttgen.evaluate(tree, val);
        assertEquals(val["A"] && val["B"], tree.truthValue);
    }
};

EvaluatorTest.prototype.testOr = function() {
    var tree = ttgen.parse("A\\lor B");
    var sym = ttgen.getSymbols(tree);

    for (var i = 0; i < 4; ++i) {
        var val = ttgen.getValuation(sym, i);
        ttgen.evaluate(tree, val);
        assertEquals(val["A"] || val["B"], tree.truthValue);
    }
};

EvaluatorTest.prototype.testImplies = function() {
    var tree = ttgen.parse("A\\to B");
    var sym = ttgen.getSymbols(tree);

    for (var i = 0; i < 4; ++i) {
        var val = ttgen.getValuation(sym, i);
        ttgen.evaluate(tree, val);
        assertEquals(!val["A"] || val["B"], tree.truthValue);
    }
};

EvaluatorTest.prototype.testIff = function() {
    var tree = ttgen.parse("A\\leftrightarrow B");
    var sym = ttgen.getSymbols(tree);

    for (var i = 0; i < 4; ++i) {
        var val = ttgen.getValuation(sym, i);
        ttgen.evaluate(tree, val);
        assertEquals(val["A"] === val["B"], tree.truthValue);
    }
};

EvaluatorTest.prototype.test = function() {
    // (A -> (B -> C)) -> ((A -> B) -> (A -> C))
    var tree = ttgen.parse("(A\\to(B\\to C))\\to((A\\to B)\\to(A\\to C))");
    var sym = ttgen.getSymbols(tree);
    for (var i = 0; i < 8; ++i) {
        var val = ttgen.getValuation(sym, i);
        ttgen.evaluate(tree, val);
        assertEquals(true, tree.truthValue);
    }

    // (A -> B) -> (!B -> !A)
    tree = ttgen.parse("(A\\to B)\\to(\\lnot B\\to\\lnot A)");
    sym = ttgen.getSymbols(tree);
    for (var i = 0; i < 4; ++i) {
        var val = ttgen.getValuation(sym, i);
        ttgen.evaluate(tree, val);
        assertEquals(true, tree.truthValue);
    }
};

EvaluatorTest.prototype.testRepeat = function() {
    assertEquals("", "".repeat(0));
    assertEquals("", "".repeat(1));
    assertEquals("", "".repeat(2));
    assertEquals("", "ab".repeat(0));
    assertEquals("ab", "ab".repeat(1));
    assertEquals("abab", "ab".repeat(2));
};

var TableGenTest = TestCase("TableGenTest");

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

TableGenTest.prototype.testParens = function() {
    var tree = ttgen.parse("A");
    ttgen.evaluateParens(tree);
    assertEquals("A", remakeString(tree));

    tree = ttgen.parse("A\\land B");
    ttgen.evaluateParens(tree);
    assertEquals("(A & B)", remakeString(tree));

    tree = ttgen.parse("A\\land\\lnot B");
    ttgen.evaluateParens(tree);
    assertEquals("(A & !B)", remakeString(tree));

    tree = ttgen.parse("\\lnot A\\land B");
    ttgen.evaluateParens(tree);
    assertEquals("(!A & B)", remakeString(tree));

    tree = ttgen.parse("\\lnot(A\\land B)");
    ttgen.evaluateParens(tree);
    assertEquals("!(A & B)", remakeString(tree));

    tree = ttgen.parse("((\\lnot(A\\land B)\\lor(\\lnot A\\land\\lnot B))\\to\\lnot C)");
    ttgen.evaluateParens(tree);
    assertEquals("((!(A & B) | (!A & !B)) -> !C)", remakeString(tree));
};

TableGenTest.prototype.testLatexHeader = function() {
    var tree = ttgen.parse("((\\lnot(A\\land B)\\lor(\\lnot A\\land\\lnot B))\\to\\lnot C)");
    var expected = "    A & B & C & ((\\lnot & (A & \\land & B) & \\lor & (\\lnot & A & \\land & \\lnot & B)) & \\to & \\lnot & C) ";
    assertEquals(expected, ttgen.makeLatexTableHeader(tree));
};

TableGenTest.prototype.testLatexRows = function() {
    var tree = ttgen.parse("A\\to B");
    ttgen.evaluateParens(tree);
    var sym = ttgen.getSymbols(tree);

    for (var i = 0; i < 4; ++i) {
        var val = ttgen.getValuation(sym, i);
        var values = [ val["A"], val["B"], val["A"], !val["A"] || val["B"], val["B"] ];
        var expected = "    " + values.map(function(v) { return v? "1" : "0" }).join(" & ") + " ";
        assertEquals(expected, ttgen.makeLatexTableRow(tree, i));
    }
};

