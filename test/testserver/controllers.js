var express = require('express');
var router = express.Router();

router.get('/test-click', function(request, response) {
    response.render('test-click');    
});


module.exports = router;