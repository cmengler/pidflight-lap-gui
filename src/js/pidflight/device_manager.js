'use strict';

var DeviceManager = {
    isActive: function(deviceId) {
        return (DEVICES[deviceId].state !== undefined && DEVICES[deviceId].state != 3);
    },
    isIdle: function(deviceId) {
        return (DEVICES[deviceId].state !== undefined && DEVICES[deviceId].state == 0);
    },
    isTiming: function(deviceId) {
        return (DEVICES[deviceId].state !== undefined && DEVICES[deviceId].state == 1);
    },
	isCalibrating: function(deviceId) {
        return (DEVICES[deviceId].state !== undefined && DEVICES[deviceId].state == 2);
    },
    isTimerWaiting: function (deviceId) {
        return (DEVICES[deviceId].timer_state !== undefined && DEVICES[deviceId].timer_state == 0);
    },
    isTimerStart: function (deviceId) {
        return (DEVICES[deviceId].timer_state !== undefined && DEVICES[deviceId].timer_state == 1);
    },
    isTimerStop: function (deviceId) {
        return (DEVICES[deviceId].timer_state !== undefined && DEVICES[deviceId].timer_state == 2);
    }
};