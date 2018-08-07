const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');

//Connecting to mongodb
mongoose.connect('mongodb://127.0.0.1:27017/ipl');
let db = mongoose.connection;

db.once('open',function(){
  console.log('Connected to MongoDb');
});
db.on('error',function(err){
  console.log('Error in connection... Error:'+err);
});

//Bring in models
let Matches=require('./models/matches');
let Deliveries=require('./models/deliveries');

matchesWonOfAllTeamsPerYear = ()=>{
    return new Promise(function(resolve,reject){
      Matches.aggregate([
        {
          $group: {
            _id: {
              season: "$season",
              team: "$winner"
            },
            numOfMatches: {$sum: 1}
          }
        },
        {
          $sort: {
            _id: 1
          }
        }
      ],function(error,matchesWonOfAllTeams){
        if(error){
          reject(error);
        }else{
          // let arrMatchesWonOfAllTeams=groupBy(matchesWonOfAllTeams,"_id.team");
          // let arrMatchWonTeams = mapValues(arrMatchesWonOfAllTeams,function(matches){
          //   return mapValues(groupBy(matches,"_id.season"),function(matchesWonOfAllTeamsPerYear){
          //     return matchesWonOfAllTeamsPerYear[0].numOfMatches;
          //   });
          // });
  
          //time: 1.248
          let teamOrder=[];
          let team=[];
          let order=0;
          let rowData=[];
          let year ;
          //For converting the data to highchart format
          matchesWonOfAllTeams.forEach(function(obj){
            tempTeamName = obj._id.team;
            //for handling draw results  
            if(tempTeamName!="")
            {
              if(obj._id.season!=year){
                year=obj._id.season;
                rowData[year]=[];
              }
              //To handle the team name data for: "Rising Pune Supergiants" and "Rising Pune Supergiant"
              if(tempTeamName=="Rising Pune Supergiant")
                tempTeamName="Rising Pune Supergiants"; 
              //Variable order for setting order for team names in xaxis of high chart
              if(teamOrder.hasOwnProperty(tempTeamName)){
                let yearOrder=teamOrder[tempTeamName];
                rowData[year][yearOrder]=obj.numOfMatches;
              }else{
                teamOrder[tempTeamName]=order;
                team.push(tempTeamName);
                rowData[year][order]=obj.numOfMatches;
                order++;
              }
            }
          });
          let records=[];
          //Setting value zero for empty values in xaxis of highchart && 
          //Assigning Data structure for highChartStackBar
          rowData.forEach((val,key)=>{
            let i=0;
            while(i<order){
              if(val[i]==undefined)
                val[i]=0;
              i++;
            }
            let record ={};
            record.name=key;
            record.data=val;
            records.push(record);
          });
          let data={msg:"Matches won of all teams over all the years of IPL",arrTeam:team,records:records};
          resolve(data);
        }
      });
    })
  }
  

  extraRunsInYear2016 =()=>{
    return new Promise(function(resolve,reject){
      Matches.aggregate([
        {
          $match:{ season:2016}
        },
        {
          $project:{ _id:0,id:1}
        }
      ],function(error,season2016){
        if(error){
          console.log("Error in fetching Data, Error:"+error);
          res.sendStatus(404).json({msg:"Data not found"});
        }else{
          let matchIds=season2016.map((obj)=> obj.id);
          
          Deliveries.aggregate([{
            $project:{
              _id:0,
              bowling_team:1,
              extra_runs:1,
              "has_ids":{
                $in:["$match_id",matchIds]
              }
            }
          },
          {
            $match:{
              has_ids:true
            }
          },
          {
            $group:{
              _id:"$bowling_team",
              extraRuns:{$sum: "$extra_runs"}
            }
          }
        ],function(error,extraRuns2016){
          if(error){
            reject(error);
          }else{
            resolve(extraRuns2016);
          }  
        });
        }
      });
    })
  }
  
//function for the problem: For the year 2015 plot the top economical bowlers.
bowlerEconomy2015 =() => { 
    return new Promise(function(resolve,reject){ 
      Matches.aggregate([
        {
          $match:{season:2015}
        },
        {
          $project:{ _id:0,id:1}
        }
      ],function(error,season2015){
        if(error){
          reject(error);
        }
        else{
          let matchIds=season2015.map((obj)=> obj.id);
    
          Deliveries.aggregate([
            {
              $project:{
                _id:0,
                bowler:1,
                wide_runs:1,
                batsman_runs:1,
                noball_runs:1,
                "has_ids":{
                  $in:["$match_id",matchIds]
                }
              }
            },
            {
              $match:{
                has_ids:true
              }
            },
            {
              $group:{
                _id:"$bowler",
                wide_runs:{$sum:"$wide_runs"},
                batsman_runs:{$sum:"$batsman_runs"},
                noball_runs:{$sum:"$noball_runs"},
                numBalls:{
                  $sum:{$cond: [{ $and:[ { $eq:["$wide_runs",0] },{$eq:["$noball_runs",0]}]},1,0]}
                }
              }
            },
            {
              $project:{ _id:1,totalRuns:{$sum:["$wide_runs","$batsman_runs","$noball_runs"]},numOfOvers:{$divide:["$numBalls",6]}}
            },
            {
              $project:{_id:1,economy:{$divide:["$totalRuns","$numOfOvers"]}}
            },
            {
              $sort:{
                economy:1
              }
            },
            {
              $limit:15
            }
          ],function(error,arrBowlerEconomy2015){
            if(error)
              reject(error);
            else
              resolve(arrBowlerEconomy2015);
          });
        }
      }); 
    });
}   

module.exports = {
    matchesWonOfAllTeamsPerYear,
    extraRunsInYear2016,
    bowlerEconomy2015
}