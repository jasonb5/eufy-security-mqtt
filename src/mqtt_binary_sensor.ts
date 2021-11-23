import { MqttClient } from 'mqtt';
import {Device, PropertyValue} from 'eufy-security-client';
import { MqttDevice } from './mqtt_device';
import {camelCaseToWords} from './utils';
import {log} from './logger';

export class MqttBinarySensor extends MqttDevice {
    name: string;
    state_topic: string;

    constructor(name: string, device: Device, mqtt: MqttClient) {
        super('binary_sensor', `${device.getSerial()}_${name}`, device, mqtt);

        this.name = name;
        this.state_topic = `${this.baseTopic}/${this.name}/state`;
    }

    discoveryPayload(): any {
        return {
            name: `${this.device.getName()} ${camelCaseToWords(this.name)}`,
            state_topic: this.state_topic,
            unique_id: `${this.device.getSerial()} ${this.name}`
        };
    }

    register() {
        super.register()

        let properties = this.device.getProperties();
        let value = properties[this.name];

        this.update(this.name, value);
    }

    update(name: string, value: PropertyValue): void {
        log.info(`Updating property ${name} for ${this.device.getSerial()}`);

        if (this.name === name) {
            let payload = (value.value as boolean) ? 'ON' : 'OFF';

            this.mqtt.publish(this.state_topic, payload, {retain: true});
        }
    }
}
