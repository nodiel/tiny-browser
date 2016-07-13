"use strict";

const phantom = require('phantom');
const _ = require('lodash');
const EventEmitter = require('events');


function TinyBrowser() {
    EventEmitter.call(this);

    var self = this;
    this._loading = false;
    this._onReadyTimeout = 10 * 1000;

    this._ready = new Promise((resolve, reject) => {
        phantom.create()
            .then(instance => {
                self.phInstance = instance;
                return instance.createPage();
            })
            .then(page => {
                self.page = page;
                resolve();
            })
            .then(() => {
                self._wireUpEvents();
            })
            .catch(reject);
    });
}

TinyBrowser.prototype = _.create(EventEmitter.prototype, {

    constructor: TinyBrowser,

    _onReady: function() {
        const self = this;

        const loaderPolling = new Promise((resolve, reject) => {
            const start = Date.now();
            let interval = null;

            interval = setInterval(() => {
                if (!self._loading) {
                    clearInterval(interval);
                    resolve();
                }
                else if ((Date.now() - start) >= self._onReadyTimeout) {
                    reject('onready timeout');
                    clearInterval(interval);
                }
            }, 25);
        });

        return Promise.all([this._ready, loaderPolling]);
    },

    _wireUpEvents: function() {
        const self = this;

        this.page.on('onConsoleMessage', (message, lineNum, sourceId) => {
            console.log('CONSOLE: ' + message + ' (from line ' + lineNum + ' in ' + sourceId);
        });

        this.page.on('onLoadStarted', () => {
            self._loading = true;
        });

        this.page.on('onLoadFinished', status => {
            self._loading = false;
            self.emit('phantom.onLoadFinished', status);
        });

        this.page.on('onError', function(message, trace) {
            var msgStack = ['ERROR: ' + message];

            if (trace && trace.length) {
                msgStack.push('TRACE:');

                trace.forEach(function(t) {
                    msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function +'")' : ''));
                });
            }

            console.error(msgStack.join('\n'));
        });
    },

    open: function(url) {
        const self = this;

        return this._onReady()
            .then(() => {
                return self.page.open(url);
            });
    },

    click: function(elementSelector) {
        const self = this;

        var clickFn = function (domSelector) {

            var clickEvent = document.createEvent("MouseEvent");
            clickEvent.initMouseEvent(
                "click",
                true, true,
                window, null,
                0, 0, 0, 0,
                false, false, false, false,
                0, null
            );

            var element = document.querySelector(domSelector);
            element.dispatchEvent(clickEvent);

        };

        return this._onReady()
            .then(() => {
                return self.page.evaluate(clickFn, elementSelector);
            });
    },

    fillForm: function(data) {
        const self = this;

        return this._onReady()
            .then(() => {
                return self.page.evaluate(function(jsData) {
                    for (var selector in jsData) {
                        var element = document.querySelector(selector);

                        if (!element) {
                            console.log('not found selector in fillForm: ' + selector);
                        }
                        else {
                            element.value = jsData[selector];
                        }
                    }
                }, data);
            })
            .then(() => {
                self.emit('onFormFilled');
            });
    },

    capture: function(filePath) {
        const self = this;

        return this._onReady()
            .then(() => {
                return self.page.render(filePath);
            });
    },

    destroy: function() {
        const self = this;

        return this._onReady()
            .then(() => {
                self.phInstance.exit();
            });
    },

    waitFor: function(checkCb, timeout) {
        const self = this,
            maxTimeout = timeout || 5000;


        const conditionPolling = new Promise((resolve, reject) => {
            const start = Date.now();
            let interval = null;

            interval = setInterval(function() {
                checkCb.apply(self)
                    .then(conditionResult => {
                        if (conditionResult) {
                            console.log('condition passed after: ', Date.now() - start);
                            resolve();
                            clearInterval(interval);
                        }
                        else if ((Date.now() - start) >= maxTimeout) {
                            reject("Timeout");
                            clearInterval(interval);
                        }
                    })
                    .catch(err => {
                        console.log(err);
                    });
            }, 250);
        });

        return Promise.all([this._onReady(), conditionPolling]);
    },

    waitForSelector: function(selector) {
        var self = this;

        return this._onReady()
            .then(() => {
                return self.waitFor(function() {
                    return self.page.evaluate(function(jsSelector) {
                        return !!document.querySelector(jsSelector);
                    }, selector);
                });
            });
    },

    fetchText: function(elementSelector) {
        var self = this;

        var textExtractor = function(jsSelector) {
            return document.querySelector(jsSelector).innerText;
        };

        return this._onReady()
            .then(function() {
                return self.page.evaluate(textExtractor, elementSelector);
            });
    }


});

module.exports = TinyBrowser;
