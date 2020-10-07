const express = require("express");
const VError = require("verror");
const {rutrackerAuthorize} = require("./src/authorize-middleware");
const {download, search} = require("./src/rutracker-api");

const app = express();
const port = process.env.PORT || 8080;

app.use(rutrackerAuthorize);

app.get("/search", (req, res) => {
  const searchQuery = req.query.query;

  if (!req.cookies) {
    res.status(500).send("You are not logged in into rutracker");
  }

  console.log(`Searching for '${searchQuery}'`);

  search(req.cookies, searchQuery)
    .then((result) => {
      res.json({ torrents: result });
    })
    .catch((error) => {
      console.error(
        "Rutracker search failed. Original error message: " + error.message
      );

      res.status(500).send(error);
    });
});

app.get("/download", async (req, res) => {
  const torrentId = req.query.t;

  if (!req.cookies) {
    res.status(500).send("You are not logged in into rutracker.");
  }

  console.log(`Downloading '${torrentId}'`);

  try {
    const response = await download(req.cookies, torrentId);

    res.setHeader("content-type", response.headers["content-type"]);
    res.setHeader(
      "content-disposition",
      response.headers["content-disposition"]
    );
    res.send(response.data);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.listen(port, () => {
  console.log(`Rutracker proxy is listening on http://localhost:${port}`);
});
