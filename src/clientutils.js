/*!
 * Casper is a navigation utility for PhantomJS.
 *
 * Documentation: http://casperjs.org/
 * Repository:    http://github.com/casperjs/casperjs
 *
 * Copyright (c) 2011-2012 Nicolas Perriault
 *
 * Part of source code is Copyright Joyent, Inc. and other Node contributors.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

(function(exports) {

    exports.ClientUtils = function ClientUtils(options) {

        this.options = options || {};
        this.options.scope = this.options.scope || document;

        this.elementVisible = function elementVisible(elem) {
            var style;
            try {
                style = window.getComputedStyle(elem, null);
            } catch (e) {
                return false;
            }
            var hidden = style.visibility === 'hidden' || style.display === 'none';

            if (hidden) {
                return false;
            }

            if (elem.clientHeight === 0 && elem.clientWidth === 0) {
                return false;
            }

            return true;
        };

        this.visible = function visible(selector) {
            return [].some.call(this.findAll(selector), this.elementVisible);
        };

        this.findAll = function findAll(selector, scope) {
            scope = scope instanceof HTMLElement ? scope : scope && this.findOne(scope) || this.options.scope;

            try {
                return Array.prototype.slice.call(scope.querySelectorAll(selector));
            }
            catch (e) {
                console.log('findAll(): invalid selector provided "' + selector + '":' + e);
            }
        };

        this.findOne = function findOne(selector, scope) {
            scope = scope instanceof HTMLElement ? scope : scope && this.findOne(scope) || this.options.scope;

            try {
                return scope.querySelector(selector);
            }
            catch (e) {
                this.log('findOne(): invalid selector"' + selector + '": ' + e)
                console.log();
            }
        };

        this.log = function log(message, level) {
            console.log("[tiny-browser:" + (level || "debug") + "]" + message);
        };

        this.fill = function fill(values) {

            for (var fieldSelector in values) {

                if (!values.hasOwnProperty(fieldSelector)) {
                    continue;
                }

                try {
                    this.setFieldValue(fieldSelector, values[fieldSelector]);
                }
                catch (err) {
                    this.log(err.name, "error");
                }
            }

        };

        this.setFieldValue = function setFieldValue(selector, value) {
            var field = this.findOne(selector);

            this.setField(field, value);
            return true;
        };

        this.setField = function setField(field, value) {

            var logValue = value;

            if (!(field instanceof HTMLElement)) {
                var error = new Error('setField: Invalid field; only HTMLElement is supported');
                error.name = 'FieldNotFound';
                throw error;
            }

            if (field.getAttribute('type') === 'password') {
                logValue = new Array(('' + value).length + 1).join('*');
            }

            this.log('Set "' + field.getAttribute('name') + '" field value to ' + logValue);

            try {
                field.focus();
            } catch (e) {
                this.log("Unable to focus() input field " + field.getAttribute('name') + ": " + e, 'warning');
            }

            filter = String(field.getAttribute('type') ?  field.getAttribute('type') : field.nodeName).toLowerCase();

            switch(filter) {
                case 'checkbox':
                case 'radio':
                    field.checked = value ? true : false;
                    break;

                case 'file':
                    throw {
                        name: 'FileUploadError',
                        message: 'File field must be filled using page.uploadFile',
                        path: value,
                        id: field.id || null
                    };
                case 'select':
                    if (field.multiple) {
                        throw {
                            name: 'Multiple select not yet supported',
                            message: 'Select multiple are not yet supported'
                        };
                    }

                    if (value === '') {
                        field.selectedIndex = -1;
                    }
                    else {
                        field.value = value;
                    }

                    // if the value can't be found, try search options text
                    if (field.value.toString() !== value.toString()) {
                        this.log("Value of select couldn't be found, trying searching by options text.");

                        [].some.call(field.options, function(option) {

                            option.selected = (value === option.text);
                            return value === option.text;
                        });
                    }

                    break;

                default:
                    field.value = value;
            }

            ['change', 'input'].forEach(function(name) {
                var event = document.createEvent('HTMLEvents');
                event.initEvent(name, true, true);
                field.dispatchEvent(event);
            });

            try {
                field.blur();
            }
            catch (err) {
                this.log('Unable to blur() input field ' + field.getAttribute('name') + ': ' + err, 'warning');
            }
        };

        this.click = function click(selector) {
            var element = this.findOne(selector);

            if (!element) {
                this.log('click(): Couldn\'t find any element matching "' + selector + '" selector', 'error');

                return false;
            }

            try {
                var clickEvent = document.createEvent('MouseEvents');
                clickEvent.initMouseEvent('click', true, true, window, null, 0, 0, 0, 0, false, false, false, false, 0, null);

                element.dispatchEvent(clickEvent);
                return true;
            }
            catch (err) {
                this.log('Failed dispatching click event on ' + selector + ': ' + e, 'error');
                return false;
            }


        };

    };

})(window);

