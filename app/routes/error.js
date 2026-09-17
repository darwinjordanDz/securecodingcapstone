// Error handling middleware
// A5-3 (Security Misconfiguration): never render the raw error/stack to the user.

const errorHandler = (err, req, res, next) => {

    "use strict";

    // A8 (CSRF): a failed CSRF check should be surfaced as a clean 403, not a 500.
    if (err.code === "EBADCSRFTOKEN") {
        res.status(403);
        return res.render("error-template", {
            message: "Your request could not be validated (CSRF check failed). Please go back, refresh the page and try again.",
            error: false
        });
    }

    console.error(err.message);
    console.error(err.stack);
    res.status(500);
    res.render("error-template", {
        message: "An internal error occurred. Please try again later.",
        error: false
    });
};

module.exports = { errorHandler };