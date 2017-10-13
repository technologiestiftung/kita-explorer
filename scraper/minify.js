var fs = require('fs'),
  d3 = require('d3'),
  data = require('./data/kitas.json')

//instead of georeference use the berlin address data

var address = d3.csvParse(fs.readFileSync('./data/address.csv', 'utf8'))

var notFound = {0:0,1:0,2:0}

function removeZero(num){
  while(num.substr(0,1)=='0'){
    num = num.slice(1,num.length)
  }
  return num
}

data.data.forEach(function(d){
  var m = d.mapLink.split('='),
    postcode = m[1].split('&')[0],
    street = decodeURIComponent(m[2].split('&')[0]).split('+').join(' '),
    num = removeZero(m[3]),
    found = false

  d.geo['e'] = 2
  d.geo['alat'] = 0
  d.geo['alon'] = 0

  var error = Number.MAX_VALUE

  address.forEach(function(a){
    //strname,hsnr,plz,lat,lon
    if(a.strname == street && a.hsnr == num && a.plz == postcode){
      d.geo.alat = +a.lon
      d.geo.alon = +a.lat
      d.geo.e = 0
      found = true
    }else if(d.e != 0 && a.strname == street && a.hsnr == num && error > Math.abs(a.plz-postcode)){
      d.geo.alat = +a.lon
      d.geo.alon = +a.lat
      d.geo.e = 1
      error = Math.abs(a.plz-postcode)
    }
  })

  if(d.geo.e == 2){
    console.log(postcode, street, num)
  }
})

var dict = {
  educational:[],
  topics:[],
  languages:[],
  type:[],
  parentType:[],
  parent:[]
},
keys = {
  educational:{},
  topics:{},
  languages:{},
  type:{},
  parentType:{},
  parent:{}
}

//in a first run we replace common strings by ids and store them in a dictionary instead

data.data.forEach( (d,i,a) => {
  (['educational','topics','languages','type','parentType','parent']).forEach((t) => {
    if(t == 'educational' || t == 'topics' || t == 'languages'){
      a[i][t].forEach((dd,ii,aa) => {
        dd = dd.trim()
        if(!(dd in keys[t])){
          dict[t].push(dd)
          keys[t][dd] = dict[t].length-1
          a[i][t][ii] = keys[t][dd]
        }else{
          a[i][t][ii] = keys[t][dd]
        }
      })
    }else{
      if(!(d[t] in keys[t])){
        dict[t].push(d[t])
        keys[t][d[t]] = dict[t].length-1
        a[i][t] = keys[t][d[t]]
      }else{
        a[i][t] = keys[t][d[t]]
      }
    }
  })
})

fs.writeFileSync('./data/kitas_test.json', JSON.stringify(data.data), 'utf8')

var csv = 'id,lat,lon,e,alat,alon,address,district,plz,educational,topics,languages,name,type,parent,parenttype,mo_o,mo_c,tu_o,tu_c,we_o,we_c,th_o,th_c,fr_o,fr_c,all,over,under';

data.data.forEach( d => {

  if(d.open[0] == 0){
    d.open = [
      [0,0],
      [0,0],
      [0,0],
      [0,0],
      [0,0]
    ]
  }

  csv += '\n';
  csv += d.id + ',' +
    d.geo.lat + ',' +
    d.geo.lon + ',' +
    d.geo.e + ',' +
    d.geo.alat + ',' +
    d.geo.alon + ',' +
    '"' + d.address + '",' +
    '"' + d.district + '",' +
    d.postcode + ',' +
    ((d.educational.length>0)?('"' + d.educational.join('|') + '"'):'') + ',' +
    ((d.topics.length>0)?('"' + d.topics.join('|') + '"'):'') + ',' +
    ((d.languages.length>0)?('"' + d.languages.join('|') + '"'):'') + ',' +
    '"' + (d.name.split('"').join('').split("\n"))[0] + '",' +
    d.type + ',' +
    d.parent + ',' +
    d.parentType + ',' +
    d.open[0][0] + ',' +
    d.open[0][1] + ',' +
    d.open[1][0] + ',' +
    d.open[1][1] + ',' +
    d.open[2][0] + ',' +
    d.open[2][1] + ',' +
    d.open[3][0] + ',' +
    d.open[3][1] + ',' +
    d.open[4][0] + ',' +
    d.open[4][1] + ',' +
    d.structure.overall + ',' +
    d.structure.over + ',' +
    d.structure.under
})

fs.writeFileSync('./data/kitas.csv', csv, 'utf8')
fs.writeFileSync('./data/kitas_dict.json', JSON.stringify(dict), 'utf8')