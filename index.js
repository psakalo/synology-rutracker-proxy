const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const { URL, URLSearchParams } = require("url");
const windows1251 = require("windows-1251");

const app = express();
const port = process.env.PORT || 8080;

const RUTRACKER_BASE_URL = "https://rutracker.org";
const RUTRACKER_LOGIN_URL = RUTRACKER_BASE_URL + "/forum/login.php";
const RUTRACKER_SEARCH_URL = RUTRACKER_BASE_URL + "/forum/tracker.php";
const RUTRACKER_DOWNLOAD_URL = RUTRACKER_BASE_URL + "/forum/dl.php";

async function authorize(username, password) {
  const body = new URLSearchParams();

  body.append("login_username", username);
  body.append("login_password", password);
  body.append("login", "Вход");

  try {
    const response = await axios({
      url: RUTRACKER_LOGIN_URL,
      method: "POST",
      data: body.toString(),
      maxRedirects: 0,
      validateStatus: (status) => {
        return status === 200 || status === 302;
      },
    });

    // If we've received 200, then probably we have to fill captcha
    if (response.status === 200) {
      const match = /src="(.*?captcha.*?)"/.exec(response.data);
      if (match) {
        console.log(match);
      }
    }

    return response.headers["set-cookie"].map((cookie) => cookie.split(";")[0]);
  } catch (error) {
    if (error.isAxiosError) {
      throw new Error(error.message);
    }

    throw error;
  }
}

const SortingOrder = {
  asc: "1",
  desc: "2",
};

const SortingColumn = {
  registered: "1",
  title: "2",
  downloads: "4",
  size: "7",
  lastMessage: "8",
  seeds: "10",
  leeches: "11",
};

async function search(
  cookies,
  query,
  order = SortingOrder.desc,
  sort = SortingColumn.downloads
) {
  const url = new URL(RUTRACKER_SEARCH_URL);
  url.searchParams.append("nm", query);

  const body = new URLSearchParams();
  body.append("s", order);
  body.append("o", sort);

  try {
    const response = await axios({
      url: url.toString(),
      method: "POST",
      data: body.toString(),
      responseType: "arraybuffer",
      headers: {
        Cookie: cookies.join("; "),
      },
    });

    // Rutracker responds in windows-1251 encoding, so convert it to utf-8
    const decodedData = windows1251.decode(response.data.toString("binary"), {
      mode: "html",
    });

    const $ = cheerio.load(decodedData);
    const rows = $("#tor-tbl tbody tr");
    const result = [];

    rows.each((i, elm) => {
      const row = $(elm);
      const cols = row.find("td");
      const id = row.attr("id").split("-")[2];

      const torrent = {
        title: $(cols[3]).find("a").text(),
        download: `http://localhost:${port}/download?t=${id}`,
        size: Number($(cols[5]).attr("data-ts_text")),
        datetime: new Date(
          Number($(cols[9]).attr("data-ts_text")) * 1000
        ).toISOString(),
        page: "https://rutracker.org/forum/viewtopic.php?t=" + id,
        seeds: Number($(cols[6]).attr("data-ts_text")),
        leechs: Number($(cols[7]).text()),
        category: $(cols[2]).find("a").text(),
      };

      result.push(torrent);
    });

    return result;
  } catch (error) {
    throw error;
  }
}

let cookies = null;

authorize(process.env.RUTRACKER_USERNAME, process.env.RUTRACKER_PASSWORD)
  .then((respCookies) => {
    console.log(
      "Successfully logged in to rutracker. Cookies are ",
      respCookies
    );
    cookies = respCookies;
  })
  .catch((error) => {
    console.error(
      "Failed to login to rutracker. Original error message: " + error.message
    );
  });

app.get("/search", (req, res) => {
  const searchQuery = req.query.query;

  if (!cookies) {
    res.status(500).send("You are not logged in into rutracker.");
  }

  console.log(`Searching for '${searchQuery}'`);

  search(cookies, searchQuery)
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

  if (!cookies) {
    res.status(500).send("You are not logged in into rutracker.");
  }

  console.log(`Downloading '${torrentId}'`);

  const url = new URL(RUTRACKER_DOWNLOAD_URL);
  url.searchParams.append("t", torrentId);

  try {
    const response = await axios({
      url: url.toString(),
      method: "GET",
      responseType: "arraybuffer",
      headers: {
        Cookie: cookies.join("; "),
      },
    });

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
