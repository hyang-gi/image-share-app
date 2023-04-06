const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");

function initialize(passport, getUserByEmail, getUserById) {
    console.log("passport initialize works");
    const authenticateUser = async (email, password, done) => {
        const user = getUserByEmail(email);
        if (user == null) {
            console.log("user is null");
            return done(null, false, { message: "No user with that email" });
        }

        try {
            if (await bcrypt.compare(password, user.password)) {
                console.log("correct password");
                return done(null, user) //return the user you want to authenticate 
            } else {
                console.log("wrong password entered");
                return done(null, false, { message: "Password incorrect" });
            }

        } catch (e) {
            return done(e)

        }

    }
    passport.use(new LocalStrategy({ usernameField: 'user_email', passwordField: 'user_password' }, authenticateUser))

    passport.serializeUser((user, done) => {
        return done(null, user.id)
    });
    passport.deserializeUser((id, done) => {
        return done(null, getUserById(id))
    });
}

module.exports = initialize;