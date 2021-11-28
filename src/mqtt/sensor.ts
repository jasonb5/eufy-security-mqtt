import {MqttEntity, IDevice} from './entity';
import {MqttClient} from 'mqtt';


export interface ISensor {
    name: string;
    state_topic: string;
    value_template: string;
    unit_of_measurement?: string;
}

export class MqttSensor extends MqttEntity {
    config: ISensor;

    constructor(config: ISensor, unique_id: string, device: IDevice, mqtt: MqttClient) {
        super('sensor', unique_id, device, mqtt);

        this.config = config;
    }

    discoveryPayload(): any {
        return {
            ...this.config,
            unique_id: this.unique_id
        };
    }
}
