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
  WG_SUBNET,
  WG_PRE_UP,
  WG_POST_UP,
  WG_PRE_DOWN,
  WG_POST_DOWN,
  WG_NETWORK_DEFAULTS,
  WG_PREAMBLE_EXPIRATON,
} = require('../config');

module.exports = class WireGuard {

  constructor() {
    this.preambles = [];
  }

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
          // override scripts on startup if set
          if (WG_PRE_UP.length > 0) {
            config.peers.root.scripts.PreUp = { enabled: true, value: WG_PRE_UP };
          }
          if (WG_POST_UP.length > 0) {
            config.peers.root.scripts.PostUp = { enabled: true, value: WG_POST_UP };
          }
          if (WG_PRE_DOWN.length > 0) {
            config.peers.root.scripts.PreDown = { enabled: true, value: WG_PRE_DOWN };
          }
          if (WG_POST_DOWN.length > 0) {
            config.peers.root.scripts.PostDown = { enabled: true, value: WG_POST_DOWN };
          }
          debug('Configuration loaded.');
        } catch (err) {
          const privateKey = await Util.exec('wg genkey');
          const publicKey = await Util.exec(`echo ${privateKey} | wg pubkey`, {
            log: 'echo ***hidden*** | wg pubkey',
          });
          const address = WireGuardHelper.getNextAvailableAddress({ subnet: WG_SUBNET, peers: {} });

          config = {
            peers: {
              root: {
                name: 'this-server',
                address,
                publicKey,
                privateKey,
                createdAt: new Date(),
                updatedAt: new Date(),
                mobility: 'static',
                endpoint: `${WG_HOST}:${WG_PORT}`,
                dns: { enabled: false, value: '' },
                mtu: { enabled: false, value: '' },
                scripts: {
                  PreUp: { enabled: WG_PRE_UP.length > 0, value: WG_PRE_UP },
                  PostUp: { enabled: WG_POST_UP.length > 0, value: WG_POST_UP },
                  PreDown: { enabled: WG_PRE_DOWN.length > 0, value: WG_PRE_DOWN },
                  PostDown: { enabled: WG_POST_DOWN.length > 0, value: WG_POST_DOWN },
                },
              },
            },
            connections: {},
            subnet: WG_SUBNET,
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
    const strippedConfig = { peers: {}, connections: {}, subnet: config.subnet };
    for (const [peerId, peer] of Object.entries(config.peers)) {
      strippedConfig.peers[peerId] = {
        name: peer.name,
        address: peer.address,
        publicKey: peer.publicKey,
        privateKey: peer.privateKey,
        createdAt: peer.createdAt,
        updatedAt: peer.updatedAt,
        mobility: peer.mobility,
        endpoint: peer.endpoint,
        dns: peer.dns,
        mtu: peer.mtu,
        scripts: peer.scripts,
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

  async getNetwork() {
    const config = await this.getConfig();

    // By default, set all these to null
    Object.keys(config.connections).forEach(peerConnectionId => {
      config.connections[peerConnectionId].latestHandshakeAt = null;
      config.connections[peerConnectionId].transferRx = 0;
      config.connections[peerConnectionId].transferTx = 0;
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
          persistentKeepalive, // eslint-disable-line no-unused-vars
        ] = line.split('\t');

        let clientId = null; // Object.values(config.peers).find(peer => peer.publicKey === publicKey);
        for (const [peerId, peerDetails] of Object.entries(config.peers)) {
          if (peerDetails.publicKey === publicKey) {
            clientId = peerId;
          }
        }
        if (clientId == null) return;

        const clientConnectionId = WireGuardHelper.getConnectionId('root', clientId);
        if (!config.connections[clientConnectionId]) return;

        config.connections[clientConnectionId].latestHandshakeAt = latestHandshakeAt === '0'
          ? null
          : new Date(Number(`${latestHandshakeAt}000`));
        config.connections[clientConnectionId].transferRx = Number(transferRx);
        config.connections[clientConnectionId].transferTx = Number(transferTx);
      });

    config.defaults = WG_NETWORK_DEFAULTS;
    config.timestamp = (new Date()).getTime();
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

  async peerCreatePreamble({ peerId, address }) {
    const config = await this.getConfig();

    const preamble = {
      peerId,
      address,
      expiration: null,
    };

    const askingForExtension = WireGuardHelper.checkField('peerId', peerId.toString())
        && WireGuardHelper.checkField('address', address.toString());

    this.preambles = this.preambles.filter(r => r.expiration > (new Date()).getTime());
    this.preambles = this.preambles.filter(r => Object.keys(config.peers).every(p => p !== r.peerId));
    if (this.preambles.length >= 100 && !askingForExtension) throw new Error('No address can be reserved.');

    if (!askingForExtension) {
      const configCopy = JSON.parse(JSON.stringify(config));
      this.preambles.forEach(p => {
        configCopy.peers[p.peerId] = { address: p.address };
      });
      // Calculate next IP
      preamble.address = WireGuardHelper.getNextAvailableAddress(configCopy);
      if (!preamble.address) throw new Error('Maximum number of peers reached.');

      preamble.peerId = uuid.v4();
      preamble.expiration = (new Date()).getTime() + WG_PREAMBLE_EXPIRATON;
      this.preambles.push(preamble);
    } else {
      let extendedExpiration = false;
      let isThereAClash = false;
      for (let i = 0; i < this.preambles.length; i++) {
        if (this.preambles[i].peerId === preamble.peerId && this.preambles[i].address === preamble.address) {
          this.preambles[i].expiration = (new Date()).getTime() + WG_PREAMBLE_EXPIRATON;
          preamble.expiration = this.preambles[i].expiration;
          extendedExpiration = true;
          break;
        }
        isThereAClash ||= this.preambles[i].peerId === preamble.peerId || this.preambles[i].address === preamble.address;
      }
      if (!isThereAClash && !extendedExpiration) {
        preamble.expiration = (new Date()).getTime() + WG_PREAMBLE_EXPIRATON;
        this.preambles.push(preamble);
      }
      if (isThereAClash && !extendedExpiration) throw new Error('This peerId/address pair can\'t be found.');
    }

    return preamble;
  }

  async peerDeletePreamble({ peerId, address }) {
    let preambleFound = false;
    let preambleErrorMsg = '';
    this.preambles.forEach(preamble => {
      if (preamble.peerId === peerId || preamble.address === address) {
        preambleFound = true;
        if (preamble.peerId === peerId
            && preamble.address !== address) preambleErrorMsg = 'Assigned peerId\'s address doesn\t match!';
        if (preamble.address === address
            && preamble.peerId !== peerId) preambleErrorMsg = 'Assigned address\'s peerId doesn\t match!';
      }
    });
    if (!preambleFound) throw new Error('preamble not found!');
    if (preambleErrorMsg !== '') throw new Error(preambleErrorMsg);
    this.preambles = this.preambles.filter(r => !(r.peerId === peerId && r.address === address));
  }

  async createPeer({
    peerId, address, name, mobility, dns, mtu, endpoint, scripts, attachedPeers,
  }) {
    if (!name) throw new Error('Missing: Name : str');

    if (endpoint) {
      if (!WireGuardHelper.checkField('endpoint', endpoint)) throw new Error('Couldn\'t parse: Endpoint : str (in the format x.x.x.x:x)');
    }

    // TODO: change the error message to reflect the changes in the API schema
    if (!attachedPeers) throw new Error('Missing: attachedPeers : array ([peerId: str, allowedIPs: str (in the format x.x.x.x/32)])');
    if (!attachedPeers.length) throw new Error('Couldn\'t parse: attachedPeers : array ([peerId: str, allowedIPs: str (in the format x.x.x.x/32)])');
    for (const attachedPeer of attachedPeers) {
      if (!attachedPeer.peer || !attachedPeer.allowedIPsAtoB || !attachedPeer.allowedIPsBtoA) throw new Error('Couldn\'t parse: attachedPeers : array ([{peerId: str, allowedIPs: str (in the format x.x.x.x/32)}, ...])');
      if (!await this.getPeer({ peerId: attachedPeer.peer })) throw new Error(`attachedPeer doesn't exist: ${attachedPeer.peer}`);
      if (!WireGuardHelper.checkField('allowedIPs', attachedPeer.allowedIPsAtoB)) throw new Error(`allowedIPs couldn't be parsed: ${attachedPeer.allowedIPsAtoB}`);
      if (!WireGuardHelper.checkField('allowedIPs', attachedPeer.allowedIPsBtoA)) throw new Error(`allowedIPs couldn't be parsed: ${attachedPeer.allowedIPsBtoA}`);
    }

    const config = await this.getConfig();

    const privateKey = await Util.exec('wg genkey');
    const publicKey = await Util.exec(`echo ${privateKey} | wg pubkey`);

    if (!WireGuardHelper.checkField('dns', dns)) throw new Error('DNS error.');
    if (!WireGuardHelper.checkField('mtu', mtu)) throw new Error('MTU error.');

    if (!WireGuardHelper.checkField('scripts', scripts)) throw new Error('PreUp, PostUp, PreDown, PostDown scripts error.');

    if (peerId === null || address === null) {
      const { p, a } = await this.peerCreatePreamble();
      peerId = p;
      address = a;
    } else {
      let preambleErrorMsg = '';
      this.preambles.forEach(preamble => {
        if (preamble.peerId === peerId || preamble.address === address) {
          if (preamble.peerId === peerId
              && preamble.address !== address) preambleErrorMsg = 'Assigned peerId\'s address doesn\t match!';
          if (preamble.address === address
              && preamble.peerId !== peerId) preambleErrorMsg = 'Assigned address\'s peerId doesn\t match!';
          if ((new Date()).getTime() > preamble.expiration) preambleErrorMsg = 'This preamble entry is expired!';
        }
      });
      if (preambleErrorMsg !== '') throw new Error(preambleErrorMsg);
    }
    // Create Peer
    config.peers[peerId] = {
      name,
      address,
      publicKey,
      privateKey,
      mobility,
      endpoint,
      dns,
      mtu,
      scripts,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // create the connections
    // TODO: add check for incoming connection id and fields
    for (const attachedPeer of attachedPeers) {
      const connectionId = WireGuardHelper.getConnectionId(peerId, attachedPeer.peer);
      const preSharedKey = await Util.exec('wg genpsk');
      config.connections[connectionId] = {
        preSharedKey,
        enabled: attachedPeer.enabled,
        allowedIPsAtoB: attachedPeer.allowedIPsAtoB,
        allowedIPsBtoA: attachedPeer.allowedIPsBtoA,
        persistentKeepalive: attachedPeer.persistentKeepalive,
      };
    }

    await this.saveConfig();
  }

  async createConnection({
    connectionId, enabled, persistentKeepalive, allowedIPsAtoB, allowedIPsBtoA,
  }) {
    const config = await this.getConfig();
    if (!connectionId) throw new Error('Missing: connectionId');
    const peers = [];
    for (const peerId of connectionId.split('*')) {
      if (!Object.keys(config.peers).includes(peerId)) throw new Error(`Couldn't parse: connectionId: ${peerId} doesn't exist`);
      peers.push(peerId);
    }
    if (peers.length === 2 && WireGuardHelper.getConnectionId(peers[0], peers[1]) !== connectionId) throw new Error('Couldn\'t parse: connectionId: wrong order or peers');

    if (!(enabled === true || enabled === false)) throw new Error('Couldn\'t parse: enabled : enabled is either true or false');

    if (!persistentKeepalive) throw new Error('Missing: persistentKeepalive : {"enabled": false, "value": "25"}');
    if (!Object.keys(persistentKeepalive).includes('enabled')
        || !Object.keys(persistentKeepalive).includes('value')) throw new Error('Couldn\'t parse: persistentKeepalive : {"enabled": false, "value": "25"}');
    if (!(persistentKeepalive.enabled === true || persistentKeepalive.enabled === false)
        || !WireGuardHelper.checkField('persistentKeepalive', persistentKeepalive.value)) throw new Error('Couldn\'t parse: persistentKeepalive : {"enabled": false, "value": "25"}');

    if (!WireGuardHelper.checkField('allowedIPs', allowedIPsAtoB)) throw new Error(`Couldn't parse: allowedIPsAtoB: ${allowedIPsAtoB}`);
    if (!WireGuardHelper.checkField('allowedIPs', allowedIPsBtoA)) throw new Error(`Couldn't parse: allowedIPsBtoA: ${allowedIPsBtoA}`);

    // create the connection
    const preSharedKey = await Util.exec('wg genpsk');
    config.connections[connectionId] = {
      preSharedKey,
      enabled,
      allowedIPsAtoB,
      allowedIPsBtoA,
      persistentKeepalive,
    };

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

  async deleteConnection({ connectionId }) {
    const config = await this.getConfig();
    if (!await this.getConnection({ connectionId })) return;

    delete config.connections[connectionId];
    await this.saveConfig();
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
      if (!WireGuardHelper.checkField('endpoint', endpoint)) throw new Error('Couldn\'t parse: Endpoint : str (in the format x.x.x.x:x or example.com:x)');
    }

    if (mobility === 'static' && !(endpoint || config.peers[peerId].endpoint)) throw new Error('Can\'t set the mobility to \'static\' with no endpoint!');

    if (mobility) config.peers[peerId].mobility = mobility;
    if (endpoint) config.peers[peerId].endpoint = endpoint;
    config.peers[peerId].updatedAt = new Date();

    await this.saveConfig();
  }

  async updatePeerDNS({ peerId, dns }) {
    const config = await this.getConfig();
    if (!await this.getPeer({ peerId })) return;

    if (!('enabled' in dns)) dns.enabled = config.peers[peerId].dns.enabled;
    if (!('value' in dns)) dns.value = config.peers[peerId].dns.value;

    if (!WireGuardHelper.checkField('dns', dns)) throw new Error('DNS error.');

    config.peers[peerId].dns = dns;
    config.peers[peerId].updatedAt = new Date();

    await this.saveConfig();
  }

  async updatePeerMTU({ peerId, mtu }) {
    const config = await this.getConfig();
    if (!await this.getPeer({ peerId })) return;

    if (!('enabled' in mtu)) mtu.enabled = config.peers[peerId].mtu.enabled;
    if (!('value' in mtu)) mtu.value = config.peers[peerId].mtu.value;

    if (!WireGuardHelper.checkField('mtu', mtu)) throw new Error('MTU error.');

    config.peers[peerId].mtu = mtu;
    config.peers[peerId].updatedAt = new Date();

    await this.saveConfig();
  }

  async updatePeerScripts({ peerId, scripts }) {
    const config = await this.getConfig();
    if (!await this.getPeer({ peerId })) return;

    for (const [peerScriptField, peerConfigValue] of Object.entries({
      PreUp: config.peers[peerId].scripts.PreUp,
      PostUp: config.peers[peerId].scripts.PostUp,
      PreDown: config.peers[peerId].scripts.PreDown,
      PostDown: config.peers[peerId].scripts.PostDown,
    })) {
      if (Object.keys(scripts).includes(peerScriptField)) {
        if (!('enabled' in scripts[peerScriptField])) scripts[peerScriptField].enabled = peerConfigValue.enabled;
        if (!('value' in scripts[peerScriptField])) scripts[peerScriptField].value = peerConfigValue.value;
      } else {
        scripts[peerScriptField] = peerConfigValue;
      }
    }
    config.peers[peerId].scripts = scripts;
    config.peers[peerId].updatedAt = new Date();

    await this.saveConfig();
  }

  async updatePeerKeys({ peerId, publicKey, privateKey }) {
    const config = await this.getConfig();
    if (!await this.getPeer({ peerId })) return;

    // TODO: add check for incoming keys
    if (publicKey && privateKey) {
      config.peers[peerId].publicKey = publicKey;
      config.peers[peerId].privateKey = privateKey;
    } else {
      throw new Error('Couldn\'t parse incoming publicKey or privateKey');
    }
    config.peers[peerId].updatedAt = new Date();

    await this.saveConfig();
  }

  async updateConnectionKey({ connectionId, preSharedKey }) {
    const config = await this.getConfig();
    if (!await this.getConnection({ connectionId })) return;

    // TODO: add check for incoming keys
    if (preSharedKey) {
      config.connections[connectionId].preSharedKey = preSharedKey;
    } else {
      throw new Error('Couldn\'t parse incoming preSharedKey');
    }
    const { a, b } = WireGuardHelper.getConnectionPeers(connectionId);
    config.peers[a].updatedAt = new Date();
    config.peers[b].updatedAt = new Date();

    await this.saveConfig();
  }

  async enableConnection({ connectionId, enabled }) {
    const config = await this.getConfig();
    if (!await this.getConnection({ connectionId })) return;

    config.connections[connectionId].enabled = enabled;
    const { a, b } = WireGuardHelper.getConnectionPeers(connectionId);
    config.peers[a].updatedAt = new Date();
    config.peers[b].updatedAt = new Date();

    await this.saveConfig();
  }

  async updateConnectionAllowedIPs({ connectionId, AtoB, BtoA }) {
    const config = await this.getConfig();
    if (!await this.getConnection({ connectionId })) return;

    if (AtoB !== null) {
      if (!WireGuardHelper.checkField('allowedIPs', AtoB)) throw new Error(`allowedIPs couldn't be parsed: ${AtoB}`);
      config.connections[connectionId].allowedIPsAtoB = AtoB;
    }
    if (BtoA !== null) {
      if (!WireGuardHelper.checkField('allowedIPs', BtoA)) throw new Error(`allowedIPs couldn't be parsed: ${BtoA}`);
      config.connections[connectionId].allowedIPsBtoA = BtoA;
    }
    const { a, b } = WireGuardHelper.getConnectionPeers(connectionId);
    config.peers[a].updatedAt = new Date();
    config.peers[b].updatedAt = new Date();

    await this.saveConfig();
  }

  async updateConnectionPersistentKeepalive({ connectionId, enabled, value }) {
    const config = await this.getConfig();
    if (!await this.getConnection({ connectionId })) return;

    if (enabled !== null) {
      config.connections[connectionId].persistentKeepalive.enabled = enabled;
    }
    if (value !== null) {
      if (!WireGuardHelper.checkField('persistentKeepalive', value)) throw new Error(`PersistentKeepalive couldn't be parsed: ${value}`);
      config.connections[connectionId].persistentKeepalive.value = value;
    }
    const { a, b } = WireGuardHelper.getConnectionPeers(connectionId);
    config.peers[a].updatedAt = new Date();
    config.peers[b].updatedAt = new Date();

    await this.saveConfig();
  }

  async getNewKeypair() {
    const privateKey = await Util.exec('wg genkey');
    const publicKey = await Util.exec(`echo ${privateKey} | wg pubkey`, {
      log: 'echo ***hidden*** | wg pubkey',
    });
    return { publicKey, privateKey };
  }

  async getNewPreSharedKey() {
    return { preSharedKey: await Util.exec('wg genpsk') };
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
    await Util.exec(`wg-quick up ${WG_INTERFACE}`);
  }

  async disableServer() {
    await Util.exec(`wg-quick down ${WG_INTERFACE}`);
  }

};
