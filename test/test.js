var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

var should = chai.should();
chai.use(chaiAsPromised);

var TinyBrowser = require('../tiny-browser');
var testServerApp = require('./testserver/app');
var http = require('http');


describe('TinyBrowser', function() {
    this.timeout(10000);

    var browser = new TinyBrowser();
    var server = http.createServer(testServerApp);

    before(function() {
        server.listen(3000);
    });

    describe('click', function() {
        it('should click the button', function() {
        
            return browser.open('http://localhost:3000/test-click/')
                .then(function() {
                    return browser.click('#click-here');
                })
                .then(function() {
                   return browser.fetchText('#message');
                })
                .should.eventually.equal('clicked button');
        })
    });
});

