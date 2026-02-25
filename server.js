const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');

const PORT = 3000;
const TXDOT_BASE = 'https://its.txdot.gov/its';

// Nearby cameras to Magnolia Ave, Fort Worth (IH-35W corridor)
const NEARBY_CAMERAS = [
  { id: 'IH35W @ Morningside', label: 'IH-35W @ Morningside (N)' },
  { id: 'IH35W @ Berry',       label: 'IH-35W @ Berry St (S)' },
  { id: 'IH35W @ Spur280',     label: 'IH-35W @ Spur 280' },
  { id: 'IH30 @ Hulen',        label: 'IH-30 @ Hulen' },
];

function fetchFromTxDOT(urlPath) {
  return new Promise((resolve, reject) => {
    https.get(`${TXDOT_BASE}${urlPath}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Failed to parse TxDOT response')); }
      });
    }).on('error', reject);
  });
}

// Cache the district snapshot list for 8s — all cameras share the same fetch
let districtCache = { data: null, ts: 0 };
const CACHE_TTL_MS = 8000;

async function getDistrictData() {
  if (Date.now() - districtCache.ts < CACHE_TTL_MS && districtCache.data) {
    return districtCache.data;
  }
  const data = await fetchFromTxDOT('/DistrictIts/GetCctvSnapshotListByDistrict?districtCode=FTW');
  districtCache = { data, ts: Date.now() };
  return data;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Serve index.html
  if (url.pathname === '/' || url.pathname === '/index.html') {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(html);
  }

  // CORS proxy: /api/snapshot?id=IH35W%20%40%20Berry
  if (url.pathname === '/api/snapshot') {
    const id = url.searchParams.get('id');
    if (!id) { res.writeHead(400); return res.end('Missing id'); }
    try {
      const data = await getDistrictData();
      const cam = data.find(c => c.icd_Id === id);
      if (!cam) { res.writeHead(404); return res.end('Camera not found'); }
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      return res.end(JSON.stringify({ icd_Id: cam.icd_Id, snippet: cam.snippet }));
    } catch (e) {
      res.writeHead(500); return res.end(e.message);
    }
  }

  // Batch: return snapshots for all nearby cameras in one request
  if (url.pathname === '/api/snapshots') {
    try {
      const data = await getDistrictData();
      const results = NEARBY_CAMERAS.map(({ id, label }) => {
        const cam = data.find(c => c.icd_Id === id);
        return cam
          ? { id, label, snippet: cam.snippet, error: null }
          : { id, label, snippet: null, error: 'not found' };
      });
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      return res.end(JSON.stringify(results));
    } catch (e) {
      res.writeHead(500); return res.end(e.message);
    }
  }

  // API: return list of nearby cameras
  if (url.pathname === '/api/cameras') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    return res.end(JSON.stringify(NEARBY_CAMERAS));
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Fort Worth cams running at http://localhost:${PORT}`);
});
