function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var folderName = data.folderName;
    var photos = data.photos;
    var metadata = data.metadata;
    
    // ID de la carpeta principal de Google Drive configurada
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
    
    // Crear la carpeta específica para el proyecto actual
    var projectFolder = mainFolder.createFolder(folderName);
    
    // Guardar respaldo de metadatos en JSON
    projectFolder.createFile("metadata.json", JSON.stringify(metadata, null, 2), MimeType.PLAIN_TEXT);
    
    // Generar el contenido HTML estructurado con la plantilla corporativa Sustentambiente
    var htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 40px; }
            .cover { text-align: center; page-break-after: always; padding-top: 100px; }
            .logo { font-size: 26px; font-weight: bold; color: #78be20; margin-bottom: 5px; }
            .subtitle { font-size: 12px; color: #666; letter-spacing: 2px; text-transform: uppercase; }
            h1 { color: #222; font-size: 22px; border-bottom: 2px solid #78be20; padding-bottom: 8px; }
            .photo-card { margin-bottom: 25px; page-break-inside: avoid; border: 1px solid #ddd; padding: 12px; border-radius: 6px; background: #fafafa; }
            .photo-card img { max-width: 100%; height: auto; max-height: 350px; display: block; margin: 0 auto 8px auto; border-radius: 4px; }
            .caption { font-size: 12px; font-weight: bold; color: #444; text-align: center; }
          </style>
        </head>
        <body>
          <div class="cover">
            <div class="logo">SA SUSTENTAMBIENTE</div>
            <div class="subtitle">REGISTRO FOTOGRÁFICO OFICIAL - TRAMITACIÓN SEC</div>
            <h1 style="margin-top: 40px;">${metadata.title || 'Proyecto Fotovoltaico'}</h1>
            <p><strong>Ubicación / Dirección:</strong> ${metadata.subtitle || 'Sin especificar'}</p>
            <p><strong>Fecha de Inspección:</strong> ${metadata.date || 'Sin fecha'}</p>
            <p><strong>Inspector Autorizado:</strong> ${metadata.inspectorName || 'Técnico'} (${metadata.inspectorRole || 'Clase B'})</p>
          </div>
          
          <h1>ÍNDICE TÉCNICO DE INSPECCIÓN</h1>
          <ul>
            <li>1. Unidad de Generación & Fotovoltaje</li>
            <li>2. Orden de Cableado y Conectores</li>
            <li>3. Canalización CC / CA</li>
            <li>4. Inversores y Características</li>
            <li>5. Parámetros de Red y Protecciones</li>
            <li>6. Tableros Eléctricos y Contratapas</li>
            <li>7. Sistema de Puesta a Tierra</li>
          </ul>
          <div style="page-break-after: always;"></div>
    `;
    
    // Procesar y adjuntar cada imagen al reporte
    var savedFilesCount = 0;
    for (var i = 0; i < photos.length; i++) {
      var photo = photos[i];
      var base64Data = photo.data.split(',')[1] || photo.data;
      var decoded = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(decoded, MimeType.JPEG, photo.filename);
      var file = projectFolder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      var imageUrl = "https://lh3.googleusercontent.com/d/" + file.getId();
      
      htmlContent += `
        <div class="photo-card">
          <img src="${imageUrl}" />
          <div class="caption">Figura ${i + 1}: ${photo.category.toUpperCase()} — ${photo.filename}</div>
        </div>
      `;
      savedFilesCount++;
    }
    
    htmlContent += `</body></html>`;
    
    // Crear documento temporal en Google Docs para conversión nativa a PDF
    var tempDoc = DocumentApp.create("Temp_Informe_" + Date.now());
    tempDoc.getBody().appendParagraph(htmlContent);
    
    var docFile = DriveApp.getFileById(tempDoc.getId());
    var pdfBlob = docFile.getAs(MimeType.PDF);
    pdfBlob.setName(`Informe_Fotografico_${folderName}.pdf`);
    
    var finalPdfFile = projectFolder.createFile(pdfBlob);
    finalPdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Limpiar el documento temporal de texto de Google Docs
    docFile.setTrashed(true);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Informe generado y guardado correctamente",
      folderUrl: projectFolder.getUrl(),
      pdfUrl: finalPdfFile.getUrl(),
      fileCount: savedFilesCount
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("El servicio está activo. Usa POST para enviar datos.");
}
