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
var proclaimationWatcher = null;

async function GetRoot(req, res){
    console.log(`${moment().format()} - ${HOST}:${PID}:${campaignerName} - GET /`);
    
    if (!election){
        res.send(`${HOST}:${PID}:${campaignerName} - Not campaigning`);
    } else {  
        try {
            var myKey = election ? election.leaderKey : '';
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
            var myKey = election ? election.leaderKey : '';

            proclaimationWatcher = client.watch().key(leaderKey).watcher();
            proclaimationWatcher.on('put', (currentValue, previousValue)=>{
                console.log(`${moment().format()} - ${HOST}:${PID}:${campaignerName} - new proclaimed value ${currentValue ? currentValue.value : ''} and previous proclaimed value ${previousValue ? previousValue.value : '' } `);
            });

            console.log(`${moment().format()} - ${HOST}:${PID}:${campaignerName} - the current leader's key is ${leaderKey} and my lease is ${myKey}`);
        });
        election.emit
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

async function Proclaim(req, res){
    console.log(`${moment().format()} - ${HOST}:${PID}:${campaignerName} - GET /proclaim`);
    
    if (!election){
        res.send(`${HOST}:${PID}:${campaignerName} - Not campaigning`);
    } else {
        try {
            var myKey = election.leaderKey;
            var leaderKey = await election.getLeader();
            var proclamation = uuid.v4();
            
            if(myKey == leaderKey){
                election.proclaim(proclamation);
                res.send(`${HOST}:${PID}:${campaignerName} - Sent out proclamation - ${proclamation}`);
            } else {
                res.send(`${HOST}:${PID}:${campaignerName} - Only campaign leader can send out proclamation`);
            }
        } catch (err) {
            console.error(err);
        }
    }
}


async function Resign(req, res){
    console.log(`${moment().format()} - ${HOST}:${PID}:${campaignerName} - GET /resign`);

    if (election){
        election.resign();
        election=null;
        proclaimationWatcher.cancel();
        proclaimationWatcher=null;
    
        res.send(`${HOST}:${PID}:${campaignerName} - Resigned from campaign`);
    } else {
        res.send(`${HOST}:${PID}:${campaignerName} - Unable to resign campaign as not part of any campaign`);
    }
}

process.on( 'SIGINT', function() {
    console.log( "\nGracefully shutting down from SIGINT (Ctrl-C)" );
   
    if (election){
        election.resign();
        election=null;
        proclaimationWatcher.cancel();
        proclaimationWatcher=null;
    };

    // some other closing procedures go here
    process.exit( );
})

app.get('/', GetRoot);
app.get('/campaign', Campaign);
app.get('/proclaim', Proclaim);
app.get('/resign', Resign);
app.listen(PORT, ()=>{

});
