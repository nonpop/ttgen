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
    document.getElementById("input").focus();
    document.getElementById("input").select();
    restoreSettings();
    setInterval("checkForUpdates()", 1500);
};

var restoreSettings = function() {
    if (getCookie("save-settings")) {
        document.getElementById("save-settings").checked = true;
        ttgen.options.reverseRows = (getCookie("reverse-rows") === "true")? true : false;
        ttgen.options.reverseCols = (getCookie("reverse-cols") === "true")? true : false;
        ttgen.options.trueSymbol = getCookie("true-symbol") || "1";
        ttgen.options.falseSymbol = getCookie("false-symbol") || "0";
    } else {
        document.getElementById("save-settings").checked = false;
    }
    
    document.getElementById("reverse-rows").checked = ttgen.options.reverseRows;
    document.getElementById("reverse-cols").checked = ttgen.options.reverseCols;
    document.getElementById("true-symbol").value = ttgen.options.trueSymbol;
    document.getElementById("false-symbol").value = ttgen.options.falseSymbol;
};

var saveSettings = function() {
    if (document.getElementById("save-settings").checked) {
        setCookie("save-settings", true, 365);
        setCookie("reverse-rows", document.getElementById("reverse-rows").checked, 365);
        setCookie("reverse-cols", document.getElementById("reverse-cols").checked, 365);
        setCookie("true-symbol", document.getElementById("true-symbol").value, 365);
        setCookie("false-symbol", document.getElementById("false-symbol").value, 365);
    } else {
        setCookie("save-settings", false, -1);
        setCookie("reverse-rows", false, -1);
        setCookie("reverse-cols", false, -1);
        setCookie("true-symbol", false, -1);
        setCookie("false-symbol", false, -1);
    }
};

// the *Cookie functions modified are from w3schools.com
function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires=" + d.toGMTString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
};

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ')
            c = c.substring(1);
        
        if (c.indexOf(name) != -1)
            return c.substring(name.length, c.length);
    }
    return undefined;
};

