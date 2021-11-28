import {MqttEntity, IDevice} from './entity';
import {MqttClient} from 'mqtt';

export interface IBinarySensor {
    name: string;
    state_topic: string;
    value_template: string;
}

export class MqttBinarySensor extends MqttEntity {
    config: IBinarySensor;

    constructor(config: IBinarySensor, unique_id: string, device: IDevice, mqtt: MqttClient) {
        super('binary_sensor', unique_id, device, mqtt);

        this.config = config;
    }

    discoveryPayload(): any {
        return {
            ...this.config,
            unique_id: this.unique_id
        };
    }
}

