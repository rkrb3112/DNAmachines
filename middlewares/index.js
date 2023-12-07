const Review = require('../models/review');
const Pc = require('../models/pc');

module.exports.isLoggedIn = (req, res, next) =>{
    if(req.isAuthenticated()){
        return next();
    }
    req.flash('error', 'you must be logged in');
    res.redirect('/login');
};

module.exports.checkReviewUser = async (req, res, next)=>{
    try {
        const review = await Review.findById(req.params.reviewId);
        if(review.user.equals(req.user._id)) return next();
        req.flash('error', 'you cannot do that');
        res.redirect('back');
    } catch (error) {
        req.flash('error', 'something went wrong');
        console.log(error);
        res.redirect('back');
    }
};

module.exports.checkPcAuthor = async (req, res, next)=>{
    try {
        const pc = await Pc.findById(req.params.id);
        if(pc.author.equals(req.user._id)) return next();
        req.flash('error', 'you cannot do that');
        res.redirect('back');
    } catch (error) {
        req.flash('error', 'something went wrong');
        console.log(error);
        res.redirect('back');
    }
};