'use strict';

// MSP_codes needs to be re-integrated inside MSP object
var MSP_codes = {
  MSP_API_VERSION:            1,

  MSP_STATUS:                 4,

  MSP_RESET:                  5,
  MSP_RSSI_CALIBRATE:         6,
  MSP_START:                  7,
  MSP_ACTIVATE:               8,
  MSP_DEACTIVATE:             9,

  MSP_DEVICE_ID:             10,
  MSP_SET_DEVICE_ID:         11,

  MSP_CHANNEL:               20,
  MSP_SET_CHANNEL:           21,

  MSP_CURRENT_LAP:           30,

  MSP_LAP_MIN_TIME:          34,
  MSP_SET_LAP_MIN_TIME:      35,

  MSP_LAP_MAX:               37,
  MSP_SET_LAP_MAX:           38,

  MSP_RSSI:                  40,

  MSP_RSSI_THRESHOLD:        42,
  MSP_SET_RSSI_THRESHOLD:    43,

  MSP_RSSI_FILTER:           44,
  MSP_SET_RSSI_FILTER:       45,

  MSP_EEPROM_WRITE:          250
};

var MSP = {
  WILDCARD_DEVICE_ID:         0,

  state:                      0,
  message_direction:          1,
  device_id:                  0,
  code:                       0,
  message_length_expected:    0,
  message_length_received:    0,
  message_buffer:             null,
  message_buffer_uint8_view:  null,
  message_checksum:           0,

  callbacks:                  [],
  packet_error:               0,
  unsupported:                0,

  timeout_counter:            0,

  supportedBaudRates: [ // 0 based index.
    'AUTO',
    '9600',
    '19200',
    '38400',
    '57600',
    '115200',
    '230400',
    '250000',
  ],

  read: function (readInfo) {
    var data = new Uint8Array(readInfo.data);

    for (var i = 0; i < data.length; i++) {
      switch (this.state) {
        case 0: // sync char 1
          if (data[i] == 36) { // $
            this.state++;
          }
          break;
        case 1: // sync char 2
          if (data[i] == 77) { // M
            this.state++;
          } else { // restart and try again
            this.state = 0;
          }
          break;
        case 2: // direction (should be >)
          this.unsupported = 0;
          if (data[i] == 62) { // >
            this.message_direction = 1;
          } else if (data[i] == 60) { // <
            this.message_direction = 0;
          } else if (data[i] == 33) { // !
            // FC reports unsupported message error
            this.unsupported = 1;
          }

          this.state++;
          break;
        case 3:
          this.device_id = data[i];
          this.state++;
          break;
        case 4:
          this.message_length_expected = data[i];

          this.message_checksum = data[i];

          // setup arraybuffer
          this.message_buffer = new ArrayBuffer(this.message_length_expected);
          this.message_buffer_uint8_view = new Uint8Array(this.message_buffer);

          this.state++;
          break;
        case 5:
          this.code = data[i];
          this.message_checksum ^= data[i];

          if (this.message_length_expected > 0) {
            // process payload
            this.state++;
          } else {
            // no payload
            this.state += 2;
          }
          break;
        case 6: // payload
          this.message_buffer_uint8_view[this.message_length_received] = data[i];
          this.message_checksum ^= data[i];
          this.message_length_received++;

          if (this.message_length_received >= this.message_length_expected) {
            this.state++;
          }
          break;
        case 7:
          if (this.message_direction != 0) {
            if (this.message_checksum == data[i]) {
              // message received, process
              this.process_data(this.device_id, this.code, this.message_buffer, this.message_length_expected);
            } else {
              console.log('code: ' + this.code + ' - crc failed -  checksum should be ' + this.message_checksum + ' but got ' + data[i]);

              this.packet_error++;
              $('span.packet-error').html(this.packet_error);
            }
          }

          // Reset variables
          this.message_length_received = 0;
          this.state = 0;
          break;

        default:
          console.log('Unknown state detected: ' + this.state);
      }
    }
  },
  process_data: function (device_id, code, message_buffer, message_length) {
    var data = new DataView(message_buffer, 0); // DataView (allowing us to view arrayBuffer as struct/union)

    if (!this.unsupported) switch (code) {
      case MSP_codes.MSP_SET_DEVICE_ID:
        if (device_id != MSP.WILDCARD_DEVICE_ID) {
          DEVICES[device_id] = {
            id: device_id,
            laps: [],
            laps_rssi: [],
            laps_rssi_filter: []
          };
        }
        break;

      case MSP_codes.MSP_SET_DEVICE_ID:
        GUI.log(chrome.i18n.getMessage('lapRssiFoundDevice', [device_id]));
        console.log('Device found and ID initialised');
        break;

      case MSP_codes.MSP_API_VERSION:
        if (device_id != MSP.WILDCARD_DEVICE_ID) {
          var offset = 0;
          DEVICES[device_id].mspProtocolVersion = data.getUint8(offset++);
          DEVICES[device_id].apiVersion = data.getUint8(offset++) + '.' + data.getUint8(offset++) + '.0';
        }
        break;

      case MSP_codes.MSP_STATUS:
        if (device_id != MSP.WILDCARD_DEVICE_ID) {
          DEVICES[device_id].state = data.getUint8(0, 1);
          DEVICES[device_id].timer_state = data.getUint8(1, 1);
          // trigger event
          EventBus.trigger("MSP_STATUS", [device_id]);
        }
        break;

      case MSP_codes.MSP_RESET:
        console.log('Lap RSSI timer reset');
          // trigger event
          EventBus.trigger("MSP_RESET", [device_id]);
        break;

      case MSP_codes.MSP_RSSI_CALIBRATE:
        console.log('RSSI calibration started');
        break;

      case MSP_codes.MSP_START:
        console.log('Lap timer started');
        // trigger event
        EventBus.trigger("MSP_START", [device_id]);
        break;

      case MSP_codes.MSP_ACTIVATE:
        GUI.log(chrome.i18n.getMessage('lapRssiDeviceActivated', [device_id]));
        console.log('Device ' + device_id + ' activated');
        break;

      case MSP_codes.MSP_DEACTIVATE:
        GUI.log(chrome.i18n.getMessage('lapRssiDeviceDeactivated', [device_id]));
        console.log('Device ' + device_id + ' deactivated');
        break;

      case MSP_codes.MSP_CHANNEL:
        if (device_id != MSP.WILDCARD_DEVICE_ID) {
          DEVICES[device_id].channel = data.getUint16(0, 1);
          // trigger event
          EventBus.trigger("MSP_CHANNEL", [device_id]);
        }
        break;

      case MSP_codes.MSP_SET_CHANNEL:
        GUI.log(chrome.i18n.getMessage('lapRssiChannelFrequencySaved', [device_id]));
        console.log('Channel frequency saved');
        break;

      case MSP_codes.MSP_RSSI:
        if (device_id != MSP.WILDCARD_DEVICE_ID) {
          DEVICES[device_id].rssi = data.getUint16(0, 1);
          DEVICES[device_id].rssi_min = data.getUint16(2, 1);
          DEVICES[device_id].rssi_max = data.getUint16(4, 1);
          DEVICES[device_id].rssi_filter = data.getUint16(6, 1);
          // trigger event
          EventBus.trigger("MSP_RSSI", [device_id]);
        }
        break;

      case MSP_codes.MSP_RSSI_THRESHOLD:
        if (device_id != MSP.WILDCARD_DEVICE_ID) {
          DEVICES[device_id].rssi_threshold = data.getUint16(0, 1);
          // trigger event
          EventBus.trigger("MSP_RSSI_THRESHOLD", [device_id]);
        }
        break;

      case MSP_codes.MSP_SET_RSSI_THRESHOLD:
        GUI.log(chrome.i18n.getMessage('lapRssiThresholdSaved', [device_id]));
        console.log('RSSI threshold saved')
        break;

      case MSP_codes.MSP_LAP_MIN_TIME:
        if (device_id != MSP.WILDCARD_DEVICE_ID) {
          DEVICES[device_id].settings.minimum_lap_time = data.getUint16(0, 1);
        }
        break;

      case MSP_codes.MSP_SET_LAP_MIN_TIME:
        GUI.log(chrome.i18n.getMessage('lapRssiMinimumLapTimeSaved', [device_id]));
        console.log('Minimum lap time saved');
        break;

      case MSP_codes.MSP_LAP_MAX:
        if (device_id != MSP.WILDCARD_DEVICE_ID) {
          DEVICES[device_id].settings.maximum_lap = data.getUint8(0, 1);
        }
        break;

      case MSP_codes.MSP_SET_LAP_MAX:
        GUI.log(chrome.i18n.getMessage('lapRssiMaximumLapSaved', [device_id]));
        console.log('Maximum laps saved');
        break;

      case MSP_codes.MSP_CURRENT_LAP:
        if (device_id != MSP.WILDCARD_DEVICE_ID) {
          var lap = data.getUint8(0, 1);

          var isNewLap = false;
          if (lap != 0 && DEVICES[device_id].laps[lap] === undefined) {
            isNewLap = true;
          }

          DEVICES[device_id].laps[lap] = data.getUint32(1, 1);
          DEVICES[device_id].laps_rssi[lap] = data.getUint16(5, 1);
          DEVICES[device_id].laps_rssi_filter[lap] = data.getUint16(7, 1);

          // trigger event
          EventBus.trigger("MSP_CURRENT_LAP", [device_id]);

          // check if this is a new lap, trigger new lap event
          if (isNewLap) {
            EventBus.trigger("NEW_LAP", [device_id, lap]);
          }
        }
        break;

      case MSP_codes.MSP_RSSI_FILTER:
        if (device_id != MSP.WILDCARD_DEVICE_ID) {
          DEVICES[device_id].settings.rssi_filter_q = data.getUint16(0, 1) * 0.01;
          DEVICES[device_id].settings.rssi_filter_r = data.getUint16(2, 1) * 0.0001;
        }
        break;

      case MSP_codes.MSP_SET_RSSI_FILTER:
        console.log('RSSI filter saved');
        break;

      case MSP_codes.MSP_EEPROM_WRITE:
        GUI.log(chrome.i18n.getMessage('lapRssiEepromSaved', [device_id]));
        console.log('EEPROM saved');
        break;

      default:
        console.log('Unknown code detected: ' + code);
    } else {
      console.log('FC reports unsupported message error: ' + code);
    }

    // trigger callbacks, cleanup/remove callback after trigger
    for (var i = this.callbacks.length - 1; i >= 0; i--) { // itterating in reverse because we use .splice which modifies array length
      if (this.callbacks[i].code == code) {
        // save callback reference
        var callback = this.callbacks[i].callback;

        // remove timeout
        clearInterval(this.callbacks[i].timer);

        // remove object from array
        this.callbacks.splice(i, 1);

        // fire callback
        if (callback) callback({'command': code, 'data': data, 'length': message_length});
      }
    }
  },
  send_message: function (device_id, code, data, callback_sent, callback_msp) {
    var bufferOut,
    bufView;

    // always reserve 6 bytes for protocol overhead !
    if (data) {
      var size = data.length + 7,
        checksum = 0;

      bufferOut = new ArrayBuffer(size);
      bufView = new Uint8Array(bufferOut);

      bufView[0] = 36; // $
      bufView[1] = 77; // M
      bufView[2] = 60; // <
      bufView[3] = device_id;
      bufView[4] = data.length;
      bufView[5] = code;

      checksum = bufView[4] ^ bufView[5];

      for (var i = 0; i < data.length; i++) {
        bufView[i + 6] = data[i];

        checksum ^= bufView[i + 6];
      }

      bufView[6 + data.length] = checksum;
    } else {
      bufferOut = new ArrayBuffer(7);
      bufView = new Uint8Array(bufferOut);

      bufView[0] = 36; // $
      bufView[1] = 77; // M
      bufView[2] = 60; // <
      bufView[3] = device_id;
      bufView[4] = 0; // data length
      bufView[5] = code; // code
      bufView[6] = bufView[4] ^ bufView[5]; // checksum
    }

    // dev version 0.57 code below got recently changed due to the fact that queueing same MSP codes was unsupported
    // and was causing trouble while backup/restoring configurations
    // watch out if the recent change create any inconsistencies and then adjust accordingly
    var obj = {'code': code, 'requestBuffer': bufferOut, 'callback': (callback_msp) ? callback_msp : false, 'timer': false};

    var requestExists = false;
    for (var i = 0; i < MSP.callbacks.length; i++) {
      if (MSP.callbacks[i].code == code) {
        // request already exist, we will just attach
        requestExists = true;
        break;
      }
    }

    if (!requestExists) {
      obj.timer = setInterval(function () {
        console.log('MSP data request timed-out: ' + code);

        MSP.timeout_counter++;
        $('span.msp_timeout_count').text(MSP.timeout_counter);

        serial.send(bufferOut, false);
      }, 1000); // we should be able to define timeout in the future
    }

    MSP.callbacks.push(obj);

    // always send messages with data payload (even when there is a message already in the queue)
    if (data || !requestExists) {
      serial.send(bufferOut, function (sendInfo) {
        if (sendInfo.bytesSent == bufferOut.byteLength) {
          if (callback_sent) callback_sent();
        }
      });
    }

    return true;
  },
  callbacks_cleanup: function () {
    for (var i = 0; i < this.callbacks.length; i++) {
      clearInterval(this.callbacks[i].timer);
    }

    this.callbacks = [];
  },
  disconnect_cleanup: function () {
    this.state = 0; // reset packet state for "clean" initial entry (this is only required if user hot-disconnects)
    this.packet_error = 0; // reset CRC packet error counter for next session

    this.callbacks_cleanup();
  }
};

/**
 * Encode the request body for the MSP request with the given code and return it as an array of bytes.
 */
MSP.crunch = function (deviceId, code) {
  var buffer = [];

  switch (code) {
    case MSP_codes.MSP_SET_CHANNEL:
      buffer.push(lowByte(DEVICES[deviceId].channel));
      buffer.push(highByte(DEVICES[deviceId].channel));
      break;

    case MSP_codes.MSP_SET_LAP_MIN_TIME:
      buffer.push(lowByte(DEVICES[deviceId].minimum_lap_time));
      buffer.push(highByte(DEVICES[deviceId].minimum_lap_time));
      break;

    case MSP_codes.MSP_SET_LAP_MAX:
      buffer.push(DEVICES[deviceId].maximum_lap);
      break;

    case MSP_codes.MSP_SET_RSSI_THRESHOLD:
      buffer.push(lowByte(DEVICES[deviceId].rssi_threshold));
      buffer.push(highByte(DEVICES[deviceId].rssi_threshold));
      break;

    case MSP_codes.MSP_SET_RSSI_FILTER:
      buffer.push(lowByte(DEVICES[deviceId].rssi_filter_q / 0.01));
      buffer.push(highByte(DEVICES[deviceId].rssi_filter_q / 0.01));
      buffer.push(lowByte(DEVICES[deviceId].rssi_filter_r / 0.0001));
      buffer.push(highByte(DEVICES[deviceId].rssi_filter_r / 0.0001));
      break;

    default:
      return false;
  }

  return buffer;
};

/**
 * Encode the request body for the MSP request with the given code and data and return it as an array of bytes.
 */
MSP.crunchData = function (code, data) {
  var buffer = [];

  switch (code) {
    case MSP_codes.MSP_SET_LAP_MIN_TIME:
      buffer.push(lowByte(data.minimum_lap_time));
      buffer.push(highByte(data.minimum_lap_time));
      break;

    case MSP_codes.MSP_SET_LAP_MAX:
      buffer.push(data.maximum_lap);
      break;

    default:
      return false;
  }

  return buffer;
};