var pg = require('pg')
  , connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/gpslogger'
  , client
  , query;

client = new pg.Client(connectionString);
client.connect();
query1 = client.query("alter table datapoints ALTER COLUMN generated_at SET DATA TYPE timestamp with time zone USING generated_at + interval '1 hour';");
query1.on('end', function() { client.end(); });
