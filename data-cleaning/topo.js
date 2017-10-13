var topojson = require('topojson'),
	//simplify = require('topojson-simplify'),
	d3 = require('d3'),
	fs = require('fs'),
	turf = require('turf')

var geojson = JSON.parse(fs.readFileSync('./data/lor_json/Bezirk.json','utf8'))
	geojson.features.forEach(function(f,fi){
		/*geojson.features[fi].properties['a'] = turf.area(f)
		geojson.features[fi].properties['s'] = geojson.features[fi].properties.SCHLUESSEL
		delete geojson.features[fi].properties.SCHLUESSEL*/
		for(var p in geojson.features[fi].properties){
			delete geojson.features[fi].properties[p]
		}
	});
var topology = topojson.topology({Bezirk: geojson});
	topology = topojson.presimplify(topology)
	topology = topojson.simplify(topology,0.000001)

fs.writeFileSync('./export/Bezirk.topojson', JSON.stringify(topology), 'utf8')