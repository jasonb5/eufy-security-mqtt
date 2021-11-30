import {exec, ChildProcess} from 'child_process';
import {log} from './logger';
import axios from 'axios';

export class RTSPSimpleServer {
    apiAddress: string = `http://127.0.0.1:9997`;
    configPath: string = `${this.apiAddress}/v1/config/paths/add`;
    process: ChildProcess;

    constructor() {
        const cmd = 'rtsp-simple-server/rtsp-simple-server';
        const args = '';

        this.process = exec(`${cmd} ${args}`);

        if (this.process.stdout) {
            this.process.stdout.on('data', (chunk: any) => {
                log.info(chunk);
            });
        }

        if (this.process.stderr) {
            this.process.stderr.on('data', (chunk: any) => {
                log.error(chunk);
            });
        }
    }

    async addNewPath(name: string) {
        let newConfigPath = `${this.configPath}/${name}`;
        let startLivestream = 'mqtt ... homeassistant/camera/$RTSP_PATH/p2p/start'
        let stopLivestream = 'mqtt ... homeassistant/camera/$RTSP_PATH/p2p/start'
        let runOnDemand = `handleExit(){ ${stopLivestream}; } && trap handleExit SIGINT && ${startLivestream} && sleep infinity`;
        let payload = {
            source: 'publisher',
            runOnDemand: runOnDemand
        };

        let response = await axios.post(newConfigPath, payload);

        log.info(`Response ${response}`);
    }
}
