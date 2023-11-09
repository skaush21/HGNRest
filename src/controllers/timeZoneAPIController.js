const { hasPermission } = require('../utilities/permissions');

const timeZoneAPIController = function () {
  const getTimeZoneAPIKey = async (req, res) => {
    const premiumKey = process.env.TIMEZONE_PREMIUM_KEY;
    const commonKey = process.env.TIMEZONE_COMMON_KEY;
    if (!req.body.requestor.role) {
      res.status(403).send('Unauthorized Request');
      return;
    }
    if (await hasPermission(req.body.requestor, 'getTimeZoneAPIKey')) {
      res.status(200).send({ userAPIKey: premiumKey });
      return;
    }
    res.status(200).send({ userAPIKey: commonKey });
  };

  return {
    getTimeZoneAPIKey,
  };
};

module.exports = timeZoneAPIController;
