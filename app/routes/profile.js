const ProfileDAO = require("../data/profile-dao").ProfileDAO;
const {
    environmentalScripts
} = require("../../config/config");

/* The ProfileHandler must be constructed with a connected db */
function ProfileHandler(db) {
    "use strict";

    const profile = new ProfileDAO(db);

    this.displayProfile = (req, res, next) => {
        const {
            userId
        } = req.session;

        profile.getByUserId(parseInt(userId), (err, doc) => {
            if (err) return next(err);
            doc.userId = userId;

            // A7-2 (XSS): the `website` value is output-encoded by the template
            // engine for the HTML attribute context. The link href is validated to
            // only ever emit http(s) URLs so javascript: URIs can never be used.
            doc.websiteHref = "";
            if (doc.website) {
                try {
                    const parsed = new URL(doc.website);
                    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
                        doc.websiteHref = parsed.toString();
                    }
                } catch (e) {
                    // Non-URL input simply renders without a link.
                }
            }

            return res.render("profile", {
                ...doc,
                environmentalScripts
            });
        });
    };

    this.handleProfileUpdate = (req, res, next) => {

        const {
            firstName,
            lastName,
            ssn,
            dob,
            address,
            bankAcc,
            bankRouting
        } = req.body;

        // ReDoS fix: the previous regex /([0-9]+)+\#/ used a greedy nested
        // quantifier and was vulnerable to catastrophic backtracking. Removing the
        // second quantifier keeps the same behaviour with linear complexity.
        const regexPattern = /([0-9]+)\#/;
        // Allow only numbers with a suffix of the letter #, for example: 'XXXXXX#'
        const testComplyWithRequirements = regexPattern.test(bankRouting);
        // if the regex test fails we do not allow saving
        if (testComplyWithRequirements !== true) {
            const firstNameSafeString = firstName
            return res.render("profile", {
                updateError: "Bank Routing number does not comply with requirements for format specified",
                firstNameSafeString,
                lastName,
                ssn,
                dob,
                address,
                bankAcc,
                bankRouting,
                environmentalScripts
            });
        }

        const {
            userId
        } = req.session;

        profile.updateUser(
            parseInt(userId),
            firstName,
            lastName,
            ssn,
            dob,
            address,
            bankAcc,
            bankRouting,
            (err, user) => {

                if (err) return next(err);

                // WARN: Applying any sting specific methods here w/o checking type of inputs could lead to DoS by HPP
                //firstName = firstName.trim();
                user.updateSuccess = true;
                user.userId = userId;

                return res.render("profile", {
                    ...user,
                    environmentalScripts
                });
            }
        );

    };

}

module.exports = ProfileHandler;
