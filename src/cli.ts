import {readFileSync, writeFile} from 'fs';
import {EufySecurity, EufySecurityConfig, Device} from 'eufy-security-client';
import {connect} from 'mqtt';
import {Logger} from 'tslog';
import {MqttCamera} from './mqtt_camera';

interface Config {
    eufy: EufySecurityConfig,
    mqtt: {
        host: string,
        port: number,
        username?: string,
        password?: string
    }
}

function getConfig(path: string): any {
    let data = readFileSync(path);

    return JSON.parse(data.toString()) as Config;
}

function main() {
    let dump = true;

    let c = getConfig('./config.json'); 

    let mqtt = connect(c.mqtt);

    let log = new Logger({minLevel: "info"});

    let eufy = new EufySecurity(c.eufy, log);

    eufy.connect()
        .then(value => {
            log.info(`Connected to Eufy: ${value}`);
        });

    let devices = [];

    eufy.on('device added', (device: Device) => {
        if (dump) {
            let properties = device.getProperties();

            writeFile(`./device-${device.getSerial()}.json`, JSON.stringify(properties), err => log.fatal(err));
        }

        if (device.isCamera()) {
            let camera = new MqttCamera(device, mqtt, log);
            camera.register();
            devices.push(camera);
        }
    });
}

main();
