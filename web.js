var async = require('async');
var fs = require('fs');
var express = require('express');
var http = require('http');
var https = require('https');
var db = require ('./models');

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


app.get('/orders', function(request, response) {
    global.db.Order.findAll().success(function(orders) {
        var orders_json = [];
        orders.forEach(function(order) {
            orders_json.push({
                id: order.coinbase_id,
                amount: order.amount,
                time: order.time});
        });
        //Uses views/orders.html
        response.render("orders", {orders: orders_json});
    }).error(function(err) {
        console.log(err);
        response.send("error retrieving orders");
    });
});

//Hit this URL while on paleogrinds.com/orders to refresh
app.get('/refresh_orders', function(request, response) {
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
                        response.redirect("/orders");
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

//add order to the databse if it doesn't already exist
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