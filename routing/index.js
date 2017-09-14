process.env.UV_THREADPOOL_SIZE = Math.ceil(require('os').cpus().length * 1.5);

var express = require('express');
var OSRM = require('osrm');
var path = require('path');

var app = express();
var osrm_car = new OSRM(path.join(__dirname,"./data/car/berlin-latest.osrm")),
    osrm_foot = new OSRM(path.join(__dirname,"./data/foot/berlin-latest.osrm")),
    osrm_bicycle = new OSRM(path.join(__dirname,"./data/bicycle/berlin-latest.osrm"));

// Accepts a query like:
// http://localhost:8888?start=13.414307,52.521835&end=13.402290,52.523728
app.get('/', function(req, res) {
    if (!req.query.start || !req.query.end) {
        return res.json({"error":"invalid start and end query"});
    }
    var coordinates = [];
    var start = req.query.start.split(',');
    coordinates.push([+start[0],+start[1]]);
    var end = req.query.end.split(',');
    coordinates.push([+end[0],+end[1]]);
    var query = {
        coordinates: coordinates,
        //steps: true,
        geometries:'geojson',
        alternateRoute: req.query.alternatives !== 'false'
    };

    var r = {car:null,foot:null,bicycle:null};

    osrm_car.route(query, function(err, result) {
        if (err) return res.json({"error":err.message});
        r.car = result;

        osrm_foot.route(query, function(err, result) {
            if (err) return res.json({"error":err.message});
            r.foot = result;

            osrm_bicycle.route(query, function(err, result) {
                if (err) return res.json({"error":err.message});
                r.bicycle = result;
                
                return res.json(r)
            });
            
        });
    });
});

console.log('Listening on port: ' + 1717);
app.listen(1717);