const SessionHandler = require("./session");
const ProfileHandler = require("./profile");
const BenefitsHandler = require("./benefits");
const ContributionsHandler = require("./contributions");
const AllocationsHandler = require("./allocations");
const MemosHandler = require("./memos");
const ResearchHandler = require("./research");
const {
    environmentalScripts
} = require("../../config/config");
const ErrorHandler = require("./error").errorHandler;

const index = (app, db) => {

    "use strict";

    const sessionHandler = new SessionHandler(db);
    const profileHandler = new ProfileHandler(db);
    const benefitsHandler = new BenefitsHandler(db);
    const contributionsHandler = new ContributionsHandler(db);
    const allocationsHandler = new AllocationsHandler(db);
    const memosHandler = new MemosHandler(db);
    const researchHandler = new ResearchHandler(db);

    // Middleware to check if a user is logged in
    const isLoggedIn = sessionHandler.isLoggedInMiddleware;

    //Middleware to check if user has admin rights
    const isAdmin = sessionHandler.isAdminUserMiddleware;

    // The main page of the app
    app.get("/", sessionHandler.displayWelcomePage);

    // Login form
    app.get("/login", sessionHandler.displayLoginPage);
    app.post("/login", sessionHandler.handleLoginRequest);

    // Signup form
    app.get("/signup", sessionHandler.displaySignupPage);
    app.post("/signup", sessionHandler.handleSignup);

    // Logout page
    app.get("/logout", sessionHandler.displayLogoutPage);

    // The main page of the app
    app.get("/dashboard", isLoggedIn, sessionHandler.displayWelcomePage);

    // Profile page
    app.get("/profile", isLoggedIn, profileHandler.displayProfile);
    app.post("/profile", isLoggedIn, profileHandler.handleProfileUpdate);

    // Contributions Page
    app.get("/contributions", isLoggedIn, contributionsHandler.displayContributions);
    app.post("/contributions", isLoggedIn, contributionsHandler.handleContributionsUpdate);

    // Benefits Page (A7-Function-Level Access Control): only admins may manage benefits
    app.get("/benefits", isLoggedIn, isAdmin, benefitsHandler.displayBenefits);
    app.post("/benefits", isLoggedIn, isAdmin, benefitsHandler.updateBenefits);

    // Allocations Page
    app.get("/allocations/:userId", isLoggedIn, allocationsHandler.displayAllocations);

    // Memos Page
    app.get("/memos", isLoggedIn, memosHandler.displayMemos);
    app.post("/memos", isLoggedIn, memosHandler.addMemos);

    // Handle redirect for learning resources link
    app.get("/learn", isLoggedIn, (req, res) => {
        // A1-4 (Open Redirect): validate the redirect target. Same-site relative
        // URLs must resolve to this exact origin (rejecting protocol-relative and
        // backslash tricks), and absolute URLs must be https on an allow-listed
        // trusted learning host. Anything else falls back to the dashboard.
        const redirectUrl = req.query.url;
        const trustedLearningHosts = ["khanacademy.org", "www.khanacademy.org"];

        const isSafeRedirect = (target) => {
            if (!target || typeof target !== "string") return false;

            // Absolute URLs: https only, on an allow-listed trusted host.
            if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target)) {
                try {
                    const parsed = new URL(target);
                    return parsed.protocol === "https:" && trustedLearningHosts.indexOf(parsed.hostname) !== -1;
                } catch (e) {
                    return false;
                }
            }

            // Relative references: resolve against this app and require same origin.
            try {
                const base = `${req.protocol}://${req.get("host")}`;
                const resolved = new URL(target, base);
                if (resolved.origin !== base) return false;
                return resolved.pathname.charAt(0) === "/" && resolved.pathname.charAt(1) !== "/";
            } catch (e) {
                return false;
            }
        };

        if (isSafeRedirect(redirectUrl)) {
            return res.redirect(redirectUrl);
        }
        return res.redirect("/dashboard");
    });

    // Handle redirect for learning resources link
    app.get("/tutorial", (req, res) => {
        return res.render("tutorial/a1", {
            environmentalScripts
        });
    });

    app.get("/tutorial/:page", (req, res) => {
        // A1-5 (Path Traversal): only render known tutorial templates
        const {
            page
        } = req.params;
        const allowedTutorialPages = [
            "a1", "a2", "a3", "a4", "a5", "a6",
            "a7", "a8", "a9", "a10", "redos", "ssrf"
        ];
        if (allowedTutorialPages.indexOf(page) === -1) {
            return res.render("tutorial/a1", { environmentalScripts });
        }
        return res.render(`tutorial/${page}`, {
            environmentalScripts
        });
    });

    // Research Page
    app.get("/research", isLoggedIn, researchHandler.displayResearch);

    // Error handling middleware
    app.use(ErrorHandler);
};

module.exports = index;
