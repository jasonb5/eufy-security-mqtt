import {exec, ChildProcess} from 'child_process';
import {log} from './logger';

export class FFMpeg {
    process: ChildProcess;

    constructor(rtsp_address: string) {
        const args = `-i - -vcodec copy -f rtsp -rtsp_transport tcp ${rtsp_address}`;

        this.process = exec(`/usr/bin/ffmpeg ${args}`);

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

    write(data: Buffer) {
        if (this.process.stdin) {
            this.process.stdin.write(data, (err) => {
                if (err) {
                    log.error(`Error writing data to FFMpeg input: ${err}`);
                }
            });
        }
    }
}
