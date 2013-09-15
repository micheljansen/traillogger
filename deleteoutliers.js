var pg = require('pg')
  , connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/gpslogger'
  , client
  , query;

client = new pg.Client(connectionString);
client.connect();
query1 = client.query("DELETE FROM datapoints WHERE id IN (21310, 20885, 15003, 23719, 26925, 25928, 20045, 26234, 14584)");
query1.on('end', function() { client.end(); });
