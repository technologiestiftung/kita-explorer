const { exec } = require('child_process')

var minx = 369095.687897,
  miny = 5799302.08121,
  maxx = 416868.309276,
  maxy = 5838240.33418

var steps = 8, x = 0, y = 0;

function getData(){
  console.log(x,y)
  exec('ogr2ogr -spat '+(minx + (maxx-minx)/steps*x)+' '+(miny + (maxy-miny)/steps*y)+' '+(minx + (maxx-minx)/steps*(x+1))+' '+(miny + (maxy-miny)/steps*(y+1))+' -s_srs EPSG:25833 -t_srs WGS84 -f GeoJSON /Users/sebastianmeier/Sites/kita-explorer@tsb@github/scraper/data/address/address_'+x+'_'+y+'.geojson WFS:"http://fbinter.stadt-berlin.de/fb/wfs/geometry/senstadt/re_rbsadressen" re_rbsadressen', (err, stdout, stderr) => {
    if (err) {
      // node couldn't execute the command
      console.log(err)
      return;
    }

    x++
    if(x>steps){
      x=0
      y++
      if(y>steps){
        console.log('done');
      }else{
        getData()
      }
    }else{
      getData()
    }
  })
}

getData();