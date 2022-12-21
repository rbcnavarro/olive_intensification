// https://earthengine.googlesource.com/users/rebeccanavarrokhoury/MDPI_RS/ReferenceDataCollector_UI

// Set background map visualization options
Map.setOptions('HYBRID');
Map.style().set('cursor', 'crosshair');


// Don't make imports that correspond to the drawn points.
Map.drawingTools().setLinked(false);
Map.drawingTools().addLayer([], 'Winter crops');
Map.drawingTools().addLayer([], 'Spring crops');
Map.drawingTools().addLayer([], 'Summer crops');
Map.drawingTools().addLayer([], 'Double cropping');
Map.drawingTools().addLayer([], 'Shrubland'); 
Map.drawingTools().addLayer([], 'Other vegetation');
Map.drawingTools().addLayer([], 'Impervious ground');
Map.drawingTools().addLayer([], 'Bare land');
Map.drawingTools().addLayer([], 'Deciduous orchards');
Map.drawingTools().addLayer([], 'Evergreen orchards');



Map.drawingTools().setDrawModes(['polygon', 'point', 'rectangle']);


// 


var aboutPanel = ui.Panel(
  {style: {margin: '0px -8px 0px -8px'}});

// Show/hide info panel button.
var aboutButton = ui.Button(
  {label: 'About ❯', style: {margin: '0px 4px 0px 0px'}});

// Information text. 
var descrLabel = ui.Label('This app allows to plot an NDVI time series for different years to collect virtual reference data for different crop types based on their NDVI peak. It uses 10 m pixel size Sentinel-2 imagery. Please consider that orchards with large tree-to-tree spacings or additional land use off season between trees can cause a bias in the NDVI time series.');


var gridmetLabel = ui.Label('Tool developed and designed by R. Navarro on behalf of BICC within the BMBF funded project I-WALAMAR [grant number: 01LZ1807D].', null,
  'https://www.bicc.de/about/staff/staffmember/member/786-navarro/');
var descrHolder = ui.Panel([descrLabel, gridmetLabel]);

var infoShow = false;
function infoButtonHandler() {
  if(infoShow) {
    infoShow = false;
    descrHolder.style().set('shown', false);
    aboutButton.setLabel('About ❯');
  } else {
    infoShow = true;
    descrHolder.style().set('shown', true);
    aboutButton.setLabel('About ❮');
  }
}
aboutPanel.style().set({
  position: 'top-right',
  backgroundColor: 'rgba(255, 255, 255, 0.5)'
});
descrLabel.style().set({
  margin: '0px',
  backgroundColor: 'rgba(255, 255, 255, 0)',
  fontSize: '13px',
  color: '505050'
});
gridmetLabel.style().set({
  margin: '4px 0px 0px 0px',
  backgroundColor: 'rgba(255, 255, 255, 0)',
  fontSize: '13px',
  color: '505050'
});
descrHolder.style().set({
  shown: false,
  width: '250px',
  margin: '4px 0px 0px 0px',
  padding: '8px 8px 8px 8px',
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
});
aboutButton.style().set({
  margin: '0px 0px 0px 0px'
});
aboutButton.onClick(infoButtonHandler);
aboutPanel.add(aboutButton);
aboutPanel.add(descrHolder);
Map.add(aboutPanel)

// Set up styles
var TITLE_STYLE = {
  fontWeight: '100',
  fontSize: '20px',
  padding: '6px',
  color: '#616161',
  stretch: 'horizontal',
  
  backgroundColor: '#11ffee00',
};


var symbol = {
  rectangle: '⬛',
  polygon: '🔺',
  point: '📍',
};
var drawingTools = Map.drawingTools();

function drawRectangle() {
  
  drawingTools.setShape('rectangle');
  drawingTools.draw();
}

function drawPolygon() {
  
  drawingTools.setShape('polygon');
  drawingTools.draw();
}

function drawPoint() {
  
  drawingTools.setShape('point');
  drawingTools.draw();
}

function clearGeometry() {
  var layers = drawingTools.layers();
  layers.get(0).geometries().remove(layers.get(0).geometries().get(0));
}
function editMode() {
  drawingTools.onEdit()
}
function quitDrawing() {
  
  drawingTools.stop();
}


var urlGeom= ui.Label('Download KML file', {shown: false})
// Download function
var exportData = function() {
  print("Exporting data...");
  //Set up download arguments
  var downloadArgsGeom = {
    format: 'kml'
  };
  

  if (Map.drawingTools().layers().length() > 0) {
    var features = Map.drawingTools().toFeatureCollection()
    var exportGeom = ee.FeatureCollection(features);
   urlGeom.setUrl(exportGeom.getDownloadURL(downloadArgsGeom));
    urlGeom.style().set({shown: true});
  }
}

// Add download button to panel
var exportDataButton = ui.Button('Generate download link');
exportDataButton.onClick(exportData);


// Function to mask clouds in Sentinel 2 SR imagery   
/*function maskS2clouds(image) {
  var cloudProb = image.select('MSK_CLDPRB');
  var snowProb = image.select('MSK_SNWPRB');
  var cloud = cloudProb.lt(10);
  var scl = image.select('SCL'); 
  var shadow = scl.eq(3); // 3 = cloud shadow
  var cirrus = scl.eq(10); // 10 = cirrus
  // Cloud probability less than 10% or cloud shadow classification
  var mask = cloud.and(cirrus.neq(1)).and(shadow.neq(1));
  return image.updateMask(mask).divide(10000)
  .copyProperties(image, ['system:time_start']);
}  */



  function maskS2clouds(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask).divide(10000)
  .copyProperties(image, ['system:time_start']);
}
// NDVI time series with harmonic fit and seasonal composite based on: 

// Google Developers. Landsat8 Harmonic Modeling - Earth Engine Code Editor, 2021. 
// Available online: https://code.earthengine.google.com/07fe82cb6d4ef2f13f85a1b278b98897 (accessed on 6 December 2021).

// Function to add an NDVI band, the dependent variable.
var addNDVI = function(image) {
  return image.normalizedDifference(['B8', 'B4'])
    .rename('NDVI')
    .copyProperties(image, ['system:time_start']);
};

// Name of the dependent variable.
var dependent = ee.String('NDVI');

// The number of cycles per year to model.
var harmonics = 2;

// Make a list of harmonic frequencies to model.
// These also serve as band name suffixes.
var harmonicFrequencies = ee.List.sequence(1, harmonics);

// Function to get a sequence of band names for harmonic terms.
var constructBandNames = function(base, list) {
  return ee.List(list).map(function(i) {
    return ee.String(base).cat(ee.Number(i).int());
  });
};

// Construct lists of names for the harmonic terms.
var cosNames = constructBandNames('cos_', harmonicFrequencies);
var sinNames = constructBandNames('sin_', harmonicFrequencies);

// Independent variables.
var independents = ee.List(['constant', 't'])
  .cat(cosNames).cat(sinNames);
  
  
// Function to add a time band.
var addDependents = function(image) {
  // Compute time in fractional years since the epoch.
  var years = image.date().difference('1970-01-01', 'year');
  var timeRadians = ee.Image(years.multiply(2 * Math.PI)).rename('t');
  var constant = ee.Image(1);
  return image.addBands(constant).addBands(timeRadians.float());
};

// Function to compute the specified number of harmonics
// and add them as bands.  Assumes the time band is present.
var addHarmonics = function(freqs) {
  return function(image) {
    // Make an image of frequencies.
    var frequencies = ee.Image.constant(freqs);
    // This band should represent time in radians.
    var time = ee.Image(image).select('t');
    // Get the cosine terms.
    var cosines = time.multiply(frequencies).cos().rename(cosNames);
    // Get the sin terms.
    var sines = time.multiply(frequencies).sin().rename(sinNames);
    return image.addBands(cosines).addBands(sines);
  };
};


// User interface options -------------------------------------- 
var years = {

2016: '2016',
2017: '2017' ,
2018: '2019',
2019: '2019',
  2020: '2020',
  2021:'2021',
}



var dropdown = ui.Select({
  items: Object.keys(years),
  //value: '2020',
  onChange: function(key) {
    var date_start = ee.Date(key+'-01-01T00:00','UTC')
    var date_end = date_start.advance(1, 'years')
    var dateRange = ee.DateRange(date_start, date_end)
  
    var harmonicSentinel = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
        .filterDate(dateRange)
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',5))
        .map(maskS2clouds)
        .map(addNDVI)
        .map(addDependents)
        .map(addHarmonics(harmonicFrequencies));

// The output of the regression reduction is a 4x1 array image.
    var harmonicTrend = harmonicSentinel
        .select(independents.add(dependent))
        .reduce(ee.Reducer.linearRegression(independents.length(), 1));

// Turn the array image into a multi-band image of coefficients. Each band stores an array of coefficients in each pixel.
    var harmonicTrendCoefficients = harmonicTrend.select('coefficients')
        .arrayProject([0])
  // name the coefficients like the variables
        .arrayFlatten([independents]);
  
  // Compute fitted values. = Linear regression function p_t = beta0 + beta1*t ...
    var fittedHarmonic = harmonicSentinel.map(function(image) {
       return image.addBands(
        image.select(independents)
          .multiply(harmonicTrendCoefficients)
          .reduce('sum')
          .rename('fitted'))
          .copyProperties(image, ['system:time_start']);
    });
    // Create a panel for the time series chart
    var panelchart1 = ui.Panel();

// panels to hold lon/lat values
    var lon = ui.Label();
    var lat = ui.Label();
    panelchart1.style().set('width', '400px');
    var intro = ui.Panel([
      ui.Label({
        value: 'Sentinel 2 NDVI time series inspector',
        style: TITLE_STYLE
      }),
    ]);
    panelchart1.add(intro);
    panelchart1.style().set('position', 'bottom-right')
    panelchart1.add(ui.Panel([lon, lat], ui.Panel.Layout.flow('horizontal')));
    
    
    Map.clear();
    Map.add(aboutPanel)
    Map.setOptions('HYBRID')
    Map.add(panelchart1);

    
    Map.onClick(function(coords) {
      lon.setValue('lon: ' + coords.lon.toFixed(2)),
      lat.setValue('lat: ' + coords.lat.toFixed(2));
      var point = ee.Geometry.Point(coords.lon, coords.lat);

      var harmonicS2 = ui.Chart.image.series(
        fittedHarmonic.select(['fitted','NDVI']), point, ee.Reducer.mean(), 30)
          .setSeriesNames(['NDVI', 'fitted'])
          .setOptions({
            legend: {maxLines: 5, position: 'right'},
            title: 'NDVI Harmonic model: original and fitted values for '+key,
            lineWidth: 0.5,
            pointSize: 1,
            showMean: true,
            visibleInLegend: true
          }); 
    Map.layers().set(0,ui.Map.Layer(point, {color: 'FF0000'}, 'NDVI point'));
        panelchart1.widgets().set(0,harmonicS2);
    });
    }
    });
    
    
// Create panel
var controlPanel = ui.Panel({
  widgets:[
    ui.Label('Reference data collection tool', TITLE_STYLE),
    ui.Label('1) Zoom in to your area of interest.'),
    ui.Label('2) Select a year for NDVI time series analysis.'),
    dropdown,
    ui.Label('3) Click on a field and observe the NDVI time series plot.'),
    ui.Label('4) Select a drawing mode, choose or create a LULC class (see "Geometry Imports), and start drawing. Quit drawing mode to plot more NDVI time series.'),
    ui.Panel({
      widgets:[
       
    ui.Button({
      label: symbol.rectangle + ' Rectangle',
      onClick: drawRectangle,
      style: {stretch: 'horizontal'}
    }),
    ui.Button({
      label: symbol.polygon + ' Polygon',
      onClick: drawPolygon,
      style: {stretch: 'horizontal'}
    }),
    ui.Button({
      label: symbol.point + ' Point',
      onClick: drawPoint,
      style: {stretch: 'horizontal'}
    })],
    layout: ui.Panel.Layout.flow('horizontal', true) 
    }),
    ui.Panel({
      widgets:[
       
     ui.Button({
      label:  ' ✎ Edit mode',
      onClick: quitDrawing,
      style: {stretch: 'horizontal'}
    }),
    ui.Button({
      label:  ' 🗑 Delete geometry',
      onClick: clearGeometry,
      style: {stretch: 'horizontal'}
    })],
      layout: ui.Panel.Layout.flow('horizontal', true) 
    }),
    ui.Label('5) When finished, generate a download link.'),
   
    exportDataButton,
     urlGeom,
    //ui.Label('*Please verify the here displayed satellite imagery with dated Google Earth Pro Imagery for better accuracy.'),
    ui.Label('Data source: Sentinel-2 Data (ESA/Copernicus).')],
    
    
  layout: ui.Panel.Layout.flow('vertical', true),
  style: {width: '320px',
  //backgroundColor: colors.gray,
  position: 'bottom-left',
  shown: true
  },
});

// Add it to map

ui.root.insert(0,controlPanel)

Map.add(controlPanel)

ui.root.widgets().reset([controlPanel]);

