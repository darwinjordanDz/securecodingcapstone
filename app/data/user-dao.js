const bcrypt = require("bcryptjs");

const crypto = require("crypto");

/* The UserDAO must be constructed with a connected database object */
function UserDAO(db) {

    "use strict";

    /* If this constructor is called without the "new" operator, "this" points
     * to the global object. Log a warning and call it correctly. */
    if (false === (this instanceof UserDAO)) {
        console.log("Warning: UserDAO constructor called without 'new' operator");
        return new UserDAO(db);
    }

    const usersCol = db.collection("users");

    this.addUser = (userName, firstName, lastName, password, email, callback) => {

        // A2-1 (Broken Authentication): store passwords using a strong one-way
        // hash with a per-user salt (bcrypt). Never store plaintext passwords.
        const salt = bcrypt.genSaltSync(10);
        const user = {
            userName,
            firstName,
            lastName,
            benefitStartDate: this.getRandomFutureDate(),
            password: bcrypt.hashSync(password, salt)
        };

        // Add email if set
        if (email) {
            user.email = email;
        }

        this.getNextSequence("userId", (err, id) => {
            if (err) {
                return callback(err, null);
            }
            console.log(typeof(id));

            user._id = id;
            usersCol.insert(user, (err, result) => !err ? callback(null, result.ops[0]) : callback(err, null));
        });
    };

    this.getRandomFutureDate = () => {
        // A2-3 (Insecure Randomness): use a cryptographically secure RNG instead of Math.random()
        const today = new Date();
        const day = (crypto.randomInt(10) + today.getDay()) % 29;
        const month = (crypto.randomInt(10) + today.getMonth()) % 12;
        const year = crypto.randomInt(31) + today.getFullYear();
        return `${year}-${("0" + month).slice(-2)}-${("0" + day).slice(-2)}`
    };

    this.validateLogin = (userName, password, callback) => {

        usersCol.findOne({
            userName: userName
        }, (err, user) => {
            if (err) return callback(err, null);

            if (!user) {
                // A2-2 (Broken Authentication): use a generic message so valid
                // usernames cannot be enumerated.
                const noSuchUserError = new Error("Invalid username and/or password");
                noSuchUserError.noSuchUser = true;
                return callback(noSuchUserError, null);
            }

            // A2-1 (Broken Authentication): compare against the stored hash.
            if (bcrypt.compareSync(password, user.password)) {
                return callback(null, user);
            }

            const invalidPasswordError = new Error("Invalid username and/or password");
            invalidPasswordError.invalidPassword = true;
            return callback(invalidPasswordError, null);
        });
    };

    // This is the good one, see the next function
    this.getUserById = (userId, callback) => {
        usersCol.findOne({
            _id: parseInt(userId)
        }, callback);
    };

    this.getUserByUserName = (userName, callback) => {
        usersCol.findOne({
            userName: userName
        }, callback);
    };

    this.getNextSequence = (name, callback) => {
        db.collection("counters").findAndModify({
                _id: name
            }, [], {
                $inc: {
                    seq: 1
                }
            }, {
                new: true
            },
            (err, data) =>  err ? callback(err, null) : callback(null, data.value.seq));
    };
}

module.exports = { UserDAO };
