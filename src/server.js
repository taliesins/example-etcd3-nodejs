#!/usr/bin/env node
/*jshint esversion: 6 */
const express = require('express');
const os = require('os');
const uuid = require('uuid');
const moment = require('moment');
const { Election, Etcd3 } = require('etcd3');

const PID = process.pid;
const PORT = (process.env.PORT || 8080);
const HOST = os.hostname();
const app = express();
const client = new Etcd3();
const campaignerName = uuid.v4();
const campaignName = (process.env.CAMPAIGNNAME || 'singleton_service');
const campaignTtl = (process.env.CAMPAIGNTTL || 1000);

var election = null;

async function GetRoot(req, res){
    console.log(`${moment().format()} - ${HOST}:${PID}:${campaignerName} - GET /`);
    
    if (!election){
        res.send(`${HOST}:${PID}:${campaignerName} - Not campaigning`);
    } else {
        //var election = new Election(client, campaignName);
        
        try {
            var myKey = election.leaderKey;//election.getPrefix() + election.leaseId;
            var leaderKey = await election.getLeader();
            
            if(myKey == leaderKey){
                res.send(`${HOST}:${PID}:${campaignerName} - Campaign leader - ${leaderKey} vs ${myKey} `);
            } else {
                res.send(`${HOST}:${PID}:${campaignerName} - Attempting to become the campaign leader - ${leaderKey} vs ${myKey}`);
            }
        } catch (err) {
            console.error(err);
        }
    }
}

async function Campaign(req, res){
    console.log(`${moment().format()} - ${HOST}:${PID}:${campaignerName} - GET /campaign`);

    if (!election){
        election = new Election(client, campaignName);
        
        election.on('leader', (leaderKey)=>{
            var myKey = election.leaderKey;
            console.log(`${moment().format()} - ${HOST}:${PID}:${campaignerName} - the current leader's key is ${leaderKey} and my lease is ${myKey}`);
        });
        election.on('error', (err)=>{
            console.log(`${moment().format()} - ${HOST}:${PID}:${campaignerName} - err`);
            console.error(err);
        });
        election.campaign(campaignerName);
        res.send(`${HOST}:${PID}:${campaignerName} - Started campaigning`);
    } else {
        res.send(`${HOST}:${PID}:${campaignerName} - Unable to start campaigning as already part of a campaign`);
    }
}

async function Resign(req, res){
    console.log(`${moment().format()} - ${HOST}:${PID}:${campaignerName} - GET /resign`);

    if (election){
        election.resign();
        election=null;
    
        res.send(`${HOST}:${PID}:${campaignerName} - Resigned from campaign`);
    } else {
        res.send(`${HOST}:${PID}:${campaignerName} - Unable to resign campaign as not part of any campaign`);
    }
}

app.get('/', GetRoot);
app.get('/campaign', Campaign);
app.get('/resign', Resign);
app.listen(PORT, ()=>{

});