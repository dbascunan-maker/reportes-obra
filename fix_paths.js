const fs = require('fs');
const path = require('path');

const rootDir = __dirname;

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file.startsWith('detalle__')) {
                const codePath = path.join(fullPath, 'code.html');
                if (fs.existsSync(codePath)) {
                    fixFile(codePath);
                }
            }
        }
    }
}

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Fix navigation links
    // Handles the special char 'ó' by matching the pattern loosely or using correct encoding (Node use UTF8 by default)
    // We'll use a string replace which handles this better in memory than shell

    // Exact string match
    const searchString = "/listado_de_inspección_actualizado/code.html";
    const replacement = "../index.html";

    // Replace global
    while (content.includes(searchString)) {
        content = content.replace(searchString, replacement);
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed: ${filePath}`);
    } else {
        console.log(`No changes needed (or pattern not found): ${filePath}`);
        // Debugging: check if encoded differently
        if (content.includes("listado_de_inspecci")) {
            console.log("Found partial match, character mismatch likely.");
        }
    }
}

processDir(rootDir);
