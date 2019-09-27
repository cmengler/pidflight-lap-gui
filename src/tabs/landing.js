'use strict';

TABS.landing = {};
TABS.landing.initialize = function (callback) {
    var self = this;

    if (GUI.active_tab != 'landing') {
        GUI.active_tab = 'landing';
    }

    $('#content').load("./tabs/landing.html", function () {
        // translate to user-selected language
        localize();

        GUI.content_ready(callback);

        // load changelog content
        $('#changelog .log').load('./changelog.html');

        /** changelog trigger **/
        $("#changelog_toggle").on('click', function() {
            var state = $(this).data('state2');
            if (state) {
                $("#changelog").animate({right: -245}, 200, function () {
                    $("#content").removeClass('log_open');
                });
                state = false;
            } else {
                $("#changelog").animate({right: 0}, 200);
                $("#content").addClass('log_open');
                state = true;
            }
            $(this).text(state ? 'Close' : 'Changelog');
            $(this).data('state2', state);
        });
        /** credits trigger **/
        $("#credits_toggle").on('click', function() {
            var state_credits = $(this).data('state2_credits');
            if (state_credits) {
                $("#morecredits").hide();
                state_credits = false;
            } else {
                $("#morecredits").show();
                state_credits = true;
            }
            $(this).text(state_credits ? 'Show less' : 'Show more');
            $(this).data('state2_credits', state_credits);
        });
    });

};

TABS.landing.cleanup = function (callback) {
    if (callback) callback();
};
