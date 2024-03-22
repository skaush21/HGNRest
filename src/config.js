const config = {};

config.JWT_SECRET = process.env.JWT_SECRET;
config.REQUEST_AUTHKEY = "Authorization";
config.TOKEN = {
  Lifetime: process.env.TOKEN_LIFETIME,
  Units: process.env.TOKEN_LIFETIME_UNITS,
};
config.JWT_HEADER = {
  alg: "RS256",
  typ: "JWT",
};

// ChatGPT configurations
config.OPENAI_API_KEY_API_KEY = process.env.OPENAI_API_KEY;

module.exports = config;
