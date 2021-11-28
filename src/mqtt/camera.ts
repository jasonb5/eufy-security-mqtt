import {MqttEntity} from './entity';
import {Device, PropertyValue, PropertyValues, GenericDeviceProperties, DeviceProperties, PropertyMetadataNumeric} from 'eufy-security-client';
import {MqttClient} from 'mqtt';
import {log} from './../logger';
import {MqttBinarySensor} from './binary_sensor';
import {MqttSensor} from './sensor';
import {camelCaseToWords} from './../utils';
import axios from 'axios';

export class MqttCamera extends MqttEntity {
    eufyDevice: Device;
    stateTopic: string;
    properties = new Map<string, MqttEntity>();
    state: {[key: string]: string} = {};

    constructor(eufyDevice: Device, mqtt: MqttClient) {
        super('camera', `${eufyDevice.getSerial()}_camera`, {
            identifiers: [eufyDevice.getSerial()],
            manufacturer: 'eufy',
            model: eufyDevice.getModel(),
            name: eufyDevice.getName(),
            sw_version: eufyDevice.getSoftwareVersion()
        }, mqtt);

        this.eufyDevice = eufyDevice;
        this.stateTopic = `${this.baseTopic}/state`;
    }

    discoveryPayload(): any {
        return {
            name: this.device.name,
            topic: this.baseTopic,
            unique_id: this.unique_id,
            json_attributes_topic: this.attributeTopic
        };
    }

    getAttributes(properties: PropertyValues): {[key: string]: string} {
        let attributes: {[key: string]: string} = {};

        for (let x in GenericDeviceProperties) {
            if (x in properties) {
                let deviceProperty = GenericDeviceProperties[x];

                if ("states" in deviceProperty) {
                    let value = properties[x].value as number;
                    let states = (deviceProperty as PropertyMetadataNumeric).states;

                    if (states) {
                        attributes[x] = states[value];
                    } else {
                        attributes[x] = String(value);
                    }
                } else {
                    attributes[x] = String(properties[x].value);
                }
            }
        }

        log.info(`${this.eufyDevice.getSerial()} (${this.device.name}) attributes ${JSON.stringify(attributes)}`);

        return attributes;
    }

    register(): void {
        super.register();

        let properties = this.eufyDevice.getProperties();
        let attributes = this.getAttributes(properties);
        let deviceType = this.eufyDevice.getDeviceType();

        this.mqtt.publish(this.attributeTopic, JSON.stringify(attributes), {retain: true});

        for (let x in DeviceProperties[deviceType]) {
            if (!(x in properties)) {
                log.info(`Skipping property ${x} not in current device properties`);

                continue;
            }

            let deviceProperties = DeviceProperties[deviceType][x];

            if (deviceProperties.type === 'boolean') {
                // TODO check if writable, use switch rather than binary_sensor
                let sensor = new MqttBinarySensor({
                    name: `${this.device.name} ${camelCaseToWords(x)}`,
                    state_topic: this.stateTopic,
                    value_template: `{{ value_json.${x} }}`
                }, `${this.eufyDevice.getSerial()}_${x}`, this.device, this.mqtt);

                sensor.register();

                this.properties.set(x, sensor);

                this.state[x] = (properties[x].value as boolean) ? 'ON' : 'OFF';
            } else if (deviceProperties.type === 'number') {
                // TODO Check if states exists, use select rather than sensor
                let sensor = new MqttSensor({
                    name: `${this.device.name} ${camelCaseToWords(x)}`,
                    state_topic: this.stateTopic,
                    value_template: `{{ value_json.${x} }}`,
                    unit_of_measurement: (deviceProperties as PropertyMetadataNumeric).unit
                }, `${this.eufyDevice.getSerial()}_${x}`, this.device, this.mqtt);

                sensor.register();

                this.properties.set(x, sensor);

                let value = properties[x].value;
                let states = (deviceProperties as PropertyMetadataNumeric).states;

                if (states) {
                    this.state[x] = states[value as number];
                } else {
                    this.state[x] = String(value);
                }
            } else {
                log.info(`Skipping property ${x}, cannot handle type ${deviceProperties.type}`);

                continue;
            }
        }

        this.mqtt.publish(this.stateTopic, JSON.stringify(this.state), {retain: true});
    }

    async updateState(name: string, value: PropertyValue) {
        let deviceType = this.eufyDevice.getDeviceType();
        let deviceProperty = DeviceProperties[deviceType][name];

        if (name === 'pictureUrl') {
            let response = await axios.get(value.value as string, {responseType: "arraybuffer"});
            let data = Buffer.from(response.data);

            this.mqtt.publish(this.baseTopic, data, {retain: true});
        } else if (deviceProperty.type === 'boolean') {
            this.state[name] = (value.value as boolean) ? 'ON' : 'OFF';

            this.mqtt.publish(this.stateTopic, JSON.stringify(this.state), {retain: true});
        } else if (deviceProperty.type === 'number') {
            if ("states" in deviceProperty) {
                let states = (deviceProperty as PropertyMetadataNumeric).states;

                if (states) {
                    this.state[name] = states[value.value as number];
                }
            } else {
                this.state[name] = String(value.value);
            }

            this.mqtt.publish(this.stateTopic, JSON.stringify(this.state), {retain: true});
        } else {
            log.info(`Skipping update to property ${name}`);

            return;
        }
    }
}
