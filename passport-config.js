/* Initialising Modules */

const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");

/* Authentication Function */

function initialize(passport, getUserByEmail) {
    console.log("passport initialize works");
    const authenticateUser = async (email, password, done) => {
        const user = await getUserByEmail(email).then(async (user) => {
            console.log("p-c user", user);
            if (user == null) {
                console.log("No user with that email");
                return done(null, false, { message: "No user with that email" });
            }

            try {
                console.log(password, user.user_password);
                if (await bcrypt.compare(password, user.user_password)) {
                    console.log("correct password");
                    return done(null, user) //return the user you want to authenticate 
                } else {
                    console.log("wrong password entered");
                    return done(null, false, { message: "Password incorrect" });
                }
            } catch (e) {
                return done(e)

            }
        })


    }
    passport.use(new LocalStrategy({ usernameField: 'user_email', passwordField: 'user_password' }, authenticateUser))

    passport.serializeUser((user, done) => {
        return done(null, user)
    });
    passport.deserializeUser((user, done) => {
        return done(null, user)
    });
}

module.exports = initialize;