var fs = require('fs'),
  ss = require('simple-statistics'),
  d3 = require('d3')


var data_labels = ['E_E00_01','E_E01_02','E_E02_03','E_E03_05','E_E05_06','E_E'],
      sum_labels = ['E_E01_02','E_E02_03','E_E03_05','E_E05_06'],
      years = [2001,2016],
      data_keys = {}, overall,
      dict = JSON.parse(fs.readFileSync('../app/data/lor_dict.json', 'utf8'))
      data = d3.csvParse(fs.readFileSync('../app/data/EWR.csv', 'utf8'))


function process(d){
  var summary = {sum:[]};
  data_labels.forEach(function(dl){
    summary[dl]=[];
  });
  for(var key in summary){
    for(var year = years[0]; year <= years[1]; year++){
      summary[key].push(0);
    }
  }

  for(var i in d){
    var id = data_keys[d[i].id];
    if(id != undefined){
      data_labels.forEach(function(dl){
        d[i][dl] = [];
        for(var year = years[0]; year <= years[1]; year++){
          d[i][dl].push(+data[id][year+'_'+dl]);
          summary[dl][(d[i][dl].length-1)] += +data[id][year+'_'+dl];
        }
      });
      d[i]['sum'] = [];
      for(var year = years[0]; year <= years[1]; year++){
        var sum = 0;
        sum_labels.forEach(function(dl){
          sum += +data[id][year+'_'+dl];
        });
        d[i]['sum'].push(sum);
        summary.sum[(d[i]['sum'].length-1)] += sum;
      }
    }
    var clength = 0;
    for(var cid in d[i].c){clength++;}
    if(clength > 0){
      var cSum = process(d[i].c);
      for(var key in cSum){
        d[i][key] = cSum[key];
        cSum[key].forEach(function(s,si){
          summary[key][si] += s;
        });
      }
    }
  }
  return summary;
}

function predict(data, intervals){
  var res = [];

  var starts = [], 
    startCount = intervals, 
    count = data.length, 
    all = data.length;

  for(var i = 0; i<startCount; i++){
    starts.push(all-count)
    count = count/2
  }

  for(var i = 0; i<starts.length; i++){
    var points = [];

    for(var j = starts[i]; j<data.length; j++){
      points.push([j, data[j]]);
    }

    var l = ss.linearRegressionLine(ss.linearRegression(points));

    for(var k = 0; k<i; k++){
      res.push(l(j));
    }
  }

  var median = d3.median(res)

  return (median<0)?0:median;
}

data.forEach(function(d,i){
  data_keys[d.id] = i;
});

overall = process(dict);

function addPredictions(dict){
  for(var i in dict){
    var prediction = predict(dict[i].sum, 4)
    dict[i].sum.push(prediction)
    addPredictions(dict[i].c)
  }
}

addPredictions(dict)

fs.writeFileSync('./export/dict.json', JSON.stringify(dict), 'utf8')
var csv = 'fid,id,all_2016'
for(var i = 2001; i<2018; i++){
  csv += ','+i
}

function extract(d){
  for(var key in d){

    csv += '\n'+d[key].fid+','+d[key].id+','+d[key].E_E[d[key].E_E.length-2];

    d[key].sum.forEach(function(s){
      csv += ','+s
    })

    extract(d[key].c)
  }
}

extract(dict)

fs.writeFileSync('./export/EWR.min.csv', csv, 'utf8')