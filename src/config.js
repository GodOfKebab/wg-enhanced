'use strict';

const { release } = require('./package.json');

module.exports.RELEASE = release;
module.exports.PORT = process.env.PORT || 51821;
module.exports.PASSWORD = process.env.PASSWORD;
module.exports.NETWORK_INTERFACE = process.env.NETWORK_INTERFACE || 'eth0';
module.exports.WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';
module.exports.WG_PATH = process.env.WG_PATH || '/etc/wireguard/';
module.exports.WG_HOST = process.env.WG_HOST;
module.exports.WG_PORT = process.env.WG_PORT || 51820;
module.exports.WG_SUBNET = process.env.WG_SUBNET || '10.8.0.0/24';

module.exports.WG_PRE_UP = process.env.WG_PRE_UP || '';
module.exports.WG_POST_UP = process.env.WG_POST_UP || `
iptables -t nat -A POSTROUTING -s ${module.exports.WG_DEFAULT_ADDRESS.replace('x', '0')}/24 -o ${module.exports.NETWORK_INTERFACE} -j MASQUERADE;
iptables -A INPUT -p udp -m udp --dport 51820 -j ACCEPT;
iptables -A FORWARD -i ${module.exports.WG_INTERFACE} -j ACCEPT;
iptables -A FORWARD -o ${module.exports.WG_INTERFACE} -j ACCEPT;
`.split('\n').join(' ');
module.exports.WG_PRE_DOWN = process.env.WG_PRE_DOWN || '';
module.exports.WG_POST_DOWN = process.env.WG_POST_DOWN || '';

module.exports.WG_PREAMBLE_EXPIRATON = process.env.WG_PREAMBLE_EXPIRATON || 5 * 60 * 1000; // default reservation is 5 minutes

module.exports.WG_NETWORK_DEFAULTS = {
  peers: {
    dns: {
      enabled: true,
      value: typeof process.env.WG_DEFAULT_DNS === 'string'
        ? process.env.WG_DEFAULT_DNS
        : '1.1.1.1',
    },
    mtu: {
      enabled: false,
      value: '',
    },
    scripts: {
      PreUp: {
        enabled: false,
        value: '',
      },
      PostUp: {
        enabled: false,
        value: '',
      },
      PreDown: {
        enabled: false,
        value: '',
      },
      PostDown: {
        enabled: false,
        value: '',
      },
    },
  },
  connections: {
    persistentKeepalive: {
      enabled: !!process.env.WG_PERSISTENT_KEEPALIVE,
      value: (process.env.WG_PERSISTENT_KEEPALIVE || 25).toString(),
    },
  },
};
