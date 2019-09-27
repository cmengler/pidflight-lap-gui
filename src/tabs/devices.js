'use strict';

TABS.devices = {};

TABS.devices.initialize = function (callback) {
    var self = this;

    if (GUI.active_tab != 'devices') {
        GUI.active_tab = 'devices';
    }

    load_html();

    // create new device
    function createDevice(deviceId) {
        var deviceTemplate = $('#tab-devices-templates .device');
        var newDevice = deviceTemplate.clone();

        $(newDevice).attr('id', 'device-' + deviceId);
        $(newDevice).data('id', deviceId);

        $(newDevice).find('.name').text('Device ' + deviceId);

        var newDeviceToggle = $(newDevice).find('input[name="device_enabled"]');

        $(newDeviceToggle).change(function() {
            if (this.checked) {
                MSP.send_message(deviceId, MSP_codes.MSP_ACTIVATE);
            } else {
                MSP.send_message(deviceId, MSP_codes.MSP_DEACTIVATE);
            }
        });

        // initialise device toggle
        $(newDeviceToggle).prop('checked', DeviceManager.isActive(deviceId));

        // get the pilot name stored by the app
        chrome.storage.local.get('device_settings_' + deviceId, function (result) {
            if (result['device_settings_' + deviceId]) {
                // set the pilot name
                if (result['device_settings_' + deviceId].pilot_name !== undefined) {
                    DEVICES[deviceId].pilot_name = result['device_settings_' + deviceId].pilot_name;
                    $(newDevice).find('input[name="pilot_name"]').val(DEVICES[deviceId].pilot_name);
                }
            }
        });

        return newDevice;
    }

    // update device status
    function updateDeviceStatus(deviceId) {
        var deviceElement = $('#device-' + deviceId);
        deviceElement.find('.status-device').text('DEVICE: ' + LOOKUPS.deviceState[DEVICES[deviceId].state] + (DeviceManager.isTiming(deviceId) ? ' (' + LOOKUPS.timerState[DEVICES[deviceId].timer_state] + ')' : ''));
        deviceElement.find('.status-rssi').text('RSSI: ' + DEVICES[deviceId].rssi_filter);

        if (DEVICES[deviceId].rssi_filter !== undefined && DEVICES[deviceId].rssi_min !== undefined && DEVICES[deviceId].rssi_max !== undefined) {
            // update RSSI meter
            var deviceRssiMeter = deviceElement.find('.meter-bar');
            deviceRssiMeter.find('.fill').css('width', DEVICES[deviceId].rssi_filter.map(DEVICES[deviceId].rssi_min, DEVICES[deviceId].rssi_max, 0, 100) + '%');

            // update RSSI min/max
            deviceElement.find('.meter-min').text(DEVICES[deviceId].rssi_min);
            deviceElement.find('.meter-max').text(DEVICES[deviceId].rssi_max);
        }
    }

    // register events
    EventBus.on("MSP_CHANNEL", function(event, deviceId) {
        $('#device-' + deviceId).find('select[name="lap_channel"]').val(DEVICES[deviceId].channel);
    });

    EventBus.on("MSP_RSSI_THRESHOLD", function(event, deviceId) {
        $('#device-' + deviceId).find('input[name="lap_rssi_threshold"]').val(DEVICES[deviceId].rssi_threshold);
    });

    EventBus.on("MSP_STATUS", function(event, deviceId) {
        updateDeviceStatus(deviceId);
    });

    EventBus.on("MSP_RSSI", function(event, deviceId) {
        updateDeviceStatus(deviceId);
    });

	function load_html() {
        $('#content').load("./tabs/devices.html", process_html);
    }

    function process_html() {
        // translate to user-selected language
        localize();

        // display devices
        var deviceElement = $('.tab-devices .devices');
        for (var deviceId in DEVICES) {
            var newDevice = createDevice(deviceId);
            deviceElement.append(newDevice);
        }

        // get the global device settings stored by the app
        chrome.storage.local.get('device_settings_0', function (result) {
            if (result.device_settings_0) {
                // set the minimum lap time and maximum laps
                $('input[name="lap_minimum_lap_time"]').val(result.device_settings_0.lap_minimum_lap_time);
                $('input[name="lap_maximum_lap"]').val(result.device_settings_0.lap_maximum_lap);
            }
        });

        // request device channels and RSSI threshold values
        MSP.send_message(MSP.WILDCARD_DEVICE_ID, MSP_codes.MSP_CHANNEL);
        MSP.send_message(MSP.WILDCARD_DEVICE_ID, MSP_codes.MSP_RSSI_THRESHOLD);

        $('a.deviceCalibrate').click(function () {
            var deviceElement = $(this).closest('.device');
            var deviceId = deviceElement.data('id');

            GUI.interval_pause_all();

            // calibrate device
            MSP.send_message(deviceId, MSP_codes.MSP_RSSI_CALIBRATE);
            GUI.log(chrome.i18n.getMessage('lapRssiCalibrationStarted', [deviceId]));

            GUI.timeout_add('device_' + deviceId + '_calibrate', function () {
                GUI.interval_resume_all();

                // request the calibrated RSSI threshold
                MSP.send_message(deviceId, MSP_codes.MSP_RSSI_THRESHOLD);
                GUI.log(chrome.i18n.getMessage('lapRssiCalibrationEnded', [deviceId]));
            }, 500);
        });

        $('a.deviceSet').click(function () {
            var deviceElement = $(this).closest('.device');
            var deviceId = deviceElement.data('id');

            // set device settings
            DEVICES[deviceId].channel = $(deviceElement).find('select[name="lap_channel"]').val();
            DEVICES[deviceId].rssi_threshold = $(deviceElement).find('input[name="lap_rssi_threshold"]').val();
            DEVICES[deviceId].pilot_name = $(deviceElement).find('input[name="pilot_name"]').val();

            // store the pilot name and enabled flag for this device
            var settings = {};
            settings['device_settings_' + deviceId] = {
           		pilot_name: DEVICES[deviceId].pilot_name
            };
            chrome.storage.local.set(settings);

            // set pilot name on Tiny View Plus
            TinyViewPlus.setCameraLabel(deviceId, DEVICES[deviceId].pilot_name);

            MSP.send_message(deviceId, MSP_codes.MSP_SET_CHANNEL, MSP.crunch(deviceId, MSP_codes.MSP_SET_CHANNEL));
            MSP.send_message(deviceId, MSP_codes.MSP_SET_RSSI_THRESHOLD, MSP.crunch(deviceId, MSP_codes.MSP_SET_RSSI_THRESHOLD));
        });

        $('a.save').click(function () {
            var minimum_lap_time = parseInt($('input[name="lap_minimum_lap_time"]').val());
            var maximum_lap = parseInt($('input[name="lap_maximum_lap"]').val());

            // store the global device settings
            chrome.storage.local.set({'device_settings_0': {
                lap_minimum_lap_time: minimum_lap_time,
                lap_maximum_lap: maximum_lap
            }});

            MSP.send_message(MSP.WILDCARD_DEVICE_ID, MSP_codes.MSP_SET_LAP_MIN_TIME, MSP.crunchData(MSP_codes.MSP_SET_LAP_MIN_TIME, {minimum_lap_time: minimum_lap_time}));
            MSP.send_message(MSP.WILDCARD_DEVICE_ID, MSP_codes.MSP_SET_LAP_MAX, MSP.crunchData(MSP_codes.MSP_SET_LAP_MAX, {maximum_lap: maximum_lap}));
            MSP.send_message(MSP.WILDCARD_DEVICE_ID, MSP_codes.MSP_EEPROM_WRITE);
        });

        // poll device data every 250ms
        GUI.interval_add('device_status_pull', function rssi_data_pull() {
            // request device status
            MSP.send_message(MSP.WILDCARD_DEVICE_ID, MSP_codes.MSP_STATUS);
            // request device RSSI
            MSP.send_message(MSP.WILDCARD_DEVICE_ID, MSP_codes.MSP_RSSI);
        }, 250, true);

        GUI.content_ready(callback);
    }
};

TABS.devices.cleanup = function (callback) {

    if (callback) callback();

    // remove events listeners
    EventBus.off("MSP_CHANNEL");
    EventBus.off("MSP_RSSI_THRESHOLD");
    EventBus.off("MSP_STATUS");
    EventBus.off("MSP_RSSI");
};