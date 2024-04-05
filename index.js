require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const dns = require('dns');
const urlparser = require('url');
const { MongoClient } = require('mongodb');
const client = new MongoClient(process.env.DBB);
const port = process.env.PORT || 3000;

app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));
app.use(express.urlencoded({ extended: true }));

const dbPromise = (async () => {
    await client.connect();
    return client.db("urlshortener").collection("urls");
})();

app.get('/', function(req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
});

app.post('/api/shorturl', async function(req, res) {
    const originalUrl = req.body.url;
    const hostname = urlparser.parse(originalUrl).hostname;

    dns.lookup(hostname, async (err, address) => {
        if (err || !address) {
            res.json({ error: "Invalid URL" });
        } else {
            const urls = await dbPromise;
            const urlCount = await urls.countDocuments({});
            const urlDoc = {
                original_url: originalUrl,
                short_url: urlCount + 1
            };
            await urls.insertOne(urlDoc);
            res.json({ original_url: originalUrl, short_url: urlCount + 1 });
        }
    });
});

app.get("/api/shorturl/:short_url", async (req, res) => {
    const shortUrl = +req.params.short_url;
    const urls = await dbPromise;
    const urlDoc = await urls.findOne({ short_url: shortUrl });
    if (urlDoc) {
        res.redirect(urlDoc.original_url);
    } else {
        res.status(404).json({ error: 'URL not found' });
    }
});

app.listen(port, function() {
    console.log(`Listening on port ${port}`);
});
