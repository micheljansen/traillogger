var cluster = require('cluster');
var ejs = require("ejs");
var express = require("express");
var pg = require("pg");
var async = require("async");
var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/gpslogger';
var port = process.env.PORT || 5000;
var numCPUs = require('os').cpus().length;



// call function nextStep after guaranteeing that a client row exists.
function with_client_do(request, response, nextStep) {
  // To Get a Cookie
  var cookies = {};
  request.headers.cookie && request.headers.cookie.split(';').forEach(function( cookie ) {
    var parts = cookie.split('=');
    cookies[ parts[ 0 ].trim() ] = ( parts[ 1 ] || '' ).trim();
  });
  //console.log("cookies", cookies);

  var clientid;

  var createNew = function(nextStep) {
    pgc.query('INSERT INTO clients(user_agent, created_at, debug) VALUES($1, now(), $2) RETURNING *', [request.headers["user-agent"], Date()])
    .on('row', function (row) {
      //console.log("inserted:", row);
      clientid = row.id;
      // Write a Cookie
      response.writeHead(200, {
        'Set-Cookie': 'clientid='+clientid
      });
      //console.log("New client", clientid);

      nextStep(row);
    });
  }

  if("clientid" in cookies) {
    clientid = cookies["clientid"];
    var found = false;
    pgc.query('SELECT * from clients WHERE id=$1', [clientid])
    .on('row', function(row) {
      //console.log("found row");
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



if (cluster.isMaster) {
  console.log('Master:');

  for (var i = 0; i < numCPUs-1; i++) {
    cluster.fork();
  }

  cluster.on('exit', function(worker) {
    console.error('DEATH:', worker.pid);
    cluster.fork();
  });
}
else {

  var app = express();
  //app.use(express.logger());
  app.use(express.static(__dirname + '/public'));
  app.use(express.bodyParser());

  var pgc = new pg.Client(connectionString);
  pgc.connect();


  app.get('/', function(request, response) {
    with_client_do(request, response, function(client) {
      var clientid = client.id;
      //response.write(JSON.stringify(client, null, 2));
      response.render("index.ejs", {clientid: clientid}, function(err, html) {
        response.write(html);
        response.end();
      });
    });
  });

  app.post('/ping', function(request, response) {
    with_client_do(request, response, function(client) {
      var clientid = client.id;
      var q = request.body;

      var fix = function(x) {
        var ret = parseFloat(x);
        return isNaN(ret) ? null : ret;
      }

      var data = [clientid,
        fix(q["t"]) , fix(q["t"]), fix(q["lat"]), fix(q["long"]), fix(q["acc"]), fix(q["alt"]), fix(q["alt_acc"]), null];
      pgc.query("INSERT INTO datapoints(\
                client_id, created_at, sent_at, generated_at, latitude, longitude, accuracy, altitude, altitude_accuracy, debug)\
                VALUES($1, now(), to_timestamp($2), to_timestamp($3), $4, $5, $6, $7, $8, $9) RETURNING *",
                data,
                function(err, row) {
                  response.write(JSON.stringify([err,row], null, 2));
                  response.end();
                });
    });
  });

  app.get('/trails.json', function(request, res) {
    var q = request.query;
    var from = q["from"] ? q["from"] : "2013-08-09T20:21:00";
    var to = q["to"] ? q["to"] : "2013-08-09T23:59:00";
    console.log(from);
    pgc.query({
      text: "SELECT id, client_id, generated_at,latitude,longitude,accuracy from datapoints\
      WHERE accuracy < 50 AND generated_at >= $1 AND generated_at <= $2\
      ORDER BY generated_at, client_id",
      values: [from, to]
    }, function(err, result) {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.write(JSON.stringify(result.rows, null, 2));
      res.end();
    });
  });

  app.get('/segments.json', function(request, res) {
    var q = request.query;
    // var timesegments = q["times"] ? JSON.parse(q["times"]) : [["2013-08-09T20:21:00", "2013-08-09T23:59:00"]];
    var timesegments = q["times"] ? JSON.parse(q["times"]) : [
      ["2013-08-09T20:25:00Z", "2013-08-09T20:42:00Z"],
      ["2013-08-09T20:56:00Z", "2013-08-09T21:08:00Z"],
      ["2013-08-09T21:21:00Z", "2013-08-09T21:29:00Z"],
      ["2013-08-09T21:32:00Z", "2013-08-09T21:42:00Z"],
      ["2013-08-09T21:49:00Z", "2013-08-09T21:52:00Z"],
      ["2013-08-09T21:52:00Z", "2013-08-09T21:56:00Z"],
    ];
    console.log(timesegments);

    async.map(timesegments, getSegment, function(err, results) {
      // beat data into shape
      // starting by extracting the rows from the different timesegments
      var rowsets = results.map(function(x) {
        // break up by client_id
        return x.rows.reduce(function(coll, cur) {
          var cid = ""+cur.client_id
          coll[cid] = coll[cid] || [];
          coll[cid].push(cur);
          return coll;
        }, {});
      });
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.write(JSON.stringify(rowsets, null, 2));
      res.end();
    });

    function getSegment(timerange, callback) {
      pgc.query({
        text: "SELECT id, client_id, generated_at,latitude,longitude,accuracy from datapoints\
        WHERE accuracy < 50 AND generated_at >= $1 AND generated_at <= $2\
        ORDER BY client_id, generated_at",
        values: timerange
      }, callback);
    }

  });



  app.get('/grouped.json', function(request, res) {
    var q = request.query;
    var from = q["from"] ? q["from"] : "2013-08-09T20:21:00";
    var to = q["to"] ? q["to"] : "2013-08-09T23:59:00";
    console.log(from);
    pgc.query({
      text: "SELECT id, client_id, generated_at,latitude,longitude,accuracy from datapoints\
      WHERE accuracy < 50 AND generated_at >= $1 AND generated_at <= $2\
      ORDER BY client_id, generated_at",
      values: [from, to]
    }, function(err, result) {
      var grouped = result.rows.reduce(function(coll, cur) {
        var cid = ""+cur.client_id
        coll[cid] = coll[cid] || [];
        coll[cid].push(cur);
        return coll;
      }, {});
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.write(JSON.stringify(grouped, null, 2));
      res.end();
    });
  });

  app.get('/show', function(request, response) {
    response.render("show.ejs");
  });


  app.listen(port, function() {
    // console.log("Worker", cluster.worker.id, "listening on ", port);
  });

}
