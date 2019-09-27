'use strict';

var LapManager = {};

LapManager.initialize = function () {
    var self = this;

    // remove any exising event listener for new laps
    EventBus.off("NEW_LAP");

    // add listener for new laps
    EventBus.on("NEW_LAP", function(event, deviceId, lap) {
        // play beep
        self.beep();

        // construct lap time to be spoken
        var over = DEVICES[deviceId].laps[lap];
        var m = parseInt(over/60000);
        over = over % 60000;
        var s = parseInt(over/1000);
        var ms = over % 1000;

        var speak = DEVICES[deviceId].pilot_name + ', Lap ' + lap + ', ';
        if (m) speak += m + ' minute' + (m > 1 ? 's' : '');
        if (s) speak += s + '.' + ms + ' seconds';

        chrome.tts.speak(speak, {enqueue: true, gender: 'female', lang: 'en-US', rate: 1.0, pitch: 1.0});
    });

    // start listening, check after 250ms
    this.check();
};

LapManager.check = function () {
    var self = this;

	// request current lap from devices
    MSP.send_message(MSP.WILDCARD_DEVICE_ID, MSP_codes.MSP_CURRENT_LAP);

    GUI.timeout_add('lap_manager_refresh', function () {
        self.check();
    }, 250);
};

LapManager.formatTime = function(lap_time) {
    var h, m, s, ms, over;

    h = parseInt(lap_time/3600000);
    over = lap_time % 3600000;
    m = parseInt(over/60000);
    over = over % 60000;
    s = parseInt(over/1000);
    ms = over % 1000;

    return "{0}:{1}:{2}.{3}".format(h.padLeft(2), m.padLeft(2), s.padLeft(2), ms.padLeft(3));
};

LapManager.beep = function() {
    var beep = new Audio();
    beep.src = "sounds/beep.mp3";
    beep.play();
};