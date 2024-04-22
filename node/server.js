import express from 'express';
import fs from 'fs';
import {setTimeout} from 'timers/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));


const app = express();
const PORT = 5000;

let payments = 0;
let consumerPayment = {};

// Endpoint to handle file download
app.get('/requestFile', async (req, res) => {
  // Parse file hash from the query parameter
  const fileHash = "giraffe.jpg";
//   const consumerID = req.query.peerID;

//   if (!fileHash || !consumerID) {
//     // If file hash is not provided
//     console.log('missing field', fileHash, consumerID)
//     return res.status(400).send('File hash is required');
//   }

//   if (!consumerPayment.hasOwnProperty(consumerID)) { 
//     consumerPayment[consumerID] = {}
//   }
//   if (!consumerPayment[consumerID].hasOwnProperty(fileHash)) { 
//     consumerPayment[consumerID][fileHash] = true;
//   }

  // Assuming your files are stored in a directory called 'files'
  const filePath = path.join(__dirname, 'files', fileHash);
  // Open the file for reading synchronously
  const fileHandle = fs.openSync(filePath, 'r');

  // Get file stats to know its size
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  // Set response headers
  res.set({
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename=${fileHash}`,
    'Content-Length': fileSize
  });
  
  // Buffer size for each chunk (you can adjust this value as needed)
  const bufferSize = 1024 * 60; 
  // Buffer to store chunk data
  const buffer = Buffer.alloc(bufferSize);

  // Function to read chunks from the file and write them to the response stream
  while (true) {
    // while (!consumerPayment[consumerID][fileHash]) {
    //   await setTimeout(100);
    //   console.log('waiting for pay')
    // }
    await setTimeout(1000);   // NEEDED
    
    let bytesRead;
    let bytesProcessed = 0; // Track the total bytes processed
    let endOfFile = false; // Flag to indicate end of file
    let remainingBytes = bufferSize;
    while (remainingBytes > 0) {
      bytesRead = fs.readSync(fileHandle, buffer, bytesProcessed, remainingBytes, null);
      if (bytesRead === 0) {
        endOfFile = true; // Set endOfFile flag to true
        break; // Exit inner loop if end of file
      }
      remainingBytes -= bytesRead;
      bytesProcessed += bytesRead;
    }
    
    console.log('sent chunk', bytesProcessed)
    res.write(buffer.slice(0, bytesProcessed)); // Write the chunk data to the response stream
    // consumerPayment[consumerID][fileHash] = false;

    // If bytesRead is 0, it means we've reached the end of the file
    if (endOfFile) {
      // Close the file handle
      fs.closeSync(fileHandle);
      // End the response
      res.end();
      break
    }

  };
});

app.get('/sendTransaction', (req, res) => {
  const fileHash = req.query.fileHash;
  const consumerID = req.query.peerID;

  payments += 1;
  consumerPayment[consumerID][fileHash] = true
  console.log('payed', payments)
  res.setHeader('Connection', 'close');
  res.end();
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export {app}