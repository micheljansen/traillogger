var pg = require('pg').native
  , connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/gpslogger'
  , client
  , query;

client = new pg.Client(connectionString);
client.connect();
query1 = client.query('DROP TABLE IF EXISTS clients');
query1 = client.query('DROP TABLE IF EXISTS datapoints');
query1 = client.query('CREATE TABLE clients (id SERIAL, created_at TIMESTAMP WITH TIME ZONE, user_agent TEXT, debug TEXT)');
query2 = client.query("CREATE TABLE datapoints \
                      (id SERIAL, \
                      client_id INT NOT NULL, \
                      created_at TIMESTAMP WITH TIME ZONE NOT NULL, \
                      sent_at TIMESTAMP, \
                      generated_at TIMESTAMP, \
                      latitude NUMERIC, \
                      longitude NUMERIC, \
                      accuracy NUMERIC, \
                      altitude NUMERIC, \
                      altitude_accuracy NUMERIC, \
                      debug TEXT)");
query2.on('end', function() { client.end(); });
