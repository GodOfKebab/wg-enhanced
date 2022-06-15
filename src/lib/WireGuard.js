'use strict';

const fs = require('fs').promises;
const path = require('path');

const debug = require('debug')('WireGuard');
const uuid = require('uuid');
const QRCode = require('qrcode');

const Queue = require('queue-fifo');
const Util = require('./Util');
const ServerError = require('./ServerError');

const {
  WG_INTERFACE,
  WG_PATH,
  WG_HOST,
  WG_PORT,
  WG_MTU,
  WG_DEFAULT_DNS,
  WG_DEFAULT_ADDRESS,
  WG_PERSISTENT_KEEPALIVE,
  WG_ALLOWED_IPS,
  WG_POST_UP,
  WG_POST_DOWN,
} = require('../config');

module.exports = class WireGuard {

  async getConfig() {
    if (!this.__configPromise) {
      this.__configPromise = Promise.resolve().then(async () => {
        if (!WG_HOST) {
          throw new Error('WG_HOST Environment Variable Not Set!');
        }

        debug('Loading configuration...');
        let config;
        try {
          config = await fs.readFile(path.join(WG_PATH, `${WG_INTERFACE}.json`), 'utf8');
          config = JSON.parse(config);
          debug('Configuration loaded.');
        } catch (err) {
          const privateKey = await Util.exec('wg genkey');
          const publicKey = await Util.exec(`echo ${privateKey} | wg pubkey`, {
            log: 'echo ***hidden*** | wg pubkey',
          });
          const address = WG_DEFAULT_ADDRESS.replace('x', '1');

          config = {
            peers: {},
            peers_config: {
              root: {
                name: 'vpn-server',
                address,
                privateKey,
                publicKey,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            },
          };
          debug('Configuration generated.');
        }

        await this.__saveConfig(config);
        await Util.exec(`wg-quick down ${WG_INTERFACE}`).catch(() => { });
        await Util.exec(`wg-quick up ${WG_INTERFACE}`).catch(err => {
          if (err && err.message && err.message.includes(`Cannot find device "${WG_INTERFACE}"`)) {
            throw new Error(`WireGuard exited with the error: Cannot find device "${WG_INTERFACE}"\nThis usually means that your host's kernel does not support WireGuard!`);
          }

          throw err;
        });
        // await Util.exec(`iptables -t nat -A POSTROUTING -s ${WG_DEFAULT_ADDRESS.replace('x', '0')}/24 -o eth0 -j MASQUERADE`);
        // await Util.exec('iptables -A INPUT -p udp -m udp --dport 51820 -j ACCEPT');
        // await Util.exec(`iptables -A FORWARD -i ${WG_INTERFACE} -j ACCEPT`);
        // await Util.exec(`iptables -A FORWARD -o ${WG_INTERFACE} -j ACCEPT`);
        await this.__syncConfig();

        return config;
      });
    }

    return this.__configPromise;
  }

  async saveConfig() {
    const config = await this.getConfig();
    await this.__saveConfig(config);
    await this.__syncConfig();
  }

  async __saveConfig(config) {
    let result = `
# Note: Do not edit this file directly.
# Your changes will be overwritten!

# Server
[Interface]
PrivateKey = ${config.peers_config.root.privateKey}
Address = ${config.peers_config.root.address}/24
ListenPort = 51820
PostUp = ${WG_POST_UP}
PostDown = ${WG_POST_DOWN}
`;

    for (const [peerId, peer] of Object.entries(config.peers)) {
      if (!peer.enabled) continue;

      let peerConfig = { ...peer, ...config.peers_config[peerId] };

      result += `

# Client: ${peerConfig.name} (${peerId})
[Peer]
PublicKey = ${peerConfig.publicKey}
PresharedKey = ${peerConfig.preSharedKey}
AllowedIPs = ${peerConfig.address}/32`;
      while (Object.keys(peerConfig.peers).length !== 0) {
        for (const [peerId, peer] of Object.entries(peerConfig.peers)) {
          if (!peer.enabled) continue;
          peerConfig = { ...peer, ...config.peers_config[peerId] };
          result += `, ${peerConfig.address}/32`;
        }
      }
    }

    debug('Config saving...');
    await fs.writeFile(path.join(WG_PATH, `${WG_INTERFACE}.json`), JSON.stringify(config, false, 2), {
      mode: 0o660,
    });
    await fs.writeFile(path.join(WG_PATH, `${WG_INTERFACE}.conf`), result, {
      mode: 0o600,
    });
    debug('Config saved.');
  }

  async __syncConfig() {
    debug('Config syncing...');
    await Util.exec(`wg syncconf ${WG_INTERFACE} <(wg-quick strip ${WG_INTERFACE})`);
    debug('Config synced.');
  }

  async getClients() {
    const config = await this.getConfig();
    const clients = Object.entries(config.peers).map(([clientId, client]) => ({
      id: clientId,
      name: config.peers_config[clientId]['name'],
      enabled: client.enabled,
      address: config.peers_config[clientId]['address'],
      publicKey: config.peers_config[clientId]['publicKey'],
      createdAt: new Date(config.peers_config[clientId]['createdAt']),
      updatedAt: new Date(config.peers_config[clientId]['updatedAt']),
      allowedIPs: null,

      persistentKeepalive: null,
      latestHandshakeAt: null,
      transferRx: null,
      transferTx: null,
    }));

    // Loop WireGuard status
    const dump = await Util.exec(`wg show ${WG_INTERFACE} dump`, {
      log: false,
    });
    dump
      .trim()
      .split('\n')
      .slice(1)
      .forEach(line => {
        const [
          publicKey,
          preSharedKey, // eslint-disable-line no-unused-vars
          endpoint, // eslint-disable-line no-unused-vars
          allowedIps, // eslint-disable-line no-unused-vars
          latestHandshakeAt,
          transferRx,
          transferTx,
          persistentKeepalive,
        ] = line.split('\t');

        const client = clients.find(client => client.publicKey === publicKey);
        if (!client) return;

        client.latestHandshakeAt = latestHandshakeAt === '0'
          ? null
          : new Date(Number(`${latestHandshakeAt}000`));
        client.transferRx = Number(transferRx);
        client.transferTx = Number(transferTx);
        client.persistentKeepalive = persistentKeepalive;
      });

    return clients;
  }

  async getPeer({ clientId }) {
    const peerId = clientId;
    const config = await this.getConfig();
    const peer = config.peers_config[peerId];
    if (!peer) {
      throw new ServerError(`Peer Not Found: ${peerId}`, 404);
    }

    return peer;
  }

  async getClientConfiguration({ clientId }) {
    const peerId = clientId;
    const config = await this.getConfig();
    let peerConf = await this.getPeer({ clientId });

    let conf = `
[Interface]
PrivateKey = ${peerConf.privateKey}
Address = ${peerConf.address}/24
${WG_DEFAULT_DNS ? `DNS = ${WG_DEFAULT_DNS}` : ''}
${WG_MTU ? `MTU = ${WG_MTU}` : ''}`;

    const queue = new Queue();

    for (const [selfPeerId, selfPeer] of Object.entries(config.peers)) {
      peerConf = { ...selfPeer, ...config.peers_config[selfPeerId] };
      queue.enqueue([selfPeerId, peerConf]);

      // if part of self, then add self as a peer
      if (selfPeerId === peerId && selfPeer.enabled) {
        conf += `
# Peer: ${config.peers_config.root.name} (root)
[Peer]
PublicKey = ${config.peers_config.root.publicKey}
PresharedKey = ${peerConf.preSharedKey}
AllowedIPs = ${WG_ALLOWED_IPS}
PersistentKeepalive = ${WG_PERSISTENT_KEEPALIVE}
Endpoint = ${WG_HOST}:${WG_PORT}\n`;
      }
    }

    // traverse peers to see if peer exists as a peer in other peers
    while (queue.size() !== 0) {
      const [peerCandidateId, peerCandidate] = queue.dequeue();

      if (Object.keys(peerCandidate.peers).length !== 0) {
        if (peerCandidateId === peerId) {
          for (const [peerCandidateChildId, peerCandidateChild] of Object.entries(peerCandidate.peers)) {
            conf += `
# Peer: ${config.peers_config[peerCandidateChildId].name} (${peerCandidateChildId})
[Peer]
PublicKey = ${config.peers_config[peerCandidateChildId].publicKey}
PresharedKey = ${peerCandidateChild.preSharedKey}
AllowedIPs = ${config.peers_config[peerCandidateChildId].address}/32
PersistentKeepalive = ${WG_PERSISTENT_KEEPALIVE}
Endpoint = TODO
`;
          }
        }

        for (const [peerCandidateChildId, peerCandidateChild] of Object.entries(peerCandidate.peers)) {
          queue.enqueue([peerCandidateChildId, peerCandidateChild]);
          if (peerCandidateChildId === peerId) {
            conf += `
# Peer: ${config.peers_config[peerCandidateId].name} (${peerCandidateId})
[Peer]
PublicKey = ${config.peers_config[peerCandidateId].publicKey}
PresharedKey = ${peerCandidateChild.preSharedKey}
AllowedIPs = ${config.peers_config[peerCandidateId].address}/32
PersistentKeepalive = ${WG_PERSISTENT_KEEPALIVE}
Endpoint = TODO
`;
          }
        }
      }
    }
    // TODO: allow peers to forward depth>1 packets
    // TODO: endpoints
    return conf;
  }

  async getClientQRCodeSVG({ clientId }) {
    const config = await this.getClientConfiguration({ clientId });
    return QRCode.toString(config, {
      type: 'svg',
      width: 512,
    });
  }

  async createClient({ name }) {
    if (!name) {
      throw new Error('Missing: Name');
    }

    const config = await this.getConfig();

    const privateKey = await Util.exec('wg genkey');
    const publicKey = await Util.exec(`echo ${privateKey} | wg pubkey`);
    const preSharedKey = await Util.exec('wg genpsk');

    // Calculate next IP
    let address;
    for (let i = 2; i < 255; i++) {
      const client = Object.values(config.peers_config).find(client => {
        return client.address === WG_DEFAULT_ADDRESS.replace('x', i);
      });

      if (!client) {
        address = WG_DEFAULT_ADDRESS.replace('x', i);
        break;
      }
    }

    if (!address) {
      throw new Error('Maximum number of clients reached.');
    }

    // Create Client
    const clientId = uuid.v4();
    config.peers[clientId] = {
      preSharedKey,
      enabled: true,
      peers: {},
    };
    config.peers_config[clientId] = {
      name,
      address,
      privateKey,
      publicKey,

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // TODO: add the option to specify where to connect the new peer

    await this.saveConfig();
  }

  async deleteClient({ clientId }) {
    const config = await this.getConfig();

    if (config.peers_config[clientId]) {
      delete config.peers_config[clientId];
      delete config.peers[clientId];
      await this.saveConfig();
    }

  //  TODO: add the option to delete specific connections in the map
  }

  async enableClient({ clientId }) {
    const config = await this.getConfig();

    config.peers[clientId].enabled = true;
    config.peers_config[clientId].updatedAt = new Date();

    // TODO: add the option to enable/disable specific connections in the map

    await this.saveConfig();
  }

  async disableClient({ clientId }) {
    const config = await this.getConfig();

    config.peers[clientId].enabled = false;
    config.peers_config[clientId].updatedAt = new Date();

    // TODO: add the option to enable/disable specific connections in the map

    await this.saveConfig();
  }

  async updateClientName({ clientId, name }) {
    const config = await this.getConfig();

    config.peers_config[clientId].name = name;
    config.peers_config[clientId].updatedAt = new Date();

    await this.saveConfig();
  }

  async updateClientAddress({ clientId, address }) {
    const config = await this.getConfig();

    if (!Util.isValidIPv4(address)) {
      throw new ServerError(`Invalid Address: ${address}`, 400);
    }

    config.peers_config[clientId].address = address;
    config.peers_config[clientId].updatedAt = new Date();

    await this.saveConfig();
  }

  async getServerStatus() {
    const status = await Util.exec('wg', {
      log: false,
    });
    if (status.startsWith(`interface: ${WG_INTERFACE}`)) {
      return 'up';
    }
    return 'down';
  }

  async enableServer() {
    await Util.exec(`wg-quick up ${WG_INTERFACE}`, {
      log: false,
    });
  }

  async disableServer() {
    await Util.exec(`wg-quick down ${WG_INTERFACE}`, {
      log: false,
    });
  }

};
