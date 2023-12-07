const express = require('express');
const router = express.Router();
const Pc = require('../models/pc');

const {isLoggedIn , checkPcAuthor} = require('../middlewares/index');

//Cloudinary
const multer = require('multer');
const storage = require('../cloudinary/index');
const upload = multer({storage});

// mapbox
const geocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const geocodingClient = geocoding({accessToken: process.env.MAPBOX_TOKEN});
// contact form
const {sendEmail} = require('../middlewares/email');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.get('/', (req, res)=>{
    res.render('landing', {page: 'Home - DNAmachines'});
});

router.get('/contact', (req, res)=>{
    res.render('contact', {page: 'Contact'});
});

router.post('/contact', async (req, res)=>{
    try {
        await sendEmail(req.body.contact);
        res.send('email sent');
    } catch (error) {
        res.send(error);
    }
});

router.get('/pcs', async (req, res)=>{
    try {
        const pcs = await Pc.find();
        res.render('pcs/index', {pcs, page: 'All PCs - DNAmachines'}); 
    } catch (error) {
        res.send(error);
    }
});

router.get('/pcs/new', isLoggedIn, (req, res)=>{
    res.render('pcs/new', {page: 'New PC - DNAmachines'});
});

router.post('/pcs', isLoggedIn, upload.array('image'), async (req, res)=>{
    try {
        const newPc = new Pc(req.body.pc);
        newPc.author = req.user._id;
        for(let img of req.files){
            newPc.image.push(img.path);
        };
        const query = req.body.pc.address;
        const result = await geocodingClient
        .forwardGeocode({
            query,
            limit: 1
        })
        .send()
        newPc.location = result.body.features[0].geometry;
        await newPc.save();
        res.redirect(`/pcs/${newPc._id}`);
    } catch (error) {
        res.send(error);
    }
});

router.get('/pcs/:id', async (req, res)=>{
    try {
        const {id} = req.params;
        let likeExists=null, dislikeExists=null;
        if(req.user){
            likeExists = await Pc.findOne({
                _id: id,
                upvotes: req.user._id
            });
            dislikeExists = await Pc.findOne({
                _id: id,
                downvotes: req.user._id
            });
        };
        const pc = await Pc.findById(req.params.id).populate('reviews');
        const reviews = pc.reviews;
        res.render('pcs/show', {likeExists, dislikeExists, reviews, pc, page: 'PC details - DNAmachines'});
    } catch (error) {
        res.send(error);
    }
});

router.get('/pcs/:id/edit', isLoggedIn, checkPcAuthor, async (req, res)=>{
    try {
        const pc = await Pc.findById(req.params.id);
        res.render('pcs/edit', {pc, page: 'Edit - DNAmachines'});
    } catch (error) {
        res.send(error);
    }
});
router.patch('/pcs/:id', isLoggedIn, checkPcAuthor, async (req, res)=>{
    try {
        const pc =  await Pc.findByIdAndUpdate(req.params.id, req.body.pc);
        const query = req.body.pc.address;
        const result = await geocodingClient
        .forwardGeocode({
            query,
            limit: 1
        })
        .send()
        pc.location = result.body.features[0].geometry;
        await pc.save();
        res.redirect(`/pcs/${req.params.id}`);
    } catch (error) {
        res.send(error);
    }
});
router.delete('/pcs/:id', isLoggedIn, checkPcAuthor, async (req, res)=>{
    try {
        await Pc.findByIdAndDelete(req.params.id);
        res.redirect('/pcs');
    } catch (error) {
        res.send(error);
    }
});

router.get('/pcs/:id/checkout', isLoggedIn, async (req, res)=>{
    try {
        const pc = await Pc.findById(req.params.id);
        const session = await stripe.checkout.sessions.create({ 
            payment_method_types: ["card"], 
            line_items: [ 
              { 
                price_data: { 
                  currency: "inr", 
                  product_data: { 
                    name: pc.name,
                    description: pc.description,
                    images: [pc.image[0]]
                  }, 
                  unit_amount: pc.price * 100, 
                }, 
                quantity: pc.quantity, 
              }, 
            ], 
            mode: "payment", 
            success_url: "http://localhost:3000/success", 
            cancel_url: "http://localhost:3000/cancel", 
        });
        res.redirect(session.url);
    } catch (error) {
        res.send(error);
    }
});

router.get('/success', (req, res)=>{
    res.send('payment successful');
});
router.get('/cancel', (req, res)=>{
    res.send('payment cancelled');
});
router.get('/pcs/:id/upvote', isLoggedIn, async (req, res)=>{
    try {
        const {id} = req.params;
        const likeExists = await Pc.findOne({
            _id: id,
            upvotes: req.user._id
        });
        const dislikeExists = await Pc.findOne({
            _id: id,
            downvotes: req.user._id
        });
        // check if user has already liked -> remove like
        // check if user has already disliked -> toggle from dislike to like
        // else -> add a new like
        if(likeExists){
            await Pc.findByIdAndUpdate(id, {
                $pull: {upvotes: req.user._id}
            });
            req.flash('success', 'removed like');
            res.redirect(`/pcs/${id}`);
        } else if(dislikeExists){
            await Pc.findByIdAndUpdate(id, {
                $pull: {downvotes: req.user._id},
                $push: {upvotes: req.user._id}
            });
            req.flash('success', 'changed from dislike to like');
            res.redirect(`/pcs/${id}`);
        }else{
            const pc = await Pc.findById(id);
            pc.upvotes.push(req.user);
            await pc.save();
            req.flash('success', 'added a like');
            res.redirect(`/pcs/${id}`);
        }
    } catch (error) {
        
    }
});
router.get('/pcs/:id/downvote', isLoggedIn, async (req, res)=>{
    try {
        const {id} = req.params;
        const likeExists = await Pc.findOne({
            _id: id,
            upvotes: req.user._id
        });
        const dislikeExists = await Pc.findOne({
            _id: id,
            downvotes: req.user._id
        });
        // check if user has already disliked -> remove dislike
        // check if user has already liked -> toggle from like to dislike
        // else -> add a new dislike
        if(dislikeExists){
            await Pc.findByIdAndUpdate(id, {
                $pull: {downvotes: req.user._id}
            });
            req.flash('success', 'removed dislike');
            res.redirect(`/pcs/${id}`);
        } else if(likeExists){
            await Pc.findByIdAndUpdate(id, {
                $pull: {upvotes: req.user._id},
                $push: {downvotes: req.user._id}
            });
            req.flash('success', 'changed from like to dislike');
            res.redirect(`/pcs/${id}`);
        }else{
            const pc = await Pc.findById(id);
            pc.downvotes.push(req.user);
            await pc.save();
            req.flash('success', 'added a dislike');
            res.redirect(`/pcs/${id}`);
        }
    } catch (error) {
        
    }
});

module.exports = router;