import {MqttClient} from 'mqtt';
// import {log} from './../logger';

export interface IDevice {
    configuration_url?: string;
    connections?: string[];
    identifiers?: string[];
    manufacturer?: string;
    model?: string;
    name?: string;
    suggested_area?: string;
    sw_version?: string;
    via_device?: string;
}

export abstract class MqttEntity {
    component: string;
    unique_id: string;
    device: IDevice;
    mqtt: MqttClient;

    baseTopic: string;
    discoveryTopic: string;
    attributeTopic: string;

    constructor(component: string, unique_id: string, device: IDevice, mqtt: MqttClient) {
        this.component = component;
        this.unique_id = unique_id;
        this.device = device;
        this.mqtt = mqtt;

        this.baseTopic = `homeassistant/${component}/${unique_id}`;
        this.discoveryTopic = `${this.baseTopic}/config`;
        this.attributeTopic = `${this.baseTopic}/attributes`;
    }

    abstract discoveryPayload(): any;

    register(): void {
        let payload = {
            device: this.device,
            ...this.discoveryPayload(),
        };

        // log.info(`Publishing discovery with payload ${JSON.stringify(payload, null, 2)}`);

        this.mqtt.publish(this.discoveryTopic, JSON.stringify(payload));
    }

    unregister() {
        this.mqtt.publish(this.discoveryTopic, '');
    }
}
