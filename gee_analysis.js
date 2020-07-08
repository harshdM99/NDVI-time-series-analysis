var gfsad = ee.Image("USGS/GFSAD1000_V0");
var wheatrice = gfsad.select('landcover').eq(1)
var ROI = (xyz)
var points = wheatrice.selfMask().stratifiedSample({numPoints:500, region:ROI, geometries: true} )

var points = points.map(function(feature) {
  return ee.Feature(feature.geometry(), {'id': feature.id()})
})

var outline = ee.Image().byte().paint({
  featureCollection: ROI,
  color: 1,
  width: 3
});
Map.addLayer(outline, {palette: ['blue']}, 'AOI')
// Show the farm locations in green
Map.addLayer(points, {color: 'green'}, 'Farm Locations')



// Function to remove cloud and snow pixels
function maskCloudAndShadows(image) {
  var cloudProb = image.select('MSK_CLDPRB');
  var snowProb = image.select('MSK_SNWPRB');
  var cloud = cloudProb.lt(5);
  var snow = snowProb.lt(5);
  var scl = image.select('SCL'); 
  var shadow = scl.eq(3); // 3 = cloud shadow
  var cirrus = scl.eq(10); // 10 = cirrus
  // Cloud probability less than 5% or cloud shadow classification
  var mask = (cloud.and(snow)).and(cirrus.neq(1)).and(shadow.neq(1));
  return image.updateMask(mask);
}
// Adding a NDVI band
function addNDVI(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('ndvi')
  return image.addBands([ndvi])
}
var startDate = '2018-12-01'
var endDate = '2019-12-30'
// Use Sentinel-2 L2A data
var collection = ee.ImageCollection('COPERNICUS/S2_SR')
    .filterDate(startDate, endDate)
    .map(maskCloudAndShadows)
    .map(addNDVI)
    .filter(ee.Filter.bounds(points))
// View the median composite
var vizParams = {bands: ['B4', 'B3', 'B2'], min: 0, max: 2000}
Map.addLayer(collection.median(), vizParams, 'collection')


var testPoint = ee.Feature(points.first())

Map.centerObject(testPoint, 10)


var chart = ui.Chart.image.series({
    imageCollection: collection.select('ndvi'),
    
    region: testPoint.geometry()
    }).setOptions({
      interpolateNulls: true,
      lineWidth: 1,
      pointSize: 3,
      title: 'NDVI over Time',
      vAxis: {title: 'NDVI'},
      hAxis: {title: 'Date', format: 'YYYY-MMM', gridlines: {count: 12}}
    })

print(chart)