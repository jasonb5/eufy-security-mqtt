import {MqttEntity} from './mqtt_entity';
import {Device, GenericDeviceProperties, DeviceProperties} from 'eufy-security-client';
import {MqttClient} from 'mqtt';

export class MqttCamera extends MqttEntity {
    eufyDevice: Device;

    constructor(eufyDevice: Device, mqtt: MqttClient) {
        let device = {
            identifiers: [eufyDevice.getSerial()],
            manufacturer: 'eufy',
            model: eufyDevice.getModel(),
            name: eufyDevice.getName(),
            sw_version: eufyDevice.getSoftwareVersion()
        };

        super('camera', `${eufyDevice.getSerial()}-camera`, device, mqtt);

        this.eufyDevice = eufyDevice;
    }

    discoveryPayload(): any {
        return {
            name: this.device.name,
            topic: this.baseTopic,
            unique_id: this.unique_id,
        };
    }

    register(): void {
        super.register();

        let properties = this.eufyDevice.getProperties();
        let attributeKeys = Object.keys(GenericDeviceProperties);
        let deviceType = this.eufyDevice.getDeviceType();
        let propertyKeys = Object.keys(DeviceProperties[deviceType]);
    }
}
