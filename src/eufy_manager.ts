import {EufySecurity, Device, PropertyValue, Station, StreamMetadata} from 'eufy-security-client';
import {MqttClient, connect} from 'mqtt';
import {Config} from './cli';
import {MqttCamera} from './mqtt/camera';
import {MqttStation} from './mqtt/station';
import {log} from './logger';
import readline from 'readline';
import process from 'process';
import {FFMpeg} from './ffmpeg';
import {Readable} from 'stream';

export class EufyManager {
    mqtt: MqttClient;
    eufy: EufySecurity;
    devices: {[key: string]: Device} = {};
    stations: {[key: string]: Station} = {};
    mqttCameras: {[key: string]: MqttCamera} = {};
    mqttStations: {[key: string]: MqttStation} = {};

    constructor(private config: Config) {
        this.mqtt = connect(config.mqtt);
        this.eufy = new EufySecurity(config.eufy, log);
    }

    async run() {
        this.mqtt.on('message', async (topic: string, message: Buffer) => {
            let [_base, serial, _type] = topic.split('/');
            let device = this.devices[serial];

            if (device === undefined) {
                log.fatal(`Failed to find device ${serial}`);

                return;
            }

            let station = this.stations[device.getStationSerial()];

            if (station === undefined) {
                log.fatal(`Failed to find station for device ${serial}`);

                return;
            }

            if (message.toString() === 'start') {
                let ffmpeg = new FFMpeg(`${this.config.rtsp.address}/${serial}`); 

                station.on('livestream start', (_station: Station, _channel: number, _metadata: StreamMetadata, videostream: Readable, audiostream: Readable) => {
                    videostream.on('data', (chunk: any) => {
                        ffmpeg.write(chunk);
                    });

                    audiostream.on('data', (chunk: any) => {
                        ffmpeg.write(chunk);
                    });
                });

                station.startLivestream(device);
            } else {
                await station.stopLivestream(device);
            }
        });

        await this.eufy.connect()

        log.info(`Eufy connection: ${this.eufy.isConnected()}`);

        this.eufy.on('captcha request', (id: string, _captcha: string) => {
            const getinput = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            }); 

            getinput.question('What is the result of the captcha? ', async (code) => {
                await this.eufy.connect(code, id);

                getinput.close();
            });
        });

        if (!(this.eufy.isConnected())) {
            const getinput = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            }); 

            getinput.question('What is the result of the captcha? ', async (code) => {
                getinput.question('What is the captcha ID? ', async (captchaId) => {
                    await this.eufy.connect(code, captchaId);

                    getinput.close();
                })
            });
        }

        this.eufy.on('device added', (device: Device) => {
            let serial = device.getSerial();

            this.devices[serial] = device;

            log.info(`Add device ${serial}`);

            if (device.isCamera()) {
                let mqttCamera = new MqttCamera(device, this.mqtt);

                mqttCamera.register();

                this.mqttCameras[serial] = mqttCamera;

                this.mqtt.subscribe(`eufy/${serial}/p2p`, (err) => {
                    if (err) {
                        log.fatal(`Failed to subscribe to eufy/${serial}/p2p: ${err}`);
                    }
                });
            }
        });

        this.eufy.on('device removed', (device: Device) => {
            let serial = device.getSerial();

            delete this.devices[serial];

            log.info(`Remove device ${serial}`);

            this.mqttCameras[serial].unregister();

            delete this.mqttCameras[serial];
        });

        this.eufy.on('station added', (station: Station) => {
            let serial = station.getSerial();

            this.stations[serial] = station;

            log.info(`Add station ${serial}`);

            let mqttStation = new MqttStation(station, this.mqtt);

            mqttStation.register();

            this.mqttStations[serial] = mqttStation;
        });

        this.eufy.on('station removed', (station: Station) => {
            let serial = station.getSerial();

            delete this.stations[serial];

            log.info(`Remove station ${serial}`);

            this.mqttStations[serial].unregister();

            delete this.mqttStations[serial];
        });

        this.eufy.on('device property changed', (device: Device, name: string, value: PropertyValue) => {
            let serial = device.getSerial();

            log.info(`Updating device ${serial} property ${name} = ${value.value}`);

            if (serial in this.mqttCameras) {
                this.mqttCameras[serial].updateState(name, value);
            }
        });

        this.eufy.on('station property changed', (station: Station, name: string, value: PropertyValue) => {
            let serial = station.getSerial();

            log.info(`Updating station ${serial} property ${name} = ${value.value}`);

            if (serial in this.mqttStations) {
                this.mqttStations[serial].updateState(name, value);
            }
        });
    }
}
