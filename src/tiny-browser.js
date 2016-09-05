"use strict";

import phantom from "phantom";
var debug = require('debug')('tiny-browser');


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
        debug('Initializing phantom instance.');
        this._phInstance = await phantom.create();

        debug('Initializing phantom page instance.');
        this._page = await this._phInstance.createPage();

        this._wireUpEvents();
    }

    /**
     * Wires all the needed events from phantom runtime
     */
    _wireUpEvents() {
        const self = this;

        this._page.on('onConsoleMessage', (message, lineNum, sourceId) => {
            debug('Received message in browser console: %s', message);
        });

        this._page.on('onLoadStarted', () => {
            self._page.property('url').then(url => {
                debug('Started loading page: %s', url);

                // Moved here, because the actions that this change triggers
                // will execute before the debug message
                // and will confuse whomever reads the logs about the order of actions
                self._loading = true;
            });
        });

        this._page.on('onLoadFinished', status => {

            self._page.property('url')
                .then(url => {
                    debug('Finished loading page: %s', url);
                })
                .then(function() {
                    return self.injectClientUtils();
                })
                .then(function() {
                    self._loading = false;
                })
                .catch(err => {
                    debug('Error processing onLoadFinished(). ' + err);
                })
        });

        this._page.on('onError', function(message, trace) {
            // TODO: print trace too
            debug('Error on javascript execution: %s', message);
        });
    }

    async injectClientUtils() {
        const clientUtilsInjected = await this._page.evaluate(function() {
            return typeof __utils__ === "object";
        });

        if (clientUtilsInjected === true) {
            debug('client utils already injected.');
            return Promise.resolve();
        }

        debug('client utils not already injected.');

        const includeResult = await this._page.injectJs(require('path').join(__dirname,'clientutils.js'));

        if (true === includeResult) {
            debug('Successfully injected client-side utilities');
        }
        else {
            debug('Error injecting client-side utilities.');
        }

        await this._page.evaluate(function() {
            window.__utils__ = new window.ClientUtils({});
        });
    }

    async _untilReady() {
        let self = this;

        const loaderPolling = new Promise(function(resolve, reject) {
            const started = Date.now();
            let interval = null;

            debug('Waiting for page to be ready ...');

            interval = setInterval(function() {
                let elapsed = (Date.now() - started);

                // if phantom is done loading
                // see the onLoadStarted and onLoadFinished events
                if (!self._loading) {
                    debug('Page ready after %d ms', elapsed);
                    clearInterval(interval);
                    resolve();
                }
                // or if the has passed the timeout
                // reject the promise notifying the reason
                else if (elapsed >= self._untilReadyTimeout) {
                    clearInterval(interval);
                    reject(`_untilReady timed out after: ${elapsed}`);
                }

            }, 10);
        });

        return loaderPolling;
    }

    /**
     * Evaluates a function in the webpage context
     *
     * @param      {Function}  fn      The function
     * @param      {...*}    args    Arguments to the function
     * @return     {Promise}        Promise that fulfill when operation completed
     */
    async evaluate(fn, args) {
        await this._untilReady();
        return this._page.evaluate.apply(this._page, arguments);
    }

    /**
     * Navigates to the specified url
     *
     * @param      {String}  url     The url
     */
    async open(url) {
        debug('Opening url: %s', url);

        await this._untilReady();
        await this._page.open(url);

        debug('Done opening url.');
    }

    /**
     * Clicks the element specified by selector
     *
     * @param      {String}  selector  The selector
     */
    async click(selector) {
        debug('Clicking selector: %s', selector);

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

        debug('Done clicking selector.');
    }

    async fillForm(data) {
        debug('Filling fields with values: %s', JSON.stringify(data));

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
        debug('Capturing screenshot to: %s', outPath);
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
                            reject(new Error(`waitFor predicate timedout after ${elapsed}.`));
                        }
                    })
                    .catch(err => {
                        reject(err);
                    });
            }, 10);
        });

        await this._untilReady();
        return conditionPolling;
    }

    /**
     * Returns true/false depending if the element identify by selector
     * is visible
     *
     * @param      Boolean selector  The selector
     */
    async visible(selector) {
        debug(`Checking visibility of element ${selector}`);

        await this._untilReady();

        let result = await this._page.evaluate(function(domSelector) {
            return __utils__.visible(domSelector);
        }, selector);

        debug(`Element visibility: ${result}`);

        return result;
    }

    async waitWhileVisible(selector) {
        debug(`Waiting while ${selector} is visible.`);
        await this._untilReady();
        var self = this;


        return this.waitFor(function() {
            return self._page.evaluate(function(domSelector) {
                return !__utils__.visible(domSelector);
            }, selector);
        });
    }

    async waitForSelector(selector) {
        const self = this;
        debug(`entering waitForSelector`);

        let checkerFunction = function(domSelector) {
            return !!document.querySelector(domSelector);
        };

        await this._untilReady();

        return this.waitFor(function() {
            return self._page.evaluate(checkerFunction, selector);
        });
    }

    /**
     * Waits for timeout amount of miliseconds
     *
     * @param      Number   timeout  The timeout
     * @return     {Promise}  Promise that succeeds after timeout miliseconds
     */
    async wait(timeout) {
        timeout = timeout || 1000;

        debug(`called wait with a ${timeout}ms timeout.`);

        return new Promise((resolve, reject) => {
            setTimeout(function() {
                debug(`wait finished.`);
                resolve();
            }, timeout);
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
