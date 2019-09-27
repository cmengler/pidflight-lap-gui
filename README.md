# PIDflight Lap GUI

![PIDflight](https://www.pidflight.com/logo.png)

[PIDflight Lap](https://www.pidflight.com/pidflight-lap/) is a video transmitter (VTx) lap timing solution for individual pilots and multi-pilot support for race meets of up to 8 pilots.

PIDflight Lap GUI is a crossplatform tool for the [PIDflight](https://www.pidflight.com/) lap timing devices.

It runs as an app within Google Chrome and allows you to configure and run PIDflight Lap timing devices.

There are also standalone versions available for native platforms such as `Windows`, `macOS`, and `Linux`.

- **Windows (7, 8, 10)**: `pidflight-lap-installer_[VERSION]_win32.exe`
- **macOS**: `pidflight-lap_[VERSION]_macOS.dmg`
- **Linux**:
  - *Ubuntu, Debian*: `pidflight-lap_[VERSION]_amd64.deb`
  - *Red Hat, Fedora, CentOS*: `pidflight-lap-[VERSION]-1.x86_64.rpm`
  - *Others*: `pidflight-lap_[VERSION]_linux64.zip`

Downloads are available in [Releases](https://github.com/cmengler/pidflight-lap-gui/releases)

## Native app build via NW.js

### Development

1. Install node.js (version 10 required)
2. Install yarn: `npm install yarn -g`
3. Change to project folder and run `yarn install`.
4. Run `yarn start`.

### App build and release

The tasks are defined in `gulpfile.js` and can be run with through yarn:

```bash
yarn gulp <taskname> [[platform] [platform] ...]
```

List of possible values of `<task-name>`:

- **dist** copies all the JS and CSS files in the `./dist` folder.
- **apps** builds the apps in the `./apps` folder [1].
- **debug** builds debug version of the apps in the `./debug` folder [1].
- **release** zips up the apps into individual archives in the `./release` folder [1].

[1] Running this task on macOS or Linux requires Wine, since it's needed to set the icon for the Windows app (build for specific platform to avoid errors).

#### Build or release app for one specific platform

To build or release only for one specific platform you can append the plaform after the `task-name`.
If no platform is provided, all the platforms will be done in sequence.

- **macOS** use `yarn gulp <task-name> --osx64`
- **Linux** use `yarn gulp <task-name> --linux64`
- **Windows** use `yarn gulp <task-name> --win32`
- **ChromeOS** use `yarn gulp <task-name> --chromeos`

You can also use multiple platforms e.g. `yarn gulp <taskname> --osx64 --linux64`.

## Credits

Special thanks to all involved in the development of the Betaflight/Cleanflight/Baseflight Configurator projects for which this GUI's foundations have derived from.
