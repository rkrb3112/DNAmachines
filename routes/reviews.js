const express = require('express');
const router = express.Router();
const Review = require('../models/review');
const Pc = require('../models/pc');

const {isLoggedIn, checkReviewUser} = require('../middlewares/index');

//CUD
//new
router.get('/pcs/:id/reviews/new', isLoggedIn, (req, res)=>{
    res.render('reviews/new', {pcId: req.params.id, page: 'New review'});
});

//create
router.post('/pcs/:id/reviews', isLoggedIn, async (req, res)=>{
    try {
        const newReview = new Review(req.body.review);
        newReview.user = req.user._id;
        await newReview.save();
        const pc = await Pc.findById(req.params.id);
        pc.reviews.push(newReview);
        pc.totalRatings++;
        pc.sumOfRatings += parseInt(req.body.review.stars, 10);
        pc.averageRating = (pc.sumOfRatings/pc.totalRatings);
        await pc.save();
        req.flash('success', 'posted a review')
        res.redirect(`/pcs/${req.params.id}`);
    } catch (error) {
        console.log(error);
        req.flash('error', "Couldn't post review");
        res.redirect(`/pcs/${req.params.id}`);
    }
});

//edit
router.get('/pcs/:id/reviews/:reviewId/edit', isLoggedIn, checkReviewUser, async (req, res)=>{
    try {
        const review = await Review.findById(req.params.reviewId );
        res.render('reviews/edit', {pcId: req.params.id, review, page: 'Edit review'});
    } catch (error) {
        res.send(error);
    }
});

//update
router.patch('/pcs/:id/reviews/:reviewId', isLoggedIn, checkReviewUser, async (req, res)=>{
    try {
        const review = await Review.findById(req.params.reviewId);
        const pc = await Pc.findById(req.params.id);
        await Review.findByIdAndUpdate(req.params.reviewId, req.body.review);
        pc.sumOfRatings -= parseInt(review.stars, 10);
        pc.sumOfRatings += parseInt(req.body.review.stars);
        pc.averageRating = (pc.sumOfRatings / pc.totalRatings);
        await pc.save();
        res.redirect(`/pcs/${req.params.id}`);
    } catch (error) {
        res.send(error);
    }
});

//delete
router.delete('/pcs/:id/reviews/:reviewId', isLoggedIn, checkReviewUser, async (req, res)=>{
    try {
        const review = await Review.findById(req.params.reviewId);
        const pc = await Pc.findById(req.params.id);
        await Review.findByIdAndDelete(req.params.reviewId);
        pc.sumOfRatings -= parseInt(review.stars, 10);
        pc.totalRatings--;
        pc.averageRating = (pc.sumOfRatings / pc.totalRatings);
        await pc.save();
        res.redirect(`/pcs/${req.params.id}`);
    } catch (error) {
        res.send(error);
    }
});

module.exports = router;