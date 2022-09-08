/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

'use strict';

class API {

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

  async createPeer({ name, mobility, dns, mtu, endpoint, attachedPeers }) {
    return this.call({
      method: 'post',
      path: '/wireguard/peer',
      body: { name, mobility, dns, mtu, endpoint, attachedPeers },
    });
  }

  async deletePeer({ peerId }) {
    return this.call({
      method: 'delete',
      path: `/wireguard/peer/${peerId}`,
    });
  }

  async enablePeer({ peerId }) {
    return this.call({
      method: 'post',
      path: `/wireguard/peer/${peerId}/enable`,
    });
  }

  async disablePeer({ peerId }) {
    return this.call({
      method: 'post',
      path: `/wireguard/peer/${peerId}/disable`,
    });
  }

  async updatePeerName({ peerId, name }) {
    return this.call({
      method: 'put',
      path: `/wireguard/peer/${peerId}/name/`,
      body: { name },
    });
  }

  async updatePeerAddress({ peerId, address }) {
    return this.call({
      method: 'put',
      path: `/wireguard/peer/${peerId}/address/`,
      body: { address },
    });
  }

  async updatePeerEndpoint({ peerId, mobility, endpoint }) {
    return this.call({
      method: 'put',
      path: `/wireguard/peer/${peerId}/endpoint/`,
      body: { mobility, endpoint },
    });
  }

  async updatePeerDNS({ peerId, dns }) {
    return this.call({
      method: 'put',
      path: `/wireguard/peer/${peerId}/dns/`,
      body: { dns },
    });
  }

  async updatePeerMTU({ peerId, mtu }) {
    return this.call({
      method: 'put',
      path: `/wireguard/peer/${peerId}/mtu/`,
      body: { mtu },
    });
  }

  async updateConnectionAllowedIPs({ connectionId, AtoB, BtoA }) {
    return this.call({
      method: 'put',
      path: `/wireguard/connection/${connectionId}/allowedIPs/`,
      body: { AtoB, BtoA },
    });
  }

  async getWirGuardStatus() {
    return this.call({
      method: 'get',
      path: '/wireguard/server/status',
    });
  }

  async wireguardEnable() {
    return this.call({
      method: 'post',
      path: '/wireguard/server/enable',
    });
  }

  async wireguardDisable() {
    return this.call({
      method: 'post',
      path: '/wireguard/server/disable',
    });
  }

}
