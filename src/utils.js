function getAppPort() {
  return process.env.PORT || 8080;
}

module.exports = {
  getAppPort,
};
