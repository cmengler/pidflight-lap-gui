'use strict';

TABS.race = {};

TABS.race.initialize = function (callback) {
    var self = this;

    if (GUI.active_tab != 'race') {
        GUI.active_tab = 'race';
    }

    var maximum_lap = 0;

    function update_race_statistics() {
        var fastest_lap, fastest_lap_device_id;
        var RACE = [];

        // interate over each device to generate race statistics based on laps
        for (var device_id in DEVICES) {
            // ignore disabled devices
            if (!DeviceManager.isActive(device_id)) continue;

            var current_lap = 0;
            var best_lap = 0;
            var total_lap_time = 0;
            var total_laps = 0;

            for (var lap in DEVICES[device_id].laps) {
                // ignore zero lap
                if (lap == 0) continue;

                // sum the total lap time
                total_lap_time += DEVICES[device_id].laps[lap];

                // increment total lap counter
                total_laps++;

                // store current lap
                current_lap = lap;

                // determine if this is pilots best lap
                if (best_lap == 0 || DEVICES[device_id].laps[lap] < DEVICES[device_id].laps[best_lap]) {
                    best_lap = parseInt(lap);

                    // determine fastest lap
                    if (fastest_lap === undefined || DEVICES[device_id].laps[lap] < DEVICES[fastest_lap_device_id].laps[fastest_lap]) {
                        fastest_lap = best_lap;
                        fastest_lap_device_id = device_id;
                    }
                }
            }

            RACE.push({
                device_id: device_id,
                data: {
                    total_lap_time: total_lap_time,
                    total_laps: total_laps,
                    current_lap: current_lap,
                    best_lap: best_lap
                }
            });
        }

        // sort by total laps then by total lap time
        RACE.sort(function (a, b) {
            return b.data.total_laps - a.data.total_laps || a.data.total_lap_time - b.data.total_lap_time;
        });

        var positionsElement = $('.tab-race .positions .positions');
        var positionTemplate = $('#tab-race-templates .position .position');

        $(positionsElement).empty();
        for (var i = 0; i < RACE.length; i++) {
            var position = positionTemplate.clone();

            var positionNumber = i + 1;

            switch (positionNumber) {
                case 1:
                    $(position).find('.info').addClass('one');
                    break;
                case 2:
                    $(position).find('.info').addClass('two');
                    break;
                case 3:
                    $(position).find('.info').addClass('three');
                    break;
            }

            $(position).find('.name').text(DEVICES[RACE[i].device_id].pilot_name);
            $(position).find('.number').text(positionNumber);

            if (RACE[i].data.current_lap > 0) {
                $(position).find('.current-lap').text(LapManager.formatTime(DEVICES[RACE[i].device_id].laps[RACE[i].data.current_lap]) + ' seconds (Lap ' + RACE[i].data.current_lap + ')');
            }

            if (RACE[i].data.best_lap > 0) {
                if (RACE[i].device_id == fastest_lap_device_id) {
                    $(position).find('.best-lap').text(LapManager.formatTime(DEVICES[RACE[i].device_id].laps[RACE[i].data.best_lap]) + ' seconds (Fastest, Lap ' + RACE[i].data.best_lap + ')');
                } else {
                    $(position).find('.best-lap').text(LapManager.formatTime(DEVICES[RACE[i].device_id].laps[RACE[i].data.best_lap]) + ' seconds (Best, Lap ' + RACE[i].data.best_lap + ')');
                }
            }

            if (RACE[i].data.total_lap_time > 0) {
                $(position).find('.total-lap').text(LapManager.formatTime(RACE[i].data.total_lap_time) + ' seconds');
            }

            $(position).find('.lap-number').text((RACE[i].data.current_lap > 0 ? RACE[i].data.current_lap : '-'));
            $(position).find('.lap-total').text((maximum_lap > 0 ? '/' + maximum_lap : '/-'));

            // display device status
            var ledStatusClass = 'led-red';
            if (DeviceManager.isTiming(RACE[i].device_id)) {
                if (DeviceManager.isTimerWaiting(RACE[i].device_id)) ledStatusClass = 'led-yellow';
                else if (DeviceManager.isTimerStart(RACE[i].device_id)) ledStatusClass = 'led-green';
            }
            $(position).find('.led').addClass(ledStatusClass).prop('title', LOOKUPS.deviceState[DEVICES[RACE[i].device_id].state] + (DeviceManager.isTiming(RACE[i].device_id) ? ' (' + LOOKUPS.timerState[DEVICES[RACE[i].device_id].timer_state] + ')' : ''));

            $(positionsElement).append(position);
        }
    }

    load_html();

	function load_html() {
        $('#content').load("./tabs/race.html", process_html);
    }

    function process_html() {
        // translate to user-selected language
        localize();

        // get the global device settings stored by the app
        chrome.storage.local.get('device_settings_0', function (result) {
            if (result.device_settings_0) {
                maximum_lap = result.device_settings_0.lap_maximum_lap;
            }
        });

        $('a.reset').click(function () {
            MSP.send_message(MSP.WILDCARD_DEVICE_ID, MSP_codes.MSP_RESET, false, false, function () {
                for (var deviceId in DEVICES) {
                    DEVICES[deviceId].laps = [];
                    DEVICES[deviceId].laps_rssi = [];
                    DEVICES[deviceId].laps_rssi_filter = [];

                    // clear the lap time on Tiny View Plus
                    TinyViewPlus.clearCameraLapTime(deviceId);
                }
            });
        });

        $('a.start').click(function () {
            MSP.send_message(MSP.WILDCARD_DEVICE_ID, MSP_codes.MSP_START);
        });

        // update race statistics every 250ms
        GUI.interval_add('race_statistics', update_race_statistics, 250, true);

        // poll device status every 250ms
        GUI.interval_add('device_status_pull', function status_data_pull() {
            MSP.send_message(MSP.WILDCARD_DEVICE_ID, MSP_codes.MSP_STATUS);
        }, 250, true);

        GUI.content_ready(callback);
    }
};

TABS.race.cleanup = function (callback) {

    if (callback) callback();

};