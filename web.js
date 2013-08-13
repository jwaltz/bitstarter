var fs = require('fs');
var express = require('express');

var logFile = fs.createWriteStream('./log.txt', {flags: 'a'});

var app = express.createServer();
app.use(express.logger({stream: logFile}));
app.use(express.static(__dirname));

app.get('/', function(request, response) {
    fs.readFile('index.html', function(err, data) {
        if (err) throw err;
        response.send(data);
    });
});

app.get('/login.html', function(request, response) {
    fs.readFile('login.html', function(err, data) {
        if (err) throw err;
        response.send(data);
    });
});

var port = process.env.PORT || 8080;
app.listen(port, function() {
  console.log("Listening on " + port);
});
