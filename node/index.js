import { circuitRelayTransport } from "@libp2p/circuit-relay-v2";
import { dcutr } from "@libp2p/dcutr";
import { mplex } from "@libp2p/mplex";
import { noise } from "@libp2p/noise";
import { createFromPrivKey } from "@libp2p/peer-id-factory";
import { tcp } from "@libp2p/tcp";
import { createLibp2p } from "libp2p";
import { identify } from "@libp2p/identify";
import { generateKeyPairFromSeed } from "@libp2p/crypto/keys";

import * as multiaddr from "@multiformats/multiaddr";

const seedBytes = Uint8Array.from({ length: 32, 0: process.env.SEED });
const secret = await generateKeyPairFromSeed("ed25519", seedBytes);
const peerId = await createFromPrivKey(secret);

const node = await createLibp2p({
  peerId,
  addresses: {
    listen: [`/ip4/0.0.0.0/tcp/${process.env.PORT}`],
    announce: [`/ip4/${EXTERNAL_IP}/tcp/${process.env.PORT}`],
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

console.warn(`node started with peer id ${node.peerId.toString()}`);

setInterval(async () => {
  console.warn(
    "connections: ",
    node.getConnections().map((conn) => conn.remoteAddr.toString())
  );
}, 5000);

if (process.env.MODE === "dialer") {
  setTimeout(async () => {
    const addr = multiaddr.multiaddr(
      `${process.env.RELAY_MULTIADDR}/p2p-circuit/p2p/${process.env.LISTENER_PEER_ID}`
    );
    try {
      await node.dial(addr);
    } catch (error) {
      console.error("cannot connect to ", addr);
      console.error(error);
    }
  }, 5000);
}
