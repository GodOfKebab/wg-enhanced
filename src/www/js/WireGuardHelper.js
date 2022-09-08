/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

'use strict';

class WireGuardHelper {

  static getPeerConfig(network, peerId) {
    const peer = network.peers[peerId];

    let conf = `[Interface]
PrivateKey = ${peer.privateKey}
Address = ${peer.address}/24
${peer.mobility === 'static' ? `ListenPort = ${peer.endpoint.toString().split(':')[1]}` : 'DEL'}
${peer.dns.enabled ? `DNS = ${peer.dns.ip}` : 'DEL'}
${peer.mtu.enabled ? `MTU = ${peer.mtu.value}` : 'DEL'}\n`.replaceAll('DEL\n', '');

    for (const [connectionPeers, connectionDetails] of Object.entries(network.connections)) {
      if (!connectionPeers.includes(peerId)) continue;
      if (!connectionDetails.enabled) continue;

      let otherPeerId = '';
      let allowedIPsThisPeer = '';
      if (connectionPeers.split('*')[0] === peerId) {
        otherPeerId = connectionPeers.split('*')[1];
        allowedIPsThisPeer = connectionDetails.allowedIPsAtoB;
      } else {
        otherPeerId = connectionPeers.split('*')[0];
        allowedIPsThisPeer = connectionDetails.allowedIPsBtoA;
      }

      conf += `
# Peer: ${network.peers[otherPeerId].name} (${otherPeerId})
[Peer]
PublicKey = ${network.peers[otherPeerId].publicKey}
PresharedKey = ${connectionDetails.preSharedKey}
AllowedIPs = ${allowedIPsThisPeer}
PersistentKeepalive = ${connectionDetails.persistentKeepalive}\n`;

      // Add the Endpoint line if known TODO: get roaming endpoints as well
      if (network.peers[otherPeerId].mobility === 'static') {
        conf += `Endpoint = ${network.peers[otherPeerId].endpoint}\n`;
      }
    }

    return conf;
  }

  static downloadPeerConfig(network, peerId) {
    const peerConfigFileContents = WireGuardHelper.getPeerConfig(network, peerId);
    const peerConfigFileName = network.peers[peerId].name.replace(/[^a-zA-Z0-9_=+.-]/g, '-').replace(/(-{2,}|-$)/g, '-').replace(/-$/, '').substring(0, 32);

    const element = document.createElement('a');
    element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(peerConfigFileContents)}`);
    element.setAttribute('download', `${peerConfigFileName}.conf`);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }

  static checkField(fieldName, fieldVariable) {
    // check name
    if (fieldName === 'name') {
      return fieldVariable.length > 0;
    }

    // TODO: change the hardcoded IP subnet
    // TODO: check to see if a duplicate exists
    if (fieldName === 'address') {
      let addressCheck = true;
      addressCheck &&= fieldVariable.startsWith('10.8.0.');
      addressCheck &&= fieldVariable.replace('10.8.0.', '').match('^[0-9]*$');
      addressCheck &&= parseInt(fieldVariable.replace('10.8.0.', ''), 10) >= 0 && parseInt(fieldVariable.replace('10.8.0.', ''), 10) <= 255;
      return addressCheck;
    }

    // check mobility
    if (fieldName === 'mobility') {
      return fieldVariable === 'static' || fieldVariable === 'roaming';
    }

    // check endpoint
    if (fieldName === 'endpoint') {
      let endpointCheck = fieldVariable.match('^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?):(0|6[0-5][0-5][0-3][0-5]|[1-5][0-9][0-9][0-9][0-9]|[1-9][0-9]{0,3})$');
      endpointCheck ||= fieldVariable.match('^(((?!\\-))(xn\\-\\-)?[a-z0-9\\-_]{0,61}[a-z0-9]{1,1}\\.)*(xn\\-\\-)?([a-z0-9\\-]{1,61}|[a-z0-9\\-]{1,30})\\.[a-z]{2,}:(0|6[0-5][0-5][0-3][0-5]|[1-5][0-9][0-9][0-9][0-9]|[1-9][0-9]{0,3})$');
      return endpointCheck;
    }

    // check peer count
    if (fieldName === 'peerCount') {
      return fieldVariable.length > 0;
    }

    // check allowedIPs
    if (fieldName === 'allowedIPs') {
      return fieldVariable.match('^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\/(3[0-2]|2[0-9]|[0-9]))(,((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\/(3[0-2]|2[0-9]|[0-9])))*$');
    }

    // check dns
    if (fieldName === 'dns') {
      let checkDNS = fieldVariable.enabled === true || fieldVariable.enabled === false;
      checkDNS &&= !(fieldVariable.enabled === true && !fieldVariable.value.toString().match('^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'));
      return checkDNS;
    }

    // check allowedIPs
    if (fieldName === 'mtu') {
      let checkMTU = fieldVariable.enabled === true || fieldVariable.enabled === false;
      checkMTU &&= !(fieldVariable.enabled === true && !(fieldVariable.value > 0 && fieldVariable.value < 65536));
      return checkMTU;
    }

    return false;
  }

  static getConnectionId(peer1, peer2) {
    if (peer1.localeCompare(peer2, 'en') === 1) return `${peer1}*${peer2}`;
    return `${peer2}*${peer1}`;
  }

}

try {
  module.exports = WireGuardHelper;
} catch (e) {}
