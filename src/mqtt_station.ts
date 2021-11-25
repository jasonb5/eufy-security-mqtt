import {MqttEntity} from './mqtt_entity';
import {Station} from 'eufy-security-client';
import {MqttClient} from 'mqtt';

export class MqttStation extends MqttEntity {
    stateTopic: string;

    constructor(station: Station, mqtt: MqttClient) {
        let device = {
            identifiers: [station.getSerial()],
            manufacturer: 'eufy',
            model: station.getModel(),
            name: station.getName(),
            sw_version: station.getSoftwareVersion(),
        };

        super('sensor', `${station.getSerial()}-station`, device, mqtt);

        this.stateTopic = `${this.baseTopic}/state`;
    }

    discoveryPayload(): any {
        return {
            name: `${this.device.name} Station`,
            state_topic: this.stateTopic,
            unique_id: this.unique_id,
        };
    }
}
