'use strict';

var TinyViewPlus = {
    _ready: false
};

TinyViewPlus.setConfig = function(config) {
    chrome.storage.local.set({'settings': {
        tinyviewplus: {
            host: config.host,
            port: config.port
        }
    }});
};

TinyViewPlus.getConfig = function() {
    var deferred = $.Deferred();

    chrome.storage.local.get('settings', function (result) {
        if (result.settings !== undefined && result.settings.tinyviewplus !== undefined) {
            return deferred.resolve({
                host: result.settings.tinyviewplus.host,
                port: result.settings.tinyviewplus.port
            });
        }
    });

    return deferred.promise();
};

TinyViewPlus.initialize = function (ipAddress, port) {
    var self = this;

    // prevent initlisation if it already is initialised
    if (this._ready) {
        return;
    }

    this.oscAddr = ipAddress;
    this.oscPort = port;
    this.udpPort = new osc.UDPPort({
        remoteAddress: this.oscAddr,
        remotePort: this.oscPort
    });

    this.udpPort.on('error', function (error) {
        console.log('[ERROR] TinyViewPlus:', error);
    });

    this.udpPort.on('ready', function (msg) {
        self._ready = true;
        GUI.log(chrome.i18n.getMessage('tinyViewPlusReady', [self.oscAddr, self.oscPort]));
    });

    this.udpPort.on('close', function (msg) {
        self._ready = false;
        GUI.log(chrome.i18n.getMessage('tinyViewPlusClosed'));
    });

    this.udpPort.open();

    // add listener for new laps
    EventBus.on("NEW_LAP", function(event, deviceId, lap) {
        // construct lap time to be spoken
        var over = DEVICES[deviceId].laps[lap];
        var m = parseInt(over/60000);
        over = over % 60000;
        var s = parseInt(over/1000);
        var ms = over % 1000;

        var speak = '';
        if (m) speak += m;
        if (s) speak += s + '.' + ms;

        TinyViewPlus.setCameraLapTime(deviceId, speak);
    });
};

TinyViewPlus.reset = function () {
    var self = this;
    var deferred = $.Deferred();

    if (!this._ready) {
        return deferred.resolve();
    }

    this.udpPort.on('close', function () {
        return deferred.resolve();
    });

    this.udpPort.close();

    return deferred.promise();
};

TinyViewPlus.setCameraLabel = function (cameraId, label) {
    var self = this;

    if (this._ready) {
        this.udpPort.send({
            address: '/v1/camera/' + cameraId + '/label',
            args: [
                {
                    type: 's',
                    value: label
                }
            ]
        });
    }
};

TinyViewPlus.setCameraLapTime = function (cameraId, lapTime) {
    var self = this;

    if (this._ready) {
        this.udpPort.send({
            address: '/v1/camera/' + cameraId + '/laptime',
            args: [
                {
                    type: 'f',
                    value: lapTime
                }
            ]
        });
    }
};

TinyViewPlus.clearCameraLapTime = function (cameraId) {
    var self = this;
    this.setCameraLapTime(cameraId, 0);
};

TinyViewPlus.toggleCamera = function (cameraId, state) {
    if (this._ready) {
        this.udpPort.send({
            address: '/v1/camera/' + cameraId + '/display',
            args: [
                {
                    type: 's',
                    value: state
                }
            ]
        });
    }
};

TinyViewPlus.showCamera = function(cameraId) {
    var self = this;
    this.toggleCamera(cameraId, 'on');
};

TinyViewPlus.hideCamera = function(cameraId) {
    var self = this;
    this.toggleCamera(cameraId, 'off');
};
