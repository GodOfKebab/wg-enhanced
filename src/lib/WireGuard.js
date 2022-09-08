'use strict';

const fs = require('fs').promises;
const path = require('path');

const debug = require('debug')('WireGuard');
const uuid = require('uuid');

const Util = require('./Util');
const ServerError = require('./ServerError');

const WireGuardHelper = require('../www/js/WireGuardHelper');

const {
  WG_INTERFACE,
  WG_PATH,
  WG_HOST,
  WG_PORT,
  WG_MTU,
  WG_DEFAULT_DNS,
  WG_DEFAULT_ADDRESS,
  WG_PERSISTENT_KEEPALIVE,
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
            connections: {},
            peers: {
              root: {
                name: 'this-server',
                address,
                privateKey,
                publicKey,
                createdAt: new Date(),
                updatedAt: new Date(),
                mobility: 'static',
                endpoint: `${WG_HOST}:${WG_PORT}`,
                dns: {
                  enabled: false,
                  value: '',
                },
                mtu: {
                  enabled: false,
                  value: '',
                },
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
    debug('Config saving...');
    const strippedConfig = { peers: {}, connections: {} };
    for (const [peerId, peer] of Object.entries(config.peers)) {
      strippedConfig.peers[peerId] = {
        name: peer.name,
        address: peer.address,
        privateKey: peer.privateKey,
        publicKey: peer.publicKey,
        createdAt: peer.createdAt,
        updatedAt: peer.updatedAt,
        mobility: peer.mobility,
        endpoint: peer.endpoint,
        dns: peer.dns,
        mtu: peer.mtu,
      };
    }
    for (const [connectionId, connection] of Object.entries(config.connections)) {
      strippedConfig.connections[connectionId] = {
        preSharedKey: connection.preSharedKey,
        enabled: connection.enabled,
        allowedIPsAtoB: connection.allowedIPsAtoB,
        allowedIPsBtoA: connection.allowedIPsBtoA,
        persistentKeepalive: connection.persistentKeepalive,
      };
    }
    await fs.writeFile(path.join(WG_PATH, `${WG_INTERFACE}.json`), JSON.stringify(strippedConfig, false, 2), {
      mode: 0o660,
    });
    await fs.writeFile(path.join(WG_PATH, `${WG_INTERFACE}.conf`), WireGuardHelper.getPeerConfig(config, 'root'), {
      mode: 0o600,
    });
    debug('Config saved.');
  }

  async __syncConfig() {
    debug('Config syncing...');
    await Util.exec(`wg syncconf ${WG_INTERFACE} <(wg-quick strip ${WG_INTERFACE})`);
    debug('Config synced.');
  }

  getConnectionId(peer1, peer2) {
    if (peer1.localeCompare(peer2, 'en') === 1) return `${peer1}*${peer2}`;
    return `${peer2}*${peer1}`;
  }

  async getNetwork() {
    const config = await this.getConfig();

    // By default, set all these to null
    Object.keys(config.connections).forEach(peerConnectionId => {
      config.connections[peerConnectionId].latestHandshakeAt = null;
      config.connections[peerConnectionId].transferRx = null;
      config.connections[peerConnectionId].transferTx = null;
      config.connections[peerConnectionId].persistentKeepalive = null;
    });

    // Loop WireGuard status to fill the above values
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

        let clientId = null; // Object.values(config.peers).find(peer => peer.publicKey === publicKey);
        for (const [peerId, peerDetails] of Object.entries(config.peers)) {
          if (peerDetails.publicKey === publicKey) {
            clientId = peerId;
          }
        }
        if (clientId == null) return;

        const clientConnectionId = this.getConnectionId('root', clientId);
        if (!config.connections[clientConnectionId]) return;

        config.connections[clientConnectionId].latestHandshakeAt = latestHandshakeAt === '0'
          ? null
          : new Date(Number(`${latestHandshakeAt}000`));
        config.connections[clientConnectionId].transferRx = Number(transferRx);
        config.connections[clientConnectionId].transferTx = Number(transferTx);
        config.connections[clientConnectionId].persistentKeepalive = persistentKeepalive === 'off' ? 0 : persistentKeepalive;
      });

    return config;
  }

  async getPeer({ peerId }) {
    const config = await this.getConfig();
    const peer = config.peers[peerId];
    if (!peer) {
      throw new ServerError(`Peer Not Found: ${peerId}`, 404);
    }

    return peer;
  }

  async getConnection({ connectionId }) {
    const config = await this.getConfig();
    const connection = config.connections[connectionId];
    if (!connection) {
      throw new ServerError(`Connection Not Found: ${connectionId}`, 404);
    }

    return connection;
  }

  async createPeer({
    name, mobility, dns, mtu, endpoint, attachedPeers,
  }) {
    if (!name) throw new Error('Missing: Name : str');

    if (endpoint) {
      let peerCreateEligibilityEndpoint = endpoint.match('^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?):(0|6[0-5][0-5][0-3][0-5]|[1-5][0-9][0-9][0-9][0-9]|[1-9][0-9]{0,3})$');
      peerCreateEligibilityEndpoint ||= endpoint.match('^(((?!\\-))(xn\\-\\-)?[a-z0-9\\-_]{0,61}[a-z0-9]{1,1}\\.)*(xn\\-\\-)?([a-z0-9\\-]{1,61}|[a-z0-9\\-]{1,30})\\.[a-z]{2,}:(0|6[0-5][0-5][0-3][0-5]|[1-5][0-9][0-9][0-9][0-9]|[1-9][0-9]{0,3})$');
      if (!peerCreateEligibilityEndpoint) throw new Error('Couldn\'t parse: Endpoint : str (in the format x.x.x.x:x)');
    }

    if (!attachedPeers) throw new Error('Missing: attachedPeers : array ([peerId: str, allowedIPs: str (in the format x.x.x.x/32)])');
    if (!attachedPeers.length) throw new Error('Couldn\'t parse: attachedPeers : array ([peerId: str, allowedIPs: str (in the format x.x.x.x/32)])');
    for (const attachedPeer of attachedPeers) {
      if (!attachedPeer.peer || !attachedPeer.allowedIPs) throw new Error('Couldn\'t parse: attachedPeers : array ([{peerId: str, allowedIPs: str (in the format x.x.x.x/32)}, ...])');
      if (!await this.getPeer({ peerId: attachedPeer.peer })) throw new Error(`attachedPeer doesn't exist: ${attachedPeer.peer}`);
      const allowedIPsEligibility = attachedPeer.allowedIPs.match('^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\/(3[0-2]|2[0-9]|[0-9]))(,((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\/(3[0-2]|2[0-9]|[0-9])))*$');
      if (!allowedIPsEligibility) throw new Error(`allowedIPs couldn't be parsed: ${attachedPeer.allowedIPs}`);
    }

    const config = await this.getConfig();

    const privateKey = await Util.exec('wg genkey');
    const publicKey = await Util.exec(`echo ${privateKey} | wg pubkey`);

    // Calculate next IP
    let address;
    for (let i = 2; i < 255; i++) {
      const peer = Object.values(config.peers).find(peer => {
        return peer.address === WG_DEFAULT_ADDRESS.replace('x', i);
      });

      if (!peer) {
        address = WG_DEFAULT_ADDRESS.replace('x', i);
        break;
      }
    }

    if (!address) {
      throw new Error('Maximum number of peers reached.');
    }

    let checkDNSMTU = dns.enabled === true || dns.enabled === false || mtu.enabled === true || mtu.enabled === false;
    checkDNSMTU &&= !(dns.enabled === true && !dns.value.toString().match('^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'));
    checkDNSMTU &&= !(mtu.enabled === true && !(mtu.value > 0 && mtu.value < 65536));

    if (!checkDNSMTU) {
      throw new Error('DNS/MTU error.');
    }

    // Create Peer
    const peerId = uuid.v4();
    config.peers[peerId] = {
      name,
      address,
      privateKey,
      publicKey,
      mobility,
      endpoint,
      dns,
      mtu,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // create the connections
    for (const attachedPeer of attachedPeers) {
      const connectionId = this.getConnectionId(peerId, attachedPeer.peer);
      const preSharedKey = await Util.exec('wg genpsk');
      config.connections[connectionId] = {
        preSharedKey,
        enabled: true,
        allowedIPsAtoB: connectionId.startsWith(peerId) ? attachedPeer.allowedIPs : `${address}/32`,
        allowedIPsBtoA: !connectionId.startsWith(peerId) ? attachedPeer.allowedIPs : `${address}/32`,
        persistentKeepalive: attachedPeer.persistentKeepalive,
      };
    }

    await this.saveConfig();
  }

  async deletePeer({ peerId }) {
    const config = await this.getConfig();
    if (!await this.getPeer({ peerId })) return;

    for (const [connectionPeers] of Object.entries(config.connections)) {
      if (connectionPeers.includes(peerId)) {
        delete config.connections[connectionPeers];
      }
    }
    delete config.peers[peerId];
    await this.saveConfig();

  //  TODO: add the option to delete specific connections in the map
  }

  async enablePeer({ peerId }) {
    const config = await this.getConfig();
    if (!await this.getPeer({ peerId })) return;

    for (const [connectionPeers, connectionDetails] of Object.entries(config.connections)) {
      if (!connectionPeers.includes(peerId)) continue;
      connectionDetails.enabled = true;
    }
    config.peers[peerId].updatedAt = new Date();

    // TODO: add the option to enable/disable specific connections in the map

    await this.saveConfig();
  }

  async disablePeer({ peerId }) {
    const config = await this.getConfig();
    if (!await this.getPeer({ peerId })) return;

    for (const [connectionPeers, connectionDetails] of Object.entries(config.connections)) {
      if (!connectionPeers.includes(peerId)) continue;
      connectionDetails.enabled = false;
    }
    config.peers[peerId].updatedAt = new Date();

    // TODO: add the option to enable/disable specific connections in the map

    await this.saveConfig();
  }

  async updatePeerName({ peerId, name }) {
    const config = await this.getConfig();
    if (!await this.getPeer({ peerId })) return;

    config.peers[peerId].name = name;
    config.peers[peerId].updatedAt = new Date();

    await this.saveConfig();
  }

  async updatePeerAddress({ peerId, address }) {
    const config = await this.getConfig();
    if (!await this.getPeer({ peerId })) return;

    // TODO: check to see if the address is in the subnet
    if (!Util.isValidIPv4(address)) {
      throw new ServerError(`Invalid Address: ${address}`, 400);
    }

    config.peers[peerId].address = address;
    config.peers[peerId].updatedAt = new Date();

    await this.saveConfig();
  }

  async updatePeerEndpoint({ peerId, mobility, endpoint }) {
    const config = await this.getConfig();
    if (!await this.getPeer({ peerId })) return;

    if (endpoint) {
      let peerCreateEligibilityEndpoint = endpoint.match('^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?):(0|6[0-5][0-5][0-3][0-5]|[1-5][0-9][0-9][0-9][0-9]|[1-9][0-9]{0,3})$');
      peerCreateEligibilityEndpoint ||= endpoint.match('^(((?!\\-))(xn\\-\\-)?[a-z0-9\\-_]{0,61}[a-z0-9]{1,1}\\.)*(xn\\-\\-)?([a-z0-9\\-]{1,61}|[a-z0-9\\-]{1,30})\\.[a-z]{2,}:(0|6[0-5][0-5][0-3][0-5]|[1-5][0-9][0-9][0-9][0-9]|[1-9][0-9]{0,3})$');
      if (!peerCreateEligibilityEndpoint) throw new Error('Couldn\'t parse: Endpoint : str (in the format x.x.x.x:x or example.com:x)');
    }

    if (mobility === 'static' && !(endpoint || config.peers[peerId].endpoint)) throw new Error('Can\'t set the mobility to \'static\' with no endpoint!');

    if (mobility) config.peers[peerId].mobility = mobility;
    if (endpoint) config.peers[peerId].endpoint = endpoint;
    config.peers[peerId].updatedAt = new Date();

    await this.saveConfig();
  }

  async updateClientAllowedIPs({ connectionId, AtoB, BtoA }) {
    const config = await this.getConfig();
    if (!await this.getConnection({ connectionId })) return;

    if (AtoB !== null) {
      const allowedIPsEligibility = AtoB.match('^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\/(3[0-2]|2[0-9]|[0-9]))(,((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\/(3[0-2]|2[0-9]|[0-9])))*$');
      if (!allowedIPsEligibility) throw new Error(`allowedIPs couldn't be parsed: ${AtoB}`);
      config.connections[connectionId].allowedIPsAtoB = AtoB;
    }
    if (BtoA !== null) {
      const allowedIPsEligibility = BtoA.match('^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\/(3[0-2]|2[0-9]|[0-9]))(,((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\/(3[0-2]|2[0-9]|[0-9])))*$');
      if (!allowedIPsEligibility) throw new Error(`allowedIPs couldn't be parsed: ${BtoA}`);
      config.connections[connectionId].allowedIPsBtoA = BtoA;
    }
    // TODO: get peerIds and update them.
    // config.peers[peerId].updatedAt = new Date();

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
