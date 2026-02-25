const NEARBY_CAMERAS = [
  { id: 'IH35W @ Morningside', label: 'IH-35W @ Morningside (N)' },
  { id: 'IH35W @ Berry',       label: 'IH-35W @ Berry St (S)' },
  { id: 'IH35W @ Spur280',     label: 'IH-35W @ Spur 280' },
  { id: 'IH30 @ Hulen',        label: 'IH-30 @ Hulen' },
];

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 's-maxage=3600');
  res.status(200).json(NEARBY_CAMERAS);
};
