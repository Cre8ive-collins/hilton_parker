const express = require('express');
const route = express.Router();
const pool = require('../config/dbconfig');
const joi = require('joi')
const bcrypt = require('bcryptjs');
const mailers = require('../services/mailers');
require('dotenv').config()
const fs = require('fs')
const jwt = require('jsonwebtoken');
const { entries } = require('lodash');
flash = require('express-flash')
const search = require('../middlewares/search');
const { Router } = require('express');

const directory = './assets/uploads/academics'


const schema = joi.object({
    firstname: joi.string().alphanum().min(3).max(30).required(),
    lastname: joi.string().alphanum().min(3).max(30).required(),
    phonenumber: joi.string().min(3).max(30).required(),
    password: joi.string().required(),
    email: joi.string().email({ minDomainSegments: 2, tlds: { allow:['com']}}).required()
})


function admin() {

    route.use('/search', (req, res, next) => {
        search(req, res, next)
    })

    route.get('/search', (req, res) => {
        res.render('./admin/search')
    })

    route.post('/search', (req, res) => {
        // const data = await res.locals
        const userList = req.app.locals.result
        const table = req.app.locals.table
        if(table == 'agent'){
            res.render('./admin/userList', {
                agentList: userList,
                admin: []
            })
        }else if(table == 'leads'){
            res.render('./admin/applicants', {
                userList
            })
        }else{
            res.render('./error')
        }
    })

    route.get('/logout', (req, res) => {
        res.cookie('authenticate','', {expiresIn: Date.now()})
        res.redirect('/admin/login')
    })

    route.get('/',  authenticateAdmin =(req, res, next) => {
        if (req.cookies.authenticate){
            req.user = jwt.verify(req.cookies.authenticate, process.env.TOKEN_SECRET)
            next()
         }else{
            req.flash('danger', 'You Must Login First', )
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
            req.flash('danger', 'You Must Login First', )
            res.redirect('/admin/login')
            } 
    }, (req, res) => {
        const id = req.user.id
        pool.getConnection((err, con) => {
            if (err) throw err;
            const message = req.flash()
            con.query('SELECT * FROM admin WHERE id = ?', id, (err, admin) => {
                con.query('SELECT * FROM leads WHERE status = "new" && accountofficer = ?', id, (err, starter) =>{
                    con.query('SELECT * FROM leads WHERE status IN("registered", "pending") && accountofficer = ?', id, (err, complete) =>{
                        con.query('SELECT * FROM leads WHERE status = "paid" && accountofficer = ?', id, (err, paid) =>{
                            con.query('SELECT * FROM leads WHERE status = "success" && accountofficer = ?', id, (err, success) =>{
                                con.query('SELECT * FROM leads WHERE accountofficer = ?', id, (err, allUser) =>{

                                    res.render('./admin/dashboard', {
                                        admin, 
                                        starter, 
                                        complete,
                                        paid,
                                        success,
                                        allUser,
                                        message : message 

                                    })
                                })

                            })
                        })
                    })
                })
            })
        })
    })

    

    // POST TO /ADMIN/REGISTER ROUTE 
    route.post('/register', async(req, res) => {
        const params = req.body
        // VALIDATE FORM ENTRY 
        const valid = await schema.validate({
            firstname:params.firstName,
            lastname:params.lastName,
            phonenumber:params.phonenumber,
            password: params.password,
            email: params.email
        })

        // console.log(valid)
        // CHECK FOR ERROR 
        if (valid.error){
            err = valid.error 
            // res.send(err.details[0].message)
            res.render('error')
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
                        const email = value.email
                        con.query('SELECT * FROM admin WHERE email = ?', [email], (err, result) => {
                        if(!err){
                            const st = result.length
                            if(st == 0){
                                con.query('UPDATE admin SET clients = 0', (err, resu) => {
                                    con.query('INSERT INTO admin SET ?', value, (err, result) => {
                                        con.release()
                                        if(!err){
                                            req.flash('success', 'Account Created please login', )
                                            res.redirect('/support')
                                        }else{
                                            res.render('error')
                                        }
                                    })
                                })
                                
                            }else{
                                req.flash('danger', 'Email already exists')
                                res.redirect('/support')
                            }
                        }else{
                            // res.send(err)
                            res.render('error')
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
        const message = req.flash()
        res.render('./admin/login', {
            message
        })
    })

        // POST TO ADMIN LOGIN 
        route.post('/login', (req, res) => {
            const userDetails = req.body
            pool.getConnection((err, con) => {
                if (err) res.redirect('/')
                con.query('SELECT * FROM admin WHERE email = ?', userDetails.email, async (err, user) => {
                    con.release()
                    if(user.length > 0){
                        // CHECK PASSWORD 
                        bcrypt.compare(userDetails.password , user[0].password, (err, response) =>{
                            if(response){
                                const token = jwt.sign({id: user[0].id}, process.env.TOKEN_SECRET)
                                res.cookie('authenticate', token, {maxAge: 43200000}).redirect('/admin')
                            }else{
                                req.flash('danger', 'incorrect password')
                                res.redirect('/admin/login')
                            }
                        })
                        
                    }else{
                        req.flash('danger', 'Incorrect Email or Password')
                        res.redirect('/admin/login')
                    }
                })
            })
            })


        // agents details
        route.get('/details', (req, res, next,) => {
            if (req.cookies.authenticate){
                req.user = jwt.verify(req.cookies.authenticate, process.env.TOKEN_SECRET)
                next()
            }else{
                req.flash('danger', 'You Must Login First', )
                res.redirect('/agent/login')
                } 
        }, (req, res) => {
            const id = req.user.id
            pool.getConnection((err, con) => {
                if (err) throw err;
                con.query('SELECT * FROM admin WHERE id = ?', id, (err, admin) => {
                    con.query('SELECT * FROM agent WHERE status = "new" && accountofficer = ?', id, (err, fresh) =>{
                        con.query('SELECT * FROM agent WHERE status = "submit" && accountofficer = ?', id, (err, registered) =>{
                            con.query('SELECT * FROM agent WHERE status = "verified" && accountofficer = ?', id, (err, active) =>{   
                                con.query(`SELECT * FROM agent WHERE accountofficer = ? ` , id, (err, all) => {
                                    console.log(err)
                                    con.release()
                                    res.render('./admin/agent', {
                                        userList : all,
                                        fresh,
                                        registered,
                                        active,
                                        admin : admin[0]

                                    })
                                }) 
                                   
    
                              
                            })
                        })
                    })
                })
            })
        })
    



    // DASHBOARD NAVIGATION LINKS
    route.get('/newApplicants',(req, res, next,) => {
        if (req.cookies.authenticate){
            req.user = jwt.verify(req.cookies.authenticate, process.env.TOKEN_SECRET)
            next()
        }else{
            req.flash('danger', 'You Must Login First', )
            res.redirect('/agent/login')
            } 
    },  (req, res) => {
        const accountofficer = req.user.id
        pool.getConnection((err, con) =>{
            if (err) res.redirect('/')
            con.query('SELECT * FROM leads WHERE status = "new" && accountofficer = ?', accountofficer, (err, userList) =>{
                if(userList.length > 0){
                    res.render('./admin/applicants', {
                        userList
                    })
                }else{
                    res.render('./admin/applicants', {
                        userList
                    })
                }
            })
        })
    })

    route.get('/completereg', (req, res, next,) => {
        if (req.cookies.authenticate){
            req.user = jwt.verify(req.cookies.authenticate, process.env.TOKEN_SECRET)
            next()
        }else{
            req.flash('danger', 'You Must Login First', )
            res.redirect('/agent/login')
            } 
    },  (req, res) => {
        const accountofficer = req.user.id
        pool.getConnection((err, con) =>{
            if (err) res.redirect('/')
            con.query('SELECT * FROM leads WHERE status IN("registered", "pending") && accountofficer = ?', accountofficer, (err, userList) =>{
                if(userList.length > 0){
                    res.render('./admin/applicants', {
                        userList
                    })
                }else{
                    res.render('./admin/applicants', {
                        userList
                    })
                }
            })
        })
    })

    route.get('/makepayment', (req, res, next,) => {
        if (req.cookies.authenticate){
            req.user = jwt.verify(req.cookies.authenticate, process.env.TOKEN_SECRET)
            next()
        }else{
            req.flash('danger', 'You Must Login First',)
            res.redirect('/agent/login')
            } 
    },  (req, res) => {
        const accountofficer = req.user.id
        pool.getConnection((err, con) =>{
            if (err) res.redirect('/')
            con.query('SELECT * FROM leads WHERE status = "paid" && accountofficer = ?', accountofficer, (err, userList) =>{
                if(userList.length > 0){
                    res.render('./admin/applicants', {
                        userList
                    })
                }else{
                    res.render('./admin/applicants', {
                        userList
                    })
                }
            })
        })
    })

    route.get('/success', (req, res, next,) => {
        if (req.cookies.authenticate){
            req.user = jwt.verify(req.cookies.authenticate, process.env.TOKEN_SECRET)
            next()
        }else{
            req.flash('danger', 'You Must Login First', )
            res.redirect('/agent/login')
            } 
    },  (req, res) => {
        const accountofficer = req.user.id
        pool.getConnection((err, con) =>{
            if (err) res.redirect('/')
            con.query('SELECT * FROM leads WHERE status = "success" && accountofficer = ?', accountofficer, (err, userList) =>{
                if(userList.length > 0){
                    res.render('./admin/applicants', {
                        userList
                    })
                }else{
                    res.render('./admin/applicants', {
                        userList
                    })
                }
            })
        })
    })



    route.get('/home', (req, res) => {
        res.redirect('/admin/dashboard')
    })


    // agent details route

    route.get('/newagents', (req, res, next,) => {
        if (req.cookies.authenticate){
            req.user = jwt.verify(req.cookies.authenticate, process.env.TOKEN_SECRET)
            next()
        }else{
            req.flash('danger', 'You Must Login First', )
            res.redirect('/agent/login')
            } 
    }, (req, res) => {
        const accountofficer = req.user.id
        pool.getConnection((err, con) =>{
            if (err) res.redirect('/')
            con.query('SELECT * FROM admin WHERE id = ?', accountofficer, (err, admin) => {
                con.query('SELECT * FROM agent WHERE status = "new" && accountofficer = ?', accountofficer, (err, agentList) =>{
                    if(agentList.length > 0){
                        res.render('./admin/userList', {
                            agentList,
                            admin: admin[0]
                        })
                    }else{
                        res.render('./admin/userList', {
                            agentList,
                            admin: admin[0]
                        })
                    }
                })
            })
        })
    })

    route.get('/doc_upload', (req, res, next,) => {
        if (req.cookies.authenticate){
            req.user = jwt.verify(req.cookies.authenticate, process.env.TOKEN_SECRET)
            next()
        }else{
            req.flash('danger', 'You Must Login First', )
            res.redirect('/agent/login')
            } 
    }, (req, res) => {

        const accountofficer = req.user.id
        pool.getConnection((err, con) =>{
            if (err) res.redirect('/')
            con.query('SELECT * FROM admin WHERE id = ?', accountofficer, (err, admin) => {
                con.query('SELECT * FROM agent WHERE status = "submit" && accountofficer = ?', accountofficer, (err, agentList) =>{
                    if(agentList.length > 0){
                        res.render('./admin/userList', {
                            agentList,
                            admin: admin[0]
                        })
                    }else{
                        res.render('./admin/userList', {
                            agentList,
                            admin: admin[0]
                        })
                    }
                })
            })
        })
    })

    route.get('/verifiedagents', (req, res, next,) => {
        if (req.cookies.authenticate){
            req.user = jwt.verify(req.cookies.authenticate, process.env.TOKEN_SECRET)
            next()
        }else{
            req.flash('danger', 'You Must Login First', )
            res.redirect('/agent/login')
            } 
    },  (req, res) => {
        const accountofficer = req.user.id
        pool.getConnection((err, con) =>{
            if (err) res.redirect('/')
            con.query('SELECT * FROM admin WHERE id = ?', accountofficer, (err, admin) => {
                con.query('SELECT * FROM agent WHERE status = "verified" && accountofficer = ?', accountofficer, (err, agentList) =>{
                    if(agentList.length > 0){
                        res.render('./admin/userList', {
                            agentList,
                            admin : admin[0]
                        })
                    }else{
                        res.render('./admin/userList', {
                            agentList,
                            admin : admin[0]
                        })
                    }
                })
            })
        })
    })

    route.get('/activeagents', (req, res) => {
        res.render('./admin/userList', {
            admin : admin[0]
        })
    })

    route.get('/agentdetails/:id', (req, res, next,) => {
        if (req.cookies.authenticate){
            req.user = jwt.verify(req.cookies.authenticate, process.env.TOKEN_SECRET)
            next()
        }else{
            req.flash('danger', 'You Must Login First', )
            res.redirect('/agent/login')
            } 
    },  (req, res) => {
        const id = req.params.id
        pool.getConnection((err, con) =>{
            if (err) res.redirect('/')
                con.query('SELECT * FROM agent WHERE id = ?', id, (err, info) =>{
                    if(info.length > 0){
                        res.render('./admin/agentdetails', {
                            info : info[0]
                        })
                    }else{
                        res.render('./admin/agentdetails', {
                            info
                        })
                    }
                })
        })
    })




    route.get('/clientdetails/:id', (req, res, next,) => {
        if (req.cookies.authenticate){
            req.user = jwt.verify(req.cookies.authenticate, process.env.TOKEN_SECRET)
            next()
        }else{
            req.flash('danger', 'You Must Login First', )
            res.redirect('/agent/login')
            } 
    },  (req, res) => {
        const id = req.params.id

        fs.readdir(directory, (err, files) => {
            const doc = []
            files.forEach(file => {
              console.log(file)  
              doc.push(file)
            })

            const id = req.params.id
            const entries = []
            const counter = id.length
            for (var i =0; i<doc.length; i++){
                const j = doc[i].slice(0,counter)
                if(j == id){
                    entries.push(doc[i])
                }
            }
            pool.getConnection((err, con) =>{
                console.log(entries)
                if (err) res.redirect('/')
                    con.query('SELECT * FROM leads WHERE id = ?', id, (err, resp) =>{
                        if(resp.length > 0){
                            res.render('./admin/clientdetails', {
                                resp : resp[0],
                                files: entries
                            })
                        }else{
                            res.render('./admin/clientsdetails', {
                                resp,
                                files: entries

                            })
                        }
                    })
            })
        }
        )

        
    })





    
    route.post('/verify/:id', (req, res, next) =>{
        const id = req.params.id
        pool.getConnection((err, con)=>{
            con.query('SELECT * FROM agent WHERE id = ?', id, (err, agent) =>{
                if(agent.length > 0){
                    con.query('UPDATE agent SET status = "verified" WHERE id = ?', id, (err, resu) =>{
                        mailers.verified(agent)
                        req.flash('success', 'Agent verified',)
                        res.redirect('/admin/dashboard')
                    })
                }else{
                    req.flash('danger', 'Not verified',)
                    res.redirect('./admin/dashboard')
                }
            })
        })
 
    })


    route.post('/verify_user/:id', (req, res, next) =>{
        const id = req.params.id
        const message = req.flash()
        pool.getConnection((err, con)=>{
            con.query('SELECT * FROM leads WHERE id = ?', id, (err, output) =>{
                if(output.length > 0){
                    con.query('UPDATE leads SET status = "paid" WHERE id = ?', id, (err, resp) =>{
                        mailers.application_verified(output)
                        req.flash('success', 'Application verified',)
                        res.redirect('/admin/dashboard')
                    })
                }else{
                    req.flash('danger', 'Not verified',)
                    res.redirect('./admin/dashboard')
                }
            })
        })
 
    } )
       
    return route
}

module.exports = admin();