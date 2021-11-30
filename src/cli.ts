import {readFileSync} from 'fs';
import {EufyManager} from './eufy_manager';
import {EufySecurityConfig} from 'eufy-security-client';
import {FFMpeg} from './ffmpeg';
import {log} from './logger';
import {RTSPSimpleServer} from './rtsp_simple_server';

export interface MqttConfig {
    host: string,
    port: number,
    username?: string,
    password?: string
}

export interface Config {
    eufy: EufySecurityConfig,
    mqtt: MqttConfig,
}

function getConfig(path: string): any { let data = readFileSync(path); 
    return JSON.parse(data.toString()) as Config;
}

function main() {
    let c = getConfig('./config.json'); 

    let eufyManager = new EufyManager(c);

    //eufyManager.run();

    log.info(`${eufyManager}`);

    let ffmpeg = new FFMpeg('rtsp://192.168.86.50:8554/sample');

    log.info(`${ffmpeg}`);

    let rtsp = new RTSPSimpleServer();

    log.info(`${rtsp}`);
}

main();
