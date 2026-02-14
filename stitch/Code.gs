function doPost(e) {
  try {
    // 1. Get the POST data
    var data = JSON.parse(e.postData.contents);
    var folderName = data.folderName;
    var photos = data.photos;
    var metadata = data.metadata;
    
    // 2. Get or create the main folder "Informes"
    var folders = DriveApp.getFoldersByName("Informes");
    var mainFolder;
    if (folders.hasNext()) {
      mainFolder = folders.next();
    } else {
      mainFolder = DriveApp.createFolder("Informes");
    }
    
    // 3. Create the specific project folder
    var projectFolder = mainFolder.createFolder(folderName);
    
    // 4. Save Metadata
    projectFolder.createFile("metadata.json", JSON.stringify(metadata, null, 2), MimeType.PLAIN_TEXT);
    
    // 5. Save Photos
    var savedFiles = [];
    for (var i = 0; i < photos.length; i++) {
      var photo = photos[i];
      // Remove header if present (e.g. "data:image/jpeg;base64,")
      var base64Data = photo.data.split(',')[1] || photo.data;
      var decoded = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(decoded, MimeType.JPEG, photo.filename);
      var file = projectFolder.createFile(blob);
      savedFiles.push(file.getUrl());
    }
    
    // 6. Return success response
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Informe guardado correctamente",
      folderUrl: projectFolder.getUrl(),
      fileCount: savedFiles.length
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // 7. Return error response
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("El servicio está activo. Usa POST para enviar datos.");
}
