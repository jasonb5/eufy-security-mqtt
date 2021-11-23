import { MqttClient } from 'mqtt';
import {Device, PropertyValue, GenericDeviceProperties, DeviceProperties, PropertyMetadataNumeric} from 'eufy-security-client';
import {MqttDevice} from './mqtt_device';
import axios from 'axios';
import {MqttBinarySensor} from './mqtt_binary_sensor';
import {MqttSensor} from './mqtt_sensor';
import {log} from './logger';

export class MqttCamera extends MqttDevice {
    jsonAttributesTopic: string;
    properties = new Map<string, MqttDevice>();

    constructor(device: Device, mqtt: MqttClient) {
        super('camera', device.getSerial(), device, mqtt);

        this.jsonAttributesTopic = `${this.baseTopic}/jsoninfo`;
    }

    discoveryPayload(): any {
        return {
            name: this.device.getName(),
            topic: this.baseTopic,
            json_attributes_topic: this.jsonAttributesTopic,
            unique_id: `${this.device.getSerial()} ${this.device.getName()}`
        };
    }

    register() {
        super.register();

        let properties = this.device.getProperties();
        let value = properties['pictureUrl'];

        this.update('pictureUrl', value);

        let attributes: any = {};
        let deviceProperties = DeviceProperties[this.device.getDeviceType()];

        for (let key of Object.keys(GenericDeviceProperties)) {
            if (key in properties) {
                attributes[key] = properties[key].value;
            }
        }

        this.mqtt.publish(this.jsonAttributesTopic, JSON.stringify(attributes), {retain: true});

        for (let key of Object.keys(properties)) {
            if (key === 'pictureUrl' || Object.keys(GenericDeviceProperties).indexOf(key) !== -1) { continue; }

            let prop = null;
            let devProp = deviceProperties[key];

            if (devProp) {
                if (devProp.type === 'boolean') {
                    prop = new MqttBinarySensor(key, this.device, this.mqtt); 
                } else if (devProp.type === 'number') {
                    prop = new MqttSensor(key, this.device, this.mqtt, devProp as PropertyMetadataNumeric);
                } else {
                    log.error(`Skipping property ${key} unsupported type ${devProp.type}`);
                }
            } else {
                log.error(`HELP ${this.device.getName()} no type ${key}`);
            }

            if (prop) {
                prop.register();

                this.properties.set(key, prop);
            }
        }
    }

    async update(name: string, value: PropertyValue): Promise<any> {
        log.info(`Updating property ${name} for ${this.device.getSerial()}`);

        if (name === 'pictureUrl') {
            let response = await axios.get(value.value as string, {responseType: 'arraybuffer'});
            let buffer = Buffer.from(response.data);

            this.mqtt.publish(this.baseTopic, buffer, {retain: true});
        } else {
            this.properties.get(name)?.update(name, value);
        }

        return null;
    }
}
