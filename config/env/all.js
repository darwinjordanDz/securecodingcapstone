// default app configuration
const port = process.env.PORT || 4000;
// A6-1 (Sensitive Data Exposure / Security Misconfiguration): removed hard-coded
// database credentials. The connection string MUST be supplied via the MONGODB_URI
// environment variable (Render/Heroku config var).
const db = process.env.MONGODB_URI || "";

module.exports = {
    port,
    db,
    cookieSecret: process.env.COOKIE_SECRET || "please-change-me-before-deploying",
    cryptoKey: process.env.CRYPTO_KEY || "change-me-too-before-deploying",
    cryptoAlgo: "aes256",
    hostName: process.env.HOST_NAME || "localhost",
    researchUrlBase: process.env.RESEARCH_URL_BASE || "https://finance.yahoo.com/quote/",
    environmentalScripts: []
};

