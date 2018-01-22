let d3 = require('d3'),
	fs = require('fs')

let data = d3.csvParse(fs.readFileSync('./kitas.csv', 'utf8'))

data.forEach( d => {
	d.id = parseInt(d.id);
	d.all = parseInt(d.all);
	d.over = parseInt(d.over);
	d.under = parseInt(d.under);
	d.plz = parseInt(d.plz);
	d.alat = parseFloat(d.alat);
	d.alon = parseFloat(d.alon);
	d.type = parseInt(d.type);
	d.parent = parseInt(d.parent);
	d.parentType = parseInt(d.parentType);

	(["mo","tu","we","th","fr"]).forEach(function(dd){
		(["c","o"]).forEach(function(ddd){
		    d[dd+"_"+ddd] = timeConversion(d[dd+"_"+ddd])
		})
	})

})

function timeConversion(t){
  if(t && t.indexOf(':')>=0){
    let times = t.split(':');
    return parseInt(times[0])*4 + parseInt(times[1])/15;
  }
  return 'NaN';
}

let columns = ["id","alat","alon","address","district","plz","educational","topics","languages","name","type","parent","parentType","mo_o","mo_c","tu_o","tu_c","we_o","we_c","th_o","th_c","fr_o","fr_c","all","over","under"];

let csv = '';

columns.forEach((c,i)=>{
	if(i>0){
		csv += ','
	}
	csv += c
})

data.forEach(d=>{
	csv += '\n'
	columns.forEach((c,i)=>{
		if(i>0){
			csv += ','
		}
		if(typeof d[c] == 'string' && d[c] != '' && d[c] != 'NaN'){
			csv += '"'
		}
		csv += d[c]
		if(typeof d[c] == 'string' && d[c] != '' && d[c] != 'NaN'){
			csv += '"'
		}
	})	
})

fs.writeFileSync('kitas_clean.csv', csv, 'utf8')