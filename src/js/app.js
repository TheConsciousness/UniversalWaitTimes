/**
To-do list:
 1. If on startup, watchedRides wakes exist but no wakeups are set, set a wakeup.
 2. Do not let users 'watch' rides that wait times are non-numerical / closed.
 3. Sometimes in slow network environments, ride checking occurs before ajaxCall has brought in new data. Make ajaxCall block and call ride checking on success.
 4. Remove scheduleEvent from checkRides, call them separately as failing javascript can stop events from being scheduled.
 9999. Implement UUID to localStorage and error log sending
 */

var UI = require('ui');
var ajax = require('ajax');
var Wakeup = require('wakeup');
var Vibe = require('ui/vibe');

// Globals
var timerTimeout;
var timeSet;
var wakeupVar;

var log = function(message) {
  var theTime = new Date(Date.now());
  var formatted = (theTime.getMonth()+1) + '/' + theTime.getDate() + '/' +  theTime.getFullYear() + " " + theTime.getHours() + ":" + theTime.getMinutes() + ":" + theTime.getSeconds();
  console.log(formatted + ": " + message);
};

var main = new UI.Menu({
    sections: [{
      items: [{
        title: 'Parks',
        subtitle: 'Loading...'
      }]
    }]
  });

var clearWakes = function() {
  log("Clearing Wakes");

  Wakeup.each(function(e) {
    Wakeup.cancel(e);
    Wakeup.cancel(e.id);
    log(e.id + " canceled");
  });
  Wakeup.cancel('all'); 
  
};

var checkWatchedRides = function() {
  // Check rides for better times
  // Clearing the interval
  
  log("Checking Rides at " + new Date(Date.now()));
  Vibe.vibrate('short');
  //log("Clearing interval: " + timerInterval);
  //clearInterval(timerInterval);
  //log("Interval: " + timerInterval + " cleared");
    
  if (localStorage.getItem("watchedRides") !== null)
    {
      var watchedRides = JSON.parse(localStorage.getItem("watchedRides"));
      var rideData = JSON.parse(localStorage.getItem("rideData"));
      
      // Variables for holding "Kong: 20 < 30; etc"
      var lessTitle = "";
      
      console.log("rideData length: " + Object.keys(rideData).length);
      
      for (var ride in watchedRides.rides)
        {
          //log("JSON: " + JSON.stringify(watchedRides));
          log("Now: " + JSON.stringify(rideData[ride].RideName) + " - " + JSON.stringify(rideData[ride].WaitTime));
          log("Then: " + JSON.stringify(ride) + " - " + watchedRides.rides[ride]);
          
          // If current time time is less than saved time
          // Not likely to see this, so test with ==
          if (JSON.stringify(rideData[ride].WaitTime) < watchedRides.rides[ride])
            {
              //log(JSON.stringify(rideData[ride]) + ": " + JSON.stringify(rideData[ride].WaitTime) + " < " + JSON.stringify(watchedRides.rides[ride]));
              
              var shortened = JSON.stringify(rideData[ride].RideName).split(" ")[0] + " " + JSON.stringify(rideData[ride].RideName).split(" ")[1];
              lessTitle += "[" + shortened + ": " + JSON.stringify(rideData[ride].WaitTime) + " < " + watchedRides.rides[ride] + "] ";
              
              //details.title(JSON.stringify(ride));
              //details.subtitle("Now: " + JSON.stringify(rideData[ride].WaitTime));
              //details.body("Was: " + watchedRides.rides[ride]);
              //details.show();
            }
        }
      lessTitle = lessTitle.replace(/"/g, "");
      log(lessTitle);
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
        log("checkWatchedRides: Clearing wakeups and watchedRides");
        clearTimeout(timerTimeout);
        timerTimeout = null;
        log("Timeout: " + timerTimeout + " cleared");
        
        clearWakes();
        localStorage.setItem("watchedRides", null);
        populateTimes();
      }
    }
};

var scheduleEvent = function() {
  var watchedRides = JSON.parse(localStorage.getItem("watchedRides"));

  if (watchedRides !== null)
    {
      if (watchedRides.wakes > 0)
      {
        log("Trying to schedule...");
        
        // 15 minutes from now
        var wakeTime = Date.now() / 1000 + 900;
        
        wakeupVar = Wakeup.schedule(
          {
            time: wakeTime,
            data: { wakeTime: wakeTime },
            notifyIfMissed: true
          },
          function(e) {
            if (e.failed) {
              // Log the error reason
              log('Wakeup set failed: ' + e.error);
            } else {
              
              timerTimeout = null;
              clearTimeout(timerTimeout);
              
              timerTimeout = setTimeout(function() {
                checkWatchedRides();
                
                //details.title("Took:");
                //details.subtitle(((Date.now() - timeSet) / 1000) / 60);
                //details.body("minutes");
                //details.show();
              }, 900000);
              
              log(watchedRides.wakes + " wakes left");
              log('Wakeup set! Event ID: ' + e.id);
              
              log("scheduleEvent timerTimeout: " + timerTimeout);
              log('Timeout scheduled at: ' + wakeTime);
              timeSet = Date.now();
              
              watchedRides.wakes -= 1;
              localStorage.setItem("watchedRides", JSON.stringify(watchedRides));
            }
          }
        );      
      }
      else if (watchedRides.wakes <= 0)
      {
        log("scheduleEvent: Clearing wakeups and watchedRides");
        clearTimeout(timerTimeout);
        timerTimeout = null;
        log("Timeout: " + timerTimeout + " cleared");

        clearWakes();
        localStorage.setItem("watchedRides", null);
        populateTimes();
      }
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
      log("Clearing Watched Rides and Wakes");
      localStorage.removeItem("watchedRides");
      
      clearWakes();
      populateTimes();
    }
  else if (e.item.title == "Clear parks")
    { 
      log("Clearing Parks and LastUpdate");
      localStorage.removeItem("rideData");
      localStorage.removeItem("lastUpdate");
    }
  else if (e.item.title == "Clear wakes")
    { 
      log("Clearing Wakes");
      clearWakes();      
      clearTimeout(timerTimeout);
      timerTimeout = null;
    }
  else if (e.item.title == "Clear storage")
    {
      log("Clearing Storage");
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
        watchedRides.wakes = 8;
        messages.title(details.title());
        messages.subtitle("Added to watchlist");
        messages.body("");
        messages.show();
      }
      
    }
  else
  {
    watchedRides.wakes = 8;
    watchedRides.ride[details.body()] = details.subtitle().split(" ")[0];
    
    messages.title(details.title());
    messages.subtitle("Added to watchlist");
    messages.body("");
    messages.show();
  }
  
  if (Object.keys(watchedRides.rides).length < 1)
    { watchedRides.wakes = 0; clearWakes(); }
  
  log("saving: " + JSON.stringify(watchedRides));
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
  else if (e.item.title == "Volcano Bay")
    { VBMenu.show(); }
  else if (e.item.title == "Refresh Times")
    { 
      var parkTimes = [{
        title: 'Universal Studios',
        subtitle: 'Loading...'
      }, {
        title: 'Islands of Adventure',
        subtitle: 'Loading...'
      }, {
        title: 'Volcano Bay',
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

var VBMenu = new UI.Menu({
    sections: [{
      items: [{
        title: 'VB Rides',
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

VBMenu.on('select', function(e) {
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
             //log('Success: ' + status);             
             // Make ride data persistant
             localStorage.setItem("rideData", JSON.stringify(data));
             populateTimes();
           },
           function failure(error, status) {
             var mainMenu = [{
                title: 'Refresh Times'
              }];
             main.items(0, mainMenu);
             log('Error: ' + status + ' ' + error);
             
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
        title: 'Volcano Bay',
        subtitle: rideData.VB
      }, {
        title: 'Refresh Times'
      }, {
        title: 'Watched Rides'
      }, {
        title: 'Settings'
      }];
  log(parkTimes);
  main.items(0, parkTimes);
  
  delete rideData.USO;
  delete rideData.IOA;
  delete rideData.VB;
  
  var USOwaitTimes = [];
  var IOAwaitTimes = [];
  var VBwaitTimes  = [];
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
    
    //log(indRide.subtitle);
    //log(indRide.id);
    //log(indRide.title);
    
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
    } else if (JSON.stringify(rideData[ride].VenueId) == 13801) {
      VBwaitTimes.push(indRide);
    }
    
  }
  
  // Display them on the watch
  USOMenu.items(0, USOwaitTimes);
  IOAMenu.items(0, IOAwaitTimes);
  VBMenu.items(0, VBwaitTimes);
  watchedMenu.items(0, watchedRidesList);
};

Pebble.addEventListener("showConfiguration",
	function() {
    var config = "https://theconsciousness.github.io/UniversalWaitTimes/index.html";
		var settings = encodeURIComponent(localStorage.getItem("settings"));
		log("Opening Config: " + config + "?settings=" + settings);
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
      log("stringify: " + JSON.stringify(localStorage.getItem("settings")));
      log("parse: " + JSON.parse(localStorage.getItem("settings")).fileurl);
			//log(JSON.stringify(settings));
		} catch(err) {
			settings = false;
			log("No JSON response or received Cancel event");
		}
	}
);

function typeOf (obj) {
  return {}.toString.call(obj).split(' ')[1].slice(0, -1).toLowerCase();
}

Wakeup.launch(function(e) {
    
  //log(localStorage.getItem("lastUpdate") + " " + typeOf(localStorage.getItem("lastUpdate")));
  //log(localStorage.getItem("watchedRides") + " " + typeOf(localStorage.getItem("watchedRides")));
  //log(localStorage.getItem("rideData") + " " + typeOf(localStorage.getItem("rideData")));
  
  // if (localStorage.getItem("lastUpdate") === null) also doesnt work
  if (localStorage.getItem("lastUpdate") == "null")
    {
      log("Setting lastUpdate for first time");
      localStorage.setItem("lastUpdate", 0);
    }
  
  // If 10 minutes has passed since last update or no ride data was set (first launches)
  if ((Date.now() - Number(localStorage.getItem("lastUpdate"))) > 600000 || localStorage.getItem("rideData") === null)
    {
      // Get the ride data and set the last update time
      log("10 minutes have passed");
      ajaxCall();
      localStorage.setItem("lastUpdate", Date.now());
    }
  else { populateTimes(); }
  
  // If watch wakes up to a WakeUp
  if (e.wakeup) {
    log('Woke up to ' + e.id + '! data: ' + JSON.stringify(e.data));
      
    // Check the watched rides for better wait times
    checkWatchedRides();
  } else {
    // If watch app was ran by user, not by WakeUp
    log('Regular launch not by a wakeup event.');
    
    // For each of the WakeUps scheduled...
    Wakeup.each(function(e) {
      //log('Wakeup ' + e.id + ': ' + JSON.stringify(e));
      
      
      // Get the time til next Wakeup
      var timeToGo = (e.data.wakeTime - (Date.now() / 1000)) * 1000;
      log((timeToGo / 1000) / 60 + " mins to go til " + e.id);
      // Solves the issue of waking up to a missed Wakeup
      if (timeToGo > 1)
        {
          // Set the timer if the screen is on
          timerTimeout = setTimeout(function() {
            log('Screen on during timer, checking wait times');
            checkWatchedRides();
          }, timeToGo);
          log(timerTimeout + " screen on; setting timer.");
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