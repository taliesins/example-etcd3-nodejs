# example-etcd3-nodejs

Demonstrate etcd3 with nodejs (elections)

# Temp hack until elections are merged into nodejs etcd3
Until election support is added you need to use branch version of etcd3
```
git clone https://github.com/taliesins/example-etcd3-nodejs
git clone --single-branch -b feature/election https://github.com/taliesins/etcd3
cd etcd3

#npm run -s build:proto
#need to recreate marker interface as proto won't make interface without any members

npm run -s build:ts
cd example-etcd3-nodejs/src
npm install ../../etcd3
```
# Prerequisites

* node.js - https://nodejs.org/en/download/
* npm
* typescript
* etcd3 - https://github.com/coreos/etcd/releases

# Demo 1 - Leader election

Leader election is useful when you want to ensure that only want instance running across multiple datacenters, and if that instance crashes one of the other instances will take over. The crashed instance can then be fixed and restarted. An example where a single instance might be used is for a scheduled report generator.

Get etcd3 running with default ports 
```
etcd
```

Get 2 instances running:
```
PORT=9944 npm start
```
```
PORT=9945 npm start
```

Lets test:
```
curl -s http://localhost:9944
curl -s http://localhost:9945
#notice that there is no one campaigning

curl -s http://localhost:9944/campaign
sleep 1
curl -s http://localhost:9945/campaign
#started campaigning

curl -s http://localhost:9944
#campaign winner 
curl -s http://localhost:9945
#still trying to win campaign

curl -s http://localhost:9944/resign
curl -s http://localhost:9944/campaign
#simulate restart of service

curl -s http://localhost:9944
#still trying to win campaign (no longer the winner)
curl -s http://localhost:9945
#campaign winner (new winner) 

curl -s http://localhost:9945/proclaim
#proclaimed value shows up on both nodes in the campaign

curl -s http://localhost:9944/resign
#resign from campaign, so will no long recieve proclamations 
curl -s http://localhost:9945/proclaim
#proclamation only recieved on the one node
```
