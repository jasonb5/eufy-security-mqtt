import {MqttClient} from 'mqtt';
import {Device, PropertyValue} from 'eufy-security-client';

export abstract class MqttDevice {
    component: string;
    unique_id: string;
    baseTopic: string;
    discoveryTopic: string;
    device: Device;
    mqtt: MqttClient;

    constructor(component: string, unique_id: string, device: Device, mqtt: MqttClient) {
        this.component = component;
        this.unique_id = unique_id;
        this.device = device;
        this.mqtt = mqtt;

        this.baseTopic = `homeassistant/${this.component}/${this.unique_id}`;
        this.discoveryTopic = `${this.baseTopic}/config`;
    }

    devicePayload(): any {
        return {
            device: {
                identifiers: [
                    this.device.getSerial()
                ],
                manufacturer: "Eufy",
                model: this.device.getModel(),
                name: this.device.getName(),
                sw_version: this.device.getSoftwareVersion()
            },
        };
    }

    abstract discoveryPayload(): any;
    abstract update(name: string, value: PropertyValue): void | Promise<any>;

    register() {
        let payload = {
            ...this.devicePayload(),
            ...this.discoveryPayload()
        };

        this.mqtt.publish(this.discoveryTopic, JSON.stringify(payload), {retain: true});
    }

    unregister() {
        this.mqtt.publish(this.discoveryTopic, '', {retain: true});
    }
}
