var fs = require('fs');
var express = require('express');

var logFile = fs.createWriteStream('./log.txt', {flags: 'a'});

var app = express.createServer();
app.use(express.logger({stream: logFile}));
app.use(express.static(__dirname));

var buffer = fs.readFileSync('index.html');

app.get('/', function(request, response) {
  response.send(buffer.toString());
});

var port = process.env.PORT || 8080;
app.listen(port, function() {
  console.log("Listening on " + port);
});
