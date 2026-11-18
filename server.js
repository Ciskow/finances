const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8182;
const DATA = process.env.DATA_FILE_PATH || '/data/db.json';
const DIST = path.join(__dirname, 'dist');
const TYPES = {
  '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2', '.map': 'application/json',
};

http.createServer((req, res) => {
  if (req.url.startsWith('/api/data')) {
    if (req.method === 'GET') {
      fs.readFile(DATA, (e, b) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(e ? 'null' : b);
      });
    } else if (req.method === 'PUT') {
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', () => {
        try { JSON.parse(body); } catch (e) { res.writeHead(400); return res.end('bad json'); }
        try { fs.mkdirSync(path.dirname(DATA), { recursive: true }); } catch (e) {}
        const tmp = DATA + '.tmp';
        fs.writeFile(tmp, body, e => {
          if (e) { res.writeHead(500); return res.end('write fail'); }
          fs.rename(tmp, DATA, e2 => {
            if (e2) { res.writeHead(500); return res.end('rename fail'); }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end('{"ok":true}');
          });
        });
      });
    } else { res.writeHead(405); res.end(); }
  } else {
    // Static files of the React build (dist/); any other path gets index.html.
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const file = path.normalize(path.join(DIST, urlPath));
    const inDist = file.startsWith(DIST + path.sep) && TYPES[path.extname(file)];
    fs.readFile(inDist ? file : path.join(DIST, 'index.html'), (e, b) => {
      if (!e) {
        const type = inDist ? TYPES[path.extname(file)] : 'text/html; charset=utf-8';
        const cache = inDist && urlPath.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache';
        res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache });
        return res.end(b);
      }
      if (inDist) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(500);
      res.end('App not built: run "npm run build" in the web folder.');
    });
  }
}).listen(PORT, () => console.log('Finanças app on :' + PORT + ' — data at ' + DATA));
