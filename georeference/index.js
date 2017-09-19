var fs = require('fs'),
  sqlite = require('better-sqlite3'),
  d3 = require('d3'),
  express = require('express')

var db = new sqlite('address.db', {memory:true});


db.prepare("CREATE TABLE IF NOT EXISTS streets (id INTEGER UNIQUE PRIMARY KEY AUTOINCREMENT, street text collate nocase, plz integer)").run()
db.prepare("CREATE TABLE IF NOT EXISTS streetnumbers (id INTEGER UNIQUE PRIMARY KEY AUTOINCREMENT, street integer, num text, plz interger, lat float, lon float)").run()

var streets = d3.csvParse(fs.readFileSync('./data/streets.csv','utf8'))

streets.forEach((s,i)=>{
  var plz = parseInt(s.plz)
  if(isNaN(plz)){
    plz = 0
  }
  var params = [s.street, plz]
  db.prepare('INSERT INTO streets (street, plz) VALUES (?,?)').run(params)
})

var streetnumbers = d3.csvParse(fs.readFileSync('./data/address.min.csv','utf8'))

streetnumbers.forEach((s,i)=>{
  var params = [parseInt(s.street)+1, s.hsnr, parseInt(s.plz), parseFloat(s.lat), parseFloat(s.lon)]
  db.prepare('INSERT INTO streetnumbers (street, num, plz, lat, lon) VALUES (?,?,?,?,?)').run(params)
})

var app = express()

app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

app.get('/street', function(req, res) {
  if (!req.query.street) {
    return res.json({"error":"invalid query"})
  }
  var rows = db.prepare("SELECT id,street,plz FROM streets WHERE street LIKE ?").all([req.query.street+'%'])
  res.json(rows)
})

app.get('/num', function(req, res) {
  if (!req.query.street) {
    return res.json({"error":"invalid query"})
  }
  var rows = db.prepare("SELECT num,id FROM streetnumbers WHERE street = ?").all([parseInt(req.query.street)])
  res.json(rows)
})

app.get('/geo', function(req, res) {
  if (!req.query.num) {
    return res.json({"error":"invalid query"})
  }
  var rows = db.prepare("SELECT lat,lon FROM streetnumbers WHERE id = ?").get([parseInt(req.query.num)])
  res.json(rows)
})

console.log('Listening on port: ' + 1818)
app.listen(1818)