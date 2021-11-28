import {MqttEntity} from './entity';
import {Station, PropertyValue, PropertyValues, BaseStationProperties, StationProperties, PropertyMetadataNumeric} from 'eufy-security-client';
import {MqttClient} from 'mqtt';
import {log} from './../logger';
import {MqttBinarySensor} from './binary_sensor';
import {MqttSensor} from './sensor';
import {camelCaseToWords} from './../utils';

export class MqttStation extends MqttEntity {
    eufyStation: Station;
    stateTopic: string;
    properties = new Map<string, MqttEntity>();
    state: {[key: string]: string} = {};

    constructor(station: Station, mqtt: MqttClient) {
        super('sensor', `${station.getSerial()}_station`, {
            identifiers: [`${station.getSerial()}_station`],
            manufacturer: 'eufy',
            model: station.getModel(),
            name: `${station.getName()} Station`,
            sw_version: station.getSoftwareVersion()
        }, mqtt);

        this.eufyStation = station;
        this.stateTopic = `${this.baseTopic}/state`;
    }

    discoveryPayload(): any {
        return {
            name: this.device.name,
            state_topic: this.baseTopic,
            unique_id: this.unique_id,
            json_attributes_topic: this.attributeTopic
        };
    }

    getAttributes(properties: PropertyValues): {[key: string]: string} {
        let attributes: {[key: string]: string} = {};

        for (let x in BaseStationProperties) {
            if (x in properties) {
                let deviceProperty = BaseStationProperties[x];

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

        log.info(`${this.eufyStation.getSerial()} (${this.device.name}) attributes ${JSON.stringify(attributes)}`);

        return attributes;
    }

    register(): void {
        super.register();

        let properties = this.eufyStation.getProperties();
        let attributes = this.getAttributes(properties);
        let deviceType = this.eufyStation.getDeviceType();

        this.mqtt.publish(this.attributeTopic, JSON.stringify(attributes), {retain: true});

        for (let x in StationProperties[deviceType]) {
            if (!(x in properties)) {
                log.info(`Skipping property ${x} not in current device properties`);

                continue;
            }

            let deviceProperties = StationProperties[deviceType][x];

            if (deviceProperties.type === 'boolean') {
                let sensor = new MqttBinarySensor({
                    name: `${this.device.name} ${camelCaseToWords(x)}`,
                    state_topic: this.stateTopic,
                    value_template: `{{ value_json.${x} }}`
                }, `${this.eufyStation.getSerial()}_${x}`, this.device, this.mqtt);

                sensor.register();

                this.properties.set(x, sensor);

                this.state[x] = (properties[x].value as boolean) ? 'ON' : 'OFF';
            } else if (deviceProperties.type === 'number') {
                let sensor = new MqttSensor({
                    name: `${this.device.name} ${camelCaseToWords(x)}`,
                    state_topic: this.stateTopic,
                    value_template: `{{ value_json.${x} }}`,
                    unit_of_measurement: (deviceProperties as PropertyMetadataNumeric).unit
                }, `${this.eufyStation.getSerial()}_${x}`, this.device, this.mqtt);

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

        log.info(`Sending payload ${JSON.stringify(this.state)}`);

        this.mqtt.publish(this.stateTopic, JSON.stringify(this.state), {retain: true});
    }

    async updateState(name: string, value: PropertyValue) {
        let deviceType = this.eufyStation.getDeviceType();
        let deviceProperty = StationProperties[deviceType][name];

        if (deviceProperty.type === 'boolean') {
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
