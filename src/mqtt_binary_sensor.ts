import { MqttClient } from 'mqtt';
import {Device, PropertyValue} from 'eufy-security-client';
import { MqttDevice } from './mqtt_device';
import {Logger} from 'tslog';

export class MqttBinarySensor extends MqttDevice {
    name: string;
    state_topic: string;

    constructor(name: string, device: Device, mqtt: MqttClient, log: Logger) {
        super('binary_sensor', device, mqtt, log, name);

        this.name = name;
        this.state_topic = `homeassistant/binary_sensor/${device.getSerial()}/${this.name}/state`;
    }

    discoveryPayload(): any {
        return {
            name: `${this.device.getName()} ${this.name}`,
            state_topic: this.state_topic,
            unique_id: `${this.device.getSerial()} ${this.name}`
        };
    }

    register() {
        super.register()

        let properties = this.device.getProperties();
        let value = properties[this.name]['value'] as boolean;

        this.update(value);

        this.device.on('property changed', (_device: Device, name: string, value: PropertyValue) => {
            if (name === this.name) {
                this.update(value.value as boolean);
            }
        });
    }

    update(value: boolean) {
        let payload = (value) ? 'ON' : 'OFF';

        this.log.info(`Updating ${this.state_topic} with ${payload}`);

        this.mqtt.publish(this.state_topic, payload, {retain: true});
    }
}
