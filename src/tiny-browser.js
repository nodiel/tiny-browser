"use strict";

import phantom from "phantom";

class TinyBrowser {

    /**
     * Creates a new instance of TinyBrowser
     *
     * @param      {Object}  options  Options passed to the browser and phantom
     * @return     {TinyBrowser}  a new instance of TinyBrowser
     */
    static async create(options) {
        let browserInstance = new TinyBrowser();

        browserInstance._loading = false;
        browserInstance._untilReadyTimeout = 10 * 1000;

        await browserInstance._init();
        return browserInstance;
    }

    /**
     * Initializes the phantom instance and page
     */
    async _init() {
        this._phInstance = await phantom.create();
        this._page = await this._phInstance.createPage();

        this._wireUpEvents();
    }

    /**
     * Wires all the needed events from phantom runtime
     */
    _wireUpEvents() {
        const self = this;

        this._page.on('onConsoleMessage', (message, lineNum, sourceId) => {
            console.log('CONSOLE: ' + message + ' (from line ' + lineNum + ' in ' + sourceId);
        });

        this._page.on('onLoadStarted', () => {
            self._loading = true;
        });

        this._page.on('onLoadFinished', status => {
            self._loading = false;
        });

        this._page.on('onError', function(message, trace) {
            var msgStack = ['ERROR: ' + message];

            if (trace && trace.length) {
                msgStack.push('TRACE:');

                trace.forEach(function(t) {
                    msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function +'")' : ''));
                });
            }

            console.error(msgStack.join('\n'));
        });
    }

    async _untilReady() {
        let self = this;

        const loaderPolling = new Promise(function(resolve, reject) {
            const started = Date.now();
            let interval = null;

            interval = setInterval(function() {
                let elapsed = (Date.now() - started);

                // if phantom is done loading
                // see the onLoadStarted and onLoadFinished events
                if (!self._loading) {

                    clearInterval(interval);
                    resolve();
                }
                // or if the has passed the timeout
                // reject the promise notifying the reason
                else if (elapsed >= self._untilReadyTimeout) {
                    clearInterval(interval);
                    reject(`_untilReady timed out after: ${elapsed}`);
                }

            }, 50);
        });

        return loaderPolling;
    }

    /**
     * Navigates to the specified url
     *
     * @param      {String}  url     The url
     */
    async open(url) {
        await this._untilReady();
        await this._page.open(url);
    }

    /**
     * Clicks the element specified by selector
     *
     * @param      {String}  selector  The selector
     */
    async click(selector) {
        let clickFunction = function(domSelector) {
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

        await this._untilReady();
        await this._page.evaluate(clickFunction, selector);
    }

    async fillForm(data) {

        let fillerFunction = function(domData) {
            for (var selector in domData) {
                var element = document.querySelector(selector);

                if (!element) {
                    console.log('Not found sleector. fillForm');
                    continue;
                }

                element.value = domData[selector];
            }
        };

        await this._untilReady();
        await this._page.evaluate(fillerFunction, data);
    }

    async capture(outPath) {
        await this._untilReady();

        return await this._page.render(outPath);
    }

    async waitFor(asyncPredicate, timeout) {
        const self = this;

        let maxTimeout = timeout || 5 * 1000;

        let conditionPolling = new Promise(function(resolve, reject) {
            const started = Date.now();
            let interval = null;

            interval = setInterval(() => {
                asyncPredicate.call(self)
                    .then(result => {
                        let elapsed = Date.now() - started;

                        if (result) {
                            clearInterval(interval);
                            resolve();
                        }

                        else if (elapsed >= maxTimeout) {
                            clearInterval(interval);
                            reject(`waitFor timed out after: ${elapsed}`);
                        }
                    })
                    .catch(err => {
                        reject(err);
                    });
            });
        });

        await this._untilReady();
        return conditionPolling;
    }

    async waitForSelector(selector) {
        const self = this;

        let checkerFunction = function(domSelector) {
            return !!document.querySelector(domSelector);
        };

        await this._untilReady();

        return this.waitFor(function() {
            return self._page.evaluate(checkerFunction, selector);
        });
    }

    async fetchText(selector) {
        let textExtractor = function(domSelector) {
            return document.querySelector(domSelector).innerText;
        };

        await this._untilReady();
        return await this._page.evaluate(textExtractor, selector);
    }

    async destroy() {
        await this._untilReady();
        return this._phInstance.exit();
    }
}

module.exports = TinyBrowser;
