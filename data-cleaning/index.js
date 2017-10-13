var d3 = require('d3'),
  fs = require('fs'),
  stat = require('simple-statistics')

var years = [2001,2016],  
  data = {}

var csvParse = d3.dsvFormat(';')

var dictCSV = csvParse.parse(fs.readFileSync('./data/lor.csv', 'utf8'))

var dict = {}, id = 0

dictCSV.forEach(function(d){
  d.id1 = +d.id1
  d.id2 = +d.id2
  d.id3 = +d.id3
  d.id4 = +d.id4

  if(!(d.id1 in dict)){
    dict[d.id1] = {
      n:d.name1,
      c:{},
      id:id,
      fid:idStr([d.id1])
    }
    id++
  }
  if(!(d.id2 in dict[d.id1].c)){
    dict[d.id1].c[d.id2] = {
      n:d.name2,
      c:{},
      id:id,
      fid:idStr([d.id1,d.id2])
    }
    id++
  }
  if(!(d.id3 in dict[d.id1].c[d.id2].c)){
    dict[d.id1].c[d.id2].c[d.id3] = {
      n:d.name3,
      c:{},
      id:id,
      fid:idStr([d.id1,d.id2,d.id3])
    }
    id++
  }
  if(!(d.id4 in dict[d.id1].c[d.id2].c[d.id3].c)){
    dict[d.id1].c[d.id2].c[d.id3].c[d.id4] = {
      n:d.name4,
      id:id,
      fid:idStr([d.id1,d.id2,d.id3,d.id4])
    }
    id++
  }
});

function idStr(ids){
  var str = ''

  ids.forEach(function(id){
    if(id < 10){
      str += '0'+id
    }else{
      str += id
    }
  })

  return str
}

fs.writeFileSync('./export/lor_dict.json', JSON.stringify(dict), 'utf8')

for(var year = years[0]; year <= years[1]; year++){
  data[year] = csvParse.parse(fs.readFileSync('./data/EWR'+year+'12E_Matrix.csv', 'utf8'))
}

var group_labels = ['BEZ','PGR','BZR','PLR'],
  group = [],
  data_labels = ['E_E00_01','E_E01_02','E_E02_03','E_E03_05','E_E05_06', 'E_E']

for(var year in data){
  data[year].forEach(function(d,i){
    var ids = []

    group_labels.forEach(function(gl, glI){
      ids.push(+d[gl])
    })

    if(ids.reduce(function(a, b){return a + b;}, 0) > 0){

      var id = dict[ids[0]].c[ids[1]].c[ids[2]].c[ids[3]].id

      if(!(id in group)){
        group[id] = {}
      }

      group[id][year] = {}

      data_labels.forEach(function(dl){
        group[id][year][dl] = parseInt(d[dl].replace(',','.'))
      })

    }
  })
}

var csv = 'id', lc = 0, series = []

for(var id in group){
  var line = '\n'+id,
    serie = {}
  for(var year = years[0]; year <= years[1]; year++){
    data_labels.forEach(function(dl){
      if(!(dl in serie)){serie[dl]=[];}
      serie[dl].push(group[id][year][dl])
      if(lc == 0){      
        csv += ','+year+'_'+dl
      }
      line += ','+group[id][year][dl]
    })
  }
  series.push(serie);
  csv += line
  lc++
}

fs.writeFileSync('./export/EWR.csv', csv, 'utf8')

/*
//Prediction Test
var errors = {s:[],d:[]}

for(var ii = 0; ii<series.length; ii++){
  var res = []

  var starts = [], 
    startCount = 4, 
    count = series[ii]['E_E01_02'].length, 
    all = series[ii]['E_E01_02'].length,
    next

  for(var i = 0; i<startCount; i++){
    starts.push(all-count)
    count = count/2
  }

  for(var i = 0; i<starts.length; i++){
    var points = []

    for(var j = starts[i]; j<series[ii]['E_E01_02'].length-1; j++){
      points.push([j, (series[ii]['E_E01_02'][j] + series[ii]['E_E02_03'][j] + series[ii]['E_E03_05'][j] + series[ii]['E_E05_06'][j])])
    }

    next = (series[ii]['E_E01_02'][j] + series[ii]['E_E02_03'][j] + series[ii]['E_E03_05'][j] + series[ii]['E_E05_06'][j]);

    var l = stat.linearRegressionLine(stat.linearRegression(points))

    for(var k = 0; k<i; k++){
      res.push(l(j))
    }
  }

  if(next != 0){
    errors.s.push(Math.round(Math.abs(d3.median(res)-next))/next)
  }
}

console.log(d3.min(errors.s),d3.max(errors.s),d3.mean(errors.s),d3.median(errors.s))
*/