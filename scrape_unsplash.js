const https = require('https');

https.get('https://unsplash.com/napi/search/photos?query=full%20body%20fashion%20men&per_page=30', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const ids = json.results.map(r => r.id);
            console.log(JSON.stringify(ids));
        } catch(e) {
            console.error('Error parsing JSON', e);
        }
    });
}).on('error', err => {
    console.error('Request failed', err);
});
