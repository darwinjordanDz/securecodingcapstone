const ResearchDAO = require("../data/research-dao").ResearchDAO;
const needle = require("needle");
const URL = require("url").URL;
const {
    environmentalScripts,
    researchUrlBase
} = require("../../config/config");

// A10-1 (SSRF fix): only requests to this trusted host are permitted.
const TRUSTED_RESEARCH_HOSTS = ["finance.yahoo.com"];

function ResearchHandler(db) {
    "use strict";

    const researchDAO = new ResearchDAO(db);

    this.displayResearch = (req, res) => {

        if (req.query.symbol) {
            // Only allow reasonable stock symbols (alphanumeric plus a few exchange suffixes).
            const symbol = String(req.query.symbol).trim();
            if (!/^[a-zA-Z0-9.\-^=]{1,15}$/.test(symbol)) {
                return res.render("research", {
                    resultError: "Invalid stock symbol supplied.",
                    environmentalScripts
                });
            }

            // Validate the base URL: must be https and on the allow-list of hosts.
            // This prevents an attacker from pointing the request at internal
            // infrastructure (SSRF) or an arbitrary external URL.
            let target;
            try {
                const base = researchUrlBase || "";
                const requestUrl = base.endsWith("/") ? `${base}${encodeURIComponent(symbol)}` : `${base}/${encodeURIComponent(symbol)}`;
                const parsed = new URL(requestUrl);

                if (parsed.protocol !== "https:") {
                    throw new Error("Only https targets are allowed");
                }
                if (TRUSTED_RESEARCH_HOSTS.indexOf(parsed.hostname) === -1) {
                    throw new Error("Target host is not allowed");
                }
                target = parsed.toString();
            } catch (e) {
                return res.render("research", {
                    resultError: "The requested research URL is not allowed.",
                    environmentalScripts
                });
            }

            // Do not follow redirects so an attacker cannot chain to an arbitrary host.
            return needle.get(target, { follow_max: 0 }, (error, newResponse, body) => {
                if (error || !newResponse || newResponse.statusCode !== 200) {
                    return res.render("research", {
                        resultError: "Unable to retrieve stock information for the requested symbol.",
                        environmentalScripts
                    });
                }

                // Escape the retrieved content so nothing supplied by the remote
                // page can execute as HTML/JavaScript on our origin.
                const ESAPI = require("node-esapi");
                const safeBody = ESAPI.encoder().encodeForHTML(typeof body === "string" ? body : "");

                return res.render("research", {
                    result: safeBody,
                    symbol,
                    environmentalScripts
                });
            });
        }

        return res.render("research", {
            environmentalScripts
        });
    };

}

module.exports = ResearchHandler;