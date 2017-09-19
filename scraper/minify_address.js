var fs = require('fs')

var data = []

fs.readdirSync('./data/address').forEach(filename => {
  if(filename.substr(0,1)!='.'){
    data = data.concat(JSON.parse(fs.readFileSync('./data/address/'+filename, 'utf8')).features)
  }
})

var light = [], streets = [], street_keys = {}, street_counts = {}

data.forEach(d=>{
  d.properties.STRNR = parseInt(d.properties.STRNR)
  if(!(d.properties.STRNAME in street_counts)){
    street_counts[d.properties.STRNAME] = 1
  }else{
    if(!(d.properties.STRNR in street_keys)){
      street_counts[d.properties.STRNAME]++
    }
  }
  if(!(d.properties.STRNR in street_keys)){
    streets.push([d.properties.STRNAME,[parseInt(d.properties.PLZ)]])
    street_keys[d.properties.STRNR] = streets.length - 1
  }else{
    if(streets[street_keys[d.properties.STRNR]][1].indexOf(parseInt(d.properties.PLZ)) == -1){
      streets[street_keys[d.properties.STRNR]][1].push(parseInt(d.properties.PLZ))
    }
  }
  light.push([
    d.properties.STRNAME,
    d.properties.STRNR,
    //remove leading zeros
    cleanHSNR(d.properties.HSNR),
    parseInt(d.properties.PLZ),
    //Reduce precision of coordinates
    d.geometry.coordinates[0].toFixed(5),
    d.geometry.coordinates[1].toFixed(5)
  ])
})

fs.writeFileSync('./data/address.csv', array2csv(light, 'strname,hsnr,plz,lat,lon'), 'utf8') //,lat,lon

//Remove streetnames and organize in separate file

/*Ülight.forEach((d,i)=>{
  light[i][0] = street_keys[light[i][0]+light[i][2]]
})*/

streets.forEach((s,i)=>{
  if(street_counts[streets[i][0]]>1){
    streets[i][1] = streets[i][1].join('|')
  }else{
    streets[i][1] = ''
  }
})

fs.writeFileSync('./data/streets.csv', array2csv(streets,'street,plz'), 'utf8')
//fs.writeFileSync('./data/streets.json', JSON.stringify(streets), 'utf8')


light.forEach((d,i)=>{
  light[i] = [street_keys[d[1]],d[2],d[3],d[4],d[5]]
})

//fs.writeFileSync('./data/address.min.csv', array2csv(light, 'strname,hsnr,lon,lat'), 'utf8')
fs.writeFileSync('./data/address.min.csv', array2csv(light, 'street,hsnr,plz,lat,lon'), 'utf8')
//fs.writeFileSync('./data/address.min.json', JSON.stringify(light), 'utf8')

function cleanHSNR(n){
  while(n.substring(0,1)=='0'){
    n = n.substring(1)
  }
  return n
}

function array2csv(data,head){
  var csv = head

  data.forEach(d=>{
    csv += "\n"
    if( typeof d === 'array' ) {
      d.forEach((dd,ii)=>{
        if(ii>0){
          csv += ','
        }
        csv += dd
      })
    }else{
      csv += d
    }
  })

  return csv
}