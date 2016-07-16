var express = require('express');
var path = require('path');

var app = express();
var controllers = require('./controllers');

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', controllers);

module.exports = app;

