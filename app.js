/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */

var UI = require('ui');
var ajax = require('ajax');
var Settings = require('settings');

// Globals
var JSONDATA = "N/A";

var main = new UI.Menu({
    sections: [{
      items: [{
        title: 'Parks',
        subtitle: 'Loading...'
      }]
    }]
  });
main.show();

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
});

var details = new UI.Card({
  title: 'Not loaded',
  body: 'Contact Dev',
  scrollable: true
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
  details.body(e.item.subtitle);
  details.show();
});

IOAMenu.on('select', function(e) {
  details.title(e.item.title);
  details.body(e.item.subtitle);
  details.show();
});

var ajaxCall = function() {
  if (!localStorage.getItem("settings"))
  {
    var mainMenu = [{
      title: 'Refresh Times'
    }];
    main.items(0, mainMenu);
    details.title("Error");
    details.body("Please configure settings from phone first.");
    details.show();
  }
  else if (!JSON.parse(localStorage.getItem("settings")).fileurl)
  {
    var mainMenu = [{
      title: 'Refresh Times'
    }];
    main.items(0, mainMenu);
    details.title("Error");
    details.body("Please configure settings from phone.");
    details.show();
  }
  else {
    ajax({ url: JSON.parse(localStorage.getItem("settings")).fileurl, type: 'json' },
           function success(data, status) {
             //console.log('Success: ' + status);
             JSONDATA = data;
             populateTimes();
           },
           function failure(error, status) {
             var mainMenu = [{
                title: 'Refresh Times'
              }];
              main.items(0, mainMenu);
             console.log('Error: ' + status + ' ' + error);
             details.title("Error");
             details.body("Can't be reached: " + status + " " + error);
             details.show();
           });
    }
};


var populateTimes = function() {
  var parkTimes = [{
        title: 'Universal Studios',
        subtitle: JSONDATA.USO
      }, {
        title: 'Islands of Adventure',
        subtitle: JSONDATA.IOA
      }, {
        title: 'Refresh Times'
      }];
  main.items(0, parkTimes);
  delete JSONDATA.USO;
  delete JSONDATA.IOA;
  
  var USOwaitTimes = [];
  var IOAwaitTimes = [];
  
  for (var ride in JSONDATA)
  {
    var indRide = {};
    indRide.title = ride.replace('The ',"").replace(' the',"").replace('the ',"");
    var waitTime;
          
    if (JSONDATA[ride].WaitTime == -1) {
      waitTime = "Closed: Hours";
    } else if (JSONDATA[ride].WaitTime == -2) {
      waitTime = "Closed: Temporary";
    } else if (JSONDATA[ride].WaitTime == -3) {
      waitTime = "Closed: Long term";
    } else if (JSONDATA[ride].WaitTime == -4) {
      waitTime = "Closed: Weather";
    } else if (JSONDATA[ride].WaitTime == -5) {
      waitTime = "Closed: At capacity";
    } else if (JSONDATA[ride].WaitTime == -50) {
      waitTime = "Not available";
    } else { waitTime = JSONDATA[ride].WaitTime + " minute(s)"; }
    indRide.subtitle = waitTime;
    
    if (JSONDATA[ride].VenueId == 10010) {
      USOwaitTimes.push(indRide);
    } else if (JSONDATA[ride].VenueId == 10000) {
      IOAwaitTimes.push(indRide);
    }
  }
  
  // Display them on the watch
  USOMenu.items(0, USOwaitTimes);
  IOAMenu.items(0, IOAwaitTimes);

};

Pebble.addEventListener("showConfiguration",
	function() {
    var config = "https://theconsciousness.github.io/UniversalWaitTimes/index.html";
		var settings = encodeURIComponent(localStorage.getItem("settings"));
		console.log("Opening Config: " + config + "?settings=" + settings);
		Pebble.openURL(config + "?settings=" + settings);
	}
);


// close configuration screen
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

ajaxCall();
