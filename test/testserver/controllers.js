var express = require('express');
var router = express.Router();

router.get('/test-click', function(request, response) {
    response.render('test-click');
});

router.get('/test-waitfor', function(request, response) {
    response.render('waitfor');
});

router.get('/', function(request, response) {
    response.render('home');
});

router.get('/visible', function(request, response) {
    response.render('visible');
});

module.exports = router;
