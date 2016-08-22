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
            var visibles = ["inline", "inline-block", "flex", "inline-flex"];
            if (visibles.indexOf(style.display) !== -1) {
                return true;
            }
            return elem.clientHeight > 0 && elem.clientWidth > 0;
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
                console.log('findAll(): invalid sleector provided "' + sleector + '":' + e);
            }
        };

        this.findOne = function findOne(selector, scope) {
            scope = scope instanceof HTMLElement ? scope : scope && this.findOne(scope) || this.options.scope;

            try {
                return scope.querySelector(selector);
            }
            catch (e) {
                console.log('findOne(): invalid selector provided"' + sleector + '": ' + e);
            }
        };

    };

})(window);

