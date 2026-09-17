// A6-1 / A7-1 (Sensitive Data Exposure): SSN and date-of-birth are stored
// encrypted using AES-256-GCM (authenticated encryption). A fresh random
// initialization vector is generated for every value, and stored alongside
// the ciphertext and its authentication tag.

const crypto = require("crypto");
const config = require("../../config/config");

const ALGORITHM = "aes-256-gcm";
// Derive a 32-byte key from the configured crypto key.
const KEY = crypto.createHash("sha256").update(String(config.cryptoKey)).digest();

const encrypt = (plaintext) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    const encrypted = Buffer.concat([
        cipher.update(String(plaintext), "utf8"),
        cipher.final()
    ]);
    const authTag = cipher.getAuthTag();
    return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
};

const decrypt = (stored) => {
    try {
        const parts = String(stored).split(":");
        if (parts.length !== 3) {
            // Not in our encrypted format (e.g. legacy value) - do not guess.
            return "";
        }
        const [ivHex, tagHex, dataHex] = parts;
        const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, "hex"));
        decipher.setAuthTag(Buffer.from(tagHex, "hex"));
        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(dataHex, "hex")),
            decipher.final()
        ]);
        return decrypted.toString("utf8");
    } catch (e) {
        console.error("Failed to decrypt stored field: " + e.message);
        return "";
    }
};

/* The ProfileDAO must be constructed with a connected database object */
function ProfileDAO(db) {

    "use strict";

    /* If this constructor is called without the "new" operator, "this" points
     * to the global object. Log a warning and call it correctly. */
    if (false === (this instanceof ProfileDAO)) {
        console.log("Warning: ProfileDAO constructor called without 'new' operator");
        return new ProfileDAO(db);
    }

    const users = db.collection("users");

    this.updateUser = (userId, firstName, lastName, ssn, dob, address, bankAcc, bankRouting, callback) => {

        // Create user document
        const user = {};
        if (firstName) {
            user.firstName = firstName;
        }
        if (lastName) {
            user.lastName = lastName;
        }
        if (address) {
            user.address = address;
        }
        if (bankAcc) {
            user.bankAcc = bankAcc;
        }
        if (bankRouting) {
            user.bankRouting = bankRouting;
        }
        // A6-1 (Sensitive Data Exposure): encrypt SSN and DOB before persisting.
        if (ssn) {
            user.ssn = encrypt(ssn);
        }
        if (dob) {
            user.dob = encrypt(dob);
        }

        users.update({
                _id: parseInt(userId)
            }, {
                $set: user
            },
            err => {
                if (!err) {
                    console.log("Updated user profile");
                    return callback(null, user);
                }

                return callback(err, null);
            }
        );
    };

    this.getByUserId = (userId, callback) => {
        users.findOne({
                _id: parseInt(userId)
            },
            (err, user) => {
                if (err) return callback(err, null);
                // A6-1 (Sensitive Data Exposure): decrypt SSN and DOB for display only.
                user.ssn = user.ssn ? decrypt(user.ssn) : "";
                user.dob = user.dob ? decrypt(user.dob) : "";

                callback(null, user);
            }
        );
    };
}

module.exports = { ProfileDAO };