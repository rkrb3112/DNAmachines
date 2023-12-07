const User = require('../models/user');

module.exports.loginForm = (req, res)=>{
    res.render('users/login', {page: 'Login'});
};

module.exports.loginUser = (req, res)=>{
    res.redirect('/pcs');
};

module.exports.registerForm = (req, res)=>{
    res.render('users/register', {page: 'Register'})
};

module.exports.registerUser = async (req, res)=>{
    try {
        const userData = new User(req.body.user);
        const registeredUser = await User.register(userData, req.body.password);
        req.login(registeredUser, (error)=>{
            if(error){
                return res.send(error);
            }
            res.redirect('/pcs');
        });
    } catch (error) {
        res.send(error);
    }
};

module.exports.logoutUser = (req, res)=>{
    req.logout((error)=>{
        if(error) return res.send(error);
        res.redirect('/pcs');
    })
};