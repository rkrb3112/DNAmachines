const express = require('express');
const passport = require('passport');
const router = express.Router();

router.get('/auth/google', async (req, res, next)=>{
    passport.authenticate('google', {
        scope: ['email', 'profile']
    })(req, res, next);
});
router.get('/auth/google/process', 
    passport.authenticate('google', {
        failureFlash: true,
        failureRedirect: '/auth/google'
    }), 
    (req, res)=>{
        req.flash('success', 'welcome google user');
        res.redirect('/pcs');
});

module.exports = router;