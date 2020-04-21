var _JSONEditor = function(element, json, statusEl){
    var instance = this;
    instance.statusEl = {
        validElement: statusEl && statusEl.validElement || null,
        invalidElement: statusEl && statusEl.invalidElement || null
    };

    instance.jsonStatus = true;

    initEditor(element);

    Object.defineProperty(instance, 'json', {
        get: function() {
            return instance.editor.getValue();
        },
        set: function(v) {
            instance.editor.setValue(v);
        }
    });

    instance.json = json;

    instance.editor.on("change", function() {
        var json = instance.json;
        var statusEl = instance.statusEl;

        if(statusEl.validElement) {
            statusEl.validElement.hide();
        }

        if(statusEl.invalidElement) {
            statusEl.invalidElement.hide();
        }

        if(!json || !json.length){
            statusEl.validElement.show();
            instance.jsonStatus = true;
            return;
        }

        try {
            var j = jsonlint.parse(json);

            if(typeof(j) === "number" ||
               typeof(j) === "boolean") {
                throw new Error(true);
            }

            if(statusEl.validElement) {
                statusEl.validElement.show();
            }
            instance.jsonStatus = true;
        } catch (e) {
            if(statusEl.invalidElement) {
                statusEl.invalidElement.show();
            }
            instance.jsonStatus = false;
        }
    });

    instance.format = function() {
        var json = instance.json;
        try{
            var result = jsonlint.parse(json);
            instance.json = JSON.stringify(result, null, "    ");
        }catch(e){
            //Error - Cannot format
        }
    };

    instance.returnJSON = function() {
        return JSON.minify(instance.json);
    }

    function initEditor(element) {
        instance.editor = CodeMirror(element, {
            lineNumbers: true,
            styleActiveLine: true,
            matchBrackets: true,
            indentWithTabs: true,
            autofocus: true,
            mode: 'javascript',
            gutters: ['CodeMirror-linenumbers'],
            theme: "none"
        });
    };

    instance.format();
    CodeMirror.signal(instance.editor, "change");
}