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

ParserTest.prototype.testUniq = function() {
    assertEquals([], [].uniq());
    assertEquals(["A","B"], ["A","B"].uniq());
    assertEquals(["A","B"], ["A","B","A","B"].sort().uniq());
    assertEquals(["A","B","C"], ["C","B","A","A","B","C"].sort().uniq());
};

ParserTest.prototype.testSymbols = function() {
    assertEquals(["A"], ttgen.getSymbols(ttgen.parse("A")));
    assertEquals(["A","B"], ttgen.getSymbols(ttgen.parse("A\\land B")));
    assertEquals(["A","B","C"], ttgen.getSymbols(ttgen.parse("A\\land (B\\lor C)")));
    assertEquals(["A","B","C"], ttgen.getSymbols(ttgen.parse("A\\land (\\lnot B\\lor C)")));
    assertEquals(["A","B","C"], ttgen.getSymbols(ttgen.parse("B\\land (\\lnot A\\lor C)")));
    assertEquals(["A","B"], ttgen.getSymbols(ttgen.parse("B\\land (\\lnot A\\lor B)")));
    assertEquals(["A"], ttgen.getSymbols(ttgen.parse("A\\land A")));
};

