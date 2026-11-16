/**
 * Generador Automático de Informes Fotográficos FV - Sustentambiente
 * Replica el formato corporativo LaTeX (Montserrat, #94C41C, Portada, Índice y Figuras)
 */

// ============================================================
// CONFIGURACIÓN GENERAL
// ============================================================
var MAIN_DRIVE_FOLDER_ID = "15-HgejfO7iVHI62yCi7x35FSfxbbdfpb"; // Tu carpeta raíz en Drive

// Colores y Tipografía extraídos de configuraciones_Rising.sty
var COLOR_PRIMARY = "#94C41C"; // RGB(148, 196, 28) - RisingColor
var COLOR_DARK    = "#1C130D"; // Texto principal
var COLOR_MUTED   = "#555555"; // Subtítulos y pies de foto
var COLOR_BG_CARD = "#F8F9F5"; // Fondo suave para recuadro de portada
var FONT_MAIN     = "Montserrat";

// Mapeo de las 15 categorías de la App hacia las 8 secciones del informe oficial
var REPORT_STRUCTURE = [
  {
    title: "UNIDAD DE GENERACIÓN",
    subsections: [
      {
        title: "Fachada / Numeración de la Propiedad",
        categories: ["Fachada", "Punto de acceso de la planta"],
        includeProjectDetails: true,
        intro: "En las siguientes figuras se muestra el acceso, ubicación y fachada de la propiedad inspeccionada:"
      },
      {
        title: "Paneles Fotovoltaicos, Vista General",
        categories: ["Paneles solares"],
        intro: "Se presenta a continuación la vista general de los módulos fotovoltaicos instalados en la planta:"
      },
      {
        title: "Estructura y Aterrizaje Paneles-Estructura",
        categories: ["Estructura", "Aterrizaje", "Bastidor"],
        intro: "Se observa el montaje estructural, pletinas de continuidad y conexiones equipotenciales de aterrizaje:"
      },
      {
        title: "Señaléticas de Seguridad",
        categories: ["Señalética"],
        intro: "Se detallan las señaléticas normativas de advertencia, identificación y apagado de emergencia:"
      }
    ]
  },
  {
    title: "ORDEN DE CABLEADO Y CONECTORES",
    subsections: [
      {
        title: "Orden de Cableado y Disposición en Rieles",
        categories: ["Cableado"],
        intro: "Se muestra la disposición inferior de los conductores solares y su sujeción a la estructura:"
      }
    ]
  },
  {
    title: "CANALIZACIÓN",
    subsections: [
      {
        title: "Trazado Canalización CC / AC",
        categories: ["Canalización"],
        intro: "Se observa el trazado de bandejas portaconductores y ductos de canalización hacia equipos:"
      }
    ]
  },
  {
    title: "INVERSORES",
    subsections: [
      {
        title: "Disposición, Conectores y Placa de Características",
        categories: ["Inversor"],
        intro: "Se detalla el montaje de los inversores, llegada de strings CC, número de serie y placa técnica:"
      }
    ]
  },
  {
    title: "PARÁMETROS INVERSORES",
    subsections: [
      {
        title: "Configuración de Red y Perfil Chile",
        categories: ["Perfil chile"],
        intro: "Se presentan los parámetros eléctricos, protecciones y configuración bajo norma chilena:"
      }
    ]
  },
  {
    title: "TABLEROS ELÉCTRICOS",
    subsections: [
      {
        title: "Tablero Fotovoltaico, Contratapa y Protecciones",
        categories: ["Tablero", "Automáticos"],
        intro: "Se muestra la disposición externa, contratapa, protecciones termomagnéticas y auxiliares del tablero:"
      }
    ]
  },
  {
    title: "TABLERO TEMP / TRANSFORMADOR",
    subsections: [
      {
        title: "Transformador, Empalme y Protecciones de Inyección",
        categories: ["Transformador"],
        intro: "Se detalla el equipamiento de transformación, empalme y protecciones asociadas:"
      }
    ]
  },
  {
    title: "SISTEMA DE PUESTA A TIERRA",
    subsections: [
      {
        title: "Medición de Puesta a Tierra y Valores de Ajuste",
        categories: ["Medición a tierra"],
        intro: "Se registra la cámara de inspección y medición de resistencia del sistema de puesta a tierra:"
      }
    ]
  }
];

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var folderName = data.folderName || ("Informe_" + Date.now());
    var photos = data.photos || [];
    var metadata = data.metadata || {};

    var mainFolder;
    try {
      mainFolder = DriveApp.getFolderById(MAIN_DRIVE_FOLDER_ID);
    } catch (err) {
      return jsonResponse({
        status: "error",
        message: "No se encontró la carpeta principal en Drive con ID: " + MAIN_DRIVE_FOLDER_ID
      });
    }

    // 1. Crear carpeta del proyecto y guardar respaldo JSON
    var projectFolder = mainFolder.createFolder(folderName);
    projectFolder.createFile("metadata.json", JSON.stringify(metadata, null, 2), MimeType.PLAIN_TEXT);

    // 2. Guardar todas las imágenes individuales en la carpeta de Drive y organizarlas por categoría
    var photosByCategory = {};
    var savedFilesCount = 0;

    for (var i = 0; i < photos.length; i++) {
      var p = photos[i];
      var base64Data = p.data.split(',')[1] || p.data;
      var decoded = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(decoded, MimeType.JPEG, p.filename);

      var file = projectFolder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      var catKey = normalizeText(p.category);
      if (!photosByCategory[catKey]) {
        photosByCategory[catKey] = [];
      }
      photosByCategory[catKey].push({
        blob: blob,
        category: p.category,
        filename: p.filename,
        caption: p.caption || ""
      });
      savedFilesCount++;
    }

    // 3. Buscar assets corporativos opcionales en la carpeta raíz de Drive (logo.png / portada.jpg)
    var logoBlob = findAssetBlob(mainFolder, ["logo.png", "Logo.png", "logo.jpg"]);
    var portadaBlob = findAssetBlob(mainFolder, ["Portadaa.jpeg", "portada.jpeg", "portada.jpg", "portada.png"]);

    // 4. Crear documento Google Docs temporal y maquetar el informe
    var tempDoc = DocumentApp.create("Temp_Informe_" + Date.now());
    var body = tempDoc.getBody();

    // Configurar página Carta (Letter: 612 x 792 pt) y márgenes
    body.setPageWidth(612);
    body.setPageHeight(792);
    body.setMarginTop(72);
    body.setMarginBottom(60);
    body.setMarginLeft(45);
    body.setMarginRight(45);

    // Encabezado y Pie de página corporativo
    setupHeaderAndFooter(tempDoc, logoBlob);

    // PÁGINA 1: PORTADA
    buildCoverPage(body, metadata, logoBlob, portadaBlob);
    body.appendPageBreak();

    // PÁGINA 2: ÍNDICE AUTOMÁTICO
    buildIndexPage(body);
    body.appendPageBreak();

    // PÁGINAS DE CONTENIDO: SECCIONES Y FOTOGRAFÍAS
    var usedCategories = {};
    var figCounter = 1;
    var activeSecNum = 1;

    for (var s = 0; s < REPORT_STRUCTURE.length; s++) {
      var section = REPORT_STRUCTURE[s];
      var sectionHasContent = false;
      var activeSubsections = [];

      // Verificar qué subsecciones tienen fotos (o datos técnicos en Sección 1)
      for (var sub = 0; sub < section.subsections.length; sub++) {
        var subObj = section.subsections[sub];
        var subPhotos = [];

        for (var c = 0; c < subObj.categories.length; c++) {
          var key = normalizeText(subObj.categories[c]);
          usedCategories[key] = true;
          if (photosByCategory[key]) {
            subPhotos = subPhotos.concat(photosByCategory[key]);
          }
        }

        if (subPhotos.length > 0 || subObj.includeProjectDetails) {
          sectionHasContent = true;
          activeSubsections.push({
            def: subObj,
            photos: subPhotos
          });
        }
      }

      if (!sectionHasContent) continue;

      // Renderizar Banner Verde de Sección (HEADING1)
      appendSectionBanner(body, activeSecNum + ". " + section.title);

      for (var a = 0; a < activeSubsections.length; a++) {
        var activeSub = activeSubsections[a];
        var subTitle = activeSecNum + "." + (a + 1) + " " + activeSub.def.title;

        // Subtítulo de sección (HEADING2)
        appendSubsectionHeading(body, subTitle);

        // Si es la subsección de Fachada, agregar ficha de ubicación como en el boceto
        if (activeSub.def.includeProjectDetails) {
          appendLocationBullets(body, metadata);
        }

        if (activeSub.photos.length > 0) {
          var introP = body.appendParagraph(activeSub.def.intro);
          introP.setFontFamily(FONT_MAIN)
                .setFontSize(10.5)
                .setForegroundColor(COLOR_DARK)
                .setSpacingAfter(10)
                .setKeepWithNext(true);

          for (var k = 0; k < activeSub.photos.length; k++) {
            var item = activeSub.photos[k];
            var captionText = item.caption
              ? item.caption
              : (item.category + " (" + item.filename.replace(/\.[^/.]+$/, "") + ")");

            appendFigure(body, item.blob, figCounter, captionText);
            figCounter++;
          }
        }
      }

      activeSecNum++;
      // Salto de página después de cada sección principal (excepto la última)
      if (s < REPORT_STRUCTURE.length - 1) {
        body.appendPageBreak();
      }
    }

    // Respaldo: Si llegara alguna categoría nueva no mapeada, incluirla al final
    var extraPhotos = [];
    for (var catKey in photosByCategory) {
      if (!usedCategories[catKey]) {
        extraPhotos = extraPhotos.concat(photosByCategory[catKey]);
      }
    }
    if (extraPhotos.length > 0) {
      body.appendPageBreak();
      appendSectionBanner(body, activeSecNum + ". REGISTRO ADICIONAL DE OBRA");
      for (var ep = 0; ep < extraPhotos.length; ep++) {
        var extraItem = extraPhotos[ep];
        appendFigure(body, extraItem.blob, figCounter, extraItem.category + " — " + extraItem.filename);
        figCounter++;
      }
    }

    // Guardar y cerrar el Google Doc para forzar la actualización del índice y conversión
    tempDoc.saveAndClose();

    // 5. Convertir a PDF y guardar en la carpeta del proyecto en Drive
    var docFile = DriveApp.getFileById(tempDoc.getId());
    var pdfBlob = docFile.getAs(MimeType.PDF);
    pdfBlob.setName("Informe_Fotografico_" + folderName + ".pdf");

    var finalPdfFile = projectFolder.createFile(pdfBlob);
    finalPdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Eliminar el documento temporal de Google Docs
    docFile.setTrashed(true);

    return jsonResponse({
      status: "success",
      message: "Informe fotográfico generado correctamente",
      folderUrl: projectFolder.getUrl(),
      pdfUrl: finalPdfFile.getUrl(),
      fileCount: savedFilesCount
    });

  } catch (error) {
    return jsonResponse({
      status: "error",
      message: error.toString()
    });
  }
}

// ============================================================
// FUNCIONES DE CONSTRUCCIÓN VISUAL DEL DOCUMENTO
// ============================================================

function setupHeaderAndFooter(doc, logoBlob) {
  var header = doc.addHeader();
  var hTable = header.appendTable();
  var hRow = hTable.appendTableRow();
  hTable.setBorderWidth(0);

  var leftCell = hRow.appendTableCell();
  var rightCell = hRow.appendTableCell();
  leftCell.setWidth(260);
  rightCell.setWidth(262);

  if (logoBlob) {
    var lp = leftCell.getChild(0).asParagraph();
    var img = lp.appendInlineImage(logoBlob);
    var ratio = Math.min(130 / img.getWidth(), 36 / img.getHeight(), 1);
    img.setWidth(Math.round(img.getWidth() * ratio));
    img.setHeight(Math.round(img.getHeight() * ratio));
  } else {
    var lpText = leftCell.getChild(0).asParagraph();
    lpText.appendText("SA SUSTENTAMBIENTE")
          .setFontFamily(FONT_MAIN)
          .setFontSize(11)
          .setBold(true)
          .setForegroundColor(COLOR_PRIMARY);
  }

  var rp = rightCell.getChild(0).asParagraph();
  rp.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  rp.appendText("REGISTRO FOTOGRÁFICO FOTOVOLTAICO")
    .setFontFamily(FONT_MAIN)
    .setFontSize(8.5)
    .setBold(true)
    .setForegroundColor(COLOR_MUTED);

  // Pie de página corporativo
  var footer = doc.addFooter();
  var fp = footer.appendParagraph("SUSTENTAMBIENTE ENERGÍA SOLAR  |  INFORME TÉCNICO DE INSPECCIÓN");
  fp.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
    .setFontFamily(FONT_MAIN)
    .setFontSize(8.5)
    .setBold(true)
    .setForegroundColor(COLOR_PRIMARY);
}

function buildCoverPage(body, metadata, logoBlob, portadaBlob) {
  // Franja superior verde
  var topBar = body.appendTable([[""]]);
  topBar.setBorderWidth(0);
  var topCell = topBar.getCell(0, 0);
  topCell.setBackgroundColor(COLOR_PRIMARY);
  topCell.setPaddingTop(6).setPaddingBottom(6);

  // Imagen de portada si existe en Drive, o logo corporativo grande
  var visualPara = body.appendParagraph("");
  visualPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
            .setSpacingBefore(portadaBlob ? 15 : 55)
            .setSpacingAfter(25);

  if (portadaBlob) {
    var coverImg = visualPara.appendInlineImage(portadaBlob);
    var cRatio = Math.min(480 / coverImg.getWidth(), 280 / coverImg.getHeight(), 1);
    coverImg.setWidth(Math.round(coverImg.getWidth() * cRatio));
    coverImg.setHeight(Math.round(coverImg.getHeight() * cRatio));
  } else if (logoBlob) {
    var bigLogo = visualPara.appendInlineImage(logoBlob);
    var lRatio = Math.min(240 / bigLogo.getWidth(), 120 / bigLogo.getHeight(), 1);
    bigLogo.setWidth(Math.round(bigLogo.getWidth() * lRatio));
    bigLogo.setHeight(Math.round(bigLogo.getHeight() * lRatio));
  } else {
    visualPara.appendText("SA SUSTENTAMBIENTE\n")
              .setFontFamily(FONT_MAIN).setFontSize(26).setBold(true).setForegroundColor(COLOR_PRIMARY);
    visualPara.appendText("ENERGÍA SOLAR")
              .setFontFamily(FONT_MAIN).setFontSize(12).setBold(true).setForegroundColor(COLOR_MUTED);
  }

  // Título Principal (Estilo Portada LaTeX)
  var titleLabel = body.appendParagraph("Registro fotográfico:");
  titleLabel.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
            .setFontFamily(FONT_MAIN)
            .setFontSize(24)
            .setBold(true)
            .setForegroundColor(COLOR_DARK)
            .setSpacingBefore(20)
            .setSpacingAfter(6);

  var projectTitle = body.appendParagraph(metadata.title || "Proyecto Fotovoltaico");
  projectTitle.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
              .setFontFamily(FONT_MAIN)
              .setFontSize(28)
              .setBold(true)
              .setForegroundColor(COLOR_PRIMARY)
              .setSpacingAfter(8);

  var projectSub = body.appendParagraph(metadata.subtitle || "Instalación Fotovoltaica");
  projectSub.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
            .setFontFamily(FONT_MAIN)
            .setFontSize(14)
            .setForegroundColor(COLOR_MUTED)
            .setSpacingAfter(45);

  // Tabla de Ficha Técnica del Proyecto (con bordes en color RisingColor #94C41C)
  var infoRows = [
    ["PROYECTO / OBRA:", metadata.title || "Sin especificar"],
    ["UBICACIÓN / DIRECCIÓN:", metadata.subtitle || "Sin especificar"],
    ["MANDANTE / CLIENTE:", metadata.clientName || "Sin especificar"],
    ["FECHA DE INSPECCIÓN:", metadata.date || "Sin fecha"],
    ["INSPECTOR RESPONSABLE:", (metadata.inspectorName || "Técnico") + (metadata.inspectorRole ? " (" + metadata.inspectorRole + ")" : "")]
  ];

  if (metadata.coordinates) {
    infoRows.push(["COORDENADAS:", metadata.coordinates]);
  }
  if (metadata.clientNumber) {
    infoRows.push(["N° DE CLIENTE:", metadata.clientNumber]);
  }

  var infoTable = body.appendTable(infoRows);
  infoTable.setBorderColor(COLOR_PRIMARY);
  infoTable.setBorderWidth(1);

  for (var r = 0; r < infoRows.length; r++) {
    var row = infoTable.getRow(r);
    var c0 = row.getCell(0);
    var c1 = row.getCell(1);

    c0.setWidth(185).setBackgroundColor(COLOR_BG_CARD).setPaddingTop(7).setPaddingBottom(7).setPaddingLeft(10);
    c1.setWidth(337).setBackgroundColor("#FFFFFF").setPaddingTop(7).setPaddingBottom(7).setPaddingLeft(10);

    c0.getChild(0).asParagraph().setFontFamily(FONT_MAIN).setFontSize(9.5).setBold(true).setForegroundColor(COLOR_DARK);
    c1.getChild(0).asParagraph().setFontFamily(FONT_MAIN).setFontSize(10).setBold(false).setForegroundColor(COLOR_DARK);
  }
}

function buildIndexPage(body) {
  var idxTitle = body.appendParagraph("ÍNDICE");
  idxTitle.setFontFamily(FONT_MAIN)
          .setFontSize(20)
          .setBold(true)
          .setForegroundColor(COLOR_DARK)
          .setSpacingBefore(10)
          .setSpacingAfter(12);

  // Línea separadora verde bajo el título ÍNDICE
  var lineTable = body.appendTable([[""]]);
  lineTable.setBorderWidth(0);
  var lineCell = lineTable.getCell(0, 0);
  lineCell.setBackgroundColor(COLOR_PRIMARY);
  lineCell.setPaddingTop(1).setPaddingBottom(1);

  body.appendParagraph("").setSpacingAfter(6);

  // Tabla de Contenidos nativa de Google Docs (lee HEADING1 y HEADING2 y calcula páginas)
  body.appendTableOfContents();
}

function appendSectionBanner(body, titleText) {
  var table = body.appendTable([[titleText.toUpperCase()]]);
  table.setBorderColor(COLOR_PRIMARY);
  table.setBorderWidth(1);

  var cell = table.getCell(0, 0);
  cell.setWidth(522);
  cell.setBackgroundColor(COLOR_PRIMARY);
  cell.setPaddingTop(8);
  cell.setPaddingBottom(8);
  cell.setPaddingLeft(12);
  cell.setPaddingRight(12);

  var p = cell.getChild(0).asParagraph();
  p.setHeading(DocumentApp.ParagraphHeading.HEADING1);
  p.setFontFamily(FONT_MAIN)
   .setFontSize(15)
   .setBold(true)
   .setForegroundColor("#FFFFFF")
   .setSpacingBefore(0)
   .setSpacingAfter(0)
   .setKeepWithNext(true);

  body.appendParagraph("").setSpacingAfter(4).setKeepWithNext(true);
}

function appendSubsectionHeading(body, subText) {
  var p = body.appendParagraph(subText);
  p.setHeading(DocumentApp.ParagraphHeading.HEADING2);
  p.setFontFamily(FONT_MAIN)
   .setFontSize(12.5)
   .setBold(true)
   .setForegroundColor(COLOR_DARK)
   .setSpacingBefore(10)
   .setSpacingAfter(6)
   .setKeepWithNext(true);
}

function appendLocationBullets(body, metadata) {
  var bullets = [
    { label: "Dirección: ", value: metadata.subtitle || "Sin especificar" },
    { label: "Mandante: ", value: metadata.clientName || "Sin especificar" },
    { label: "Fecha de Inspección: ", value: metadata.date || "Sin fecha" }
  ];

  if (metadata.coordinates) {
    bullets.push({ label: "Coordenadas: ", value: metadata.coordinates });
  }
  if (metadata.clientNumber) {
    bullets.push({ label: "N° de Cliente: ", value: metadata.clientNumber });
  }

  for (var i = 0; i < bullets.length; i++) {
    var li = body.appendListItem("");
    li.setGlyphType(DocumentApp.GlyphType.SQUARE_BULLET);
    li.setFontFamily(FONT_MAIN).setFontSize(10).setSpacingAfter(3);

    var lbl = li.appendText(bullets[i].label);
    lbl.setBold(true).setForegroundColor(COLOR_DARK);

    var val = li.appendText(bullets[i].value);
    val.setBold(false).setForegroundColor(COLOR_MUTED);
  }

  body.appendParagraph("").setSpacingAfter(6);
}

function appendFigure(body, blob, figNumber, captionText) {
  // Párrafo de imagen centrada (unido al pie de foto con keepWithNext)
  var imgPara = body.appendParagraph("");
  imgPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
         .setSpacingBefore(8)
         .setSpacingAfter(4)
         .setKeepWithNext(true);

  var img = imgPara.appendInlineImage(blob);
  var origW = img.getWidth();
  var origH = img.getHeight();
  var maxW = 390; // Ancho máximo en puntos para hoja Carta
  var maxH = 315; // Alto máximo en puntos (permite 2 fotos por hoja cómodamente)
  var ratio = Math.min(maxW / origW, maxH / origH, 1);

  img.setWidth(Math.round(origW * ratio));
  img.setHeight(Math.round(origH * ratio));

  // Pie de figura: "Figura X: Descripción"
  var capPara = body.appendParagraph("");
  capPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
         .setSpacingAfter(14);

  var figPrefix = capPara.appendText("Figura " + figNumber + ": ");
  figPrefix.setFontFamily(FONT_MAIN)
           .setFontSize(9.5)
           .setBold(true)
           .setForegroundColor(COLOR_DARK);

  var figBody = capPara.appendText(captionText);
  figBody.setFontFamily(FONT_MAIN)
         .setFontSize(9.5)
         .setItalic(true)
         .setForegroundColor(COLOR_MUTED);
}

// ============================================================
// UTILIDADES
// ============================================================

function findAssetBlob(folder, candidateNames) {
  for (var i = 0; i < candidateNames.length; i++) {
    var files = folder.getFilesByName(candidateNames[i]);
    if (files.hasNext()) {
      return files.next().getBlob();
    }
  }
  return null;
}

function normalizeText(str) {
  if (!str) return "";
  return str.toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return ContentService.createTextOutput("Servicio de Informes Fotográficos Sustentambiente activo.");
}
