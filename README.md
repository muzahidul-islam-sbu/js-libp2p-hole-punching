# js-libp2p-hole-punching

After running `npm i` in both node and relay packages:

### relay
```bash
PORT=50000 node relay/index.js
```
### listener
```bash
SEED=0 MODE=listener node node/index.js
```
### dialer
```bash
SEED=1 MODE=dialer RELAY_MULTIADDR=$RELAY_MA LISTENER_PEER_ID=$LISTENER_PEER_ID node node/index.js
```
