const https = require('https');

const TXDOT_BASE = 'https://its.txdot.gov/its';

const NEARBY_CAMERAS = [
  { id: 'IH35W @ Morningside', label: 'IH-35W @ Morningside (N)' },
  { id: 'IH35W @ Berry',       label: 'IH-35W @ Berry St (S)' },
  { id: 'IH35W @ Spur280',     label: 'IH-35W @ Spur 280' },
  { id: 'IH30 @ Hulen',        label: 'IH-30 @ Hulen' },
];

function fetchDistrict() {
  return new Promise((resolve, reject) => {
    https.get(`${TXDOT_BASE}/DistrictIts/GetCctvSnapshotListByDistrict?districtCode=FTW`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Failed to parse TxDOT response')); }
      });
    }).on('error', reject);
  });
}

module.exports = async (req, res) => {
  try {
    const data = await fetchDistrict();
    const results = NEARBY_CAMERAS.map(({ id, label }) => {
      const cam = data.find(c => c.icd_Id === id);
      return cam
        ? { id, label, snippet: cam.snippet, error: null }
        : { id, label, snippet: null, error: 'not found' };
    });
    // Vercel CDN caches this response for 8s; stale-while-revalidate serves
    // the cached version for up to 30s while a fresh fetch happens in the background
    res.setHeader('Cache-Control', 's-maxage=8, stale-while-revalidate=30');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(results);
  } catch (e) {
    res.status(500).send(e.message);
  }
};
