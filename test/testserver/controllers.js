var express = require('express');
var router = express.Router();

router.get('/test-click', function(request, response) {
    response.render('test-click');    
});

router.get('/test-waitfor', function(request, response) {
    response.render('waitfor');
});

module.exports = router;
