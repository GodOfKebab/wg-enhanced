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
iptables -t nat -A POSTROUTING -s ${module.exports.WG_SUBNET} -o ${module.exports.NETWORK_INTERFACE} -j MASQUERADE;
iptables -A INPUT -p udp -m udp --dport ${module.exports.WG_PORT} -j ACCEPT;
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
      value: typeof process.env.WG_DEFAULT_DNS === 'string' ? process.env.WG_DEFAULT_DNS : '1.1.1.1',
    },
    mtu: {
      enabled: !!process.env.WG_DEFAULT_MTU,
      value: typeof process.env.WG_DEFAULT_MTU === 'string' ? process.env.WG_DEFAULT_MTU : '',
    },
    scripts: {
      PreUp: {
        enabled: !!process.env.WG_DEFAULT_PRE_UP,
        value: typeof process.env.WG_DEFAULT_PRE_UP === 'string' ? process.env.WG_DEFAULT_PRE_UP : '',
      },
      PostUp: {
        enabled: !!process.env.WG_DEFAULT_POST_UP,
        value: typeof process.env.WG_DEFAULT_POST_UP === 'string' ? process.env.WG_DEFAULT_POST_UP : '',
      },
      PreDown: {
        enabled: !!process.env.WG_DEFAULT_PRE_DOWN,
        value: typeof process.env.WG_DEFAULT_PRE_DOWN === 'string' ? process.env.WG_DEFAULT_PRE_DOWN : '',
      },
      PostDown: {
        enabled: !!process.env.WG_DEFAULT_POST_DOWN,
        value: typeof process.env.WG_DEFAULT_POST_DOWN === 'string' ? process.env.WG_DEFAULT_POST_DOWN : '',
      },
    },
  },
  connections: {
    persistentKeepalive: {
      enabled: !!process.env.WG_DEFAULT_PERSISTENT_KEEPALIVE,
      value: (process.env.WG_DEFAULT_PERSISTENT_KEEPALIVE || 25).toString(),
    },
  },
};
