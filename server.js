const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const BASE_DIR = __dirname;
// const REPORT_DIR = path.join(BASE_DIR, 'Informes');
const REPORT_DIR = String.raw`G:\.shortcut-targets-by-id\18Tb-NBOXp099Jtf2KMn6rG1Qka4GZTa9\2022 SUSTENTAMBIENTE\Proyectos\Adjudicados\Privados\01. Virutex 240 kWp_ Santiago\Fotos informe`;

// Ensure reports directory exists
if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR);
}

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
};

const server = http.createServer((req, res) => {
    // CORS headers for development flexibility
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const reqPath = decodeURIComponent(req.url.split('?')[0]);

    // API: Save Report
    if (req.method === 'POST' && reqPath === '/api/save-report') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            // Basic flood protection: 50MB limit
            if (body.length > 50 * 1024 * 1024) {
                res.writeHead(413, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Payload too large' }));
                req.destroy();
            }
        });

        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const folderName = data.folderName || `Reporte_${Date.now()}`;
                const projectPath = path.join(REPORT_DIR, folderName);

                // Create folder for this specific report
                if (!fs.existsSync(projectPath)) {
                    fs.mkdirSync(projectPath, { recursive: true });
                }

                // Save photos
                let savedCount = 0;
                if (data.photos && Array.isArray(data.photos)) {
                    data.photos.forEach(photo => {
                        const base64Data = photo.data.replace(/^data:image\/\w+;base64,/, "");
                        const buffer = Buffer.from(base64Data, 'base64');
                        const filePath = path.join(projectPath, photo.filename);
                        fs.writeFileSync(filePath, buffer);
                        savedCount++;
                    });
                }

                // Save metadata JSON
                fs.writeFileSync(path.join(projectPath, 'metadata.json'), JSON.stringify(data, null, 2));

                console.log(`✅ Saved report: ${folderName} (${savedCount} photos)`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Report saved', path: projectPath }));

            } catch (e) {
                console.error('Error processing upload:', e);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal Server Error', details: e.message }));
            }
        });
        return;
    }

    // Still serve static files for the app
    let filePath = path.join(BASE_DIR, reqPath === '/' ? '/index.html' : reqPath);

    // Security check
    if (!filePath.startsWith(BASE_DIR)) {
        res.writeHead(403);
        res.end('Access Denied');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 Not Found</h1>');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  🚀 Servidor listo para recibir fotos`);
    console.log(`  📂 Carpeta de destino: ${REPORT_DIR}`);
    console.log(`  🌐 URL Local: http://localhost:${PORT}`);
    // console.log(`  📱 URL Red: (Check 'ipconfig' to find your IP)`);
    console.log(`\n`);
});
