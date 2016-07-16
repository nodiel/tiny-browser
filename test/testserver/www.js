var http = require('http');
var app = require('./app');

var server = http.createServer(app);

server.on('error', function(error) {
    console.log('Error: ', error);
});

server.listen(3000, function() {
    console.log('listening on 3000');
});

