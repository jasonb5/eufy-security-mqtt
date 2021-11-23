import { MqttClient } from 'mqtt';
import {Device, PropertyValue, PropertyMetadataNumeric} from 'eufy-security-client';
import { MqttDevice } from './mqtt_device';
import {camelCaseToWords} from './utils';
import {log} from './logger';

export class MqttSensor extends MqttDevice {
    name: string;
    metadata: PropertyMetadataNumeric;
    state_topic: string;

    constructor(name: string, device: Device, mqtt: MqttClient, metadata: PropertyMetadataNumeric) {
        super('sensor', `${device.getSerial()}_${name}`, device, mqtt);

        this.name = name;
        this.metadata = metadata;
        this.state_topic = `${this.baseTopic}/${this.name}/state`;
    }

    discoveryPayload(): any {
        return {
            name: `${this.device.getName()} ${camelCaseToWords(this.name)}`,
            state_topic: this.state_topic,
            unique_id: `${this.device.getSerial()} ${this.name}`,
            unit_of_measurement: this.metadata?.unit,
        };
    }

    register() {
        super.register()

        let properties = this.device.getProperties();
        let value = properties[this.name];

        this.update(this.name, value);
    }

    update(name: string, value: PropertyValue): void {
        log.info(`Updating property ${name} for ${this.device.getSerial()} METADATA ${this.metadata}`);

        if (this.name === name) {
            let data = null;

            if (this.metadata.type === 'number') {
                data = value.value as number;
            } else {
                log.error(`Not sure how to handle type ${this.metadata.type} for ${name} on ${this.device.getSerial()}`);
            }

            if (data) { 
                if (this.metadata.states) {
                    data = this.metadata.states[data];

                    log.info(`States ${this.metadata.states} new value ${data}`);
                }

                this.mqtt.publish(this.state_topic, String(data), {retain: true});
            }
        }
    }
}
