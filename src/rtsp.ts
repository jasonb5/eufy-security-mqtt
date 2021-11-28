import net from 'net';
import http from 'http';
import {RTSPServerConfig} from './cli'; import {log} from './logger';
import {EufyManager} from './eufy_manager'; import axios from 'axios';

enum StatusCode {
    OK = "200 OK",
    NotFound = "404 Not Found",
}

interface RTSPRequest {
    method: string;
    uri: string;
    version: string;
    headers: {[key: string]: string}; body?: string;
}

const parseRTSPRequest = (data: string): RTSPRequest => {
    let lines = data.split('\r\n');
    let status = lines[0].split(' ');
    let headers: {[key: string]: string} = {};

    for (let x in status) {
        if (x === '') {
            break;
        }

        let items = x.split(': ');

        headers[items[0]] = items[1];
    }

    return {
        method: status[0],
        uri: status[1],
        version: status[2],
        headers: headers,
        body: lines[lines.length-1]
    }
}

interface CacheEntry {
    url: string;
    data: string;
}

export class RTSPServer {
    config: RTSPServerConfig;
    server: net.Server;
    imageServer: http.Server;
    manager: EufyManager;
    cache: {[key: string]: CacheEntry} = {};

    constructor(config: RTSPServerConfig, manager: EufyManager) {
        this.config = config;

        this.server = net.createServer();

        this.imageServer = http.createServer();

        this.manager = manager;
    }

    run() {
        this.server.on('connection', this.connectionHandler);

        this.server.listen(this.config.port);

        log.info(`RTSP server listening on ${this.config.port}`);

        this.imageServer.on('request', async (req: http.IncomingMessage, res: http.ServerResponse) => {
            let url = req.url;

            if (url) {
                let urlParts = url.split('/');
                let serial = urlParts[1];
                let device = this.manager.cameras[serial];

                if (device === undefined) {
                    res.writeHead(404).end();
                    return;
                }

                let properties = device.eufyDevice.getProperties();

                if ('pictureUrl' in properties) {
                    console.log(`Getting image data`);

                    let pictureUrl = properties['pictureUrl'].value as string;

                    if (this.cache[serial] == undefined || this.cache[serial].url != pictureUrl) {
                        let response = await axios.get(pictureUrl, {responseType: 'arraybuffer'});

                        this.cache[serial] = {
                            url: pictureUrl,
                            data: Buffer.from(response.data).toString(),
                        }
                    }

                    console.log(`Sending data for ${pictureUrl}`);

                    res.write(this.cache[serial].data);
                    res.end();
                } else {
                    res.writeHead(404).end();

                    return;
                }
            }

            res.writeHead(404).end();
        });

        this.imageServer.listen(this.config.port2);
    }

    async handleGet(socket: net.Socket, request: RTSPRequest) {
        let urlParts = request.uri.split('/');
        let serial = urlParts[1];
        let device = this.manager.cameras[serial];

        if (device === undefined) {
            socket.write(`${request.version} ${StatusCode.NotFound}\r\n`);
            socket.write('\r\n');
        } else {
            let properties = device.eufyDevice.getProperties();

            if ('pictureUrl' in properties) {
                console.log(`Getting image data`);

                let pictureUrl = properties['pictureUrl'].value as string;

                if (this.cache[serial] == undefined || this.cache[serial].url != pictureUrl) {
                    let response = await axios.get(pictureUrl, {responseType: 'arraybuffer'});

                    this.cache[serial] = {
                        url: pictureUrl,
                        data: Buffer.from(response.data).toString('base64'),
                    }
                }

                console.log(`Sending data for ${pictureUrl}`);

                socket.write(`${request.version} ${StatusCode.OK}\r\n`);
                socket.write('Accept-Ranges: bytes\r\n');
                socket.write(`Content-Type: binary/octet-stream\r\n`);
                socket.write(`Transfer-Encoding: chunked\r\n`);
                socket.write(`\r\n`);
                socket.write(`${this.cache[serial].data.length.toString(16)}`);
                socket.write('\r\n');
                socket.write(`${this.cache[serial].data}`);
                socket.write('\r\n0\r\n');
            } else {
                socket.write(`${request.version} ${StatusCode.NotFound}\r\n`);
                socket.write('\r\n');
            }
        }
    }

    handleOptions(socket: net.Socket, request: RTSPRequest) {
        console.log(`${socket} ${request}`);
    }

    handleDescribe(socket: net.Socket, request: RTSPRequest) {

        console.log(`${socket} ${request}`);
    }

    handleSetup(socket: net.Socket, request: RTSPRequest) {

        console.log(`${socket} ${request}`);
    }

    handleTearDown(socket: net.Socket, request: RTSPRequest) {

        console.log(`${socket} ${request}`);
    }

    handlePlay(socket: net.Socket, request: RTSPRequest) {

        console.log(`${socket} ${request}`);
    }

    connectionHandler = (socket: net.Socket) => {
        socket.on('data', (data: Buffer) => {
            let request = parseRTSPRequest(data.toString());

            switch (request.method) {
                case 'OPTIONS':
                    this.handleOptions(socket, request);
                    break;
                case 'DESCRIBE':
                    this.handleDescribe(socket, request);
                    break;
                case 'SETUP':
                    this.handleSetup(socket, request);
                    break;
                case 'TEARDOWN':
                    this.handleTearDown(socket, request);
                    break;
                case 'PLAY':
                    this.handlePlay(socket, request);
                    break;
                default:
                    throw new Error(`Cannot handle method ${request.method}`);
            }
        });
    }
}
