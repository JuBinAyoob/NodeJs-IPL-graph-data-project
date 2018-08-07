const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const iplFunctions = require('./mongoFunc');
const cors = require('cors');
// const groupBy = require('lodash.groupby');
// const mapValues = require('lodash.mapvalues');

//Connecting to mongodb
mongoose.connect('mongodb://127.0.0.1:27017/ipl');
let db = mongoose.connection;

db.once('open',function(){
  console.log('Connected to MongoDb');
});
db.on('error',function(err){
  console.log('Error in connection... Error:'+err);
});

let app = express();

//Load view engine
app.set("views",path.join(__dirname,"views"));
app.set("view engine","pug");
app.use("/static", express.static(path.join(__dirname,'public')));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(cors());

//for loading: home page
app.get('/',function(req,res){
  res.render('index');
});

//Bring in models
let Matches=require('./models/matches');
let Deliveries=require('./models/deliveries');

//
app.get('/seasons',function(req,res){
  Matches.distinct("season").exec(function(error,seasons){
    res.send(JSON.stringify(seasons));
  });
});

app.get('/teams',function(req,res){
  let year = req.query.year;
  Matches.find({season:year}).distinct("team1").exec(function(error,teams){
    if(error){
      console.log(error);
    }else{
      res.send(JSON.stringify(teams));
    }
  });
});

app.get('/getplayers/:season',function(req,res){
  let year = parseInt(req.params.season);
  let team = req.query.team;

  Matches.aggregate([
    {
      $match:{ 
        season:year,
        $or:[{team1:team},{team2:team}]
      }
    },
    {
      $project:{ _id:0,id:1}
    }
  ],function(error,matchsCol){
    if(error){
      console.log("Error in fetching Data, Error:"+error);
      res.sendStatus(404).json({msg:"Data not found"});
    }else{
      
      let matchIds=matchsCol.map((obj)=> obj.id);
      Deliveries.aggregate([
        {
          $project:{
            _id:0,
            batsman:1,
            batting_team:1,
            "has_ids":{
              $in:["$match_id",matchIds]
            }
          }
        },
        {
          $match:{
            has_ids:true,
            $or:[{batting_team:team},{bowling_team:team}]
          }
        },
        {
          $project:{
            "playerName":{
              $cond:[{$eq:["$batting_team",team]},"$batsman","$bowler"]
            }
          }
        },
        {
          $group:{
            _id:"$playerName"
          }
        },
        {
          $sort:{
            _id:1
          }
        }
      ],function(error,batsmanPlayers){
        if(error){
          console.log(error);
        }else{
          let arrPlayers=batsmanPlayers.map((val)=>val._id);
          res.send(arrPlayers);
        }
      });
    }
  });
});

app.get('/player/:playerName',function(req,res){

  let player=req.params.playerName;
  let year=parseInt(req.query.year);
  Matches.aggregate([
    {
      $match:{
        season:year
      }
    },
    {
      $project:{
        _id:0,
        id:1
      }
    }
  ],function(error,season){
    if(error){
      console.log(error);
      send.sendStatus(404).json({msg:"Data not found"});
    }else{
      let matchIds=season.map((val)=>val.id);
      findTeam(player,matchIds)
      .then(function(team){      
        Deliveries.aggregate([
          {
            $project:{
              _id:0,
              batting_team:1,
              batsman:1,
              batsman_runs:1,
              player_dismissed:1,
              wide_runs:1,
              noball_runs:1,
              "has_ids":{
                $in:["$match_id",matchIds]
              },
              "playerName":{
                $cond:[{$eq:["$batting_team",team]},"$batsman","$bowler"]
              }
            }
          },
          {
            $match:{
              has_ids:true,
              playerName:player
            }
          },
          {
            $group:{
              _id:"$playerName",
              batsman_runs:{$sum: {$cond:[{$eq:["$batsman",player]},"$batsman_runs",0]}},
              wickets:{
                $sum:{
                  $cond:[{$and:[{$ne:["$batsman",player]},{$ne:["$player_dismissed",""]}]},1,0]
                }
              },
              numBalls:{
                $sum:{$cond: [{ $and:[ {$ne:["$batsman",player]},{ $eq:["$wide_runs",0] },{$eq:["$noball_runs",0]}]},1,0]}
              }
            }
          }
        ],function(error,playerDetails){
          if(error){
            console.log("Data not Found,Error:"+error);
            res.sendStatus(404).json({msg:"Data not Found"})
          }else{
            if(playerDetails[0].numBalls){
              playerDetails[0].numOfOvers=parseInt(playerDetails[0].numBalls/6);
            }else{
              playerDetails[0].numOfOvers=0;
            }
            res.send(playerDetails);
          }
        });
      })
      .catch(error=>console.log(error));
    }
  });
});

//
function findTeam(player,matchIds){
  return new Promise(function(resolve,reject){
      Deliveries.aggregate([{
        $project:{
          _id:0,
          batting_team:1,
          bowling_team:1,
          batsman:1,
          bowler:1,
          "has_ids":{
            $in:["$match_id",matchIds]
          }
        }
      },
      {
        $match:{
          has_ids:true,
          $or:[{batsman:player},{bowler:player}]
        }
      },
      {
        $project:{
          "playersTeam":{
            $cond:[{$eq:["$batsman",player]},"$batting_team","$bowling_team"]
          }
        }
      }
    ],function(error,playersTeam){
      if(error){
        reject(error);
      }
      else{
        resolve(playersTeam[0].playersTeam);
      }
    });
});
}

//problem 1:  Plot the number of matches played per year of all the years in IPL.
app.get('/numOfMatchesPerSeason',function(req,res){
  Matches.aggregate([{$group:{ _id:"$season",total:{$sum: 1}}}]).sort({_id:1}).exec(function(error,numOfMatches){
    if(error){
      console.log("Error in fetching Data, Error:"+error);
      res.sendStatus(404).json({msg:"Data not found"});
    }else{
      let data={msg:"Number of matches per season",numOfMatches:numOfMatches};
      res.send(data);
    }
  });
});

//problem 2:  Plot a stacked bar chart of matches won of all teams over all the years of IPL.
app.get('/matchesWonOfAllTeamsPerYear',function(req,res){
  iplFunctions.matchesWonOfAllTeamsPerYear()
  .then(function(data){
    res.send(data);
  })
  .catch(function(error){
    console.log("Data not Found, Error:"+error);
    res.sendStatus(404).json({msg:"Data not Found"});
  })
});

//problem 3: For the year 2016 plot the extra runs conceded per team.
app.get('/extraRunsInYear2016',function(req,res){
  iplFunctions.extraRunsInYear2016()
  .then(function(arrExtraRunsInYear2016){
    let teamNames = arrExtraRunsInYear2016.map((obj)=>obj._id);
    let extraRuns = arrExtraRunsInYear2016.map((obj)=>obj.extraRuns);
    let data={msg:"Extra runs conceded per team on 2016",teamNames:teamNames,extraRuns:extraRuns};
    res.send(data);
  })
  .catch(function(error){
    console.log("Error in fetching data, Error:"+error);
    res.sendStatus(404).json({msg:"Data not Found"});
  });
});

//problem 4:For the year 2015 plot the top economical bowlers.
app.get("/bowlerEconomy2015",function(req,res){
  iplFunctions.bowlerEconomy2015()
  .then(function(arrBowlerEconomy2015){
    let bowlerNames = arrBowlerEconomy2015.map((obj)=>obj._id);
    let economy = arrBowlerEconomy2015.map((obj)=>obj.economy);
    let data={msg:"Top economical bowlers on 2015",bowlerNames:bowlerNames,economy:economy};
    res.send(data);
  })
  .catch(function(error){
    console.log("Data not found, Error:"+error);
    res.sendStatus(404).json({msg:"Data not found"});
  });
});

app.listen('8001');