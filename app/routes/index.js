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
        // A1-4 (Open Redirect): only ever redirect to a strict allow-list of
        // constant targets, so a user-supplied value can never reach the
        // redirect. Anything else falls back to the dashboard.
        const learnLinkTargets = {
            "/dashboard": "/dashboard",
            "https://www.khanacademy.org/economics-finance-domain/core-finance/investment-vehicles-tutorial/ira-401ks/v/traditional-iras":
                "https://www.khanacademy.org/economics-finance-domain/core-finance/investment-vehicles-tutorial/ira-401ks/v/traditional-iras"
        };

        const redirectUrl = req.query.url || "";
        return res.redirect(learnLinkTargets[redirectUrl] || "/dashboard");
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
