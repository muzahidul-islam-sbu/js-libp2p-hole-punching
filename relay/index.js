import { circuitRelayServer } from "@libp2p/circuit-relay-v2";
import { mplex } from "@libp2p/mplex";
import { noise } from "@libp2p/noise";
import { createFromPrivKey } from "@libp2p/peer-id-factory";
import { tcp } from "@libp2p/tcp";
import { createLibp2p } from "libp2p";
import { identify } from "@libp2p/identify";
import { generateKeyPairFromSeed } from "@libp2p/crypto/keys";

const seedBytes = Uint8Array.from({ length: 32, 0: 9999 });
const secret = await generateKeyPairFromSeed("ed25519", seedBytes);
const peerId = await createFromPrivKey(secret);

const relay = await createLibp2p({
  peerId,
  addresses: {
    listen: [`/ip4/0.0.0.0/tcp/${process.env.PORT}`],
  },
  transports: [tcp()],
  connectionEncryption: [noise()],
  streamMuxers: [mplex()],
  services: {
    circuitRelay: circuitRelayServer(),
    identify: identify(),
  },
});

relay.start();

console.warn(
  "relay started, listening on: ",
  relay.getMultiaddrs().map((ma) => ma.toString())
);

relay.addEventListener("peer:connect", (event) => {
  console.warn("connected: ", event.detail.toString());
});

setInterval(() => {
  console.warn(
    "connections: ",
    relay.getConnections().map((conn) => conn.remoteAddr.toString())
  );
}, 5000);
