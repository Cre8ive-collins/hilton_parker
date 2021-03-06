const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();
const pool = require('./config/dbconfig');
const flash = require('express-flash')
require('dotenv').config()
const mailers = require('./services/mailers')
const passport = require('passport');
const cookiePasser = require('cookie-parser');
const sms = require('./services/sms')


app.use(session({ secret: process.env.TOKEN_SECRET }));
app.use(cookiePasser(process.env.TOKEN_SECRET));
app.use(flash());

// PASSPORT AUTHENTICATION
app.use(passport.initialize());
app.use(passport.session());


passport.serializeUser(function (user, done) {
    console.log('serializing user:', user[0]);
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    console.log('deserializing user:', id);
    done(null,{id});
});




app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));


app.use(express.static(path.join(__dirname, 'assets')))
app.use('/uploads', express.static(path.join(__dirname, 'assets')))

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');



app.get('/2' , (req, res) => {
    res.render("index", {
        message : req.flash()
    })
})
app.get('/' , (req, res) => {
    res.render("index2", {
        message : req.flash()
    })
})

app.get('/agent' , (req, res) => {
    // mailers.testmail(),
    res.render("./agent/agent", {      
        message : req.flash()
    })
})
app.get('/contact', (req, res) => {
    const message = req.flash();
    
    if (req.user){
        const userid = req.user.id
        pool.getConnection((err, con) => {
            con.query('SELECT * FROM leads WHERE id = ? ', userid, (err, user) => {
                if(user){
                    res.render('./contactus', {
                        user: user[0],
                        message
                    })
                }else{
                    res.redirect('/#contact')
                }
                
            })
        })
    }else{
        res.redirect('/#contact')
    }
   
    
})

const suppauth = require('./routes/suppauth')
app.use('/suppauth', suppauth)

const userPassportUpload = require('./routes/userpassport')
app.use('/user/passport', (req, res, next) => {
    if(req.user) {
        next()
    }else if (req.cookies.agent_user){
        req.user = {id : req.cookies.agent_user[1]}
        next()
    }else{
        res.render('error')
    }
})
app.use('/user/passport', userPassportUpload)

const agentsuserupload = require('./routes/agentuploadclientfiles')
app.use('/agent/submit', agentsuserupload)

const bdo = require('./routes/bdo')
app.use('/bdo', bdo)

const agofficer = require('./routes/agentofficer')
app.use('/agofficer', agofficer)

const staff = require('./routes/staff')
app.use('/staff', staff)

const support = require('./routes/support')
app.use('/support', support)

const files = require('./routes/files')
app.use('/files', files)

const landingForm = require('./routes/landingform');
app.use('/landingform', landingForm);

const admin = require('./routes/admin');
app.use('/admin',admin)

const makePayment = require('./routes/payment');
app.use('/pay', makePayment)


const user = require('./routes/user')
app.use('/user', user)

const agent = require('./routes/agent')
app.use('/agent', agent)


const forgot_password = require('./routes/forgot-password')
app.use('/forgot-password', forgot_password);


const reset_password = require('./routes/agent_forgotpass')
app.use('/agent_forgotpass', reset_password)


app.listen(3000, function(){
    console.log('app running on port 3000')
})