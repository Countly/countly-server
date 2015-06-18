/*globals define, module, require, document*/
(function (root, factory) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module !== 'undefined' && module.exports) {
		module.exports = factory();
    } else {
        root.JsonHuman = factory();
    }
}(this, function () {
    "use strict";

    function makePrefixer(prefix) {
        return function (name) {
            return prefix + "-" + name;
        };
    }

    function isArray(obj) {
        return toString.call(obj) === '[object Array]';
    }

    function sn(tagName, className, data) {
        var result = document.createElement(tagName);

        result.className = className;
        result.appendChild(document.createTextNode("" + data));

        return result;
    }

    function scn(tagName, className, child) {
        var result = document.createElement(tagName),
            i, len;

        result.className = className;

        if (isArray(child)) {
            for (i = 0, len = child.length; i < len; i += 1) {
                result.appendChild(child[i]);
            }
        } else {
            result.appendChild(child);
        }

        return result;
    }

    var toString = Object.prototype.toString,
        prefixer = makePrefixer("jh"),
        p = prefixer,
        ARRAY = 1,
        BOOL = 2,
        INT = 3,
        FLOAT = 4,
        STRING = 5,
        OBJECT = 6,
        FUNCTION = 7,
        UNK = 99,

        STRING_CLASS_NAME = p("type-string"),
        INT_CLASS_NAME = p("type-int") + " " + p("type-number"),
        FLOAT_CLASS_NAME = p("type-float") + " " + p("type-number"),

        OBJECT_CLASS_NAME = p("type-object"),

        OBJ_KEY_CLASS_NAME = p("key") + " " + p("object-key"),
        OBJ_VAL_CLASS_NAME = p("value") + " " + p("object-value"),

        OBJ_EMPTY_CLASS = {"class": p("type-object") + " " + p("empty")},

        FUNCTION_CLASS_NAME = p("type-function"),
        BOOL_CLASS = {"class": p("type-bool")},
        STRING_EMPTY_CLASS = {"class": p("type-string") + " " + p("empty")},

        ARRAY_KEY_CLASS_NAME = p("key") + " " + p("array-key"),
        ARRAY_VAL_CLASS_NAME = p("value") + " " + p("array-value"),

        ARRAY_CLASS_NAME = p("type-array"),
        ARRAY_EMPTY_CLASS = {"class": p("type-array") + " " + p("empty")},

        UNKNOWN_CLASS_NAME = p("type-unk"),

        EMPTY_STRING = sn("span", STRING_EMPTY_CLASS, "(Empty Text)"),
        EMPTY_OBJECT = sn("span", OBJ_EMPTY_CLASS, "(Empty Object)"),
        EMPTY_ARRAY = sn("span", ARRAY_EMPTY_CLASS, "(Empty List)"),

        TRUE = sn("span", BOOL_CLASS, "true"),
        FALSE = sn("span", BOOL_CLASS, "false");

    function getType(obj) {
        var type = typeof obj;

        switch (type) {
        case "boolean":
            return BOOL;
        case "string":
            return STRING;
        case "number":
            return (obj % 1 === 0) ? INT : FLOAT;
        case "function":
            return FUNCTION;
        default:
            if (isArray(obj)) {
                return ARRAY;
            } else if (obj === Object(obj)) {
                return OBJECT;
            } else {
                return UNK;
            }
        }
    }

    function _format(data) {
        var result, container, key, keyNode, valNode, len, childs, tr,
            isEmpty = true,
            accum = [],
            type = getType(data);

        switch (type) {
        case BOOL:
            result = data ? TRUE : FALSE;
            break;
        case STRING:
            if (data === "") {
                result = EMPTY_STRING;
            } else {
                result = sn("span", STRING_CLASS_NAME, data);
            }
            break;
        case INT:
            result = sn("span", INT_CLASS_NAME, data);
            break;
        case FLOAT:
            result = sn("span", FLOAT_CLASS_NAME, data);
            break;
        case OBJECT:
            childs = [];
            for (key in data) {
                isEmpty = false;

                keyNode = sn("th", OBJ_KEY_CLASS_NAME, key);
                valNode = scn("td", OBJ_VAL_CLASS_NAME, _format(data[key]));

                tr = document.createElement("tr");
                tr.appendChild(keyNode);
                tr.appendChild(valNode);

                childs.push(tr);
            }

            if (isEmpty) {
                result = EMPTY_OBJECT;
            } else {
                result = scn("table", OBJECT_CLASS_NAME, childs);
            }
            break;
        case FUNCTION:
            result = sn("span", FUNCTION_CLASS_NAME, data);
            break;
        case ARRAY:
            if (data.length > 0) {
                childs = [];
                for (key = 0, len = data.length; key < len; key += 1) {
                    keyNode = sn("th", ARRAY_KEY_CLASS_NAME, key);
                    valNode = scn("td", ARRAY_VAL_CLASS_NAME, _format(data[key]));

                    tr = document.createElement("tr");
                    tr.appendChild(keyNode);
                    tr.appendChild(valNode);

                    childs.push(tr);
                }

                result = scn("table", ARRAY_CLASS_NAME, childs);
            } else {
                result = EMPTY_ARRAY;
            }
            break;
        default:
            result = sn("span", UNKNOWN_CLASS_NAME, data);
            break;
        }

        return result;
    }

    function format(data, options) {
        options = options || {};
        var result;

        result = _format(data);
        result.className = result.className + " " + prefixer("root");

        return result;
    }

    return {
        format: format
    };
}));