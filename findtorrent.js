const TorrentSearchApi = require("torrent-search-api");

TorrentSearchApi.enablePublicProviders();

// Search '1080' in 'Movies' category and limit to 20 results
const torrents = TorrentSearchApi.search(
  "Doing Research in Social Work and Social Care",
  null
).then(console.info);
