'use strict';

var CONFIGURATOR = {
    'releaseDate': 1523690289746, // new Date().getTime() - Sat Apr 14 2018
    'apiVersionAccepted': '2.0.0',
    'connectionValid': false
};

var LOOKUPS = {
    deviceState: ['Idle', 'Timing', 'Calibrating', 'Inactive'],
    timerState: ['Waiting', 'Start', 'Stop']
};

var DEVICES = {};