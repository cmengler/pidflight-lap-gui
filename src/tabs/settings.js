'use strict';

TABS.settings = {};

TABS.settings.initialize = function (callback) {
    var self = this;

    if (GUI.active_tab != 'settings') {
        GUI.active_tab = 'settings';
    }

    load_html();

	function load_html() {
        $('#content').load("./tabs/settings.html", process_html);
    }

    function process_html() {
        // translate to user-selected language
        localize();

        // set the Tiny View Plus UI fields
        TinyViewPlus.getConfig().then(function(config) {
            if (config.host !== undefined) {
                $('input[name="setting_tinyviewplus_host"]').val(config.host);
            }
            if (config.port !== undefined) {
                $('input[name="setting_tinyviewplus_port"]').val(config.port);
            }
        });

        // set the Race Countdown UI fields
        RaceCountdown.getConfig().then(function(config) {
            if (config.countdown !== undefined) {
                $('select[name="setting_race_countdown"]').val(config.countdown);
            }
            if (config.announcement !== undefined) {
                $('input[name="setting_race_countdown_announcement"]').val(config.announcement);
            }
            if (config.sound !== undefined) {
                $('select[name="setting_race_countdown_sound"]').val(config.sound);
            }
        });

        // save settings
        $('a.save').click(function () {
            // set Tiny View Plus configuration
            TinyViewPlus.setConfig({
                host: ($('input[name="setting_tinyviewplus_host"]').val().length != 0) ? $('input[name="setting_tinyviewplus_host"]').val() : undefined,
                port: (Number($('input[name="setting_tinyviewplus_port"]').val()) > 0) ? Number($('input[name="setting_tinyviewplus_port"]').val()) : undefined
            });

            // reinitialise Tiny View Plus with new settings
            TinyViewPlus.reset().then(function() {
                TinyViewPlus.getConfig().then(function(config) {
                    if (config.host !== undefined && config.port !== undefined) {
                        TinyViewPlus.initialize(config.host, config.port);
                    }
                });
            });

            // set Race Countdown configuration
            RaceCountdown.setConfig({
                countdown: $('select[name="setting_race_countdown"]').val(),
                announcement: ($('input[name="setting_race_countdown_announcement"]').val().length != 0) ? $('input[name="setting_race_countdown_announcement"]').val() : undefined,
                sound: $('select[name="setting_race_countdown_sound"]').val()
            });
        });

        GUI.content_ready(callback);
    }
};

TABS.settings.cleanup = function (callback) {
    if (callback) callback();
};