var fs = require('fs');
var express = require('express');

var app = express();


//VIEWS: TEMPLATING WITH EJS
//Allows naming of views with .html extension instead of .ejs
app.engine('.html', require('ejs').__express);

//Optional since express defaults to CWD/views
app.set('views', __dirname + '/views');

//Without this an extension is needed when calling res.render()
//ex: res.render('users.html') vs. res.render('users')
app.set('view engine', 'html')


//MIDDLEWARE
app.use(express.logger());
app.use(express.static(__dirname + '/public'));
app.use(express.cookieParser());
app.use(express.session({secret: 'ceiling cat'}));
app.use(express.favicon(__dirname + '/public/img/favicon.ico'));


//ROUTES
app.get('/', function(request, response) {
    response.render('index', { 
        title: "Welcome to PaleoGrinds" 
    });
});

app.get('/login', function(request, response) {
    response.render('login', {
        title: "PaleoGrinds Login"
    });
});


//START SERVER
var port = process.env.PORT || 8080;

app.listen(port, function() {
  console.log("Listening on " + port);
});
