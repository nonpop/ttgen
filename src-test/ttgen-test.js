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

