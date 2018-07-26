let turf = require('turf'),
	fs = require('fs'),
	d3 = require('d3')

let v2 = JSON.parse(fs.readFileSync('./data/ftp/kitas.json', 'utf8')),
	v1 = d3.csvParse(fs.readFileSync('../app/data/kitas_clean.csv', 'utf8'))

let v1Keys = {}

v1.forEach((d,i)=>{
	v1Keys[d.id] = i
})

let missing = [], nogeo = [], distances = [], geos = ['','a','g1','g2']

v2.data.forEach(d=>{
	if(d.id in v1Keys){
		if('geo' in d){

			let dist = [d.id]

			geos.forEach(g=>{
				if(g+'lat' in d.geo){
					let p1 = turf.point([d.geo[g+'lon'], d.geo[g+'lat']]),
						p2 = turf.point([v1[v1Keys[d.id]].alon, v1[v1Keys[d.id]].alat])

					dist.push(turf.distance(p1,p2))
				}else{
					dist.push(NaN);
				}
			})

			distances.push(dist);
		}else{
			nogeo.push(d.id)
		}
	}else{
		missing.push(d.id)
	}
})

fs.writeFileSync('./data/check_missing.txt', missing.join(','), 'utf8')
fs.writeFileSync('./data/check_nogeo.txt', nogeo.join(','), 'utf8')

distances.sort((a,b)=>{
	return a[1]-b[1]
})

let csv = 'id,distance'

distances.forEach(d=>{
	csv += '\n'
	d.forEach((dd,ii)=>{
		if(ii>0){
			csv += ','
		}
		csv += dd
	})
})

fs.writeFileSync('./data/check_distances.csv', csv, 'utf8')