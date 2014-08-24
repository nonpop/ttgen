var generateTables = function() {
    var s = document.getElementById("input").value;
    var tree = ttgen.parse(s);
    if (tree && (tree.type !== "error")) {
        var t = ttgen.makeLatexTable(tree);
        document.getElementById("theTable").innerHTML = t;
        document.getElementById("theLatex").value = t;
    } else {
        document.getElementById("theTable").innerHTML = "";
    document.getElementById("theLatex").value = "";
    }
    MathJax.Hub.Queue([ "Typeset", MathJax.Hub ]);
};

var lastInput = "";
var checkForUpdates = function() {
    var s = document.getElementById("input").value;
    if (
            s !== lastInput || 
            ttgen.options.reverseCols !== document.getElementById("reverse-cols").checked ||
            ttgen.options.reverseRows !== document.getElementById("reverse-rows").checked ||
            ttgen.options.trueSymbol !== document.getElementById("true-symbol").value ||
            ttgen.options.falseSymbol !== document.getElementById("false-symbol").value
       ) {
        lastInput = s;
        ttgen.options.reverseCols = document.getElementById("reverse-cols").checked;
        ttgen.options.reverseRows = document.getElementById("reverse-rows").checked;
        ttgen.options.trueSymbol = document.getElementById("true-symbol").value;
        ttgen.options.falseSymbol = document.getElementById("false-symbol").value;
        generateTables();
    }
};

var initialize = function() {
    //document.getElementById("input").value = "(p_0\\to(p_1\\to p_2))\\to((p_0\\to p_1)\\to(p_0\\to p_2))";
    document.getElementById("input").value = "A\\to B";
    generateTables();
    document.getElementById("input").focus();
    document.getElementById("input").select();
    document.getElementById("true-symbol").value = "1";
    document.getElementById("false-symbol").value = "0";

    setInterval("checkForUpdates()", 1500);
};

