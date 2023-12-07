// ! requiring packages
const express = require('express');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const moment = require('moment');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');

// ! initializing packages
const app = express();
require('dotenv').config();
// const passport = require('passport');
// const LocalStrategy = require('passport-local');

// ! database connection
mongoose.connect(process.env.MONGODB_URI)
.then(()=>{
    console.log('db started');
})
.catch((error)=>{
    console.log(error);
});

// ! session setup
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        maxAge: 1000*60*60*24*2
        // secure: true
    }
}));

// const User = require('./models/user');
// app.use(passport.initialize());
// app.use(passport.session());
// passport.use(new LocalStrategy(User.authenticate()));
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

// ! google auth setup
const {passportInit} = require('./config/passport');
passportInit(app);

// ! server configuration
app.use(flash());
app.set('view engine', 'ejs');
app.use(methodOverride('_method'));
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')));

// ! global middleware
app.use((req, res, next)=>{
    res.locals.moment = moment;
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    res.locals.currentUser = req.user;
    next();
})

//! requiring routes
const pcRoutes = require('./routes/pcs');
const reviewRoutes = require('./routes/reviews');
const authRoutes = require('./routes/auth');
const oAuthRoutes = require('./routes/oAuth');
app.use(pcRoutes);
app.use(reviewRoutes);
app.use(authRoutes);
app.use(oAuthRoutes);

// ! listening to ports
const port = process.env.PORT;
app.listen(port, ()=>{
    console.log('server started');
})