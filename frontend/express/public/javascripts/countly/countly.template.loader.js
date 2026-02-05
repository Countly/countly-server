/**
 * Template Loader Module
 *
 * Handles loading and mounting Vue template files.
 * Extracted from vue/core.js for better modularity.
 *
 * @module countly.template.loader
 */

import jQuery from 'jquery';
import { T } from './countly.helpers.js';

/**
 * TemplateLoader class for loading and mounting Vue templates
 * @param {Array} templates - Array of template configurations
 */
export const TemplateLoader = function(templates) {
    this.templates = templates;
    this.elementsToBeRendered = [];
};

/**
 * Load templates asynchronously
 * @returns {jQuery.Deferred|boolean} Deferred object or true if no templates
 */
TemplateLoader.prototype.load = function() {
    var self = this;

    var getDeferred = function(fName, elId) {
        if (!elId) {
            return T.get(fName, function(src) {
                self.elementsToBeRendered.push(src);
            });
        }
        else {
            return T.get(fName, function(src) {
                self.elementsToBeRendered.push("<script type='text/x-template' id='" + elId + "'>" + src + "</script>");
            });
        }
    };

    if (this.templates) {
        var templatesDeferred = [];
        this.templates.forEach(function(item) {
            if (typeof item === "string") {
                templatesDeferred.push(getDeferred(item));
                return;
            }
            for (var name in item.mapping) {
                var fileName = item.mapping[name];
                var elementId = item.namespace + "-" + name;
                templatesDeferred.push(getDeferred(fileName, elementId));
            }
        });

        return jQuery.when.apply(null, templatesDeferred);
    }
    return true;
};

/**
 * Mount loaded templates to the DOM
 * @param {string} [parentSelector="#vue-templates"] - Selector for the parent element to mount templates into
 */
TemplateLoader.prototype.mount = function(parentSelector) {
    parentSelector = parentSelector || "#vue-templates";
    this.elementsToBeRendered.forEach(function(el) {
        var jqEl = jQuery(el);
        var elId = jqEl.get(0).id;
        var elType = jqEl.get(0).type;
        if (elId && elType === "text/x-template") {
            if (jQuery(parentSelector).find("#" + elId).length === 0) {
                jQuery(parentSelector).append(jqEl);
            }
            else {
                // eslint-disable-next-line no-console
                console.log("Duplicate component templates are not allowed. Please check the template with \"" + elId + "\" id.");
            }
        }
    });
};

/**
 * Clean up loaded templates
 */
TemplateLoader.prototype.destroy = function() {
    this.elementsToBeRendered = [];
};

export default TemplateLoader;