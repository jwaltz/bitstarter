var async = require('async');
var fs = require('fs');
var express = require('express');
var http = require('http');
var https = require('https');
var db = require ('./models');
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;

//Serialize and deserialize users out of the session.
passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://paleogrinds.com/auth/facebook/callback"
}, function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
        return done(null, profile);
    });
}));

var app = express();

//VIEWS: TEMPLATING WITH EJS
//Allows naming of views with .html extension instead of .ejs
app.engine('.html', require('ejs').__express);

//Optional since express defaults to CWD/views
app.set('views', __dirname + '/views');

//Without this an extension is needed when calling res.render()
//ex: res.render('users.html') vs. res.render('users')
app.set('view engine', 'html')

app.set('port', process.env.PORT || 8080);

//MIDDLEWARE
app.use(express.logger());
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.session({secret: 'ceiling cat'}));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(__dirname + '/public'));
app.use(express.favicon(__dirname + '/public/img/favicon.ico'));


//ROUTES
app.get('/', function(request, response) {
    response.render('index', { 
        user: request.user,
        title: "Welcome to PaleoGrinds",
        page: "home"
    });
});

app.get('/account', ensureAuthenticated, function(request, response) {
    response.render('account', {
        user: request.user
    });
});

app.get('/login', function(request, response) {
    response.render('login', {
        user: request.user,
        title: "Please Login",
        page: "login"
    });
});

app.get('/auth/facebook',
        passport.authenticate('facebook'),
        function(request, response) {
            //the request will be redirected to Facebook for authentication
            //this function will not be called
        });

app.get('/auth/facebook/callback',
        passport.authenticate('facebook', {
            failureRedirect: '/login'
        }),
        function(request, response) {
            response.redirect('/');
        });

app.get('/logout', function(request, response) {
    request.logout();
    response.redirect('/');
});

function ensureAuthenticated(request, response, next) {
    if (request.isAuthenticated()) {
        return next();
    }
    response.redirect('login');
}

app.get('/contact', function(request, response) {
    response.render('contact', {
        user: request.user,
        title: "Contact Us",
        page: "contact"
    });
});


app.get('/donations', function(request, response) {
    global.db.Order.findAll().success(function(orders) {
        var orders_json = [];
        orders.forEach(function(order) {
            orders_json.push({
                id: order.coinbase_id,
                amount: order.amount,
                time: order.time});
        });
        //Uses views/orders.html
        response.render("donations", {
            user: request.user,
            orders: orders_json,
            title: "List of Donations",
            page: "donations"
        });
    }).error(function(err) {
        console.log(err);
        response.send("error retrieving orders");
    });
});

//Hit this URL while on paleogrinds.com/orders to refresh
app.get('/refresh_donations', function(request, response) {
    https.get("https://coinbase.com/api/v1/orders?api_key=" + process.env.COINBASE_API_KEY, function(res) {
        var body = '';
        res.on('data', function(chunk) {body += chunk;});
        res.on('end', function() {
            try {
                var orders_json = JSON.parse(body);
                if (orders_json.error) {
                    response.send(orders_json.error);
                    return;
                }
                //add each order asynchronously
                async.forEach(orders_json.orders, addOrder, function(err) {
                    if (err) {
                        console.log(err);
                        response.send("error adding orders");
                    } else {
                        //orders added successfully
                        response.redirect("/donations");
                    }
                });
            } catch (error) {
                console.log(error);
                response.send("error parsing json");
            }
        });
        
        res.on('error', function(e) {
            console.log(e);
            response.send("error syncing orders");
        });
    });
});

//sync the database and start the server
db.sequelize.sync().complete(function(err) {
    if (err) {
        throw err;
    } else {
        http.createServer(app).listen(app.get('port'), function() {
            console.log("Listening on " + app.get('port'));
        });
    }
});

//add order to the database if it doesn't already exist
var addOrder = function(order_obj, callback) {
    var order = order_obj.order; //order json from coinbase
    if (order.status != "completed") {
        //only add completed orders
        callback();
    } else {
        var Order = global.db.Order;
        //find if order has already been added to our database
        Order.find({where: {coinbase_id: order.id}}).success(function(order_instance) {
            if (order_instance) {
                //order already exists, do nothing
                callback();
            } else {
                //build instance and save
                var new_order_instance = Order.build({
                    coinbase_id: order.id,
                    amount: order.total_btc.cents / 100000000,  //convert satoshis to BTC
                    time: order.created_at
                });
                new_order_instance.save().success(function() {
                    callback();
                }).error(function(err) {
                    callback(err);
                });
            }
        });
    }
};