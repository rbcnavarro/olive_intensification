// LINK: https://code.earthengine.google.com/?accept_repo=users/rebeccanavarrokhoury/MDPI_RS/SAISS_olive_intensification

var Aug2010 = ee.Image("users/rebeccanavarrokhoury/normalizedAug2010"),
    Jan2011 = ee.Image("users/rebeccanavarrokhoury/normalizedJan2011"),
    Aug2020 = ee.Image("users/rebeccanavarrokhoury/PSAug2020"),
    Jan2020 = ee.Image("users/rebeccanavarrokhoury/PSJan2020"),
    aoi = ee.FeatureCollection("users/rebeccanavarrokhoury/AOI_reduced"),
    sieved_2020_msavi = ee.Image("users/rebeccanavarrokhoury/evergreens2020-msavi_sieved"),
    sieved_2020_ndvi = ee.Image("users/rebeccanavarrokhoury/Evergreens2020-ndvi_sieved"),
    sieved_2010_ndvi = ee.Image("users/rebeccanavarrokhoury/Evergreens2010-ndvi_sieved"),
    sieved_2010_msavi = ee.Image("users/rebeccanavarrokhoury/evergreens2010-msavi_sieved"),
    validation = ee.FeatureCollection("users/rebeccanavarrokhoury/labelledValidationData");

// Parameter settings: select NDVI or MSAVI to compare index performance

var index = "NDVI" 


// "RAW" or "SIEVED" data

var data = 'SIEVED'

print('-CLUSTER AND MASKING SEQUENCE USING ' + index + ' AND ' + data + ' DATA-')

// Assign cluster number using the "INSPECTOR" by clicking on known areas
// of evergreen vegetation, re-run, and re-assign until matched:

//------------------------------------------------------------
var DrySeasonCluster = 0
var RainySeasonCluster = 0
var NIR_Recluster = 1


var DrySeasonCluster2010 = 0
var RainySeasonCluster2010 = 0
var NIR_Recluster2010 = 1
//-------------------------------------------------------------

// AOI Definition and Map Options


Map.centerObject(aoi,10)
Map.setOptions('HYBRID')
Map.addLayer(aoi,{}, 'AOI')

// Target class from reference data

Map.addLayer(validation.filter(ee.Filter.eq('Croptype', 2)), {'color':"blue"}, 'Target class');

// Reduced AOI area calculation

var scaleforTestArea = 5;
 
var img = ee.Image.pixelArea().divide(10000)

var area2 = img.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: aoi,
  crs: 'EPSG:32630', // WGS Zone N 45
  scale: 5,
  maxPixels: 1E13
});

var aoi_AreainHa = ee.Number(
  area2.get('area')).getInfo().toFixed(3);
  
print('-AREA CALCULATIONS-')
print('Study area extent', aoi_AreainHa + ' ha');

//----------- CLUSTER AND MASKING SEQUENCE using k-Means
//----------- Image Preparation

// Merge images to ImageCollection
var collection = ee.ImageCollection([Jan2011, Aug2010, Jan2020, Aug2020]).filterBounds(aoi)

// Functions for index calculation
function addNDVI(image) {
  var ndvi = image.normalizedDifference(['b4', 'b3']).rename('NDVI');
  return image.addBands(ndvi);
}

function addMSAVI(image) {
  var msavi = image.expression(
  '(2 * NIR + 1 - sqrt(pow((2 * NIR + 1), 2) - 8 * (NIR - RED)) ) / 2', 
  {
    'NIR': image.select('b4'), 
    'RED': image.select('b3')
  }
).rename('MSAVI')
  return image.addBands(msavi)
}

//------------ Options for analysis and visualization

if(index=="MSAVI"){
  var indexed = collection
  .map(addMSAVI)
  .select(['MSAVI'])}
else if (index=="NDVI") {
  var indexed = collection
  .map(addNDVI)
  .select(['NDVI'])
}

  
if(index=="NDVI"){
  var sieved2020 = sieved_2020_ndvi;
  var sieved2010 = sieved_2010_ndvi
}
else if (index=="MSAVI"){
  var sieved2020 = sieved_2020_msavi;
  var sieved2010 = sieved_2010_msavi
}

var all = indexed.toBands()

var newbands = ["winter10", "summer10", "winter20", "summer20"]
var bandNames = all.bandNames()
var all = all.select(bandNames).rename(newbands)



//-------------- CLUSTER AND MASKING SEQUENCE

// 2020

// Extract summer green vegetation

var input = all.select("summer20").clip(aoi)

// Create a training sample

var training = input.sample({
  region: aoi,
  scale: 5,
  numPixels: 2500
});

var clusterer = ee.Clusterer.wekaKMeans(2).train(training);
var unClass = input.cluster(clusterer);

// Visualize the clusters 419595,f0b6ff

var clusterVis = {"opacity":1,"bands":["cluster"],"min":0,"max":1,"palette":["419595","f0b6ff"]};

Map.addLayer(unClass, clusterVis, 'Dry Season Clustering 2020',false);

// Select Cluster and create Summer Vegetation Mask

var summerVeg = unClass.select('cluster').eq(DrySeasonCluster).selfMask();

// Extract Evergreen Vegetation

var input = all.select("winter20").mask(summerVeg).clip(aoi)

// Create another training sample from the new input

var training = input.sample({
  region: aoi,
  scale: 5,
  numPixels: 2500
});

var clusterer = ee.Clusterer.wekaKMeans(2).train(training);
var unClass = input.cluster(clusterer);

Map.addLayer(unClass, clusterVis, 'Rainy Season Clustering 2020', false);

var winterVeg = unClass.select('cluster').eq(RainySeasonCluster).selfMask();

// Select Dry season image NIR band to enhance separability between deciduous tree crops with 
// winter soil greening or double cropping annuals

var NIR = Aug2020.select('b4').mask(winterVeg);

// Create another training sample from the new input
var training = NIR.sample({
  region: aoi,
  scale: 5,
  numPixels: 2500
});

var clusterer = ee.Clusterer.wekaKMeans(2).train(training);
var unClass = NIR.cluster(clusterer);

 
// Visualize the clusters 

Map.addLayer(unClass, clusterVis, 'NIR 2020 Recluster Test', false);
var evergreens2020 = unClass.select('cluster').eq(NIR_Recluster).selfMask();




// 2010

// Extract Summer green vegetation

var input = all.select("summer10").clip(aoi)

var training = input.sample({
  region: aoi,
  scale: 5,
  numPixels: 2500
});

var clusterer = ee.Clusterer.wekaKMeans(2).train(training);
var unClass = input.cluster(clusterer);


var palettes = require('users/gena/packages:palettes');
var palette = palettes.misc.tol_rainbow[7];
 
 
// Visualize the clusters 

Map.addLayer(unClass, clusterVis, 'Dry Season Clustering 2010',false);

// Select Cluster and create Summer Vegetation Mask

var summerVeg = unClass.select('cluster').eq(DrySeasonCluster2010).selfMask();


// Extract Evergreen Vegetation

var input = all.select("winter10").mask(summerVeg).clip(aoi)

var training = input.sample({
  region: aoi,
  scale: 5,
  numPixels: 2500
});
var clusterer = ee.Clusterer.wekaKMeans(2).train(training);
var unClass = input.cluster(clusterer);
Map.addLayer(unClass, clusterVis, 'Rainy Season Clustering 2010', false);
var winterVeg2010 = unClass.select('cluster').eq(RainySeasonCluster2010).selfMask();

// Select Dry season image NIR band to enhance separability between deciduous tree crops with 
// winter soil greening or double cropping annuals

var NIR = Aug2010.select('b4').mask(winterVeg2010);

var training = NIR.sample({
  region: aoi,
  scale: 5,
  numPixels: 2500
});

var clusterer = ee.Clusterer.wekaKMeans(2).train(training);
var unClass = NIR.cluster(clusterer);

 
// Visualize the clusters 

Map.addLayer(unClass, clusterVis, 'NIR 2010 Recluster Test', false);
var evergreens2010 = unClass.select('cluster').eq(NIR_Recluster2010).selfMask();


// Visualization and area calculation options
var green = {"opacity":1,"bands":["cluster"],"palette":["64a35d"]};
var red = {"opacity":1,"bands":["cluster"],"palette":["d4511f"]};
var yellow = {"opacity":1,"bands":["cluster"],"palette":["ebd955"]};
if(data=="RAW"){
var img_1 = evergreens2020;
var img_2 = evergreens2010;
var noChange = img_1.subtract(img_2);
var noChange = noChange.select('cluster').eq(0).selfMask()
var noChange = img_1.mask(noChange)
Map.addLayer(evergreens2020,green, 'Evergreens 2020 (raw)')
Map.addLayer(evergreens2010,red, 'Evergreens 2010 (raw)')
Map.addLayer(noChange,yellow,'No change (raw)')
}
else if(data=="SIEVED"){
  var img_1=sieved2020.select('b1').eq(1).selfMask();
  var img_2=sieved2010.select('b1').eq(1).selfMask();
  var noChange = img_1.subtract(img_2);
  var noChange = noChange.select('b1').eq(0).selfMask()
  var noChange = img_1.mask(noChange)
  var yellow = {"opacity":1,"bands":["b1"], "palette":["ebd955"]}
  var green = {"opacity":1,"bands":["b1"], "palette":["64a35d"]}
  var red = {"opacity":1,"bands":["b1"], "palette":["d4511f"]}
  Map.addLayer(img_1,green, 'Evergreens 2020 (sieved)')
  Map.addLayer(img_2,red, 'Evergreens 2010 (sieved)')
  Map.addLayer(noChange,yellow,'No change (sieved)')
  }



/// AREA CALCULATION


// No Change Area
var noChangeArea = ee.Image.pixelArea().mask(noChange);

var area = noChangeArea.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: aoi /* insert appropriate region */,
  scale: 5/* insert appropriate scale */,
  maxPixels: 132287045
}) 
var noChangeAreainHa = ee.Number(
  area.get('area')).divide(1e4).round();
  

// 2010


var lossArea = ee.Image.pixelArea().mask(img_2);
// Visulize the area of 2010 and rename it loss, since if visible, after overlaying 2020 results, it will be the area lost
//Map.addLayer(lossArea, {}, 'Loss')

var area = lossArea.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: aoi /* insert appropriate region */,
  scale: 5/* insert appropriate scale */,
  maxPixels: 132287045
})
var areainHa2010 = ee.Number(
  area.get('area')).divide(1e4).round();
  
print(areainHa2010, 'Area in ha 2010 (ha)' );  

  

//  2020
// Area

var winterVegArea = ee.Image.pixelArea().mask(img_1);

var area = winterVegArea.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: aoi/* insert appropriate region */,
  scale: 5/* insert appropriate scale */,
  maxPixels: 132287045
});
var areainHa2020 = ee.Number(
  area.get('area')).divide(1e4).round()
  
  
// Print results

print(areainHa2020, 'Area in ha 2020 (ha)')
print(noChangeAreainHa, 'No change area (ha)'); 

// Estimate area of olive orchards converted to other land uses

var LossArea = areainHa2010.subtract(noChangeAreainHa);
print(LossArea, 'Area converted to other land uses (ha)')

// Estimate area of new olive orchards 

var gainArea = areainHa2020.subtract(noChangeAreainHa);
print(gainArea, 'Area of new plantations (ha)' )

//----------------------- Accuracy assessment for 2020

print('-ACCURACY ASSESSMENT USING REFERENCE DATA COLLECTED FOR 2020-')

if(data=="RAW"){
  var datainput = evergreens2020
  
  }
else if (data=="SIEVED") {
  var datainput = sieved2020
  }
  
  
  
// Loop for commission errors and UA and PA calculation 
  for (var observedClass =1; observedClass < 13; observedClass++) {
  // Convert to image
    var ref = validation.filter(ee.Filter.eq('Croptype', observedClass))
    var label = ref.first().get('Label')
    print(label)
    var refImg = ref
      .filter(ee.Filter.notNull(['Croptype']))
      .reduceToImage({
        properties: ['Croptype'],
        reducer: ee.Reducer.first()
      });
    var constantImg = ee.Image(1).mask(refImg);

// Pixel Area of reference data
    var pixelArea = ee.Image.pixelArea().mask(constantImg)
    var area = pixelArea.reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: aoi /* insert appropriate region */,
      scale: 5/* insert appropriate scale */,
      maxPixels: 132287045
    })
    var areainHa_ref = ee.Number(
      area.get('area')).divide(1e4);


// Calculate area overlap per reference class and classification results

    var constant = ee.Image(1).clip(aoi)
    var classified_img = constant.mask(datainput);
    var ref_img = constant.mask(refImg);
    var Compare = classified_img.subtract(ref_img);

// Add 1 to multiply area, otherwise pixelArea function multiplies with 0
    var constantCompare= Compare.select("constant").add(1)

// Calculate pixel area of the overlap area
    var compareArea = ee.Image.pixelArea().mask(constantCompare);
    var area = compareArea.reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: aoi /* insert appropriate region */,
      scale:5/* insert appropriate scale */,
      maxPixels: 132287045
        }) 
// Convert to ha
    var compareAreainHa = ee.Number(
      area.get('area')).divide(1e4);
  

    var percentage = compareAreainHa.divide(areainHa_ref);
    var percentage = percentage.multiply(100)
    print(percentage, '% of area from reference data mapped in class ' + observedClass)
}



