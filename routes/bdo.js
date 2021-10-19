const express = require('express');
const route = express.Router();
const pool = require('../config/dbconfig')
const mailers = require('../services/mailers')
const jwt = require('jsonwebtoken')



function bdo(){

    // BDO ROUTE

    route.use((req, res, next) => {
        if (req.cookies.bdo ){
            const techie  = jwt.verify(req.cookies.bdo, process.env.TOKEN_SECRET)
            pool.getConnection((err, con) => {
                if(err){
                    res.render('error')
                }else{
                    con.query('SELECT * FROM bdo WHERE id = ?', techie.id, (err, result) => {
                        con.release()
                        if(result.length > 0.5){
                            next()
                        }else{
                            req.flash('danger', 'Please Login', )
                            res.render('./bdo/login', {
                                message: req.flash()
                            })
                        }
                    })
                }
            })
            }else{
            req.flash('danger', 'You Must Login First', )
            res.render('./bdo/login', {
                message: req.flash()
            })
            } 
    })
   route.get('/', (req, res) => {
       const cUser  = jwt.verify(req.cookies.bdo, process.env.TOKEN_SECRET)
       pool.getConnection((err, con) => {
           if(err){
               res.status(500).render('./error')
           }else{
               con.query('SELECT * FROM bdo WHERE id = ? ', cUser.id, (err, response) => {
                   if (err){
                    res.status(500).render('./error')
                   }else{
                       con.query('SELECT * FROM agentofficer WHERE bdo = ?', cUser.id, (err, agentofficer) => {
                           let sql = `SELECT * FROM agent WHERE agofficer = ${agentofficer[0].id}`  
                           for(var i = 1; i < agentofficer.length;){
                               sql += " OR agofficer = "+agentofficer[i].id+""
                               i++;
                            }
                           con.query(sql, (err, agents) => {
                               let leadsSql = `SELECT * FROM leads WHERE agent_id = '${agents[0].agent_id}'`
                               for(var i = 1; i < agents.length;){
                                leadsSql += " OR agent_id = "+"'"+agents[i].agent_id+"'"
                                 i++;
                                }
                                con.query(leadsSql, (err, leads) => {
                                    if(err){
                                        console.log(err)
                                    }
                                    con.release()
                                    res.render('./bdo/bdoindex', {
                                        leads,
                                        agents,
                                        agentofficer,
                                        currentBdo : response,
                                        message: req.flash()
                                    })
                                })
                           })
                       })
                   }
               })
           }
       })
   })



   route.get('/showagents', (req, res) => {
    const cUser  = jwt.verify(req.cookies.bdo, process.env.TOKEN_SECRET)
    pool.getConnection((err, con) => {
        if(err){
            res.status(500).render('./error')
        }else{
            con.query('SELECT * FROM bdo WHERE id = ? ', cUser.id, (err, response) => {
                if (err){
                 res.status(500).render('./error')
                }else{
                    con.query('SELECT * FROM agentofficer WHERE bdo = ?', cUser.id, (err, agentofficer) => {
                        let sql = `SELECT * FROM agent WHERE agofficer = ${agentofficer[0].id}`  
                        for(var i = 1; i < agentofficer.length;){
                            sql += " OR agofficer = "+agentofficer[i].id+""
                             i++;
                        }
                        con.query(sql, (err, agents) => {
                            let leadsSql = `SELECT * FROM leads WHERE agent_id = '${agents[0].agent_id}'`
                            for(var i = 1; i < agents.length;){
                             leadsSql += " OR agent_id = "+"'"+agents[i].agent_id+"'"
                              i++;
                             }
                             con.query(leadsSql, (err, leads) => {
                                 if(err){
                                     console.log(err)
                                 }
                                 con.release()
                                 res.render('./bdo/agent', {
                                     agents,
                                     agentofficer,
                                     currentBdo : response,
                                     message: req.flash()
                                 })
                             })
                        })
                    })
                }
            })
        }
    })
})

route.get('/showleads', (req, res) => {
    const cUser  = jwt.verify(req.cookies.bdo, process.env.TOKEN_SECRET)
    pool.getConnection((err, con) => {
        if(err){
            res.status(500).render('./error')
        }else{
            con.query('SELECT * FROM bdo WHERE id = ? ', cUser.id, (err, response) => {
                if (err){
                 res.status(500).render('./error')
                }else{
                    con.query('SELECT * FROM agentofficer WHERE bdo = ?', cUser.id, (err, agentofficer) => {
                        let sql = `SELECT * FROM agent WHERE agofficer = ${agentofficer[0].id}`  
                        for(var i = 1; i < agentofficer.length;){
                            sql += " OR agofficer = "+agentofficer[i].id+""
                             i++;
                        }
                        con.query(sql, (err, agents) => {
                            let leadsSql = `SELECT * FROM leads WHERE agent_id = '${agents[0].agent_id}'`
                            for(var i = 1; i < agents.length;){
                             leadsSql += " OR agent_id = "+"'"+agents[i].agent_id+"'"
                              i++;
                             }
                             con.query(leadsSql, (err, leads) => {
                                 if(err){
                                     console.log(err)
                                 }
                                 con.release()
                                 res.render('./bdo/leads', {
                                     leads,
                                     agents,
                                     agentofficer,
                                     currentBdo : response,
                                     message: req.flash()
                                 })
                             })
                        })
                    })
                }
            })
        }
    })
})







   route.post('/login', (req, res) => {
       const credentials = req.body
       res.send(credentials)

   })

   
   route.get('/logout', (req, res) => {
    res.cookie('bdo','');
    res.redirect('/staff')
})
route.get('/:link', (req, res) => {
    const param = req.params.link
    pool.getConnection((err, con) => {
        if(err){
            req.flash('danger', 'Internal server error')
            res.status(500).redirect('./bdo')
        }else{
            const query = `SELECT * FROM ${param}`
            con.query()
        }
    })
    res.status(200).json({
        lead : {
            errpr: 'errr'
        }
    })
})
    return route
} 

module.exports = bdo()