import { MqttClient } from 'mqtt';
import {Device, PropertyValue} from 'eufy-security-client';
import {MqttDevice} from './mqtt_device';
import axios from 'axios';
import {Logger} from 'tslog';
import {MqttBinarySensor} from './mqtt_binary_sensor';

export class MqttCamera extends MqttDevice {
    topic: string;
    properties: MqttDevice[] = [];

    constructor(device: Device, mqtt: MqttClient, log: Logger) {
        super('camera', device, mqtt, log);

        this.topic = `homeassistant/camera/${device.getSerial()}`;
    }

    discoveryPayload(): any {
        return {
            name: this.device.getName(),
            topic: this.topic,
            unique_id: `${this.device.getSerial()} ${this.device.getName()}`
        };
    }

    register() {
        super.register();

        let properties = this.device.getProperties();
        let value = properties['pictureUrl']['value'] as string;

        this.update(value);

        let enabled = new MqttBinarySensor('enabled', this.device, this.mqtt, this.log);
        enabled.register();
        this.properties.push(enabled);

        let motionDetected = new MqttBinarySensor('motionDetected', this.device, this.mqtt, this.log);
        motionDetected.register();
        this.properties.push(motionDetected);

        this.device.on('property changed', (_device: Device, name: string, value: PropertyValue) => {
            if (name === 'pictureUrl') {
                this.update(value.value as string);
            }
        });
    }

    async update(url: string) {
        let response = await axios.get(url, {responseType: 'arraybuffer'});
        let buffer = Buffer.from(response.data);

        this.mqtt.publish(this.topic, buffer, {retain: true});
    }
}
