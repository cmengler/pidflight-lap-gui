'use strict';

TABS.rssi = {};

TABS.rssi.initialize = function (callback) {
    var self = this;

    if (GUI.active_tab != 'rssi') {
        GUI.active_tab = 'rssi';
    }

    var rssiGraph;
    var rssiGraphMaximumPoints = 100;

    var colours = [
        '#2196F3',
        '#8BC34A',
        '#F44336',
        '#9C27B0',
        '#FFC107',
        '#FF5722',
        '#CDDC39',
        '#E91E63'
    ];

    load_html();

    function updateGraph() {
        var points = rssiGraph.config.data.labels.push('RSSI');
        if (points > rssiGraphMaximumPoints) {
            rssiGraph.config.data.labels.shift();
        }

        // interate over each device to generate race statistics based on laps
        for (var device_id in DEVICES) {
            // ignore disabled devices
            if (!DeviceManager.isActive(device_id)) continue;

            var dataSet = getDataSet(device_id);

            var points = dataSet.data.push(DEVICES[device_id].rssi_filter);
            if (points > rssiGraphMaximumPoints) {
                dataSet.data.shift();
            }
        }

        rssiGraph.update();
    }

    function getDataSet(deviceID) {
        // no datasets exist, create the first one
        if (rssiGraph.config.data.datasets.length == 0) {
            return createDataSet(deviceID);
        }

        // find dataset for this device ID
        for (var i = 0; i < rssiGraph.config.data.datasets.length; i++) {
            if (rssiGraph.config.data.datasets[i].device_id == deviceID) {
                return rssiGraph.config.data.datasets[i];
            }
        }

        // not found, create dataset
        return createDataSet(deviceID);
    }

    function createDataSet(deviceID) {
        // get the next dataset index
        var i = rssiGraph.config.data.datasets.length;

        // create the dataset
        rssiGraph.config.data.datasets[i] = {
            label: "Device " + deviceID,
            device_id: deviceID,
            backgroundColor: colours[i],
            borderColor: colours[i],
            borderWidth: 1,
            pointRadius: 0,
            data: [],
            fill: false
        };

        // fill the data points for existing entries
        for (var j = 1; j < rssiGraph.config.data.labels.length; j++) {
            rssiGraph.config.data.datasets[(j - 1)].data.push(0);
        }
        return rssiGraph.config.data.datasets[i];
    }

	function load_html() {
        $('#content').load("./tabs/rssi.html", process_html);
    }

    function process_html() {
        // translate to user-selected language
        localize();

        EventBus.on("MSP_RSSI", function(event, deviceId) {
            updateGraph();
        });

        var ctx = $('#rssi');
        ctx.attr('height', 300);

        rssiGraph = new Chart(ctx, {
            type: 'line',
            options: {
                animation: false,
                responsive: true,
                maintainAspectRatio: false,
                legend: {
                    position: 'bottom',
                },
                scales: {
                    xAxes: [{
                        display: false,
                        scaleLabel: {
                            display: false
                        }
                    }],
                    yAxes: [{
                        display: true,
                        scaleLabel: {
                            display: false
                        },
                        ticks: {
                            beginAtZero: true//,
                            //stepSize: 20
                        }
                    }]
                }
            }
        });

        // poll rssi every 250ms
        GUI.interval_add('rssi_pull', function rssi_data_pull() {
            MSP.send_message(MSP.WILDCARD_DEVICE_ID, MSP_codes.MSP_RSSI);
        }, 250, true);

        GUI.content_ready(callback);
    }
};

TABS.rssi.cleanup = function (callback) {
    if (callback) callback();

    EventBus.off("MSP_RSSI");
};