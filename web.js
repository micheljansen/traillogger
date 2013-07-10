var ejs = require("ejs");
var express = require("express");
var pg = require("pg");
var app = express();
var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/gpslogger';
var pgc = new pg.Client(connectionString);

app.use(express.logger());
app.use(express.static(__dirname + '/public'));
pgc.connect();

// call function nextStep after guaranteeing that a client row exists.
function with_client_do(request, response, nextStep) {
  // To Get a Cookie
  var cookies = {};
  request.headers.cookie && request.headers.cookie.split(';').forEach(function( cookie ) {
    var parts = cookie.split('=');
    cookies[ parts[ 0 ].trim() ] = ( parts[ 1 ] || '' ).trim();
  });
  console.log("cookies", cookies);

  var clientid;

  var createNew = function(nextStep) {
    pgc.query('INSERT INTO clients(user_agent, created_at, debug) VALUES($1, now(), $2) RETURNING *', [request.headers["user-agent"], Date()])
    .on('row', function (row) {
      console.log("inserted:", row);
      clientid = row.id;
      // Write a Cookie
      response.writeHead(200, {
        'Set-Cookie': 'clientid='+clientid
      });
      console.log("New client", clientid);

      nextStep(row);
    });
  }

  if("clientid" in cookies) {
    clientid = cookies["clientid"];
    var found = false;
    pgc.query('SELECT * from clients WHERE id=$1', [clientid])
    .on('row', function(row) {
      console.log("found row");
      found = true;
      nextStep(row);
    })
    .on('end', function() {
      if(!found) {
        console.log("cookie without database record");
        createNew(nextStep);
      }
    });
  }
  else {
    // Generate ID
    createNew(nextStep);
  }
}

app.get('/', function(request, response) {
  with_client_do(request, response, function(client) {
    var clientid = client.id;
    //response.write(JSON.stringify(client, null, 2));
    response.render("index.ejs", {}, function(err, html) {
      response.write(html);
      response.end();
    });
  });
});

app.get('/ping', function(request, response) {
  with_client_do(request, response, function(client) {
    var clientid = client.id;
    var q = request.query;
    console.log(q["t"], q["lat"], q["long"], q["acc"], q["alt"], q["ala"]);
    pgc.query("INSERT INTO datapoints(\
                 client_id, created_at, sent_at, generated_at, latitude, longitude, accuracy, altitude, altitude_accuracy, debug)\
                 VALUES($1, now(), to_timestamp($2), to_timestamp($3), $4, $5, $6, $7, $8, $9) RETURNING *",
                 [clientid, q["t"], q["t"], q["lat"], q["long"], q["acc"], q["alt"], q["alt_acc"], request.headers],
             function(err, row) {
               response.write(JSON.stringify([err,row], null, 2));
               response.end();
             });
  });
});

app.get('/trails.json', function(request, res) {
  var q = request.query;
  var from = q["from"] ? q["from"] : "2013-01-01";
  var to = q["to"] ? q["to"] : "2014-01-01";
  console.log(from);
  pgc.query({
    text: "SELECT client_id, generated_at,latitude,longitude,accuracy from datapoints\
            WHERE accuracy < 100 AND generated_at >= $1 AND generated_at <= $2\
            ORDER BY generated_at, client_id",
    values: [from, to]
  }, function(err, result) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.write(JSON.stringify(result.rows, null, 2));
    res.end();
  });
});

app.get('/show', function(request, response) {
  response.render("show.ejs");
});


var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
