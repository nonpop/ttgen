"use strict";

ttgen.ui = {};

ttgen.ui.generateTables = function() {
    var tree = ttgen.parser.parse($("#input").val());
    if (tree && (tree.type !== "error")) {
        var t = ttgen.tablegen.makeLatexTable(tree);
        $("#theTable").text(t).html();
        $("#theLatex").val(t);
        $("#errorArea").html("");
    } else {
        $("#theTable").html("");
        $("#theLatex").val("");
        $("#errorArea").html(tree.desc || "Parse failed");
    }
    MathJax.Hub.Queue([ "Typeset", MathJax.Hub ]);
};

ttgen.ui.updateSettings = function() {
    if (
            ttgen.options.reverseCols !== $("#reverse-cols").prop("checked") ||
            ttgen.options.reverseRows !== $("#reverse-rows").prop("checked") ||
            ttgen.options.trueSymbol !== $("#true-symbol").val() ||
            ttgen.options.falseSymbol !== $("#false-symbol").val()
       ) {
        ttgen.options.reverseCols = $("#reverse-cols").prop("checked");
        ttgen.options.reverseRows = $("#reverse-rows").prop("checked");
        ttgen.options.trueSymbol = $("#true-symbol").val();
        ttgen.options.falseSymbol = $("#false-symbol").val();
    }
    ttgen.ui.saveSettings();
};

ttgen.ui.initialize = function() {
    $("#input").val("(p_0 -> (p_1 -> p_2)) -> ((p_0 -> p_1) -> (p_0 -> p_2))");
    //$("#input").value = "A -> B";
    $("#input").focus();
    $("#input").select();
    ttgen.ui.restoreSettings();
    $("#inputForm").submit(function(e) {
        e.preventDefault();     // otherwise the submit causes page reload (?)
                                // which re-triggers document.ready()
        ttgen.ui.generateTables();
    });
    $("#save-settings").change(ttgen.ui.updateSettings);
    $("#reverse-cols").change(ttgen.ui.updateSettings);
    $("#reverse-rows").change(ttgen.ui.updateSettings);
    $("#true-symbol").change(ttgen.ui.updateSettings);
    $("#false-symbol").change(ttgen.ui.updateSettings);
};

ttgen.ui.restoreSettings = function() {
    if (ttgen.ui.getCookie("save-settings")) {
        $("#save-settings").prop("checked", true);
        ttgen.options.reverseRows = (ttgen.ui.getCookie("reverse-rows") === "true")? true : false;
        ttgen.options.reverseCols = (ttgen.ui.getCookie("reverse-cols") === "true")? true : false;
        ttgen.options.trueSymbol = ttgen.ui.getCookie("true-symbol") || "1";
        ttgen.options.falseSymbol = ttgen.ui.getCookie("false-symbol") || "0";
    } else {
        $("#save-settings").prop("checked", false);
    }
    
    $("#reverse-rows").prop("checked", ttgen.options.reverseRows);
    $("#reverse-cols").prop("checked", ttgen.options.reverseCols);
    $("#true-symbol").prop("value", ttgen.options.trueSymbol);
    $("#false-symbol").prop("value", ttgen.options.falseSymbol);
};

ttgen.ui.saveSettings = function() {
    if ($("#save-settings").prop("checked")) {
        ttgen.ui.setCookie("save-settings", true, 365);
        ttgen.ui.setCookie("reverse-rows", $("#reverse-rows").prop("checked"), 365);
        ttgen.ui.setCookie("reverse-cols", $("#reverse-cols").prop("checked"), 365);
        ttgen.ui.setCookie("true-symbol", $("#true-symbol").val(), 365);
        ttgen.ui.setCookie("false-symbol", $("#false-symbol").val(), 365);
    } else {
        ttgen.ui.setCookie("save-settings", false, -1);
        ttgen.ui.setCookie("reverse-rows", undefined, -1);
        ttgen.ui.setCookie("reverse-cols", undefined, -1);
        ttgen.ui.setCookie("true-symbol", undefined, -1);
        ttgen.ui.setCookie("false-symbol", undefined, -1);
    }
};

// the *Cookie functions are modified versions of those at w3schools.com
ttgen.ui.setCookie = function(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toGMTString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
};

ttgen.ui.getCookie = function(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ')
            c = c.substring(1);
        
        if (c.indexOf(name) != -1)
            return c.substring(name.length, c.length);
    }
    return undefined;
};

$(ttgen.ui.initialize);

