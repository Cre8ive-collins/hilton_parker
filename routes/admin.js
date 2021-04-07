const express = require('express');
const route = express.Router();
const pool = require('../config/dbconfig');
const joi = require('joi')
const bcrypt = require('bcryptjs');
require('dotenv').config()
const jwt = require('jsonwebtoken')



const schema = joi.object({
    firstname: joi.string().alphanum().min(3).max(30).required(),
    lastname: joi.string().alphanum().min(3).max(30).required(),
    password: joi.string().required(),
    email: joi.string().email({ minDomainSegments: 2, tlds: { allow:['com']}}).required()
})


function admin() {

    // route.get('/logout', (req, res) => {
    //     console.log(req.cookies)
    //     res.cookie('authentication','', {expiresIn: Date.now()})
    //     res.redirect('/admin/login')
    // })
    route.get('/',  authenticateAdmin =(req, res, next) => {
        if (req.cookies.authenticate){
            req.user = jwt.verify(req.cookies.authenticate, process.env.TOKEN_SECRET)
            next()
         }else{
            res.redirect('admin/login')
            }
    },(req,res) => {
        res.redirect('admin/dashboard') 
    })

    // GET ADMIN DASHBOARD 
    route.get('/dashboard', (req, res, next) => {
        if (req.cookies.authenticate){
            req.user = jwt.verify(req.cookies.authenticate, process.env.TOKEN_SECRET)
            next()
        }else{
            res.redirect('/admin/login')
            }
    }, (req, res) => {
        res.send('Admin Dashboard Page')
    })

    // GET /ADMIN/REGISTER ROUTE 
    route.get('/register', (req, res, next) => {
        if (req.cookies.authenticate){
            req.user = jwt.verify(req.cookies.authenticate, process.env.TOKEN_SECRET)
            res.redirect('/admin/dashboard')
         }else{
             next()
            }
    } , (req,res) => {
        res.render('./admin/sign-up')
    })

    // POST TO /ADMIN/REGISTER ROUTE 
    route.post('/register', async(req, res) => {
        const params = req.body

        // VALIDATE FORM ENTRY 
        const valid = await schema.validate({
            firstname:params.firstName,
            lastname:params.lastName,
            password: params.password,
            email: params.email
        })

        // CHECK FOR ERROR 
        if (valid.error){
            err = valid.error 
            res.send(err.details[0].message)
        }else{
            // HASH PASSWORD 
            bcrypt.hash(valid.value.password, 12)
            .then(hashedpassword => {
                const {value} = valid
                value.password = hashedpassword
                
                // CONNECT TO DB 
                pool.getConnection((err, con) => {
                    if(err) throw err;

                    // CHECK IF EMAIL EXIST 
                    con.query('SELECT * FROM admin WHERE email = ?', value.email, (err, result) => {
                        if(!err){
                            const st = result.length
                            if(st == 0){
                                con.query('INSERT INTO admin SET ?', value, (err, result) => {
                                    con.release()
                                    if(!err){
                                        res.redirect('/admin/login')
                                    }else{
                                        res.send(err)
                                    }
                                })
                            }else{
                                res.send('user already exist')
                            }
                        }else{
                            res.send(err)
                        }
                    })
                })
            })
        }
    })

    // GET ADMIN LOGIN
    route.get('/login', authenticateAdmin =(req, res, next) => {
        if (req.cookies.authenticate){
            req.user = jwt.verify(req.cookies.authenticate, process.env.TOKEN_SECRET)
            res.redirect('/admin/dashboard')
    
        }else{
            next()
        }
    }, (req, res) => {
        res.render('./admin/login')
    })

        // POST TO ADMIN LOGIN 
    route.post('/login', (req, res) => {
        const userDetails = req.body
        pool.getConnection((err, con) => {
            if (err) res.redirect('/')
            console.log(userDetails.password)
            con.query('SELECT * FROM admin WHERE email = ?', userDetails.email, async (err, user) => {
                console.log(userDetails.password)
                con.release()
                if(user.length > 0){
                    // CHECK PASSWORD 
                    bcrypt.compare(userDetails.password , user[0].password, (err, response) =>{
                        if(response){
                            const token = jwt.sign({id: user[0].id}, process.env.TOKEN_SECRET)
                            res.cookie('authenticate', token, {maxAge: 3.24e+7}).redirect('/admin')
                        }else{
                            res.redirect('/admin/login')
                        }
                    })
                    
                }else{
                    res.send('user doesnt exist')
                }
            })
        })
        })
    return route
}

module.exports = admin();