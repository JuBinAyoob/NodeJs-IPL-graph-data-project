let jsonMatches = [];
let jsonDelivery = [];
let numMatchesSeason =[];

$(document).ready(function () {
  $(".story-det").hide();
  $("#num-matches-year").click(function () {
    $("#story-chart").hide();
    $(".story-det").hide();
    numMatchesPerYear();
  });
  $("#matches-won").click(function(){
    $("#story-chart").hide();
    $(".story-det").hide();
    matchesWonOfAllTeams();
  });
  $("#extra-runs").click(function(){
    $("#story-chart").hide();
    $(".story-det").hide();
    extraRunsInYear2016();
  });
  $("#bowler-economy").click(function(){
    $("#story-chart").hide();
    $(".story-det").hide();
    bowlerEconomy2015();
  });
  $("#story-line").click(function(){
    $("#story-chart").show();
    $(".story-det").show();
    myStory(numMatchesPerYear);
  });
});

//This function block to get result for:   Plot the number of matches played per year of all the years in IPL.
function numMatchesPerYear() {
  ajaxCall("numOfMatchesPerSeason");        
}

//Function block to : Plot a stacked bar chart of matches won of all teams over all the years of IPL.
function matchesWonOfAllTeams(){
  ajaxCall("matchesWonOfAllTeamsPerYear");
}

//function block to get result for:  For the year 2016 plot the extra runs conceded per team.
function extraRunsInYear2016() {
  ajaxCall("extraRunsInYear2016");
}

//function block to get result for:   For the year 2015 plot the top economical bowlers.
function bowlerEconomy2015(findTopTenEconomy) {
  ajaxCall("bowlerEconomy2015");
}

function myStory(numMatchesPerYear){
  //numMatchesPerYear();
  ajaxCall("numOfMatchesPerSeason","myStory");
}

//Function to do Ajax calls
function ajaxCall(path,myStory){
  $.ajax({
    type:"GET",
    url:"http://localhost:8001/"+path,
    success:function(result){
      if(myStory){
        let intTotalMatchNum=0;
        let categoryYear = [];
        let numMatchesPerYear = [];
        result.numOfMatches.forEach(function(obj){
          categoryYear.push(obj._id);
          numMatchesPerYear.push(obj.total);
          intTotalMatchNum+=obj.total;
          
        });
        highChart(categoryYear,numMatchesPerYear,result.msg,'Number of matches');
        let percentage = [];
        result.numOfMatches.forEach(function(obj){
          let curYearDetail = [];
          let curPercentage = (obj.total/intTotalMatchNum)*100;
          if(obj._id=="2013")
            curYearDetail=[obj._id,curPercentage,true,true];
          else
            curYearDetail=[obj._id,curPercentage,false];
          percentage.push(curYearDetail);
        });
        highChartRoundPercentage(categoryYear,percentage);

        $("#story-p").html("As for indian dream game, The IPL cricket season game starts at year 2008 and now its continuosly increasing its followers with high rate. "+
          "As you can see, with respect to the years, new IPL teams are emerging from new states."+
          "And From the graph,It shows that Rising Pune Supergiants and Gujart Lion are the latest teams that joined in Indian IPL teams."+
          "By looking to the Number of matches won graph(graph:2), the most succesful team in All IPL seasons is Mumbai Indians with a record of total wins around 90 matches."+
          "After a set of conduction of IPL season, the number of games per season is setted around 60 games. And the longest number of games is conducted on season 2013 with 76 games."+
          "So while looking to the graph and its growth, Its clear that in coming years the IPL will be one of the best entertaining sports platform."+
          "Now coming to the Top Economical bowler 2015 graph(graph:4), On 2015 the player RN ten Doeschate have the highest economy bowler rate.");

      }else if(result.msg=="Number of matches per season"){
        let seasonName = [];
        let numMatchesPerYear = [];
        result.numOfMatches.forEach(function(obj){
          seasonName.push(obj._id);
          numMatchesPerYear.push(obj.total);
        });
        highChart(seasonName,numMatchesPerYear,result.msg,'Number of matches');
      }else if(result.msg=="Matches won of all teams over all the years of IPL"){
        
        //tried out: lodash to reduce number of lines, but it have processing time:3.998ms
        // let objMatchWonTeams = result.arrMatchWonTeams;
        // //For deleting draw results
        // delete objMatchWonTeams[""];
        // let arrTeam=Object.keys(objMatchWonTeams);
        // let arrRecords=Object.values(objMatchWonTeams);
        
        // let year = new Set();
        // arrRecords.forEach((curVal)=>{  
        //   Object.keys(curVal).map((values)=>year.add(values));
        // });

        // let records=[];
        // for(let value of year){
        //   let record = {};
        //   record.name=value;
        //   record.data=arrRecords.reduce((accumulator,curVal)=>{
        //     if(curVal[value])
        //       accumulator.push(curVal[value]);
        //     else
        //     accumulator.push(0);
        //     return accumulator;
        //   },[]);
        //   records.push(record);
        // }
  
        highChartStackBar(result.arrTeam,result.records,result.msg);
      }else if(result.msg=="Extra runs conceded per team on 2016"){
        highChart(result.teamNames,result.extraRuns,result.msg,'Extra Runs');
      }else if(result.msg=="Top economical bowlers on 2015"){
        highChart(result.bowlerNames,result.economy,result.msg,'Economy');
      }
    }
  });
}
 //Function for basic graph
 function highChart(xAxisArr,yAxisArray,subTitle,yTitle){
  var chart = Highcharts.chart('container', {
    title: {
      text: 'IPL Match'
    },
    subtitle: {
      text: subTitle
    },
    xAxis: {
      categories: xAxisArr
    },
    yAxis: {
      title:{
        text:yTitle,
        align:'middle'
      }
    },
    series: [{
      type: 'column',
      colorByPoint: true,
      data: yAxisArray,
      showInLegend: false
    }]   
  });
}

//Function for stacked bar chart template of Highchart
function highChartStackBar(team,records,yTitle){
  Highcharts.chart('container', {
    chart: {
      type: 'bar'
  },
  title: {
      text: 'IPL Match'
  },
  xAxis: {
      categories: team
  },
  yAxis: {
      min: 0,
      title: {
          text: yTitle
      }
  },
  legend: {
      reversed: true
  },
  plotOptions: {
      series: {
          stacking: 'normal'
      }
  },
    series: records
  });
}

//Function for round percentage chart template of Highchart
function highChartRoundPercentage(arrCategories,arrPercentage){
  Highcharts.chart('story-chart', {

    title: {
        text: 'Percentage of number of matches in season with respect to All IPL seasons'
    },

    xAxis: {
        categories: arrCategories
    },

    series: [{
        type: 'pie',
        allowPointSelect: true,
        keys: ['name', 'y', 'selected', 'sliced'],
        data: arrPercentage,
        showInLegend: true
    }]
  });
}