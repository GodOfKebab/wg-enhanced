/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

'use strict';

class API {

  constructor(onCatch, onFinally) {
    this.onCatch = onCatch;
    this.onFinally = onFinally;
  }

  async call({ method, path, body }) {
    const res = await fetch(`/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body
        ? JSON.stringify(body)
        : undefined,
    });

    if (res.status === 204) {
      return undefined;
    }

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || res.statusText);
    }

    return json;
  }

  async getRelease() {
    return this.call({
      method: 'get',
      path: '/release',
    });
  }

  async getSession() {
    return this.call({
      method: 'get',
      path: '/session',
    });
  }

  async createSession({ password }) {
    return this.call({
      method: 'post',
      path: '/session',
      body: { password },
    });
  }

  async deleteSession() {
    return this.call({
      method: 'delete',
      path: '/session',
    });
  }

  async getNetwork() {
    return this.call({
      method: 'get',
      path: '/wireguard/network',
    });
  }

  async getPeers() {
    return this.call({
      method: 'get',
      path: '/wireguard/peer',
    }).then(peers => peers.map(peer => ({
      ...peer,
      createdAt: new Date(peer.createdAt),
      updatedAt: new Date(peer.updatedAt),
      latestHandshakeAt: peer.latestHandshakeAt !== null
        ? new Date(peer.latestHandshakeAt)
        : null,
    })));
  }

  async preamblePeer({ peerId, address }) {
    return this.call({
      method: 'get',
      path: `/wireguard/peer/preamble/${peerId}/${address}`,
    }).catch(this.onCatch).finally(this.onFinally);
  }

  async deletePreamble({ peerId, address }) {
    return this.call({
      method: 'delete',
      path: `/wireguard/peer/preamble/${peerId}/${address}`,
    }).catch(this.onCatch).finally(this.onFinally);
  }

  async createPeer({ peerId, address, name, mobility, dns, mtu, endpoint, scripts, attachedPeers }) {
    return this.call({
      method: 'post',
      path: '/wireguard/peer',
      body: { peerId, address, name, mobility, dns, mtu, endpoint, scripts, attachedPeers },
    }).catch(this.onCatch).finally(this.onFinally);
  }

  async createConnection({ connectionId, enabled, persistentKeepalive, allowedIPsAtoB, allowedIPsBtoA }) {
    return this.call({
      method: 'post',
      path: '/wireguard/connection',
      body: { connectionId, enabled, persistentKeepalive, allowedIPsAtoB, allowedIPsBtoA },
    }).catch(this.onCatch).finally(this.onFinally);
  }

  async deletePeer(peerId) {
    return this.call({
      method: 'delete',
      path: `/wireguard/peer/${peerId}`,
    }).catch(this.onCatch).finally(this.onFinally);
  }

  async deleteConnection({ connectionId }) {
    return this.call({
      method: 'delete',
      path: `/wireguard/connection/${connectionId}`,
    }).catch(this.onCatch).finally(this.onFinally);
  }

  async enablePeer(peerId) {
    return this.call({
      method: 'post',
      path: `/wireguard/peer/${peerId}/enable`,
    }).catch(this.onCatch).finally(this.onFinally);
  }

  async disablePeer(peerId) {
    return this.call({
      method: 'post',
      path: `/wireguard/peer/${peerId}/disable`,
    }).catch(this.onCatch).finally(this.onFinally);
  }

  async updatePeerName(peerId, name) {
    return this.call({
      method: 'put',
      path: `/wireguard/peer/${peerId}/name/`,
      body: { name },
    }).catch(this.onCatch).finally(this.onFinally);
  }

  async updatePeerAddress(peerId, address) {
    return this.call({
      method: 'put',
      path: `/wireguard/peer/${peerId}/address/`,
      body: { address },
    }).catch(this.onCatch).finally(this.onFinally);
  }

  async updatePeerEndpoint(peerId, mobility, endpoint) {
    return this.call({
      method: 'put',
      path: `/wireguard/peer/${peerId}/endpoint/`,
      body: { mobility, endpoint },
    }).catch(this.onCatch).finally(this.onFinally);
  }

  async updatePeerDNS(peerId, dns) {
    return this.call({
      method: 'put',
      path: `/wireguard/peer/${peerId}/dns/`,
      body: { dns },
    }).catch(this.onCatch).finally(this.onFinally);
  }

  async updatePeerMTU(peerId, mtu) {
    return this.call({
      method: 'put',
      path: `/wireguard/peer/${peerId}/mtu/`,
      body: { mtu },
    }).catch(this.onCatch).finally(this.onFinally);
  }

  async updatePeerScripts(peerId, scripts) {
    return this.call({
      method: 'put',
      path: `/wireguard/peer/${peerId}/scripts/`,
      body: { scripts },
    }).catch(this.onCatch).finally(this.onFinally);
  }

  async updatePeerKeys(peerId, publicKey, privateKey) {
    return this.call({
      method: 'put',
      path: `/wireguard/peer/${peerId}/keys/`,
      body: { publicKey, privateKey },
    }).catch(this.onCatch).finally(this.onFinally);
  }

  async updateConnectionKey(connectionId, preSharedKey) {
    return this.call({
      method: 'put',
      path: `/wireguard/connection/${connectionId}/key/`,
      body: { preSharedKey },
    }).catch(this.onCatch).finally(this.onFinally);
  }

  async enableConnection(connectionId) {
    return this.call({
      method: 'put',
      path: `/wireguard/connection/${connectionId}/enable/`,
    }).catch(this.onCatch).finally(this.onFinally);
  }

  async disableConnection(connectionId) {
    return this.call({
      method: 'put',
      path: `/wireguard/connection/${connectionId}/disable/`,
    }).catch(this.onCatch).finally(this.onFinally);
  }

  async updateConnectionAllowedIPs(connectionId, AtoB, BtoA) {
    return this.call({
      method: 'put',
      path: `/wireguard/connection/${connectionId}/allowedIPs/`,
      body: { AtoB, BtoA },
    }).catch(this.onCatch).finally(this.onFinally);
  }

  async updateConnectionPersistentKeepalive(connectionId, enabled, value) {
    return this.call({
      method: 'put',
      path: `/wireguard/connection/${connectionId}/persistentKeepalive/`,
      body: { enabled, value },
    }).catch(this.onCatch).finally(this.onFinally);
  }

  async getWirGuardStatus() {
    return this.call({
      method: 'get',
      path: '/wireguard/server/status',
    });
  }

  async getNewKeyPairs() {
    return this.call({
      method: 'get',
      path: '/wireguard/keypair',
    }).catch(this.onCatch).finally(this.onFinally);
  }

  async getNewPreSharedKey() {
    return this.call({
      method: 'get',
      path: '/wireguard/preSharedKey',
    }).catch(this.onCatch).finally(this.onFinally);
  }

  async wireguardEnable() {
    return this.call({
      method: 'post',
      path: '/wireguard/server/enable',
    }).catch(this.onCatch).finally(this.onFinally);
  }

  async wireguardDisable() {
    return this.call({
      method: 'post',
      path: '/wireguard/server/disable',
    }).catch(this.onCatch).finally(this.onFinally);
  }

}
