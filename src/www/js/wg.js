/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

'use strict';

class WG {

  getPeerConfig(network, peerId) {
    const peerConf = network.peers[peerId];

    let conf = `[Interface]
PrivateKey = ${peerConf.privateKey}
Address = ${peerConf.address}/24\n`;
// ${WG_DEFAULT_DNS ? `DNS = ${WG_DEFAULT_DNS}` : ''}
// ${WG_MTU ? `MTU = ${WG_MTU}` : ''}`;

    for (const [connectionPeers, connectionDetails] of Object.entries(network.connections)) {
      if (!connectionPeers.includes(peerId)) continue;
      if (!connectionDetails.enabled) continue;

      let otherPeerId = '';
      let allowedIPsThisPeer = '';
      if (connectionPeers.split('*')[0] === peerId) {
        otherPeerId = connectionPeers.split('*')[1];
        allowedIPsThisPeer = connectionDetails['allowedIPs:a->b'];
      } else {
        otherPeerId = connectionPeers.split('*')[0];
        allowedIPsThisPeer = connectionDetails['allowedIPs:b->a'];
      }

      conf += `
# Peer: ${network.peers[otherPeerId].name} (${otherPeerId})
[Peer]
PublicKey = ${network.peers[otherPeerId].publicKey}
PresharedKey = ${connectionDetails.preSharedKey}
AllowedIPs = ${allowedIPsThisPeer}\n`;
// PersistentKeepalive = ${WG_PERSISTENT_KEEPALIVE}\n`;

      // Add the Endpoint line if known TODO: get roaming endpoints as well
      if (network.peers[otherPeerId].endpoint.split('->')[1] !== '') {
        conf += `Endpoint = ${network.peers[otherPeerId].endpoint.split('->')[1]}\n`;
      }
    }

    return conf;
  }

  downloadPeerConfig(network, peerId) {
    const peerConfigFileContents = this.getPeerConfig(network, peerId);
    const peerConfigFileName = network.peers[peerId].name.replace(/[^a-zA-Z0-9_=+.-]/g, '-').replace(/(-{2,}|-$)/g, '-').replace(/-$/, '').substring(0, 32);

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(peerConfigFileContents));
    element.setAttribute('download', `${peerConfigFileName}.conf`);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }

}