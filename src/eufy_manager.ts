import {EufySecurity, Device, PropertyValue, Station} from 'eufy-security-client';
import {MqttClient, connect} from 'mqtt';
import {Config} from './cli';
import {MqttCamera} from './mqtt/camera';
import {MqttStation} from './mqtt/station';
import {log} from './logger';

export class EufyManager {
    mqtt: MqttClient;
    eufy: EufySecurity;
    cameras: {[key: string]: MqttCamera} = {};
    stations: {[key: string]: MqttStation} = {};

    constructor(config: Config) {
        this.mqtt = connect(config.mqtt);
        this.eufy = new EufySecurity(config.eufy);
    }

    async run() {
        await this.eufy.connect()

        log.info(`Eufy connection: ${this.eufy.isConnected()}`);

        if (!this.eufy.isConnected()) {
            throw new Error(`Could not connect to Eufy`);
        }

        this.eufy.on('device added', (device: Device) => {
            let serial = device.getSerial();

            log.info(`Add device ${serial}`);

            if (device.isCamera()) {
                let mqttCamera = new MqttCamera(device, this.mqtt);

                mqttCamera.register();

                this.cameras[serial] = mqttCamera;
            }
        });

        this.eufy.on('device removed', (device: Device) => {
            let serial = device.getSerial();

            log.info(`Remove device ${serial}`);

            this.cameras[serial].unregister();

            delete this.cameras[serial];
        });

        this.eufy.on('station added', (station: Station) => {
            let serial = station.getSerial();

            log.info(`Add station ${serial}`);

            let mqttStation = new MqttStation(station, this.mqtt);

            mqttStation.register();

            this.stations[serial] = mqttStation;
        });

        this.eufy.on('station removed', (station: Station) => {
            let serial = station.getSerial();

            log.info(`Remove station ${serial}`);

            this.stations[serial].unregister();

            delete this.stations[serial];
        });

        this.eufy.on('device property changed', (device: Device, name: string, value: PropertyValue) => {
            let serial = device.getSerial();

            log.info(`Updating device ${serial} property ${name} = ${value.value}`);

            if (serial in this.cameras) {
                this.cameras[serial].updateState(name, value);
            }
        });

        this.eufy.on('station property changed', (station: Station, name: string, value: PropertyValue) => {
            let serial = station.getSerial();

            log.info(`Updating station ${serial} property ${name} = ${value.value}`);

            if (serial in this.stations) {
                this.stations[serial].updateState(name, value);
            }
        });
    }
}
