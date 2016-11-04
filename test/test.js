var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

var should = chai.should();
chai.use(chaiAsPromised);

var browser = require('../');
var testServerApp = require('./testserver/app');
var http = require('http');


describe('TinyBrowser', function() {
    this.timeout(0);
    this.slow(2 * 1000);

    var server = http.createServer(testServerApp);

    before(function() {
        server.listen(3000);
    });

    describe('#click()', function() {
        it('should click the button', function() {
            var browserInstance = null;

            return browser.create()
                .then(function(instance) {
                    browserInstance = instance;

                    return browserInstance.open('http://localhost:3000/test-click/');
                })
                .then(function() {
                    return browserInstance.click('#click-here');
                })
                .then(function() {
                   return browserInstance.fetchText('#message');
                })
                .should.eventually.equal('clicked button');
        });
    });

    describe('#waitForSelector()',function() {
        it('should fulfill after 2 secs approx', function(done) {
            var browserInstance = null;

            return browser.create()
                .then(function(instance) {
                    browserInstance = instance;
                    return instance.open('http://localhost:3000/test-waitfor/');
                })
                .then(function() {
                    return browserInstance.waitForSelector('label#delayed-text.dummy-class');
                })
                .then(function() {
                    done();
                })
                .catch(function(err) {
                    done(err);
                });
        });
    });

    describe('#evaluate()', function() {
        it('should successfully evaluate the function in the remote webpage.', function() {
            var browserInstance = null;

            return browser.create()
                .then(function(instance) {
                    browserInstance = instance;
                    return browserInstance.open('http://localhost:3000/test-click/')
                })
                .then(function() {
                    return browserInstance.click('#click-here');
                })
                .then(function() {
                    return browserInstance.evaluate(function() {
                        var label = document.querySelector('#message');

                        if (label) {
                            return label.innerText;
                        }

                        return 'ERROR';
                    });
                })
                should.eventually.equal('clicked button');
        });
    });

    describe('#evaluate()', function() {
        it('should evaluate the passed function with the paramaters passed as well', function() {
            var browserInstance = null;

            return browser.create()
                .then(function(instance) {
                    browserInstance = instance;
                    return browserInstance.open('http://localhost:3000/');
                })
                .then(function() {
                    return browserInstance.evaluate(function(selector) {
                        return document.querySelector(selector).innerText;
                    }, '#header');
                })
                .should.eventually.equal('Some header');
        });
    });

    describe('#visible()', function() {
        it('should return false for not visible elements', function(){
            var browserInstance = null;

            return browser.create()
                .then(function(instance) {
                    browserInstance = instance;
                    return browserInstance.open('http://localhost:3000/visible/');
                })
                .then(function() {
                    return browserInstance.visible('#visibilityHidden')
                        .should.eventually.equal(false);
                })
                .then(function() {
                    return browserInstance.visible('#displayNone')
                        .should.eventually.equal(false);
                });
        });
        it('should return true for visible elements', function() {
            var browserInstance = null;

            return browser.create()
                .then(function(instance) {
                    browserInstance = instance;
                    return browserInstance.open('http://localhost:3000/visible/');
                })
                .then(function() {
                    return browserInstance.visible('#visibleBlock')
                        .should.eventually.equal(true);
                });
        });
    });

    describe('#injectClientUtils()', function() {
        it('should properly inject the client utils in the remote webpage.', function() {
            var browserInstance = null;

            return browser.create()
                .then(function(instance) {
                    browserInstance = instance;
                    return browserInstance.open('http://localhost:3000/test-clientutils/');
                })
                .then(function() {
                    return browserInstance.click('#clickme');
                })
                .then(function() {
                    return browserInstance.fetchText('#result');
                })
                .should.eventually.equal('OK');
        });
    });

    describe('#waitWhileVisible()', function() {
        it('should succeed after aprox 2 seconds.', function(done) {
            var browserInstance = null;

            return browser.create()
                .then(function(instance) {
                    browserInstance = instance;
                    return browserInstance.open('http://localhost:3000/test-waitwhilevisible/');
                })
                .then(function() {
                    return browserInstance.waitWhileVisible('#inner')
                })
                .then(function() {
                    done();
                })
                .catch(function(err) {
                    done(err);
                });
        });
    });

    describe('#fillForm()', function() {
        it('should fill the input fields correctly and fire all the events [change, input] attached on them.', function() {
            var browserInstance = null;

            return browser.create()
                .then(function(instance) {
                    browserInstance = instance;
                    return browserInstance.open('http://localhost:3000/test-fill/');
                })
                .then(function() {
                    return browserInstance.fillForm({
                        '#select-here': '2'
                    });
                })
                .then(function() {
                    return browserInstance.fetchText('#notify');
                })
                .should.eventually.equal('changed');
            });

        });
});
