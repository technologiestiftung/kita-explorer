var d3 = require('d3'),
  fs = require('fs')

var years = [2001,2016],  
  data = {}

var csvParse = d3.dsvFormat(';')

var dictCSV = csvParse.parse(fs.readFileSync('lor.csv', 'utf8'))

var dict = {}, id = 0

dictCSV.forEach(function(d){
  if(!(d[0] in dict)){
    dict[d[0]] = {
      n:d[1],
      c:{},
      id:id
    }
    id++
  }
  if(!(d[2] in dict[d[0]])){
    dict[d[0]][d[2]] = {
      n:d[3],
      c:{},
      id:id
    }
    id++
  }
  if(!(d[4] in dict[d[0]][d[2]])){
    dict[d[0]][d[2]][d[4]] = {
      n:d[5],
      c:{},
      id:id
    }
    id++
  }
  if(!(d[6] in dict[d[0]][d[2]][d[4]])){
    dict[d[0]][d[2]][d[4]][d[6]] = {
      n:d[7],
      id:id
    }
    id++
  }
});

fs.writeFileSync('lor_dict.json', JSON.stringify(dict), 'utf8')

for(var year = years[0]; year < years[1]; year++){
  data[year] = csvParse.parse(fs.readFileSync('EWR'+year+'12E_Matrix.csv', 'utf8'))
}

var group_labels = ['BEZ','PGR','BZR','PLR'],
  group = [], group_keys = {},
  data_labels = ['E_E00_01','E_E01_02','E_E02_03','E_E03_05','E_E05_06']

for(var year in data){
  data[year].forEach(function(d){
    var key = '',
      groupObj = {}

    group_labels.forEach(function(gl, glI){
      if(glI>0){
        key += '_'
      }
      key += d[gl]
      groupObj[gl] = d[gl]
    })
    if(!(key in group_keys)){
      group_keys[key] = group.length
      group.push(groupObj)
    }

    data_labels.forEach(function(dl){
      group[group_keys[key]][year+'_'+dl] = parseInt(d[dl].replace(',','.'))
    })
  })
}

var csv = '', labels = []

group.forEach(function(g,gi){
  if(gi==0){
    for(var label in g){
      labels.push(label)
      if(labels.length>1){
        csv += ','
      }
      csv += label
    }
  }
  csv += '\n'
  labels.forEach(function(l,li){
    if(li>1){
      csv += ','
    }
    csv += g[l]
  })
})

fs.writeFileSync('EWR.csv', csv, 'utf8')