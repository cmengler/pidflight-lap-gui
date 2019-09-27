'use strict';

var RaceCountdown = {
    countdown: false,
    countdownNextTick: 0,
    _speaking: false,
    _playing: false,
    _timer: new Timer({
        tick: 250,
        ontick: function() {
            RaceCountdown.run();
        }
    })
};

RaceCountdown.setConfig = function(config) {
    chrome.storage.local.set({
        settings_racecountdown: {
            countdown: config.countdown,
            announcement: config.announcement,
            sound: config.sound
        }
    });
};

RaceCountdown.getConfig = function() {
    var deferred = $.Deferred();

    chrome.storage.local.get('settings_racecountdown', function (result) {
        if (result.settings_racecountdown !== undefined) {
            return deferred.resolve({
                countdown: result.settings_racecountdown.countdown,
                announcement: result.settings_racecountdown.announcement,
                sound: result.settings_racecountdown.sound
            });
        }
    });

    return deferred.promise();
};

RaceCountdown.initialize = function() {
    var self = this;

    this.soundBeep = new Audio();
    this.soundBeep.src = "sounds/beep.mp3";
    $(this.soundBeep).on('ended', function() {
        self._playing = false;
    });

    this.soundTone = new Audio();
    this.soundTone.src = "sounds/race_start_tone.mp3";
    $(this.soundTone).on('ended', function() {
        self._playing = false;
    });

    EventBus.on("MSP_RESET", function(event, deviceId) {
        // check if race countdown is active, cancel countdown
        if (self.isCountingDown()) {
            self.cancel();
        }
    });

    EventBus.on("MSP_START", function(event, deviceId) {
        // check if race countdown is inactive, start countdown
        if (!self.isCountingDown()) {
            // set countdown as active
            self.setCountingDown(true);

            // get config and start countdown
            self.getConfig().then(function(config) {
                if (config.countdown !== undefined) {
                    var count = config.countdown;
                    var announce = config.announcement;
                    var sound = config.sound;

                    // random seconds
                    if (count == -1) {
                        var min = 3, max = 5;
                        count = Math.floor(Math.random() * (max - min + 1)) + min;
                    }

                    // start countdown
                    if (count > 0) {
                        self.start(count, announce, sound);
                    }
                }
            });
        }
    });
};

RaceCountdown.start = function(count, announce, type) {
    var self = this;

    this.count = count;

    // set sound type
    this.speech = (type == 'speech');
    this.tone = (type == 'tone');

    // reset TTS queue
    this.speakClear();

    if (announce !== undefined && announce.length > 0) {
        this.speak(announce);
    }

    this.initCountdownTick();

    // start timer for 60 seconds, this timer is set to tick every second
    this._timer.start(60);
}

RaceCountdown.run = function () {
    var self = this;
    if (this.countdown && this.hasCountdownTicked() && !this._speaking && !this._playing) {
        // otherwise start the countdown
        if (this.count == 0) {
            this.playTone();
            this.cancel();
        } else {
            if (this.speech) {
                this.speak(this.count.toString());
                this.countdownTick();
            } else if (this.tone) {
                this.playBeep();
                this.countdownTick();
            } else {
                this.countdownTick();
            }
        }
    }
};

RaceCountdown.initCountdownTick = function() {
    var self = this;
    this.countdownNextTick = new Date().getTime();
};

RaceCountdown.countdownTick = function() {
    var self = this;
    this.count--;
    this.countdownNextTick = new Date().getTime() + 1000;
};

RaceCountdown.hasCountdownTicked = function() {
    var self = this;
    var now = new Date().getTime();
    return (now >= this.countdownNextTick);
};

RaceCountdown.cancel = function() {
    var self = this;

    // stop the timer
    this._timer.stop();

    // set countdown as inactive
    this.setCountingDown(false);

    this.countdownNextTick = 0;
    this.count = 0;
    this.speech = false;
    this.tone = false;
};

RaceCountdown.setCountingDown = function(countdown) {
    var self = this;
    this.countdown = countdown;
};

RaceCountdown.isCountingDown = function() {
    var self = this;
    return this.countdown;
};

RaceCountdown.speak = function(speak) {
    var self = this;
    self._speaking = true;
    chrome.tts.speak(speak, {
        enqueue: true,
        gender: 'female',
        lang: 'en-US',
        rate: 1.0,
        pitch: 1.0,
        onEvent: function(event) {
            if (event.type == 'end') self._speaking = false;
            else self._speaking = true;
        }
    });
};

RaceCountdown.speakClear = function(speak) {
    var self = this;
    self._speaking = false;
    chrome.tts.stop();
};

RaceCountdown.playBeep = function() {
    var self = this;
    this._playing = true;
    this.soundBeep.play();
};

RaceCountdown.playTone = function() {
    var self = this;
    this._playing = true;
    this.soundTone.play();
};