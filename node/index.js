import { circuitRelayTransport } from "@libp2p/circuit-relay-v2";
import { dcutr } from "@libp2p/dcutr";
import { mplex } from "@libp2p/mplex";
import { noise } from "@libp2p/noise";
import { createFromPrivKey } from "@libp2p/peer-id-factory";
import { tcp } from "@libp2p/tcp";
import { createLibp2p } from "libp2p";
import { identify } from "@libp2p/identify";
import { generateKeyPairFromSeed } from "@libp2p/crypto/keys";
import { server } from "./server.js";
import { pipe } from 'it-pipe'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import * as lp from 'it-length-prefixed'
import map from 'it-map'
import * as multiaddr from "@multiformats/multiaddr";
import http from 'http'

const seedBytes = Uint8Array.from({ length: 32, 0: process.env.SEED });
const secret = await generateKeyPairFromSeed("ed25519", seedBytes);
const peerId = await createFromPrivKey(secret);

const node = await createLibp2p({
  peerId,
  addresses: {
    listen: [`/ip4/0.0.0.0/tcp/${process.env.PORT}/http`, `/ip4/0.0.0.0/tcp/5000`],
    announce: [`/ip4/${process.env.EXTERNAL_IP}/tcp/${process.env.PORT}`,
    `/ip4/${process.env.EXTERNAL_IP}/tcp/5000`],
  },
  transports: [
    circuitRelayTransport({
      discoverRelays: 1,
    }),
    tcp({
      // dialOpts: { localPort: +process.env.TCP_PORT },
    }),
  ],
  connectionEncryption: [noise()],
  streamMuxers: [mplex()],
  services: {
    dcutr: dcutr(),
    identify: identify(),
  },
});

node.start();
await node.handle('/dialerlistener', async ({ stream }) => {
  await pipe(
    stream.source,
    // Decode length-prefixed data
    (source) => lp.decode(source),
    // Turn buffers into strings
    (source) => map(source, (buf) => uint8ArrayToString(buf.subarray())),
    async function (source) {
      for await (var message of source) {
        const options = {
          hostname: "localhost",
          port: 5000,
          path: '/',
          method: 'GET'
        };
        console.log('making get to', options)
        // Send the GET request
        http.get("http://localhost:5000", async (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', async () => {
            console.log('Response:', data);
            await pipe(
              [data],
              // Turn strings into buffers
              (source) => map(source, (string) => uint8ArrayFromString(string)),
              // Encode with length prefix (so receiving side knows how much data is coming)
              (source) => lp.encode(source),
              stream.sink);
          });
        });
      }
    }
  )
})

console.warn(`node started with peer id ${node.peerId.toString()}`);

setInterval(async () => {
  console.warn(
    "connections: ",
    node.getConnections().map(conn => {
      const connectionType = conn.transient === false ? ' have direct connection' : ' have relayed connection';
      return conn.remoteAddr.toString() + connectionType;
    })
  );
}, 5000);

if (process.env.MODE === "dialer") {
  setInterval(async () => {
    const addr = multiaddr.multiaddr(
      `${process.env.RELAY_MULTIADDR}/p2p-circuit/p2p/${process.env.LISTENER_PEER_ID}`
    );
    try {
      const conn = await node.dial(addr);

      console.log(`Connected to the auto relay node via ${conn.remoteAddr.toString()}`)
      const stream = await node.dialProtocol(addr, '/dialerlistener');
      // Write data to the stream
      await pipe(
        ["Making request from Dialer"],
        // Turn strings into buffers
        (source) => map(source, (string) => uint8ArrayFromString(string)),
        // Encode with length prefix (so receiving side knows how much data is coming)
        (source) => lp.encode(source),
        stream.sink);
      await pipe(
        stream.source,
        // Decode length-prefixed data
        (source) => lp.decode(source),
        // Turn buffers into strings
        (source) => map(source, (buf) => uint8ArrayToString(buf.subarray())),
        async function (source) {
          for await (var res of source) {
            console.log('response', res)
          }
        })
    } catch (error) {
      console.error("cannot connect to ", addr);
      console.error(error);
    }
  }, 5000);
} else {
  console.log(`Node started with id ${node.peerId.toString()}`)

  const conn = await node.dial(multiaddr.multiaddr(process.env.RELAY_MULTIADDR))

  console.log(`Connected to the relay ${conn.remotePeer.toString()}`)

  // Wait for connection and relay to be bind for the example purpose
  node.addEventListener('self:peer:update', (evt) => {
    // Updated self multiaddrs?
    console.log(node.getMultiaddrs())
    console.log(`Advertising with a relay address of ${node.getMultiaddrs()[0].toString()}`)
  })
}

// $env:SEED =0; $env:MODE="listener"; $env:RELAY_MULTIADDR="/ip4/52.191.209.254/tcp/3000/p2p/12D3KooWRVJCFqFBrasjtcGHnRuuut9fQLsfcUNLfWFFqjMm2p4n"; $env:PORT=3000;$env:EXTERNAL_IP="72.229.181.210"; node .\index.js
// $env:SEED =1; $env:MODE="dialer"; $env:LISTENER_PEER_ID="12D3KooWDpJ7As7BWAwRMfu1VU2WCqNjvq387JEYKDBj4kx6nXTN" ;$env:RELAY_MULTIADDR="/ip4/52.191.209.254/tcp/3000/p2p/12D3KooWRVJCFqFBrasjtcGHnRuuut9fQLsfcUNLfWFFqjMm2p4n"; $env:PORT=3000;$env:EXTERNAL_IP="172.174.239.70"; node .\index.js
