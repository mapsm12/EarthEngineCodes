function downloadFromYear(anho){
    var startDate = ee.Date(anho+'-01-01');
    var endDate = ee.Date(anho+'-12-31');
    
    // shp file subido a tus archivos personales 
    var bufferID = "projects/ee-my-username23/assets/shp";
    
    //Cambiar el valor de selector por uno de los siguientes valores dependiendo del landsat a //usar dependiendo del año según (de preferencia usar el satélite más reciente en caso sea posible) :
    // 0 : (2013 - Presente) Landsat 8
    // 1 : (1999 - Presente) Landsat 7
    // 2 : (1984 - 2012) Landsat 5
    
    //Cambiar este valor para seleccionar el satélite a utilizar
    var selector = 2;
    var landsatSatellite = "";
    
    //IMAGENREAL
    function getIMAGENREAL(image){
      var isLandsat75 = (selector !== 0);
      var B1 = image.select(isLandsat75 ? 'B7' : 'B7'); 
      var B2 = image.select(isLandsat75 ? 'B5' : 'B6');     
      var B3 = image.select(isLandsat75 ? 'B2' : 'B3'); 

      var ndwi = B3.subtract(B1).divide(B3.add(B1));

      var IMAGENREAL = B1.addBands(B2).addBands(B3).addBands(ndwi);
    //   getting ndwi
        
      return IMAGENREAL;
    }
    
    //Landsat banda BQA 
    //Filtrado de nubes usando usando la banda BQA del satélite landsat. Esta banda proporciona información 
    //mediante sus bits 3 y 4 (nubes opacas y cirro respectivamente). La función extrae estos bits de la imagen y 
    //realiza una operación AND lógica para eliminar todos los casos en que cualquiera de esos bits tenga valor 1 (presencia de nubes).
    //Se retorna la imagen actualizada con esa máscara creada.
    
    function maskLandsatClouds(image){
        var qa = image.select('BQA');
        var cloudBitMask = ee.Number(2).pow(3).int();
        var cirrusBitMask = ee.Number(2).pow(4).int();
        var mask = qa.bitwiseAnd(cloudBitMask).eq(0).and(qa.bitwiseAnd(cirrusBitMask).eq(0));
        return image.updateMask(mask);
    }
    
    switch(selector){
      
        case 0:
            landsatSatellite =  'LANDSAT/LC08/C01/T1_TOA';
            break;
        case 1:
            landsatSatellite =  'LANDSAT/LE07/C01/T1_TOA';
            break;
        case 2:
            landsatSatellite =  'LANDSAT/LT05/C01/T1_TOA' ;
            break;
        default:
            landsatSatellite =  'LANDSAT/LC08/C01/T1_TOA';
    
    }
    
    //Extracción del fusion table correspondiente al ID. A partir de estas tablas
    //se extrae la geometría de cada buffer para delimitar el área de estudio y las coordenadas para posteriormente unir ambas geometrías
    //y facilitar la visualización. 
    
    //var buffer = ee.FeatureCollection(("ft:").concat(bufferID));
    var buffer = ee.FeatureCollection(bufferID);
    
    var bufferGeometry = buffer.geometry();
    var bufferCoords = bufferGeometry.coordinates();
    var bufferCentroid = bufferGeometry.centroid();
    
    //Se extrae una collección de imágenes satelitales del Landsat X (dependiendo del año cambia el satélite a usar) para el multipolígono creado y en las fechas inicializadas
    var landsatCollection = ee.ImageCollection(landsatSatellite).filterBounds(bufferGeometry).filterDate(startDate, endDate);
    
    //Se realiza un pequeño filtrado adicional con el porcentaje de píxeles nubosos con un umbral (este umbral varía dependiendo la zona
    //y otros parámetros como sombra. En este caso se utilizó el valor 35 ya que para valores menores se perdía/cortaba parte de la imagen)
    var cloudPixelFiltered = landsatCollection.map(maskLandsatClouds);
                  
    //Etapa de filtrado con índices. Para cada colección se toma cada imagen (función map) y se le aplica el índice correspondiente y finalmente 
    //se extrae la mediana del conjunto de imágenes la cual se usará para visualizar en el mapa
    
    var imagenrealFiltered = cloudPixelFiltered.map(getIMAGENREAL).median();
    
    //Se centra el mapa usando el centroide del multipolígono
    Map.centerObject(bufferCentroid, 11);
    
    //Se muestra los índices con parámetros de visualización
    
    Map.addLayer(imagenrealFiltered.clip(bufferGeometry), 
                {min:0.034, max:0.23}, 'IMAGENREAL');
    
    //Exportar imagen a Drive (usar tab de tasks)
    //Reemplazar campo image por el nombre de la variable a exportar
    //Crear una geometría manualmente y reemplazar en campo region 
    
    var task = Export.image.toDrive({
      image: imagenrealFiltered.clip(bufferGeometry),
      description:'Leticia_01_'+anho+'_cre',
      region: bufferGeometry,
      scale: 30,
      maxPixels: 1e13,
    })
    // convert to jpg
    var task2 = Export.image.toDrive({
        image: imagenrealFiltered.clip(bufferGeometry),
        description:'Leticia_01_'+anho+'_cre_ndwi',
        region: bufferGeometry,
        scale: 30,
        maxPixels: 1e13,
        formatOptions: {
            cloudOptimized: true
        }
    })


}

// applying anho to fcuntion downloadFromYear
for (var i = 1984; i <= 2012; i++) {
    downloadFromYear(i);
}

//Inicialización de las fechas (Se debe revisar la disponibilidad de imágenes para cada satélite dependiendo del año)
