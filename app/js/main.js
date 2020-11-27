/*global mapboxgl,d3,console*/

var geocoder = 'https://geocoding-git-db-fix.technologiestiftung1.vercel.app';

var marker_kita_el = document.createElement('div');
  marker_kita_el.className = 'marker kita';

var marker_home_el = document.createElement('div');
  marker_home_el.className = 'marker home';

var marker_kita = false, marker_home = false;

var favorites = [];

window.onbeforeunload = function(){
  if(favorites.length >= 1){
    return 'Aus Datenschutzgründen wird die Merkliste beim Verlassen der Seite gelöscht. Sind Sie sicher, dass Sie gehen wollen?';
  }
};

var kitas, kitas_dict, kitas_keys = {}, selection = {},
  labels = {
    type: 'Art der Einrichtung',
    languages :'Mehrsprachigkeit',
    topics: 'Thematische Schwerpunkte',
    educational:'Pädagogische Schwerpunkte',
    parentType:'Träger'
  },
  detailShow = false,
  geojson = {},
  filterElements = {},
  filterKeys = {},
  postcodes = null, postcodeKeys = [],
  searchterm = '',
  scales = {},
  timeOpen = false,
  timeClose = false,
  borderRadius = 2.5, width = 287,
  timesOpen = [],
  timesClose = [],
  acceptance = {over:{key:'over',count:0,state:false}, under:{key:'under',count:0,state:false}},
  overCount = 0,
  underCount = 0,
  filter = ['type','languages','topics','educational','parentType'], //parent;
  filters = {},
  home = false,
  init = false;

mapboxgl.accessToken = 'pk.eyJ1IjoianVsaTg0IiwiYSI6ImNraTBpazBqbzMwazAyc2t6Y25pdnVwb3AifQ.s6Uck73RqMtgps2MjwrSAg';

var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v9',
  center: [13.4244,52.5047],
  zoom: 10
});

map.on('load', function(e){
  if(!init){
    init = true;
    d3.queue()
      .defer(d3.csv, "data/kitas_clean.csv")
      .defer(d3.json, "data/kitas_dict.json")
      .defer(d3.csv, "data/plz.csv")
      .await(function(error, file1, file2, file3) {
        if (error) { console.error(error); 
        } else {
          kitas = file1;
          kitas_dict = file2;
          postcodes = file3;
          postcodes.forEach(function(p){
            postcodeKeys.push(p.id);
          });
        }
        welcome();
      });
  }
});

map.fitBounds([[13.0790332437,52.3283651024],[13.7700526861,52.6876624308]],
  {
    offset: [0, 50],
    speed:999
  });

function welcome(){
    processKitas();
    processFilter();
}

function processKitas(){
    geojson = {type:'FeatureCollection',features:[]};
    kitas.forEach(function(d,i){
      kitas[i].all = parseInt(d.all);
      kitas[i].size = Math.pow(parseInt(d.all), 0.2);
      kitas[i].lon = parseFloat(d.alon);
      kitas[i].lat = parseFloat(d.alat);
      kitas[i].oname = kitas[i].name;
      kitas[i].open = (isNaN(d.mo_o))?36:d3.min([+d.mo_o,+d.tu_o,+d.we_o,+d.th_o,+d.fr_o]);
      kitas[i].close = (isNaN(d.mo_c))?48:d3.max([+d.mo_c,+d.tu_c,+d.we_c,+d.th_c,+d.fr_c]);

      var pre = ['AWO Kita', 'AWO ', 'AWO-Kita', 'BOOT-KITA', 'Evangelische Kita ', 'EKG - ', 'EKT - ', 'FRÖBEL Kindergarten ', 'Humanistische Kita ', 'IB-Kita, ', 'Kindergarten ', 'Kita - ', 'Kita ', 'Kindertagesstätte ', 'Kita der Ev. Kirchengem. ', 'Kita der Kath. Kirchengem. ', 'Kinderladen ', 'Kita/', 'Ev. Kita ', 'Ev.Kita ', '- ', '-'];
      pre.forEach(function(p){
        if(kitas[i].name.substr(0, p.length) == p){
          kitas[i].name = kitas[i].name.substr(p.length, kitas[i].name.length);
        }
      });

      kitas[i].name = kitas[i].name.trim();
      kitas[i].name = kitas[i].name.substr(0,1).toUpperCase() + kitas[i].name.substr(1,kitas[i].name.length);

      filter.forEach(function(f){
        if(kitas[i][f]=='' || kitas[i][f] == undefined){
          kitas[i][f] = [];
        }else{
          kitas[i][f] = (kitas[i][f].split('|'));
          kitas[i][f].forEach(function(s, si){ 
            kitas[i][f][si] = parseInt(s); 
          });
        }
      });

      kitas[i].fulltext = kitas[i].address + ' ' + kitas[i].district + ' ' + kitas[i].plz + ' ' + kitas[i].name + ' ' + kitas[i].parent;

      kitas_keys[d.id] = i;
      geojson.features.push({
        type:'Feature',
        properties:{
          data:kitas[i],
          class:'normal',
          size:kitas[i].size
        },
        geometry:{
          type:'Point',
          coordinates:[kitas[i].lon,kitas[i].lat]
        }
      });
    });

    map.addSource('kitas-default', { type: 'geojson', data: geojson });
    map.addSource('kitas-active', { type: 'geojson', data: geojson });

    map.addLayer({
      "id": "kitas-default",
      "type": "circle",
      "source": "kitas-default",
      "paint": {
        'circle-radius': {
          property: 'size',
          'base': 1.75,
           stops: [
             [{zoom: 2, value: 0}, 0],
             [{zoom: 2, value: d3.max(kitas, function(d){return d.size;})}, 3],
             [{zoom: 22, value: 0}, 0],
             [{zoom: 22, value: d3.max(kitas, function(d){return d.size;})}, 500]
          ]
        },
        'circle-color': {
          property: 'class',
          type: 'categorical',
          stops: [
            ['normal', 'rgba(230,4,51,1)'],
            ['focussed', 'transparent'],
            ['inactive', '#999999']]
        }
      }
    });

    map.addLayer({
      "id": "kitas-active",
      "type": "circle",
      "source": "kitas-active",
      "paint": {
        'circle-radius': {
          property: 'size',
          'base': 1.75,
           stops: [
             [{zoom: 2, value: 0}, 0],
             [{zoom: 2, value: d3.max(kitas, function(d){return d.size;})}, 8],
             [{zoom: 22, value: 0}, 0],
             [{zoom: 22, value: d3.max(kitas, function(d){return d.size;})}, 500]
          ]
        },
        'circle-color': {
          property: 'class',
          type: 'categorical',
          stops: [
            ['normal', 'transparent'],
            ['focussed', '#E60433'],
            ['inactive', 'transparent']]
        }
      }
    });

    (['kitas-default','kitas-active']).forEach(function(k){

      map.on('click', k, function (e) {
        var d = JSON.parse(e.features[0].properties.data);
        setDetails(d);
      });

      map.on('mouseenter', k, function () {
          map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', k, function () {
          map.getCanvas().style.cursor = '';
      });

    });

    geojson.features = geojson.features.sort(function(a,b){
      if (a.properties.data.name < b.properties.data.name) {
        return -1;
      }
      if (a.properties.data.name > b.properties.data.name) {
        return 1;
      }
      return 0;
    });

    setList();  

    d3.select('#detail-close').on('click', function(){
      if(marker_kita){
        marker_kita.remove();
      }

      if(d3.selectAll('#sidemenu li.active').size()==0){
        closeSidebar();
      }else{
        d3.select('#details').style('display','none');
        d3.selectAll('.sidebar-content').style('visibility','visible');
        detailShow = false;
      }
    });

}

var pagination = 0, perpage = 10;

//TODO TESTING
function paginate(kitas){
  var t_kitas = kitas.filter(function(d){
    if(filtersFound){
      return (d.properties.class == 'normal' || d.properties.class == 'focussed')?true:false;
    }
    return true;
  });

  t_kitas = t_kitas.sort(function(a,b){
    if (a.name < b.name) {
      return -1;
    }
    if (a.name > b.name) {
      return 1;
    }
    return 0;
  });

  if(Math.floor(t_kitas.length / perpage)<pagination){
    pagination = 0;
  }

  var f_kitas = t_kitas.filter(function(d,i){
    if(i >= perpage*pagination && i < (pagination+1)*perpage){
      return true;
    }
    return false;
  });

  return [t_kitas, f_kitas];
}

d3.select('#pagination_next').on('click', function(){
  pagination++;
  setList();
});

d3.select('#pagination_back').on('click', function(){
  pagination--;
  setList();
});

function setList(){
  d3.select('#list').node().scrollTop = 0;
  var data = paginate(geojson.features);
  d3.select('#list ul').selectAll('li').remove();
  var li = d3.select('#list ul').selectAll('li').data(data[1]).enter().append('li');
  if(data[0].length <= perpage){
    d3.select('#pagination').style('display','none');
  }else{
    d3.select('#pagination_info').text((pagination*perpage + 1) + ' - ' + (pagination+1)*perpage + ' von ' + data[0].length);
    d3.select('#pagination').style('display','block');
    if(pagination == 0){
      d3.select('#pagination_back').style('opacity',0.3).style('pointer-events','none');
    }else{
      d3.select('#pagination_back').style('opacity',1).style('pointer-events','all');
    }
    if(pagination >= Math.floor(data[0].length/perpage)){
      d3.select('#pagination_next').style('opacity',0.3).style('pointer-events','none');
    }else{
      d3.select('#pagination_next').style('opacity',1).style('pointer-events','all');
    }
  }
  buildList(li,false);
}

function buildList(li, details){
  if(details){
    li.append('a').attr('class', 'favorite-remove')
      .on('click', function(d){
        favorites.splice(favorites.indexOf(d.properties.data.id),1);
        updateFavorites();
      });
  }

  li.append('span').attr('class', 'type')
    .text(function(d){return kitas_dict.type[d.properties.data.type]+' der '+kitas_dict.parent[d.properties.data.parent];})
    .on('click', function(d){
      setDetails(d.properties.data);
    });

  li.append('span').attr('class', 'name')
    .text(function(d){return d.properties.data.name;})
    .on('click', function(d){
      setDetails(d.properties.data);
    });

  li.append('span').attr('class', 'address')
    .text(function(d){return d.properties.data.address+', '+d.properties.data.plz+' '+d.properties.data.district;})
    .on('click', function(d){
      setDetails(d.properties.data);
    });

  if(details){
    li.append('span').attr('class', 'contact')
      .html(function(d){
        var data = kitas[kitas_keys[d.properties.data.id]];
        var str = '';
        if(('phone' in data) && data.phone && data.phone != undefined && data.phone.length > 1){
          str += data.phone+'<br />';
        }
        if(('email' in data) && data.email && data.email != undefined && data.email.length > 1){
          str += '<a href="'+data.email+'">'+data.email+'</a>';
        }
        return str;
      });
  }
}

function setDetails(d){
  detailShow = true;
  d3.selectAll('.sidebar-content').style('visibility','hidden');
  d3.selectAll('#details').style('visibility','visible');

  d3.select('#detail-route').style('display','none');

  if(marker_kita){
    marker_kita.remove();
  }

  marker_kita = new mapboxgl.Marker(marker_kita_el, {
      offset: [5.5, -22.5]
    })
    .setLngLat([d.lon,d.lat])
    .addTo(map);

  d3.select('#details .loading').style('display', 'block');
  d3.select('#detail-content').style('display', 'none');

  d3.select('#details').style('display','block');

  d3.select('#detail-fav')
    .classed('active', function(){
      if(favorites.indexOf(d.id)>=0){
        return true;
      }
      return false;
    })
    .datum(d.id).on('click', function(){
      var obj = d3.select(this);
      var id = obj.datum();
      if(favorites.indexOf(id)>=0){
        obj.classed('active',false);
        favorites.splice(favorites.indexOf(id),1);
      }else{
        favorites.push(id);
        obj.classed('active',true);
      }
      updateFavorites();
    });

  d3.select('#detail-map')
    .datum([d.lon,d.lat])
    .on('click', function(){
      map.flyTo({center:d3.select(this).datum(),offset:[((window.innerWidth<768)?0:210), 50]});
      if(window.innerWidth < 768){
        closeSidebar();
      }
    });
  
  openSidebar();

  d3.json('./data/individual/' + d.id + '_kitas.json', function(err, data){

    //Enriching global data set
    kitas[kitas_keys[d.id]].email = data.email;
    kitas[kitas_keys[d.id]].phone = data.phone;

    d3.select('#detail-name').text(d.oname);
    d3.select('#detail-postcode').text(data.postcode.join(','));

    data.link = 'https://www.berlin.de/sen/jugend/familie-und-kinder/kindertagesbetreuung/kitas/verzeichnis/'+data.link;

    data.emailLink = 'mailto:'+data.email;
    (['link','id','num','parent','address','district','type','parentType','mapLink','phone','email','emailLink']).forEach(function(l){
      if(l.indexOf('link')>=0 || l.indexOf('Link')>=0){
        d3.select('#detail-'+l).attr('href', data[l]);
      }else{
        d3.select('#detail-'+l).text(data[l]);
      }
    });

    (['educational','topics','languages']).forEach(function(l){
      while(data[l][0]==""){
        data[l].splice(0,1);
      }
      if(data[l].length == 0){
        d3.selectAll('#detail-' + l + '-head, #detail-' + l).style('display','none');
      }else{
        d3.selectAll('#detail-' + l + '-head, #detail-' + l).style('display','block');
        d3.selectAll('#detail-' + l + ' li').remove();
        d3.select('#detail-' + l).selectAll('li').data(data[l]).enter().append('li')
          .text(function(d){
            return d.trim();
          });
      }
    });

    var noStructure = true;
    d3.select('#detail-structure-head').style('display','block');
    for(var label in data.structure){
      if(data.structure[label] == undefined || data.structure[label] == ''){
        d3.select('#detail-structure-'+label+'-row').style('display','none');
      }else{
        noStructure = false;
        d3.select('#detail-structure-'+label+'-row').style('display','table-row');
        d3.select('#detail-structure-'+label).text(data.structure[label]);
      }
    }

    if(noStructure){
      d3.select('#detail-structure-head').style('display','none');
    }

    var noOpen = true;

    d3.selectAll('.detail-open').style('display','block');
    data.open.forEach(function(o,i){
      if(data.open[i][0] != undefined){
        noOpen = false;
        d3.select('#detail-open-'+i).html(data.open[i][0] + '<br />' + data.open[i][1]);
      }else{
        d3.select('#detail-open-'+i).text('');
      }
    });

    if(noOpen){
      d3.selectAll('.detail-open').style('display','none');
    }

    d3.select('#details .loading').style('display', 'none');
    d3.select('#detail-content').style('display', 'block');
  });
}

function updateFavorites(){
  d3.select('#favorites').selectAll('li').remove();
  var li = d3.select('#favorites').selectAll('li').data(geojson.features.filter(function(d){ if(favorites.indexOf(d.properties.data.id)>=0){ return true; } return false; })).enter().append('li');
  buildList(li, true);
  var badge = d3.select('.badge').text(favorites.length);
  if(favorites.length > 0){
    badge.style('visibility','visible');
  }else{
    badge.style('visibility','hidden');
  }
}

function openSidebar(){
  if(!d3.select('#sidebar').classed('active')){
    d3.select('#sidebar')
      .classed('active',true);

    if(window.innerWidth > 768){
      map.panTo(map.getCenter(), {duration:500, offset:{x:200,y:0}});
    }
  }
}

function closeSidebar(){
  if(d3.select('#sidebar').classed('active')){
    d3.select('#sidebar')
      .classed('active',false);

    d3.selectAll('#sidemenu li').classed('active',false);

    if(window.innerWidth > 768){
      map.panTo(map.getCenter(), {duration:500, offset:{x:-200,y:0}});
    }
  }
}

var filtersFound;

function updateKitas(){
  d3.select('#search_placeholder').style('display','none');
  filtersFound = false;
  for(var s in selection){
    if(selection[s].length > 0){
      filtersFound = true;
      filterElements[s].box.classed('filter-set', true);
    }else{
      filterElements[s].box.classed('filter-set', false);
    }
  }

  if((timeClose && timeClose != '') || (timeOpen && timeOpen != '')){
    filterElements.time.box.classed('filter-set', true);
    filtersFound = true;
  }else{
    filterElements.time.box.classed('filter-set', false);
  }

  if(acceptance.over.state || acceptance.under.state){
    filtersFound = true;
    filterElements.age.box.classed('filter-set', true);
  }else{
    filterElements.age.box.classed('filter-set', false);
  }

  if(filtersFound){
    d3.select('#reset').style('display','block');
  }else{
    d3.select('#reset').style('display','none');
  }

  if(home || searchterm.length>0){
    filtersFound = true;
  }

  var found = 0;

  geojson.features.forEach(function(d,i){
    var show = true;

    for(var s in selection){
      selection[s].forEach(function(f){
        if(geojson.features[i].properties.data[s].indexOf(f)==-1){
          show = false;
        }
      });
    }

    if(timeClose && timeClose != ''){
      if(geojson.features[i].properties.data.close < timeClose){
        show = false;
      }
    }

    if(timeOpen && timeOpen != ''){
      if(geojson.features[i].properties.data.open > timeOpen){
        show = false;
      }
    }

    for(var key in acceptance){
      if(acceptance[key].state){
        if(geojson.features[i].properties.data[key] == 0){
          show = false;
        }
      }
    }

    var radius = d3.select('#radius').property('value');
    if(home && show && (geojson.features[i].properties.data.distance > radius)){
      show = false;
    }

    if(searchterm.length >= 3 && show){
      var tshow = false;

      var fields = kitas[kitas_keys[geojson.features[i].properties.data.id]];

      for(var key1 in fields){
        var obj = (typeof fields[key1]);
        if(obj == 'string'){
          if((fields[key1].toLowerCase().trim()).indexOf(searchterm) >= 0){
            tshow = true;
          }
        }
      }

      show = tshow;
    }else if(searchterm.length < 3 && searchterm.length > 0){
      show = false;
      d3.select('#search_placeholder').style('display','block');
    }
    
    if(show){
      if(filtersFound){
        found++;
        geojson.features[i].properties.class = 'focussed';
      }else{
        found++;
        geojson.features[i].properties.class = 'normal';
      }
    }else{
      geojson.features[i].properties.class = 'inactive';
    }
  });

  map.setPaintProperty('kitas-active', 'circle-radius', (found<10)?10/found+5:5);

  // geojson.features.sort(function(a,b){
  //   var ac = a.properties.class,
  //     bc = b.properties.class;

  //   if(ac == bc){
  //     return 0;
  //   }else if(ac == 'focussed'){
  //     return 1;
  //   }else if(bc == 'focussed'){
  //     return -1;
  //   }        
    
  //   return 0;  
  // });

  map.getSource('kitas-active').setData(geojson);
  map.getSource('kitas-default').setData(geojson);

  //Reset filters
  filter.forEach(function(f){
    filters[f].forEach(function(ff,fi){
      filters[f][fi].count = 0;
    });
  });

  acceptance.under.count = 0;
  acceptance.over.count = 0;

  //Update filters based on reset kitas
  geojson.features.forEach(function(k){
    if(k.properties.class == 'normal' || k.properties.class == 'focussed'){
      if(k.properties.data.over>0){acceptance.over.count++;}
      if(k.properties.data.under>0){acceptance.under.count++;}

      filter.forEach(function(f){
        k.properties.data[f].forEach(function(ff){
          if(filterKeys[f][ff] in filters[f]){
            filters[f][filterKeys[f][ff]].count++;
          }
        });
      });
    }
  });

  //Update Display
  filter.forEach(function(f){
    filterElements[f].groups.data(filters[f]).style('opacity', function(d){
      if(d.count > 0){
        return 1;
      }else{
        return 0.2;
      }
    });

    filterElements[f].counts.transition()
      .tween("text", function(d) {
        var that = d3.select(this),
            i = d3.interpolateNumber(parseInt(that.text()), d.count);
        return function(t) { that.text(Math.round(i(t))); };
      });

    filterElements[f].bars.transition()
      .attr('x2', function(d){ return scales[f](d.count); });
  });

  //Update Special Filter
  var minOpen = d3.min(geojson.features.filter(function(d){ return (d.properties.class == 'inactive')?false:true; }), function(d){ return d.properties.data.open; });
  var maxClose = d3.max(geojson.features.filter(function(d){ return (d.properties.class == 'inactive')?false:true; }), function(d){ return d.properties.data.close; });

  filterElements.time.groups[0].each(function(d) {
    if (d < minOpen) {
      d3.select(this).property("disabled", true);
    }else{
      d3.select(this).property("disabled", false);
    }
  });

  filterElements.time.groups[1].each(function(d) {
    if (d > maxClose) {
      d3.select(this).property("disabled", true);
    }else{
      d3.select(this).property("disabled", false);
    }
  });

  filterElements.age.groups.forEach(function(g,i){
    g.datum((i==0)?acceptance.under:acceptance.over).style('opacity', function(d){
      if(d.count > 0){
        return 1;
      }else{
        return 0.2;
      }
    });
  });

  filterElements.age.counts.forEach(function(c,i){
    c.datum((i==0)?acceptance.under:acceptance.over).transition()
      .tween("text", function(d) {
        var that = d3.select(this),
            i = d3.interpolateNumber(parseInt(that.text()), d.count);
        return function(t) { that.text(Math.round(i(t))); };
      });
  });

  filterElements.age.bars.forEach(function(b,i){
    b.datum((i==0)?acceptance.under:acceptance.over).transition()
      .attr('x2', function(d){ return scales.age(d.count); });
    });

  setList();
}

function processFilter(){
  d3.select('#reset').on('click', function(){
    for(var s in selection){
      selection[s] = [];
      timeClose = false;
      timeOpen = false;
      acceptance.over.state = false;
      acceptance.under.state = false;
      filterElements.time.box.selectAll('select').property('value', '')
    }
    d3.selectAll('.filter-list-container li').classed('active',false);
    updateKitas();
  });

  var overlay = d3.select('#filter-container');
      
  filter.forEach(function(f){
    filters[f] = [];
    selection[f] = [];
    filterKeys[f] = {};
    filterElements[f] = {titles:null, groups:null, counts:null, bars:null, box:null};
    kitas_dict[f].forEach(function(ff, ffi){
      filters[f].push({count:0, all:0, id:ffi, name:ff, type:f});
    });
  });

  kitas.forEach(function(k){
    filter.forEach(function(f){
      k[f].forEach(function(ff){
        filters[f][ff].count++;
        filters[f][ff].all++;
      });
    });
    if(k.over > 0){overCount++;}
    if(k.under > 0){underCount++;}
    ['mo','tu','we','th','fr'].forEach(function(t){
      ['o','c'].forEach(function(tt){
        var v = Math.floor(parseFloat(k[t+'_'+tt])),
          obj = (tt=='o')?timesOpen:timesClose;
        if(!isNaN(v)){
          if(obj.indexOf(v)==-1){
            obj.push(v);
          }
        }
      });
    });
  });
  timesOpen.sort();
  timesClose.sort();

  filter.forEach(function(f){
    filters[f] = filters[f].filter(function(d){
      if(d.name != '' && d.name != '(n.v.)'){
        return true;
      }
      return false;
    });

    var box = overlay.append('div').attr('class','filter-container');

    filterElements[f].box = box;

    var title = buildTitle(box);

    filterElements[f].titles = title;

    title.append('img').attr('src', 'images/icon-'+f+'@2x.png');
    title.append('span').html(labels[f]+'<img src="images/icon-checkmark-top@2x.png" />');

    var list = box.append('ul')
      .attr('class','filter-list-container')
      .style('display', 'none');

    if(window.innerWidth < 768){
      width = window.innerWidth - 73;
      if(width > 287){
        width = 287;
      }
    }

    scales[f] = d3.scaleLinear().domain([0,d3.max(filters[f], function(d){return d.count;})]).range([borderRadius,width-2*borderRadius]);

    filters[f].sort(function(a,b){
      return b.count-a.count;
    });

    filters[f].forEach(function(ff, fi){
      filterKeys[f][ff.id] = fi;
    });


    var groups = list.selectAll('li').data(filters[f]).enter().append('li').on('click', function(d){
      if(d3.select(this).classed('active')){
        d3.select(this).classed('active',false);
        removeSelection(d);
      }else{
        d3.select(this).classed('active',true);
        addSelection(d);
      }
    });

    filterElements[f].groups = groups;

    var label = groups.append('span')
      .attr('class', 'label');

    label.append('span').text(function(d){ return cleanFilterLabel(d.name) + ' ('; });
    filterElements[f].counts = label.append('span').text(function(d){ return d.count; });
    label.append('span').text(')');

    var svg = groups.append('svg')
      .attr('width', width)
      .attr('height', borderRadius*2 + 2);

    svg.append('line')
      .attr('class','bar bg')
      .attr('x1',borderRadius)
      .attr('y1', borderRadius + 1)
      .attr('x2',width - 2*borderRadius)
      .attr('y2', borderRadius + 1);

    filterElements[f].bars = svg.append('line')
      .attr('class','bar data')
      .attr('x1', borderRadius)
      .attr('y1', borderRadius + 1)
      .attr('x2', function(d){ return scales[f](d.count); })
      .attr('y2', borderRadius + 1);
    
  });


  /*SPECIAL TIME FILTER*/

  /*Opening Times*/
  filterElements['time'] = {titles:null, groups:[], counts:null, bars:null, box:null};

  filterElements.time.box = overlay.append('div').attr('class','filter-container');

  filterElements.time.titles = buildTitle(filterElements.time.box);
  filterElements.time.titles.append('img').attr('src', 'images/icon-time@2x.png');
  filterElements.time.titles.append('span').html('Öffnungszeiten<img src="images/icon-checkmark-top@2x.png" />');

  var timeList = filterElements.time.box.append('ul')
      .attr('class','filter-list-container clean-filter-list')
      .style('display', 'none');

  var openListItem = timeList.append('li');
      openListItem.append('span').attr('class', 'label').append('span').text('Wann soll die Kita öffnen?');
  var openSelect = openListItem.append('select').on('change', function(){
        timeOpen = d3.select(this).property('value');
        updateKitas();
      });
      filterElements.time.groups[0] = openSelect.selectAll('option').data(timesOpen).enter().append('option')
        .attr('value', function(d){return d;})
        .text(function(d){
          return timeFormatter(d);
        });
      openSelect.append('option').attr('value','').attr('selected','selected');

  var closeListItem = timeList.append('li');
      closeListItem.append('span').attr('class', 'label').append('span').text('Bis wann soll die Kita geöffnet sein?');
  var closeSelect = closeListItem.append('select').on('change', function(){
        timeClose = d3.select(this).property('value');
        updateKitas();
      });
      filterElements.time.groups[1] = closeSelect.selectAll('option').data(timesClose).enter().append('option')
        .attr('value', function(d){return d;})
        .text(function(d){
          return timeFormatter(d);
        });
      closeSelect.append('option').attr('value','').attr('selected','selected');



  
  /*Acceptance Age*/
  filterElements['age'] = {titles:null, groups:[], counts:[], bars:[], box:null};

  filterElements.age.box = overlay.append('div').attr('class','filter-container');
  filterElements.age.titles = buildTitle(filterElements.age.box);
  filterElements.age.titles.append('img').attr('src', 'images/icon-minor@2x.png');
  filterElements.age.titles.append('span').html('Alter<img src="images/icon-checkmark-top@2x.png" />');

  var ageList = filterElements.age.box.append('ul')
    .attr('class','filter-list-container')
    .style('display', 'none');

  scales['age'] = d3.scaleLinear().domain([0,d3.max([overCount,underCount])]).range([borderRadius,width-2*borderRadius]);

  [{
    label:'Unter 3 Jahre',
    key:'under',
    count:underCount
  },{
    label:'Über 3 Jahre',
    key:'over',
    count:overCount
  }].forEach(function(d){
    var listItem = ageList.datum(d).append('li').on('click', function(d){
      if(d3.select(this).classed('active')){
        d3.select(this).classed('active',false);
        acceptance[d.key].state = false;
        updateKitas();
      }else{
        d3.select(this).classed('active',true);
        acceptance[d.key].state = true;
        updateKitas();
      }
    });
    var label = listItem.append('span')
        .attr('class', 'label');

        label.append('span').text(d.label + ' (');
        filterElements.age.counts.push(label.append('span').text(d.count));
        label.append('span').text(')');

    var svg = listItem.append('svg')
      .attr('width', width)
      .attr('height', borderRadius*2 + 2);

    svg.append('line')
      .attr('class','bar bg')
      .attr('x1',borderRadius)
      .attr('y1', borderRadius + 1)
      .attr('x2',width - 2*borderRadius)
      .attr('y2', borderRadius + 1);

    filterElements.age.bars.push(svg.append('line')
      .attr('class','bar data')
      .attr('x1', borderRadius)
      .attr('y1', borderRadius + 1)
      .attr('x2', scales.age(d.count))
      .attr('y2', borderRadius + 1));


    filterElements.age.groups.push(listItem);
  });

  initDone();
}

function timeFormatter(t){
  var h = Math.floor(t/4);
  var m = (t-(h*4)) * 15;
  return ((h<10)?'0':'') + h + ':' + ((m<10)?'0':'') + m + ' Uhr';
}

function buildTitle(box){
  return box.append('span')
        .attr('class', 'filter-title')
        .on('click', function(){
          var current = d3.select(this.parentNode).select('.filter-list-container');
          if(current.style('display')=='block'){
            d3.selectAll('.filter-title').classed('active',false);
            d3.selectAll('.filter-list-container').style('display','none');
          }else{
            d3.selectAll('.filter-title').classed('active',false);
            d3.selectAll('.filter-list-container').style('display','none');
            d3.select(this).classed('active',true);
            current.style('display','block');
          }
        });
}

function initDone(){
  d3.select('#loading .outer')
    .transition()
      .ease(d3.easeCubicIn)
      .duration(500)
      .style('opacity',0)
        .on('end', function(){
          (d3.select(this)).remove();
        });

  d3.select('#sidebar')
    .transition()
      .delay(500)
      .ease(d3.easeCubicOut)
      .duration(500)
      .style('display','block')
      .style('opacity',1);

  d3.selectAll('#sidemenu li').datum(function(){
    return d3.select(this).attr('data-item');
  }).on('click', function(d){
    if(d3.select(this).classed('active')&&!detailShow){
      d3.selectAll('#sidemenu li').classed('active',false);
      closeSidebar();
    }else{
      detailShow = false;
      d3.selectAll('.sidebar-content').style('visibility','visible');
      if(marker_kita){
        marker_kita.remove();
      }

      d3.selectAll('#sidemenu li').classed('active',false);
      d3.select(this).classed('active',true);
      
      d3.selectAll('.sidebar-content').style('display','none');
      d3.select('#'+d).style('display','block');
      openSidebar();
    }
  });
}

function addSelection(d){
  if(selection[d.type].indexOf(d.id)==-1){
    selection[d.type].push(d.id);
    updateKitas();
  }
}

function removeSelection(d){
  if(selection[d.type].indexOf(d.id)>=0){
    selection[d.type].splice(selection[d.type].indexOf(d.id), 1);
  }
  updateKitas();
}

function cleanFilterLabel(t){
  if(t.indexOf('deutsch - ') == 0){
    return t.substr(10,1).toUpperCase() + t.substr(11);
  }
  if(t.indexOf('Musik und Kunst') > -1){
    return t.replace('Musik und Kunst','Musik & Kunst');
  }
  if(t.substr(0,1)=='(' && t.substr(t.length-1,1)==')'){
    if(t.indexOf('Rahmenvereinbarung')>=0){
      return 'Private Kita ohne Rahmenvereinbarung';
    }
    if(t.indexOf('EKT')>=0){
      return 'Eltern-Initiativ-Kindertagesstätte';
    }
    return t.substr(1,t.length-2);
  }
  
  return t;
}

d3.select('#searchfield').on('keyup', function(){
  var v = this.value.toLowerCase().trim();
  searchterm = v;
  pagination = 0;
  debouncer(updateKitas(), 200);
});

function debouncer( func , _timeout ) {
  var timeoutID , timeout = _timeout || 200;
  return function () {
    var scope = this , args = arguments;
    clearTimeout( timeoutID );
    timeoutID = setTimeout( function () {
      func.apply( scope , Array.prototype.slice.call( args ) );
    } , timeout );
  };
}

d3.select('#postcode-input').on('keyup', function(){
  var v = this.value.trim();
  if(v.length == 5){

    var idx = postcodeKeys.indexOf(v);
    if(idx>=0){
      map.fitBounds([postcodes[idx].xmin,postcodes[idx].ymin,postcodes[idx].xmax,postcodes[idx].ymax]);
      if(window.innerWidth < 768){
        closeSidebar();
      }
      postcodeError('Nutzen Sie auch die Filter um die Auswahl einzuschränken.',false);
    }else{
      postcodeError('Dies ist keine Berliner Postleitzahlen.',true);
    }

  }else if(v.length > 5){
    postcodeError('Postleitzahlen bestehen aus 5 Ziffern.',true);
  }else{
    postcodeError('',false);
  }
});

function postcodeError(e,et){
  d3.select('#postcode-error').text(e);
  d3.select('#postcode-error').classed('error',et);
}

var active_selection = 0;

d3.select('#address').on('keyup', function(){
  var suggest_length = d3.selectAll('#autosuggest ul li').size();
  if(suggest_length >= 1 && (d3.event.keyCode == 40 || d3.event.keyCode == 38 || d3.event.keyCode == 13)){
    if(d3.event.keyCode == 40){
      if(active_selection<suggest_length){
        active_selection++;
      }
    }else if(d3.event.keyCode == 38){
      if(active_selection>=1){
        active_selection--;
      }
    }
    d3.selectAll('#autosuggest ul li').classed('active',false);
    if(active_selection>0){
      d3.select('#autosuggest ul li:nth-child('+active_selection+')').classed('active',true);
    }
    if(d3.event.keyCode == 13){
      selectStreet(d3.select('#autosuggest ul li:nth-child('+active_selection+')').datum());
    }
  }else{
    if(this.value.length > 2){
      d3.selectAll('#number option').remove();
      d3.json(geocoder+'/street?street='+this.value, function(err, data){
        active_selection = 0;
        d3.selectAll('#autosuggest ul li').remove();
        d3.select('#autosuggest').style('display','block');
        d3.select('#autosuggest ul').selectAll('li')
          .data(data.data.filter(function(d){ return (d.id > 10332) ? false : true; })).enter().append('li').append('a')
            .html(function(d){ return '&raquo;&nbsp;'+d.street+((parseInt(d.plz)>0)?' '+d.plz:''); })
            .on('click', function(){
              selectStreet(d3.select(this).datum());
            });
      });
    }
  }
});

function selectStreet(d){
  var el = document.getElementById('address');
  el.blur();
  el.value = d.street;
  d3.select('#address').attr('data-id', d.id);
  d3.selectAll('#autosuggest ul li').remove();
  d3.select('#autosuggest').style('display','none');
  d3.json(geocoder+'/num?street='+d.id, function(err, data){
    data.data.forEach(function(d){
      var num_a = d.num.split(''), num = '', letter = '';
      num_a.forEach(function(n){
        if(!isNaN(n)){
          num += n;
        }else{
          letter += n;
        }
      });
      d.int = +num;
      d.letter = letter;
    });
    data.data.sort(function(a,b){
      if(a.int === b.int){
        if (a.letter < b.letter) {
          return -1;
        }
        if (a.letter > b.letter) {
          return 1;
        }
        return 0;
      }else{
        return a.int - b.int;
      }
    });
    d3.selectAll('#number option').remove();
    d3.select('#number').selectAll('option').data(([{id:-1,num:'&#9662;'}]).concat(data.data))
      .enter().append('option')
        .attr('value', function(d){return d.id;})
        .html(function(d){ return d.num; });
  });
}

d3.select('#radius').on('change', function(){
  updateKitas();
})

d3.select('#number').on('change', function(){
  var n_id = d3.select(this).property('value');
  if(n_id != -1){
    var s_id = d3.select('#address').attr('data-id');
    if(s_id != null && n_id){
      d3.json(geocoder+'/geo?num='+n_id, function(err, data){

        home = {lon : data.data.lat, lat : data.data.lon};

        if(marker_home){
          marker_home.remove();
        }

        marker_home = new mapboxgl.Marker(marker_home_el, {
            offset: [5.5, -22.5]
          })
          .setLngLat([data.data.lat,data.data.lon])
          .addTo(map);

        d3.select('#plz-reset').style('display','block').on('click', function(){
          d3.selectAll('#number option').remove();
          d3.select('#address').node().value = '';
          home = false;
          marker_home.remove();
          updateKitas();
          d3.select('#plz-reset').style('display','none');
        });

        calculateDistances();
        updateKitas();
      });
    }
  }
});

function calculateDistances(){
  geojson.features.forEach(function(d,i){
    var dist = distance(d.geometry.coordinates[0],d.geometry.coordinates[1],home.lon, home.lat);
    geojson.features[i].properties.data['distance'] = dist;
  });
}

function distance(lon1, lat1, lon2, lat2) {
  var p = 0.017453292519943295;
  var c = Math.cos;
  var a = 0.5 - c((lat2 - lat1) * p)/2 + 
          c(lat1 * p) * c(lat2 * p) * 
          (1 - c((lon2 - lon1) * p))/2;

  return 12742 * Math.asin(Math.sqrt(a));
}