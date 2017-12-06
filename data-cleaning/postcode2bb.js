let fs = require('fs'),
	turf = require('turf')

let geojson = JSON.parse(fs.readFileSync('data/plz.geojson', 'utf8'))

let bb = [],
	csv = 'id,xmin,ymin,xmax,ymax'

geojson.features.forEach(f=>{
	let b = turf.bbox(f)
	bb.push({
		id:f.properties.PLZ99,
		bb:b
	})
	csv += '\n' + f.properties.PLZ99 + ',' + b[0].toFixed(4) + ',' + b[1].toFixed(4) + ',' + b[2].toFixed(4) + ',' + b[3].toFixed(4)
})

fs.writeFileSync('data/plz.json', JSON.stringify(bb), 'utf8')
fs.writeFileSync('data/plz.csv', csv, 'utf8')