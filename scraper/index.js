var request = require('request'),
  cheerio = require('cheerio'),
  _geocoder = require('node-geocoder'),
  _progress = require('cli-progress'),
  progress_bar = new _progress.Bar({}, _progress.Presets.shades_classic),
  old = require('./data/kitas.json'),
  config = require('./config.json'),
  fs = require('fs'),
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
  geocoder = _geocoder(options)

request.get('https://www.berlin.de/sen/jugend/familie-und-kinder/kindertagesbetreuung/kitas/verzeichnis/ListeKitas.aspx?aktSuchbegriff=', (error, response, body) => {
  if (!error && response.statusCode == 200) {
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

    fs.renameSync('./data/kitas_keys.json', 'archive/'+old.date+'_kitas_keys.json')
    fs.writeFileSync('./data/kitas_keys.json', JSON.stringify(keys), 'utf8')

    progress_bar.start(data.data.length , 0)

    parseKitas()
  }else{
    console.log(error, response.statusCode)
  }
})

function parseKitas(){
  request('https://www.berlin.de/sen/jugend/familie-und-kinder/kindertagesbetreuung/kitas/verzeichnis/' + data.data[ki].link, (error, response, body) => {
    if (!error && response.statusCode == 200) {
      $ = cheerio.load(body)

      data.data[ki].type = $('#lblEinrichtungsart').text().trim()
      data.data[ki].parentType = $('#lblTraegerart').text().trim()
      data.data[ki].mapLink = $('#HLinkStadtplan').attr('href').trim()
      data.data[ki].name = ($('#lblKitaname').text().trim().split('"').join('').split("\n"))[0]
      data.data[ki].zusatz = ($('#lblKitaname').text().trim().split('"').join('').split("\n"))[1]

      data.data[ki].postcode = parseInt((data.data[ki].mapLink.match(/[0-9]*(?=&ADR)/))[0])

      data.data[ki].phone = $('#lblTelefon').text().trim()
      data.data[ki].email = $('#HLinkEMail').attr('href')
      if(data.data[ki].email && data.data[ki].email.length > 6 && data.data[ki].email.indexOf('mailto')>=0){
        data.data[ki].email = (data.data[ki].email.split('to:'))[1].trim()
      }
      data.data[ki].webLink = $('#HLinkWeb').attr('href')
      data.data[ki].image = $('#imgKita').attr('src')
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

      geocoder.geocode({address: data.data[ki].address, country: 'Germany', zipcode: data.data[ki].postcode}, function(err, res) {
        if(err){
          errorCount++;
          if(errorCount > 50){
            console.log('Too many errors')
            process.exit();
          }
          parseKitas()
        }else{

          data.data[ki].geo = {
            lat: res[0].latitude,
            lon: res[0].longitude
          }
          data.data[ki].streetName = res[0].streetName
          data.data[ki].streetNumber = res[0].streetNumber

          //fs.writeFileSync('./individual/'+data.data[ki].id+'_kitas.json', JSON.stringify(data.data[ki]), 'utf8')

          ki++
          progress_bar.update(ki)
          if(ki >= data.data.length){
            fs.renameSync('./data/kitas.json', 'archive/'+old.date+'_kitas.json')
            fs.writeFileSync('./data/kitas.json', JSON.stringify(data), 'utf8')
            process.exit()
          }else{
            parseKitas()
          }
        }
      })

    }else{
      errorCount++;
      if(errorCount > 50){
        console.log('Too many errors')
        process.exit();
      }
      parseKitas()
    }
  })
}





