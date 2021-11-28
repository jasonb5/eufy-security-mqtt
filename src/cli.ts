import {readFileSync} from 'fs';
import {EufyManager} from './eufy_manager';
import {EufySecurityConfig} from 'eufy-security-client';
import {RTSPServer} from './rtsp';

export interface RTSPServerConfig {
    port: number,
    port2: number
}

export interface MqttConfig {
    host: string,
    port: number,
    username?: string,
    password?: string
}

export interface Config {
    eufy: EufySecurityConfig,
    mqtt: MqttConfig,
    rtsp: RTSPServerConfig
}

function getConfig(path: string): any { let data = readFileSync(path); 
    return JSON.parse(data.toString()) as Config;
}

function main() {
    let c = getConfig('./config.json'); 

    let eufyManager = new EufyManager(c);

    eufyManager.run();

    let rtspServer = new RTSPServer(c.rtsp, eufyManager);

    rtspServer.run();
}

main();
