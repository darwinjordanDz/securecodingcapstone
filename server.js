"use strict";

const express = require("express");
const favicon = require("serve-favicon");
const bodyParser = require("body-parser");
const session = require("express-session");
const consolidate = require("consolidate"); // Templating library adapter for Express
const swig = require("swig");
const MongoClient = require("mongodb").MongoClient; // Driver for connecting to MongoDB
const helmet = require("helmet"); // Adds sensible HTTP security headers
const csrf = require("csurf"); // CSRF protection middleware
const http = require("http");
const marked = require("marked");
const sanitizeHtml = require("sanitize-html");
const app = express(); // Web framework to handle routing requests
const routes = require("./app/routes");
const { port, db, cookieSecret } = require("./config/config"); // Application config properties

MongoClient.connect(db, (err, db) => {
    if (err) {
        console.log("Error: DB: connect");
        console.log(err);
        process.exit(1);
    }
    console.log(`Connected to the database`);

    // A5-2 (Security Misconfiguration): add sensible HTTP security headers,
    // including an active Content Security Policy. Inline scripts are not used
    // (the login-page cookie check was moved to app/assets/js/cookie-check.js),
    // so script-src can stay strict. Styles keep 'unsafe-inline' because the
    // Bootstrap-based templates rely on inline style attributes.
    app.use(helmet({
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:"],
                fontSrc: ["'self'", "data:"],
                connectSrc: ["'self'"]
            }
        }
    }));

    // Express is behind a TLS-terminating proxy on Render/Heroku, which is
    // needed for req.secure to reflect the original https connection.
    app.set("trust proxy", 1);

    // Adding/ remove HTTP Headers for security
    app.use(favicon(__dirname + "/app/assets/favicon.ico"));

    // Express middleware to populate "req.body" so we can access POST variables
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        // Mandatory in Express v4
        extended: false
    }));

    // Enable session management using express middleware
    app.use(session({
        secret: cookieSecret,
        // A2-6 (Broken Authentication - session cookie hardening):
        //   - httpOnly: keep the cookie out of reach of JavaScript (mitigates XSS session theft)
        //   - sameSite: prevent CSRF cross-site sends of the cookie
        //   - secure: only send over HTTPS in production
        //   - saveUninitialized:false / resave:false: do not persist untouched sessions
        name: "connect.sid",
        saveUninitialized: false,
        resave: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production"
        }
    }));

    // Register templating engine
    app.engine(".html", consolidate.swig);
    app.set("view engine", "html");
    app.set("views", `${__dirname}/app/views`);
    app.use(express.static(`${__dirname}/app/assets`));

    // A8-1 (Cross-Site Request Forgery): the csurf middleware rejects state-changing
    // requests unless they carry the signed token rendered into the forms.
    app.use(csrf({ cookie: false }));

    // Make the CSRF token available to every template as `csrftoken`.
    app.use((req, res, next) => {
        res.locals.csrftoken = req.csrfToken();
        next();
    });

    // A7-1 (Cross-Site Scripting): initialising marked to render markdown, then
    // sanitising the generated HTML with an allow-list so stored/content-controlled
    // input can never inject scripts.
    app.locals.marked = (text) => sanitizeHtml(marked.parse(String(text || "")), {
        allowedTags: ["p", "br", "strong", "em", "ul", "ol", "li", "a", "code", "pre", "blockquote", "h1", "h2", "h3", "h4", "table", "thead", "tbody", "tr", "td", "th"],
        allowedAttributes: {
            a: ["href", "title"]
        },
        transformTags: {
            a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" })
        }
    });

    // Application routes
    routes(app, db);

    // Template system setup
    // A7 (Cross-Site Scripting): autoescape is ENABLED so any user-controlled
    // value interpolated into a template is HTML-encoded by default. Outputs that
    // are intentionally HTML (e.g. sanitised markdown) opt out explicitly with | safe.
    swig.setDefaults({
        autoescape: true
    });

    // HTTP connection
    http.createServer(app).listen(port, () => {
        console.log(`Express http server listening on port ${port}`);
    });

});