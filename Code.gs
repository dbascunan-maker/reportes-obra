function doPost(e) {
  try {
    // 1. Get the POST data
    var data = JSON.parse(e.postData.contents);
    var folderName = data.folderName;
    var photos = data.photos;
    var metadata = data.metadata;
    
    // 2. Get the destination folder by ID
    // ID obtenido del enlace proporcionado: https://drive.google.com/drive/folders/15-HgejfO7iVHI62yCi7x35FSfxbbdfpb?hl=es-419
    var folderId = "15-HgejfO7iVHI62yCi7x35FSfxbbdfpb"; 
    
    var mainFolder;
    try {
      mainFolder = DriveApp.getFolderById(folderId);
    } catch (e) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Error: No se encontró la carpeta con ID: " + folderId
      })).setMimeType(ContentService.MimeType.JSON);
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
