/**
 * Welcome to Pebble.js!
 *
 * Todo:
 1. On selecting a ride to be watched, append it to the list retrieved from Wakeup, as to not make 2 wakeup process
    Also reset the wakeup process by killing it, and creating a new one for the next 2 hours
    
 2. The app won't 'wakeup' and check for wait time changes when the app is open,
    so when opening the app, get the e.data (time when wakeup should occur), and if
    that time is within 5 minutes, use setInterval to set an 'in-app' alarm.
    Only one will occur, setInterval or wakeup so it wont matter. The setInterval
    appears to be killed on exit.
    
 3. Change the '==' on the time comparer to <
 
 
 */

var UI = require('ui');
var ajax = require('ajax');
var Wakeup = require('wakeup');
var Vibe = require('ui/vibe');

// Globals
var timerTimeout;
var timeSet;
var wakeupVar;

var main = new UI.Menu({
    sections: [{
      items: [{
        title: 'Parks',
        subtitle: 'Loading...'
      }]
    }]
  });

var clearWakes = function() {
  console.log("Clearing Wakes");

  Wakeup.each(function(e) {
    Wakeup.cancel(e);
    Wakeup.cancel(e.id);
    console.log(e.id + " canceled");
  });
  Wakeup.cancel('all'); 
  
};

var checkWatchedRides = function() {
  // Check rides for better times
  // Clearing the interval
  
  console.log("Checking Rides at " + new Date(Date.now()));
  Vibe.vibrate('short');
  //console.log("Clearing interval: " + timerInterval);
  //clearInterval(timerInterval);
  //console.log("Interval: " + timerInterval + " cleared");
    
  if (localStorage.getItem("watchedRides") !== null)
    {
      var watchedRides = JSON.parse(localStorage.getItem("watchedRides"));
      var rideData = JSON.parse(localStorage.getItem("rideData"));
      
      // Variables for holding "Kong: 20 < 30; etc"
      var lessTitle = "";
      var lessSubtitle = "";
      
      for (var ride in watchedRides.rides)
        {
          //console.log("JSON: " + JSON.stringify(watchedRides));
          //console.log("Now: " + JSON.stringify(rideData[ride].RideName) + " - " + JSON.stringify(rideData[ride].WaitTime));
          //console.log("Then: " + JSON.stringify(ride) + " - " + watchedRides.rides[ride]);
          
          // If current time time is less than saved time
          // Not likely to see this, so test with ==
          if (JSON.stringify(rideData[ride].WaitTime) < watchedRides.rides[ride])
            {
              //console.log(JSON.stringify(rideData[ride]) + ": " + JSON.stringify(rideData[ride].WaitTime) + " < " + JSON.stringify(watchedRides.rides[ride]));
              
              var shortened = JSON.stringify(rideData[ride].RideName).split(" ")[0] + " " + JSON.stringify(rideData[ride].RideName).split(" ")[1];
              lessTitle += shortened + ": " + JSON.stringify(rideData[ride].WaitTime) + " < " + watchedRides.rides[ride] + "; ";
              
              //details.title(JSON.stringify(ride));
              //details.subtitle("Now: " + JSON.stringify(rideData[ride].WaitTime));
              //details.body("Was: " + watchedRides.rides[ride]);
              //details.show();
            }
        }
      lessTitle = lessTitle.replace(/"/g, "");
      console.log(lessTitle);
      if (lessTitle.length > 1)
      {
        details.title("");
        details.subtitle("");
        details.body(lessTitle);
        details.show();
      }
      
      if (watchedRides.wakes > 0)
        {
          scheduleEvent();
        }
      else {
        clearInterval(timerTimeout); 
        clearWakes();
      }
    }
};

var scheduleEvent = function() {
  var watchedRides = JSON.parse(localStorage.getItem("watchedRides"));
  
  if (watchedRides.wakes > 0)
    {
      console.log("Trying to schedule...");
      
      // 15 minutes from now
      var wakeTime = Date.now() / 1000 + 900;
      
      wakeupVar = Wakeup.schedule(
        {
          time: wakeTime,
          data: { wakeTime: wakeTime }
        },
        function(e) {
          if (e.failed) {
            // Log the error reason
            console.log('Wakeup set failed: ' + e.error);
          } else {
            
            timerTimeout = null;
            clearTimeout(timerTimeout);
            
            timerTimeout = setTimeout(function() {
              console.log('Secondary timeout triggered');
              checkWatchedRides();
              
              //details.title("Took:");
              //details.subtitle(((Date.now() - timeSet) / 1000) / 60);
              //details.body("minutes");
              //details.show();
            }, 900000);
            
            watchedRides.wakes -= 1;
            console.log(watchedRides.wakes + " wakes left");
            console.log('Wakeup set! Event ID: ' + e.id);
            localStorage.setItem("watchedRides", JSON.stringify(watchedRides));
            
            console.log("scheduleEvent timerTimeout: " + timerTimeout);
            console.log('Timeout scheduled at: ' + wakeTime);
            timeSet = Date.now();
          }
        }
      );      
    }
  else if (watchedRides.wakes <= 0)
    {
      console.log("scheduleEvent() clearing all wakeups and watchedRides");
      console.log("Timer: " + JSON.stringify(timerTimeout) + " will now be cleared");
      
      clearWakes();
      
      clearTimeout(timerTimeout);
      timerTimeout = null;
      console.log(timerTimeout + " cleared?");
      localStorage.setItem("watchedRides", null);
      populateTimes();
    }
};

var settings = new UI.Menu({
    sections: [{
      items: [{
        title: 'Clear watched'
      }, {
        title: 'Clear parks'
      }, {
        title: 'Clear wakes'
      }, {
        title: 'Clear storage'
      }]
    }]
  });

var watchedMenu = new UI.Menu({
    sections: [{
      items: [{
        title: 'No rides'
      }]
    }]
  });

watchedMenu.on('select', function(e) {
  details.title(e.item.title);
  details.subtitle(e.item.subtitle);
  details.body(e.item.id);
  details.show();
});

settings.on('select', function(e) {
  if (e.item.title == "Clear watched")
    { 
      console.log("Clearing Watched Rides and Wakes");
      localStorage.removeItem("watchedRides");
      
      clearWakes();
      populateTimes();
    }
  else if (e.item.title == "Clear parks")
    { 
      console.log("Clearing Parks and LastUpdate");
      localStorage.removeItem("rideData");
      localStorage.removeItem("lastUpdate");
    }
  else if (e.item.title == "Clear wakes")
    { 
      console.log("Clearing Wakes");
      clearWakes();      
      clearTimeout(timerTimeout);
      timerTimeout = null;
    }
  else if (e.item.title == "Clear storage")
    {
      console.log("Clearing Storage");
      localStorage.removeItem("rideData");
      localStorage.removeItem("lastUpdate");
      localStorage.removeItem("watchedRides");
      localStorage.clear();
    }
});

var details = new UI.Card({
  title: 'Not loaded',
  body: 'Contact Dev',
  scrollable: true
});

var messages = new UI.Card({
  title: '',
  subtitle: '',
  body: '',
  scrollable: true
});

details.on('click', 'select', function(e) {
  var watchedRides = {};
  watchedRides.rides = {};
  watchedRides.wakes = {};
  var previousRideCount = 0;
  var numOfPendingWakes = 0;
  
  Wakeup.each(function(e) {
    numOfPendingWakes += 1;
    //nextWake = (e.data.wakeTime - (Date.now() / 1000)) * 1000;
  });
  
  if (JSON.parse(localStorage.getItem("watchedRides")) !== null)
    { 
      watchedRides = JSON.parse(localStorage.getItem("watchedRides"));
      previousRideCount = Object.keys(watchedRides.rides).length;
    }
  
  if (watchedRides.rides !== null)
    {
      if (details.body() in watchedRides.rides)
      { 
        delete watchedRides.rides[details.body()];
        messages.title(details.title());
        messages.subtitle("Removed from watchlist");
        messages.body("");
        messages.show();
      }
    else
      {
        watchedRides.rides[details.body()] = details.subtitle().split(" ")[0];
        watchedRides.wakes = 6;
        messages.title(details.title());
        messages.subtitle("Added to watchlist");
        messages.body("");
        messages.show();
      }
      
    }
  else
  {
    watchedRides.wakes = 6;
    watchedRides.ride[details.body()] = details.subtitle().split(" ")[0];
    
    messages.title(details.title());
    messages.subtitle("Added to watchlist");
    messages.body("");
    messages.show();
  }
  
  if (Object.keys(watchedRides.rides).length < 1)
    { watchedRides.wakes = 0; }
  
  console.log("saving: " + JSON.stringify(watchedRides));
  localStorage.setItem("watchedRides", JSON.stringify(watchedRides));
  populateTimes();
  
  // Schedule event if number of watchedRides increased and if there arent any wakes already
  if (Object.keys(watchedRides.rides).length > previousRideCount && numOfPendingWakes < 1)
    {
      scheduleEvent();
    }
});

main.on('select', function(e) {
  if (e.item.title == "Universal Studios")
    { USOMenu.show(); }
  else if (e.item.title == "Islands of Adventure")
    { IOAMenu.show(); }
  else if (e.item.title == "Refresh Times")
    { 
      var parkTimes = [{
        title: 'Universal Studios',
        subtitle: 'Loading...'
      }, {
        title: 'Islands of Adventure',
        subtitle: 'Loading...'
      }, {
        title: 'Refresh Times'
      }];
      main.items(0, parkTimes);
      ajaxCall(); 
    }
  else if (e.item.title == "Watched Rides")
    {
      watchedMenu.show();
    }
  else if (e.item.title == "Settings")
    {
      settings.show();
    }
});

var IOAMenu = new UI.Menu({
    sections: [{
      items: [{
        title: 'IOA Rides',
        subtitle: 'Not loaded'
      }]
    }]
  });

var USOMenu = new UI.Menu({
    sections: [{
      items: [{
        title: 'USO Rides',
        subtitle: 'Not loaded'
      }]
    }]
  });

USOMenu.on('select', function(e) {
  details.title(e.item.title);
  details.subtitle(e.item.subtitle);
  details.body(e.item.id);
  details.show();
});

IOAMenu.on('select', function(e) {
  details.title(e.item.title);
  details.subtitle(e.item.subtitle);
  details.body(e.item.id);
  details.show();
});

var ajaxCall = function() {
  if (!localStorage.getItem("settings"))
  {
    var mainMenu = [{
      title: 'Refresh Times'
    }];
    main.items(0, mainMenu);
    messages.title("Error");
    messages.subtitle("");
    messages.body("Please configure settings from phone first.");
    messages.show();
  }
  else if (!JSON.parse(localStorage.getItem("settings")).fileurl)
  {
    var mainMenu = [{
      title: 'Refresh Times'
    }];
    main.items(0, mainMenu);
    messages.title("Error");
    messages.subtitle("");
    messages.body("Please configure settings from phone first.");
    messages.show();
  }
  else {
    ajax({ url: JSON.parse(localStorage.getItem("settings")).fileurl, type: 'json' },
           function success(data, status) {
             //console.log('Success: ' + status);             
             // Make ride data persistant
             localStorage.setItem("rideData", JSON.stringify(data));
             populateTimes();
           },
           function failure(error, status) {
             var mainMenu = [{
                title: 'Refresh Times'
              }];
             main.items(0, mainMenu);
             console.log('Error: ' + status + ' ' + error);
             
             messages.title("Error");
             messages.subtitle("");
             messages.body("Can't be reached: " + status + " " + error);
             messages.show();
           });
    }
};

var populateTimes = function() {
  var rideData = JSON.parse(localStorage.getItem("rideData"));
  var parkTimes = [{
        title: 'Universal Studios',
        subtitle: rideData.USO
      }, {
        title: 'Islands of Adventure',
        subtitle: rideData.IOA
      }, {
        title: 'Refresh Times'
      }, {
        title: 'Watched Rides'
      }, {
        title: 'Settings'
      }];
  main.items(0, parkTimes);
  
  delete rideData.USO;
  delete rideData.IOA;
  
  var USOwaitTimes = [];
  var IOAwaitTimes = [];
  var watchedRidesList = [];
  
  for (var ride in rideData)
  {
    var indRide = {};
    var waitTime;
         
    if (JSON.stringify(rideData[ride].WaitTime) == -1) {
      waitTime = "Closed: Hours";
    } else if (JSON.stringify(rideData[ride].WaitTime) == -2) {
      waitTime = "Closed: Temporary";
    } else if (JSON.stringify(rideData[ride].WaitTime) == -3) {
      waitTime = "Closed: Long term";
    } else if (JSON.stringify(rideData[ride].WaitTime) == -4) {
      waitTime = "Closed: Weather";
    } else if (JSON.stringify(rideData[ride].WaitTime) == -5) {
      waitTime = "Closed: At capacity";
    } else if (JSON.stringify(rideData[ride].WaitTime) == -50) {
      waitTime = "Not available";
    } else { waitTime = JSON.stringify(rideData[ride].WaitTime) + " minute(s)"; }
    indRide.subtitle = waitTime;
    
    // Custom variable
    // Before id:{name, waitTime, venueId}
    //indRide.id = JSON.stringify(rideData[ride].Id);
    //indRide.title = ride;
    
    indRide.id = ride;
    indRide.title = rideData[ride].RideName;
    
    //console.log(indRide.subtitle);
    //console.log(indRide.id);
    //console.log(indRide.title);
    
    if (JSON.parse(localStorage.getItem("watchedRides")) !== null)
    {
      //if (JSON.stringify(rideData[ride].Id) in JSON.parse(localStorage.getItem("watchedRides")).rides)

      // For each of the watched rides, put a > in front of their title and push them to the watched rides menu
      if (ride in JSON.parse(localStorage.getItem("watchedRides")).rides)
      {
        indRide.title = "►" + rideData[ride].RideName;
        watchedRidesList.push(indRide);
      }
    }
    
    // Separate USO and IOA rides based VenueId
    if (JSON.stringify(rideData[ride].VenueId) == 10010) {
      USOwaitTimes.push(indRide);
    } else if (JSON.stringify(rideData[ride].VenueId) == 10000) {
      IOAwaitTimes.push(indRide);
    }
  }
   
  
  // Display them on the watch
  USOMenu.items(0, USOwaitTimes);
  IOAMenu.items(0, IOAwaitTimes);
  watchedMenu.items(0, watchedRidesList);
};

/*
Settings.config(
  { url:'https://jordanbrinkman.com/universal/settings.htm' },
  function(e) {
    console.log('opened config');
  },
  function(e) {
    console.log('Recieved settings!');
    var options = e.options;
    var fileURL = options.fileurl;
    console.log(fileURL);
    localStorage.setItem('phpfile', fileURL);
  }
);
*/

Pebble.addEventListener("showConfiguration",
	function() {
    var config = "https://theconsciousness.github.io/UniversalWaitTimes/index.html";
		var settings = encodeURIComponent(localStorage.getItem("settings"));
		console.log("Opening Config: " + config + "?settings=" + settings);
		Pebble.openURL(config + "?settings=" + settings);
	}
);

Pebble.addEventListener("webviewclosed",
	function(e) {
		var settings;
		try {
			settings = JSON.parse(decodeURIComponent(e.response));
			localStorage.clear();
			localStorage.setItem("settings", JSON.stringify(settings));
      console.log("stringify: " + JSON.stringify(localStorage.getItem("settings")));
      console.log("parse: " + JSON.parse(localStorage.getItem("settings")).fileurl);
			//console.log(JSON.stringify(settings));
		} catch(err) {
			settings = false;
			console.log("No JSON response or received Cancel event");
		}
	}
);

function typeOf (obj) {
  return {}.toString.call(obj).split(' ')[1].slice(0, -1).toLowerCase();
}

Wakeup.launch(function(e) {
    
  //console.log(localStorage.getItem("lastUpdate") + " " + typeOf(localStorage.getItem("lastUpdate")));
  //console.log(localStorage.getItem("watchedRides") + " " + typeOf(localStorage.getItem("watchedRides")));
  //console.log(localStorage.getItem("rideData") + " " + typeOf(localStorage.getItem("rideData")));
  
  // if (localStorage.getItem("lastUpdate") === null) also doesnt work
  if (localStorage.getItem("lastUpdate") == "null")
    {
      console.log("Setting lastUpdate for first time");
      localStorage.setItem("lastUpdate", 0);
    }
  
  // If 10 minutes has passed since last update or no ride data was set (first launches)
  if ((Date.now() - Number(localStorage.getItem("lastUpdate"))) > 600000 || localStorage.getItem("rideData") === null)
    {
      // Get the ride data and set the last update time
      console.log("10 minutes have passed");
      ajaxCall();
      localStorage.setItem("lastUpdate", Date.now());
    }
  else { populateTimes(); }
  
  // If watch wakes up to a WakeUp
  if (e.wakeup) {
    console.log('Woke up to ' + e.id + '! data: ' + JSON.stringify(e.data));
      
    // Check the watched rides for better wait times
    checkWatchedRides();
  } else {
    // If watch app was ran by user, not by WakeUp
    console.log('Regular launch not by a wakeup event.');
    
    // For each of the WakeUps scheduled...
    Wakeup.each(function(e) {
      //console.log('Wakeup ' + e.id + ': ' + JSON.stringify(e));
      
      
      // Get the time til next Wakeup
      var timeToGo = (e.data.wakeTime - (Date.now() / 1000)) * 1000;
      console.log((timeToGo / 1000) / 60 + " mins to go til " + e.id);
      // Solves the issue of waking up to a missed Wakeup
      if (timeToGo > 1)
        {
          // Set the timer if the screen is on
          timerTimeout = setTimeout(function() {
            console.log('Screen on during timer, checking wait times');
            checkWatchedRides();
          }, timeToGo);
          console.log(timerTimeout + " screen on; setting timer.");
        }
      else
        {
          // Cancel all wakes, twice
          clearWakes();
          scheduleEvent();
        }
    });
  }
});


//Wakeup.cancel('all');
//Wakeup.cancel("all");
main.show();

