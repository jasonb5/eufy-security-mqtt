import {readFileSync} from 'fs';
import {EufySecurity, EufySecurityConfig, Device, PropertyValue, Station} from 'eufy-security-client';
import {connect} from 'mqtt';
import {MqttDevice} from './mqtt_device';
import {MqttCamera} from './mqtt_camera';
import {log} from './logger';

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
    let c = getConfig('./config.json'); 

    let mqtt = connect(c.mqtt);

    log.setSettings({minLevel: "info"});

    let eufy = new EufySecurity(c.eufy, log);

    eufy.connect()
        .then(value => {
            log.info(`Connected to Eufy: ${value}`);
        });

    let devices = new Map<string, MqttDevice>();

    eufy.on('device added', (device: Device) => {
        if (device.isCamera()) {
            let camera = new MqttCamera(device, mqtt);
            camera.register();
            devices.set(device.getSerial(), camera);
        }
    });

    eufy.on('station added', (station: Station) => {
        log.info(`Register station ${station.getSerial()}`);
    });

    eufy.on('device property changed', (device: Device, name: string, value: PropertyValue) => {
        log.info(`Property updated ${device.getSerial()} name ${name} value ${value.value}`);
    });
}

main();
