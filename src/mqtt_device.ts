import {MqttClient} from 'mqtt';
import {Device} from 'eufy-security-client';
import {Logger} from 'tslog';

export abstract class MqttDevice {
    discoveryTopic: string;
    device: Device;
    mqtt: MqttClient;
    log: Logger;

    constructor(component: string, device: Device, mqtt: MqttClient, log: Logger, name?: string) {
        if (name === undefined) {
            this.discoveryTopic = `homeassistant/${component}/${device.getSerial()}/config`;
        } else {
            this.discoveryTopic = `homeassistant/${component}/${device.getSerial()}/${name}/config`;
        }
        this.device = device;
        this.mqtt = mqtt;
        this.log = log;
    }

    devicePayload(): any {
        return {
            device: {
                identifiers: [
                    this.device.getSerial()
                ],
                manufacturer: "Eufy",
                model: this.device.getModel(),
                name: this.device.getName(),
                sw_version: this.device.getSoftwareVersion()
            }
        };
    }

    abstract discoveryPayload(): any;

    register() {
        let payload = {
            ...this.devicePayload(),
            ...this.discoveryPayload()
        };

        this.log.info(`Registering ${this.device.getName()} to ${this.discoveryTopic}`);

        this.log.info(`Payload: ${JSON.stringify(payload)}`);

        this.mqtt.publish(this.discoveryTopic, JSON.stringify(payload), {retain: true});
    }

    unregister() {
        this.mqtt.publish(this.discoveryTopic, '', {retain: true});
    }
}
