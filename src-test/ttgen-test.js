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
    assertEquals({ type: "id", value: "hello" }, t.next());
    assertEquals({ type: "id", value: "hi" }, t.next());
    assertEquals({ type: "lparen" }, t.next());
    assertEquals({ type: "rparen" }, t.next());
    assertEquals({ type: "id", value: "hey" }, t.next());
    assertEquals(undefined, t.next());
};

TokenizerTest.prototype.testCmd = function() {
    var t = new ttgen.Tokenizer("\\vee");
    assertEquals("or", t.next().type);
    assertEquals(undefined, t.next());
};

TokenizerTest.prototype.testCmd2 = function() {
    var t = new ttgen.Tokenizer("\\veee");
    assertEquals({ type: "id", value: "\\veee"}, t.next());
    assertEquals(undefined, t.next());
};

TokenizerTest.prototype.test = function() {
    var t = new ttgen.Tokenizer("  (p_0\\land(p_1\\to\\p_{2}) ) ");
    assertEquals({ type: "lparen" }, t.next());
    assertEquals({ type: "id", value: "p_0" }, t.next());
    assertEquals({ type: "and" }, t.next());
    assertEquals({ type: "lparen" }, t.next());
    assertEquals({ type: "id", value: "p_1" }, t.next());
    assertEquals({ type: "implies" }, t.next());
    assertEquals({ type: "id", value: "\\p_{2}" }, t.next());
    assertEquals({ type: "rparen" }, t.next());
    assertEquals({ type: "rparen" }, t.next());
    assertEquals(undefined, t.next());
};

