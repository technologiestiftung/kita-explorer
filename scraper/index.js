process.on('uncaughtException', function (exception) {
  console.log('process', exception);
});

process.on('unhandledRejection', (reason, p) => {
    console.log("Unhandled Rejection at: Promise ", p, " reason: ", reason);
});

console.log('starting up')

var request = require('request'),
  CronJob = require('cron').CronJob,
  cheerio = require('cheerio'),
  _geocoder = require('node-geocoder'),
  config = require(__dirname + '/config.json'),
  fs = require('fs'),
  d3 = require('d3'),
  turf = require('turf'),
  $,
  data = {date:Date.now(),data:[]},
  keys = {},
  ki = 0,
  bar,
  errorCount = 0,
  options = {
    provider: 'google',
    httpAdapter: 'https',
    apiKey: config.api_key,
    formatter: null 
  },
  geocoder = _geocoder(options),
  googleMapsClient = require('@google/maps').createClient({
    key: config.api_key
  })
  
let old = false
if (fs.existsSync(__dirname + '/data/kitas.json')) {
  old = require(__dirname + '/data/kitas.json')
}

var address = d3.csvParse(fs.readFileSync(__dirname + '/data/address.csv', 'utf8'))
var address_fix = d3.csvParse(fs.readFileSync(__dirname + '/data/address_fix.csv', 'utf8'))

var notFound = {0:0,1:0,2:0}
var x_offs = [], y_offs = []

function letsGo(){

	//Reset all variables
  	data = {date:Date.now(),data:[]};
	keys = {};
	ki = 0;
	notFound = {0:0,1:0,2:0};
	x_offs = [];
	y_offs = [];
	blocked = 0;
	geoError = 0;

  request.get('https://www.berlin.de/sen/jugend/familie-und-kinder/kindertagesbetreuung/kitas/verzeichnis/ListeKitas.aspx?aktSuchbegriff=', (error, response, body) => {
    if (!error && response && response.statusCode == 200) {
      $ = cheerio.load(body)
      
      $('#DataList_Kitas tbody td').each((i, elem) => {
        var el = $(elem),
          link = el.children('a').attr('href'),
          id = parseInt((link.split('?ID='))[1].trim()),
          num = '', parent = '', address = '', district = ''

        el.children('span').each((i, elem) => {
          var el = $(elem),
            id = el.attr('id')

          if(id && id.length > 1){
            if(id.indexOf('KitaNr') >= 0){
              num = parseInt(el.text())
            }else if(id.indexOf('TraegerName') >= 0){
              parent = el.text().trim()
            }else if(id.indexOf('KitaAdresse') >= 0){
              address = el.text().trim()
            }else if(id.indexOf('Ortsteil') >= 0){
              district = el.text().trim()
            }
          }

        })

        data.data.push({
          id: id,
          link: link,
          num: num,
          parent: parent,
          address: address,
          district: district
        })

        keys[id] = data.data.length-1
      })

      if(old){
        fs.renameSync(__dirname + '/data/kitas_keys.json', __dirname + '/archive/'+old.date+'_kitas_keys.json')
      }
      fs.writeFileSync(__dirname + '/data/kitas_keys.json', JSON.stringify(keys), 'utf8')

      parseKitas()
    }else{
      console.log(error, response.statusCode)
    }
  })
}

function getAttr($, id, attr){
  if($(id).length > 0){
    switch(attr){
      case 'text':
        if($(id).text().length>0){
          return $(id).text().trim()
        }
        return ''
      break;
      default:
        if($(id).attr(attr)){
          return $(id).attr(attr).trim()
        }
        return ''
      break;
    }
  }
  return ''
}

function clearStreet(s){
  let repl = [['str.','straße'], ['Str.','Straße'], ['strasse','straße'], ['Strasse','Straße']]
  repl.forEach(r=>{
    s = s.replace(r[0],r[1])
  })
  return s;
}

function parseKitas(){
  request('https://www.berlin.de/sen/jugend/familie-und-kinder/kindertagesbetreuung/kitas/verzeichnis/' + data.data[ki].link, (error, response, body) => {
    if (!error && response && response.statusCode == 200) {
      blocked = 0
      $ = cheerio.load(body)

      data.data[ki].type = getAttr($, '#lblEinrichtungsart', 'text')
      data.data[ki].parentType = getAttr($, '#lblTraegerart', 'text')
      data.data[ki].mapLink = getAttr($, '#HLinkStadtplan', 'href')

      var tempName = (getAttr($, '#lblKitaname','text').split('"').join(''))

      data.data[ki].name = ((tempName.split("\n"))[0]).trim()

      var zusatzIndex = tempName.indexOf('\n')

      if(zusatzIndex == -1){
        data.data[ki].zusatz = ''
      }else{
        data.data[ki].zusatz = ((tempName.substr(zusatzIndex)).split("\n").join(' ').split('  ').join(' ')).trim()
      }

      if(data.data[ki].mapLink.length > 0){
        var adr = (data.data[ki].mapLink.match(/[0-9]*(?=&ADR)/))
        if(adr && adr.length > 0){
          data.data[ki].postcode = parseInt(adr[0])
        }
      }

      data.data[ki].phone = getAttr($, '#lblTelefon','text')
      data.data[ki].email = getAttr($, '#HLinkEMail', 'href')
      if(data.data[ki].email && data.data[ki].email.length > 6 && data.data[ki].email.indexOf('mailto')>=0){
        data.data[ki].email = (data.data[ki].email.split('to:'))[1].trim()
      }
      data.data[ki].webLink = getAttr($, '#HLinkWeb', 'href')
      data.data[ki].image = getAttr($, '#imgKita', 'src')
      //'https://www.berlin.de/sen/jugend/familie-und-kinder/kindertagesbetreuung/kitas/verzeichnis/' + ImageURL

      if($('#lblPaedSchwerpunkte').text().trim().length===0){
        data.data[ki].educational = []
      }else{
        data.data[ki].educational = $('#lblPaedSchwerpunkte').text().trim().split(',')
        data.data[ki].educational.forEach( d => { d = d.trim() })
      }

      if($('#lblThemSchwerpunkte').text().trim().length===0){
        data.data[ki].topics = []
      }else{
        data.data[ki].topics = $('#lblThemSchwerpunkte').text().trim().split(',')
        data.data[ki].topics.forEach( d => { d = d.trim() })
      }

      if($('#lblMehrsprachigkeit').text().trim().length===0){
        data.data[ki].languages = []
      }else{
        data.data[ki].languages = $('#lblMehrsprachigkeit').text().trim().split(',')
        data.data[ki].languages.forEach( d => { d = d.trim() })
      }

      data.data[ki].open = [
        ($('#lblOeffnungMontag').text().trim().length > 4)?($('#lblOeffnungMontag').text().replace(/<b>(.|\n)*<\/b>/gm, "").trim().split(' '))[1].split('-'):0,
        ($('#lblOeffnungDienstag').text().trim().length > 4)?($('#lblOeffnungDienstag').text().replace(/<b>(.|\n)*<\/b>/gm, "").trim().split(' '))[1].split('-'):0,
        ($('#lblOeffnungMittwoch').text().trim().length > 4)?($('#lblOeffnungMittwoch').text().replace(/<b>(.|\n)*<\/b>/gm, "").trim().split(' '))[1].split('-'):0,
        ($('#lblOeffnungDonnerstag').text().trim().length > 4)?($('#lblOeffnungDonnerstag').text().replace(/<b>(.|\n)*<\/b>/gm, "").trim().split(' '))[1].split('-'):0,
        ($('#lblOeffnungFreitag').text().trim().length > 4)?($('#lblOeffnungFreitag').text().replace(/<b>(.|\n)*<\/b>/gm, "").trim().split(' '))[1].split('-'):0
      ]

      var tds = $('#GridViewPlatzstrukturen tbody tr').eq(1).children('td')

      data.data[ki].structure = {
        overall: parseInt(tds.eq(0).text()),
        under: parseInt(tds.eq(1).text()),
        over: parseInt(tds.eq(2).text()),
        min: parseInt(tds.eq(3).text()),
        mix: tds.eq(4).text().trim()
      }

      data.data[ki].places = []

      if($('#GridViewFreiPlaetze tbody tr td').length > 1){
        var rows = $('#GridViewFreiPlaetze tbody tr')
        for(var i = 1; i<rows.length; i++){
          var fields = rows.eq(i).children('td')
          data.data[ki].places.push({
            accept:fields.eq(0).text().trim(),
            all:fields.eq(1).text().trim(),
            over:fields.eq(2).text().trim(),
            under:fields.eq(3).text().trim(),
            hours:fields.eq(4).text().trim(),
            from:fields.eq(5).text().trim(),
            comment:fields.eq(6).text().trim()
          })
        }
      }

      data.data[ki].jobs = []

      if($('#GridViewStellenangebote tbody tr td').length > 1){
        var rows = $('#GridViewStellenangebote tbody tr')
        for(var i = 1; i<rows.length; i++){
          var fields = rows.eq(i).children('td')
          data.data[ki].jobs.push({
            name:fields.eq(0).text().trim(),
            date:fields.eq(1).text().trim()
          })
        }
      }

      if(data.data[ki].mapLink.length==0){

        console.log('missing data', data.data[ki])
        nextKita()

      }else{

        var m = data.data[ki].mapLink.split('=')
        data.data[ki].link_postcode = m[1].split('&')[0]
        data.data[ki].link_streetName = clearStreet(decodeURIComponent(m[2].split('&')[0]).split('+').join(' '))
        data.data[ki].link_streetNumber = removeZero(m[3])

        data.data[ki].geo = {lat:null,lon:null,ep:null,epostcode:null,e:2}

        var found = false,
            error = Number.MAX_VALUE;

        ([address, address_fix]).forEach(function(add){
          add.forEach(function(a){
            //strname,hsnr,plz,lat,lon
            if(a.strname == data.data[ki].link_streetName && a.hsnr == data.data[ki].link_streetNumber && a.plz == data.data[ki].link_postcode){
              data.data[ki].geo.alat = +a.lon
              data.data[ki].geo.alon = +a.lat
              data.data[ki].geo.e = 0
              found = true
            }else if(data.data[ki].geo.e != 0 && a.strname == data.data[ki].link_streetName && a.hsnr == data.data[ki].link_streetNumber && error > Math.abs(a.plz-data.data[ki].link_postcode)){
              data.data[ki].geo.alat = +a.lon
              data.data[ki].geo.alon = +a.lat
              data.data[ki].geo.e = 1
              error = Math.abs(a.plz-data.data[ki].link_postcode)
              data.data[ki].geo.ep = error
              data.data[ki].geo.epostcode = a.plz
            }
          })
        })

        geoError = 0;
        geoCodeLatest();
      }

    }else{
      console.log('P1',error);
      errorCount++;
      if(errorCount > 50){
        console.log('Too many errors, maybe we got blocked or something...')
        blocked++;
        if(blocked<20){
          console.log('break')
          setTimeout(parseKitas, 6000*5)
        }else{
          console.log('kill')
        }
      }
      parseKitas()
    }
  })
}

var blocked = 0,
  geoError = 0;

function geoCodeLatest(){
  if(data.data[ki].geo.e == 2){
    let localGeoError = 0
    geocoder.geocode({address: data.data[ki].address, country: 'Germany', zipcode: data.data[ki].postcode}, function(err, res) {
      if(err){
        console.log('G1',err);
        geoError++;
        localGeoError++;
        if(geoError > 10){
          console.log('Too many geocoding errors')
        }
        geoCodeLatest()
      }else{

        if(res.length>=1){
          data.data[ki].geo.g1lat = res[0].latitude
          data.data[ki].geo.g1lon = res[0].longitude
          data.data[ki].g1streetName = res[0].streetName
          data.data[ki].g1streetNumber = res[0].streetNumber
          data.data[ki].g1postcode = res[0].zipcode
        }else{
          //console.log({address: data.data[ki].address, country: 'Germany', zipcode: data.data[ki].postcode},  'G1:ZERO_RESULTS');
          localGeoError++;
          geoError++;
        }

        googleMapsClient.geocode({
            address: ((geoError > 0)?data.data[ki].name+', ':'') + data.data[ki].address + ', ' + data.data[ki].postcode + ', Berlin, Germany'
        }, function(err, response) {
          if (err) { 
            console.log('G2',err)
            geoError++;
            localGeoError++;
            if(geoError > 10){
              console.log('Too many geocoding errors')
            }
            geoCodeLatest()
          }else{
            localGeoError = 0
            if(response.json.status == 'ZERO_RESULTS'){
              //console.log({address: ((geoError > 0)?data.data[ki].name+', ':'') + data.data[ki].address, country: 'Germany', zipcode: data.data[ki].postcode},  'G2:ZERO_RESULTS');
              geoError++;
              localGeoError++;
            }else{
              data.data[ki].geo.g2lat = response.json.results[0].geometry.location.lat
              data.data[ki].geo.g2lon = response.json.results[0].geometry.location.lng

              data.data[ki].g2streetName = findAddressComponent(response.json.results[0].address_components, 'route')
              data.data[ki].g2streetNumber = findAddressComponent(response.json.results[0].address_components, 'street_number')
              data.data[ki].g2postcode = findAddressComponent(response.json.results[0].address_components, 'postal_code')
            }

            if(localGeoError > 0){
              if(geoError < 10 && data.data[ki].geo.e > 0){
                geoCodeLatest()
              }else if(data.data[ki].geo.e > 0){
                //console.log('too many errors', {address: ((geoError > 0)?data.data[ki].name+', ':'') + data.data[ki].address, country: 'Germany', zipcode: data.data[ki].postcode})
                finishGeoCode();
              }else{
                finishGeoCode();
              }
            }else{
              finishGeoCode();
            }
          }
        })
      }
    })
  }else{
    finishGeoCode();
  }
}

function finishGeoCode(){
   //decide which geo-coordinate to use
    if(data.data[ki].geo.e == 0){
      //good match
      data.data[ki].geo.lat = data.data[ki].geo.alat
      data.data[ki].geo.lon = data.data[ki].geo.alon
    }else if(data.data[ki].geo.e == 1){
      //slightly off postcode
      data.data[ki].geo.lat = data.data[ki].geo.alat
      data.data[ki].geo.lon = data.data[ki].geo.alon
      data.data[ki].postcode = data.data[ki].geo.epostcode
    }else if(data.data[ki].geo.e == 2 && !('g2lat' in data.data[ki].geo) && !('g1lat' in data.data[ki].geo)){
      //Better than nothing
      data.data[ki].geo.lat = data.data[ki].geo.alat
      data.data[ki].geo.lon = data.data[ki].geo.alon
      data.data[ki].postcode = data.data[ki].geo.epostcode
    }else if(!('g2lat' in data.data[ki].geo) && !('g1lat' in data.data[ki].geo)){
      console.log('damn it', data.data[ki].name, data.data[ki].address, data.data[ki].postcode)
    }else{
      if(('g1lat' in data.data[ki].geo) && data.data[ki].geo.g1lat > 0){
        data.data[ki].geo.lat = data.data[ki].geo.g1lat
        data.data[ki].geo.lon = data.data[ki].geo.g1lon
      }else{
        data.data[ki].geo.lat = data.data[ki].geo.g2lat
        data.data[ki].geo.lon = data.data[ki].geo.g2lon
      }
    }

    fs.writeFileSync(__dirname + '/individual/'+data.data[ki].id+'_kitas.json', JSON.stringify(data.data[ki]), 'utf8')

    nextKita();
}

function findAddressComponent(comp, type){
  let r = ''
  comp.forEach(c=>{
    c.types.forEach(t=>{
      if(t == type){
        r = c.long_name;
      }
    })
  })
  return r
}

function nextKita(){
  ki++
  if(ki >= data.data.length){
    if(old){
      fs.renameSync(__dirname + '/data/kitas.json', __dirname + '/archive/'+old.date+'_kitas.json')
    }
    fs.writeFileSync(__dirname + '/data/kitas.json', JSON.stringify(data), 'utf8')
    restOfProcess()
  }else{
    //We don't want to stress google's API and the kita-verzeichnis
    setTimeout(parseKitas, 500)
  }
}

function removeZero(num){
  while(num.substr(0,1)=='0'){
    num = num.slice(1,num.length)
  }
  return num
}

function restOfProcess(){

  //create geojson from existing json
  let points = []
  data.data.forEach(d=>{
    if('geo' in d){
      var props = JSON.parse(JSON.stringify(d));

      var deletes = ["g1postcode","g1streetName", "g1streetNumber", "g2postcode","g2streetName","g2streetNumber","geo"]
      deletes.forEach(del=>{
        delete props[del]
      });

      points.push( turf.point([d.geo.lon, d.geo.lat], props) )
    }
  })

  fs.writeFileSync(__dirname + '/data/kitas.geojson', JSON.stringify(turf.featureCollection(points)), 'utf8')

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
          if(typeof dd.trim === "function") dd = dd.trim()
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

  fs.writeFileSync(__dirname + '/data/kitas_test.json', JSON.stringify(data.data), 'utf8')

  var csv = 'id,lat,lon,e,alat,alon,address,district,plz,educational,topics,languages,name,type,parent,parenttype,mo_o,mo_c,tu_o,tu_c,we_o,we_c,th_o,th_c,fr_o,fr_c,all,over,under',
      //missing
      mcsv = 'id,address,district,plz,educational,topics,languages,name,type,parent,parenttype,mo_o,mo_c,tu_o,tu_c,we_o,we_c,th_o,th_c,fr_o,fr_c,all,over,under';

  data.data.forEach( d => {

    if('geo' in d){

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
        timeConversion(d.open[0][0]) + ',' +
        timeConversion(d.open[0][1]) + ',' +
        timeConversion(d.open[1][0]) + ',' +
        timeConversion(d.open[1][1]) + ',' +
        timeConversion(d.open[2][0]) + ',' +
        timeConversion(d.open[2][1]) + ',' +
        timeConversion(d.open[3][0]) + ',' +
        timeConversion(d.open[3][1]) + ',' +
        timeConversion(d.open[4][0]) + ',' +
        timeConversion(d.open[4][1]) + ',' +
        d.structure.overall + ',' +
        d.structure.over + ',' +
        d.structure.under
    }else{

      mcsv += '\n';
      mcsv += d.id + ',' +
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
        timeConversion(d.open[0][0]) + ',' +
        timeConversion(d.open[0][1]) + ',' +
        timeConversion(d.open[1][0]) + ',' +
        timeConversion(d.open[1][1]) + ',' +
        timeConversion(d.open[2][0]) + ',' +
        timeConversion(d.open[2][1]) + ',' +
        timeConversion(d.open[3][0]) + ',' +
        timeConversion(d.open[3][1]) + ',' +
        timeConversion(d.open[4][0]) + ',' +
        timeConversion(d.open[4][1]) + ',' +
        d.structure.overall + ',' +
        d.structure.over + ',' +
        d.structure.under

    }
  })

  fs.writeFileSync(__dirname + '/data/kitas.csv', csv, 'utf8')
  fs.writeFileSync(__dirname + '/data/kitas_missing.csv', mcsv, 'utf8')
  fs.writeFileSync(__dirname + '/data/kitas_dict.json', JSON.stringify(dict), 'utf8')

  //Further cleaning

  csv = d3.csvParse(csv)

  csv.forEach( d => {
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

    // (["mo","tu","we","th","fr"]).forEach(function(dd){
    //   (["c","o"]).forEach(function(ddd){
    //       d[dd+"_"+ddd] = timeConversion(d[dd+"_"+ddd])
    //   })
    // })
  })

  let columns = ["id","lat","lon","address","district","plz","educational","topics","languages","name","type","parent","parentType","mo_o","mo_c","tu_o","tu_c","we_o","we_c","th_o","th_c","fr_o","fr_c","all","over","under"];

  let ccsv = '';

  columns.forEach((c,i)=>{
    if(i>0){
      ccsv += ','
    }
    let tc = c
    if(c == 'lat'){ 
      tc = 'alat' 
    }
    if(c == 'lon'){ 
      tc = 'alon' 
    }
    ccsv += tc
  })

  csv.forEach(d=>{
    ccsv += '\n'
    columns.forEach((c,i)=>{
      if(i>0){
        ccsv += ','
      }
      if(typeof d[c] == 'string' && d[c] != '' && d[c] != 'NaN' && c != 'lat' && c != 'lon' && c != 'alat' && c != 'alon'){
        ccsv += '"'
      }
      ccsv += d[c]
      if(typeof d[c] == 'string' && d[c] != '' && d[c] != 'NaN' && c != 'lat' && c != 'lon' && c != 'alat' && c != 'alon'){
        ccsv += '"'
      }
    })  
  })

  fs.writeFileSync(__dirname + '/data/kitas_clean.csv', ccsv, 'utf8')

  console.log('done')

  fs.renameSync(__dirname + '/data/kitas.geojson',   __dirname + '/../../html/kitas/kitas.geojson')
  fs.renameSync(__dirname + '/data/kitas_clean.csv', __dirname + '/../../html/kitas/kitas_clean.csv')
  fs.renameSync(__dirname + '/data/kitas_dict.json', __dirname + '/../../html/kitas/kitas_dict.json')

  console.log('copy done')
}

function timeConversion(t){
  if(t && t.indexOf(':')>=0){
    var times = t.split(':');
    return parseInt(times[0])*4 + parseInt(times[1])/15;
  }
  return 'NaN';
}

var job = new CronJob({
  cronTime: '00 30 22 * * *',
  onTick: function() {
    console.log('cron')
    letsGo()  
  },
  start: true,
  timeZone: 'Europe/Berlin'
});

job.start();

console.log('ready')