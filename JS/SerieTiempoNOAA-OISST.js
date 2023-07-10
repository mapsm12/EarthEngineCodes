// HACER CLICK EN EL MAPA EN UN PUNTO PARA OBTENER LA SERIE DE TIEMPO DESDE 1981 

var dataset = ee.ImageCollection('NOAA/CDR/OISST/V2_1')
  .filter(ee.Filter.date('1981-09-01', '2023-06-28'));
var seaSurfaceTemperature = dataset.select('sst');
var visParams = {
  min: -180.0,
  max: 3764.0,
  palette: [
    '040274', '040281', '0502a3', '0502b8', '0502ce', '0502e6',
    '0602ff', '235cb1', '307ef3', '269db1', '30c8e2', '32d3ef',
    '3be285', '3ff38f', '86e26f', '3ae237', 'b5e22e', 'd6e21f',
    'fff705', 'ffd611', 'ffb613', 'ff8b13', 'ff6e08', 'ff500d',
    'ff0000', 'de0101', 'c21301', 'a71001', '911003'
  ],
};
Map.setCenter(-77, -12, 8);
Map.addLayer(seaSurfaceTemperature, visParams, 'Sea Surface Temperature');

// Add click event to display pixel values and time series
Map.onClick(function(coords) {
  var point = ee.Geometry.Point(coords.lon, coords.lat);
  
  // Get the temperature value at the clicked point
  var temperature = ee.Image(seaSurfaceTemperature.first()).reduceRegion({
    reducer: ee.Reducer.first(),
    geometry: point,
    scale: 27830
  }).getNumber('sst');
  
  // Create a time series chart
  var chart = ui.Chart.image.series({
    imageCollection: seaSurfaceTemperature,
    region: point,
    reducer: ee.Reducer.first(),
    scale: 27830,
    xProperty: 'system:time_start'
  }).setOptions({
    title: 'Sea Surface Temperature Time Series',
    hAxis: {title: 'Date'},
    vAxis: {title: 'Temperature (°C)'}
  });
  
  // Display the temperature value and time series chart
  print('Temperature:', temperature.multiply(0.01), '°C');
  print(chart);
  
  // Export the table as CSV to Google Drive
  var exportData = seaSurfaceTemperature.map(function(image) {
    var date = ee.Date(image.get('system:time_start')).format('YYYY-MM-dd');
    var value = ee.Image(image).reduceRegion(ee.Reducer.first(), point).getNumber('sst').multiply(0.01);
    return ee.Feature(null, {'Date': date, 'Temperature': value});
  });
  
  Export.table.toDrive({
    collection: exportData,
    description: 'TimeSeriesData',
    selectors: ['Date', 'Temperature'],
    fileFormat: 'CSV'
  });
});
