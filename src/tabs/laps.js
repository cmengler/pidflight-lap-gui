'use strict';

TABS.laps = {};

TABS.laps.initialize = function (callback) {
    var self = this;

    if (GUI.active_tab != 'laps') {
        GUI.active_tab = 'laps';
    }

    load_html();

    EventBus.on("MSP_CURRENT_LAP", function(event, deviceId) {
        update_laps();
    });

    // update laps
	function update_laps() {
        // sort laps by number
        var laps = {};
        for (var deviceId in DEVICES) {
    		for (var lap in DEVICES[deviceId].laps) {
                if (lap == 0) continue;

                if (laps[lap] === undefined) {
                    laps[lap] = [];
                }

                var row = '<tr>';
                row +=     '<td>' + lap + '</td>';
                row +=     '<td>' + DEVICES[deviceId].pilot_name + '</td>';
                row +=     '<td>' + deviceId + '</td>';
                row +=     '<td>' + LapManager.formatTime(DEVICES[deviceId].laps[lap]) + '</td>';
                row +=     '<td>' + DEVICES[deviceId].laps_rssi[lap] + '</td>';
                row +=     '<td>' + DEVICES[deviceId].laps_rssi_filter[lap] + '</td>';
                row += '</tr>';

                laps[lap].push(row);
    		}
        }

        // construct rows
        var rows;
        for (var lapNumber in laps) {
            for (var i = 0; i < laps[lapNumber].length; i++) {
                rows += laps[lapNumber][i];
            }
        }

        if (!rows) {
            rows = '<tr><td colspan="6">No laps recorded.</td></tr>';
        }

        $("#lap_times tbody").empty().append(rows);
	}

    // get array of lap results
    function get_laps() {
        var laps = [];
        for (var deviceId in DEVICES) {
            for (var lap in DEVICES[deviceId].laps) {
                if (lap == 0) continue;

                var result = {
                    lap: lap,
                    device_id: deviceId,
                    pilot_name: DEVICES[deviceId].pilot_name,
                    channel_frequency: DEVICES[deviceId].channel,
                    lap_time: LapManager.formatTime(DEVICES[deviceId].laps[lap]),
                    rssi: DEVICES[deviceId].laps_rssi_filter[lap]
                };

                laps.push(result);
            }
        }
        return laps;
    }

    // generate file name
    function generateFilename(prefix, suffix) {
        var date = new Date();
        var filename = prefix;

        filename = filename + '_' + date.getFullYear()
            + zeroPad(date.getMonth() + 1, 2)
            + zeroPad(date.getDate(), 2)
            + '_' + zeroPad(date.getHours(), 2)
            + zeroPad(date.getMinutes(), 2)
            + zeroPad(date.getSeconds(), 2);

        return filename + '.' + suffix;
    }

    function zeroPad(value, width) {
        value = "" + value;

        while (value.length < width) {
            value = "0" + value;
        }

        return value;
    }

    // convert array of JSON objects to CSV string
    function convertArrayOfObjects(jsonData, jsonColumnDefArray) {
        var outputCsv = "";
        // set the column names
        for (var columnIndex = 0; columnIndex < jsonColumnDefArray.length; columnIndex++) {
            outputCsv += "\"" + jsonColumnDefArray[columnIndex].toString().trim() + "\",";
        }
        outputCsv = outputCsv.slice(0, outputCsv.length - 1);
        outputCsv += "\r\n";
        // set the data
        for (var objectIndex = 0; objectIndex < jsonData.length; objectIndex++) {
            var eachLine = "";
            var row = jsonData[objectIndex];
            for (var columnIndex = 0; columnIndex < jsonColumnDefArray.length; columnIndex++) {
                var columnName = jsonColumnDefArray[columnIndex];
                eachLine += "\"" + row[columnName].toString().trim() + "\",";
            }
            eachLine = eachLine.slice(0, eachLine.length - 1);
            outputCsv += eachLine + "\r\n";
        }
        return outputCsv;
    }

    // invoke save prompt for export data
    function save_prompt(exportType, exportData) {
        var chosenFileEntry = null;
        var exportFileNamePath = null;

        var prefix = 'laps';
        var suffix = exportType;

        var filename = generateFilename(prefix, suffix);

        var accepts = [{
            extensions: [suffix]
        }];

        chrome.fileSystem.chooseEntry({type: 'saveFile', suggestedName: filename, accepts: accepts}, function (fileEntry) {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                return;
            }

            if (!fileEntry) {
                console.log('No file selected, export aborted.');
                return;
            }

            chosenFileEntry = fileEntry;

            // echo/console log path specified
            chrome.fileSystem.getDisplayPath(chosenFileEntry, function (path) {
                exportFileNamePath = path;
                console.log('Export file path: ' + exportFileNamePath);
            });

            // change file entry from read only to read/write
            chrome.fileSystem.getWritableEntry(chosenFileEntry, function (fileEntryWritable) {
                // check if file is writable
                chrome.fileSystem.isWritableEntry(fileEntryWritable, function (isWritable) {
                    if (isWritable) {
                        chosenFileEntry = fileEntryWritable;

                        var blob = new Blob([exportData], {type: 'text/plain'}); // first parameter for Blob needs to be an array

                        chosenFileEntry.createWriter(function (writer) {
                            writer.onerror = function (e) {
                                console.error(e);
                            };

                            var truncated = false;
                            writer.onwriteend = function () {
                                if (!truncated) {
                                    // onwriteend will be fired again when truncation is finished
                                    truncated = true;
                                    writer.truncate(blob.size);

                                    return;
                                }

                                console.log('File write successful');
                                GUI.log(chrome.i18n.getMessage('lapExportFileSuccess', [exportType.toUpperCase(), exportFileNamePath]));
                                if (callback) callback();
                            };

                            writer.write(blob);
                        }, function (e) {
                            console.error(e);
                        });
                    } else {
                        // Something went wrong or file is set to read only and cannot be changed
                        GUI.log(chrome.i18n.getMessage('lapExportFileReadOnly', [exportFileNamePath]));
                        console.log('File appears to be read only, sorry.');
                    }
                });
            });
        });
    }

	function load_html() {
        $('#content').load("./tabs/laps.html", process_html);
    }

    function process_html() {
        // translate to user-selected language
        localize();

        $('a.exportCSV').click(function () {
            var exportData = get_laps();
            if (exportData.length > 0) {
                var exportDataCSV = convertArrayOfObjects(exportData, ['lap', 'device_id', 'pilot_name', 'channel_frequency', 'lap_time', 'rssi']);
                save_prompt('csv', exportDataCSV);
            }
        });

        $('a.exportJSON').click(function () {
            var exportData = get_laps();
            if (exportData.length > 0) {
                var exportDataJSON = JSON.stringify(exportData, null, '\t');
                save_prompt('json', exportDataJSON);
            }
        });

        GUI.content_ready(callback);
    }
};

TABS.laps.cleanup = function (callback) {

    if (callback) callback();

    // remove events listeners
    EventBus.off("MSP_CURRENT_LAP");
};