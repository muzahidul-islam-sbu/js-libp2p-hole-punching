import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipe } from 'it-pipe'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import * as lp from 'it-length-prefixed'
import map from 'it-map'
import { dirname } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));

const fileHash = 'giraffe.jpg'
const peerID = 'user1'
const serverUrl = `http://127.0.0.1:5000/requestFile`;
const payUrl = `http://52.191.209.254:3000/sendTransaction?fileHash=${fileHash}&peerID=${peerID}`; // URL of the file to download

let pay = 0

export function makeGetReq(multi, node) {
    http.get(serverUrl, async (response) => {
        if (response.statusCode !== 200) {
            console.error(`Failed to download file. Server responded with status code ${response.statusCode}`);
            return;
        }

        // Get filename from Content-Disposition header
        const contentDisposition = response.headers['content-disposition'];
        const filenameMatch = contentDisposition.match(/filename=(.+)/);
        const filename = filenameMatch ? filenameMatch[1] : 'downloaded_file';
        const filePath = path.join(__dirname, `${filename}`);

        const desiredChunkSize = 1024 * 60;

        let accumulatedChunks = Buffer.alloc(0); // Buffer to accumulate partial chunks
        let totalBytesReceived = 0; // Track the total bytes received

        const fileStream = fs.createWriteStream(filePath);

        response.on('data', async (chunk) => {
            // Accumulate received chunks
            accumulatedChunks = Buffer.concat([accumulatedChunks, chunk]);
            totalBytesReceived += chunk.length;

            // Check if accumulated size matches the desired chunk size
            if (totalBytesReceived >= desiredChunkSize) {
                // Write accumulated chunks to the file stream
                fileStream.write(accumulatedChunks);
                const data = {
                    type: 'data',
                    filename,
                    chunk: accumulatedChunks
                }
                const stream = await node.dialProtocol(multi, '/file');
                await pipe(
                    [JSON.stringify(data)],
                    // Turn strings into buffers
                    (source) => map(source, (string) => uint8ArrayFromString(string)),
                    // Encode with length prefix (so receiving side knows how much data is coming)
                    (source) => lp.encode(source),
                    stream.sink);
                await stream.close();
                console.log('Received chunk of size:', accumulatedChunks.length);
                // sendConfirmation();

                // Reset accumulated chunks and total bytes received
                accumulatedChunks = Buffer.alloc(0);
                totalBytesReceived = 0;
            }
        });

        response.on('end', async () => {
            // Write remaining accumulated chunks to the file stream
            if (accumulatedChunks.length > 0) {
                fileStream.write(accumulatedChunks);
                const data = {
                    type: 'end',
                    filename,
                    chunk: accumulatedChunks
                }
                const stream = await node.dialProtocol(multi, '/file');
                await pipe(
                    [JSON.stringify(data)],
                    // Turn strings into buffers
                    (source) => map(source, (string) => uint8ArrayFromString(string)),
                    // Encode with length prefix (so receiving side knows how much data is coming)
                    (source) => lp.encode(source),
                    stream.sink);
                await node.hangUp(multi);
                console.log('Received chunk of size:', accumulatedChunks.length);
            }

            // Close the file stream when all data has been received
            fileStream.end();
            // sendConfirmation()
            console.log('File downloaded successfully');
        });
    })
}
async function sendConfirmation() {
    http.get(payUrl, (response) => {
        pay += 1
        console.log('Paid', pay);
    });
};
