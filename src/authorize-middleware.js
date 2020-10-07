const VError = require("verror");
const { authorize } = require("./rutracker-api");

let cookies = null;

function rutrackerAuthorize(req, res, next) {
  if (!cookies) {
    authorize(process.env.RUTRACKER_USERNAME, process.env.RUTRACKER_PASSWORD)
      .then((respCookies) => {
        console.log(
          "Successfully logged in to rutracker. Cookies are ",
          respCookies
        );

        cookies = respCookies;
        req.cookies = respCookies;
        next();
      })
      .catch((originalError) => {
        const error = new VError(originalError, "Failed to login to rutracker");
        console.error(error);

        res.status(500).send(error.message);
      });
  } else {
    req.cookies = cookies;
    next();
  }
}

module.exports = {
  rutrackerAuthorize,
};
