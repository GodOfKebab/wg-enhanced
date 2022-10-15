/* eslint-disable no-console */
/* eslint-disable no-alert */
/* eslint-disable no-undef */
/* eslint-disable no-new */

'use strict';

function bytes(bytes, decimals, kib, maxunit) {
  kib = kib || false;
  if (bytes === 0) return '0 B';
  if (Number.isNaN(parseFloat(bytes)) && !Number.isFinite(bytes)) return 'NaN';
  const k = kib ? 1024 : 1000;
  const dm = decimals != null && !Number.isNaN(decimals) && decimals >= 0 ? decimals : 2;
  const sizes = kib
    ? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB', 'BiB']
    : ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB', 'BB'];
  let i = Math.floor(Math.log(bytes) / Math.log(k));
  if (maxunit !== undefined) {
    const index = sizes.indexOf(maxunit);
    if (index !== -1) i = index;
  }
  // eslint-disable-next-line no-restricted-properties
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

Vue.config.debug = true; Vue.config.devtools = true;
new Vue({
  el: '#app',
  components: {
    apexchart: VueApexCharts,
  },
  data: {
    authenticated: null,
    authenticating: false,
    password: null,
    requiresPassword: null,

    initializedGraph: false,
    graph: null,

    network: { peers: { root: { address: '' } }, connections: {} },

    peerAvatars: {},
    peerAvatarSources: {},
    peerAvatarCanvases: {},
    peersPersist: {},
    peerDeleteId: null,
    peerConfigId: null,
    peerConfigWindow: 'edit',
    peerQRId: null,

    peerCreatePeerId: '',
    peerCreateName: '',
    peerCreateAddress: '',
    peerCreatePreambleExpiration: (new Date()).getTime(),
    peerCreateMobility: '',
    peerCreateNoAddress: false,
    peerCreateEndpoint: '',
    peerCreateScripts: {
      PreUp: { enabled: false, value: '' },
      PostUp: { enabled: false, value: '' },
      PreDown: { enabled: false, value: '' },
      PostDown: { enabled: false, value: '' },
    },
    peerCreateShowAdvance: '',
    peerCreateDNS: { enabled: null, value: '' },
    peerCreateMTU: { enabled: null, value: '' },
    peerCreateAttachedStaticPeerIds: [],
    peerCreateAttachedRoamingPeerIds: [],
    peerCreateIsConnectionEnabled: {},
    peerCreatePersistentKeepaliveEnabledData: {},
    peerCreatePersistentKeepaliveValueData: {},
    peerCreateAllowedIPsNewToOld: {},
    peerCreateAllowedIPsOldToNew: {},
    peerCreateAssignedColor: {
      name: 'bg-white',
      address: 'bg-white',
      endpoint: 'bg-white',
      dnsmtu: {
        div: 'bg-white',
        dnsInput: 'bg-white',
        mtuInput: 'bg-white',
      },
      scripts: {
        div: 'bg-white',
        PreUp: 'bg-white',
        PostUp: 'bg-white',
        PreDown: 'bg-white',
        PostDown: 'bg-white',
      },
      connections: {
        attachedPeerCountDiv: 'bg-white',
        attachedPeerDiv: {},
        allowedIPsOldToNew: {},
        allowedIPsNewToOld: {},
        persistentKeepalive: {},
      },
    },
    peerCreateConnectionColorRefresh: 0,

    peerQuickEditName: null,
    peerQuickEditNameId: null,
    peerQuickEditAddress: null,
    peerQuickEditAddressId: null,
    peerEditName: '',
    peerEditAddress: '',
    peerEditMobility: '',
    peerEditEndpoint: '',
    peerEditDNS: { enabled: null, value: '' },
    peerEditMTU: { enabled: null, value: '' },
    peerEditScripts: {
      PreUp: { enabled: false, value: '' },
      PostUp: { enabled: false, value: '' },
      PreDown: { enabled: false, value: '' },
      PostDown: { enabled: false, value: '' },
    },
    peerEditPublicKey: '',
    peerEditPrivateKey: '',
    peerEditStaticConnectionIds: [],
    peerEditRoamingConnectionIds: [],
    peerEditNewConnectionIds: [],
    peerEditIsConnectionEnabled: {},
    peerEditPersistentKeepaliveEnabledData: {},
    peerEditPersistentKeepaliveValueData: {},
    peerEditAllowedIPsAtoB: {},
    peerEditAllowedIPsBtoA: {},
    peerChangedPeer: false,
    peerChangedConnections: false,
    peerAddedConnections: false,
    peerRemovedConnections: false,
    // peerEditChangedFields: {},
    peerEditOldConfig: { peers: {}, connections: {} },
    peerEditNewConfig: { peers: {}, connections: {} },
    peerEditAssignedColor: {
      name: 'bg-white',
      address: 'bg-white',
      endpoint: 'bg-white',
      dnsmtu: {
        div: 'bg-white',
        dnsInput: 'bg-white',
        mtuInput: 'bg-white',
      },
      scripts: {
        div: 'bg-white',
        PreUp: 'bg-white',
        PostUp: 'bg-white',
        PreDown: 'bg-white',
        PostDown: 'bg-white',
      },
      connections: {
        attachedPeerCountDiv: 'bg-white',
        div: {},
        allowedIPsAtoB: {},
        allowedIPsBtoA: {},
        persistentKeepalive: {},
      },
    },
    peerEditConnectionColorRefresh: 0,

    staticPeers: {},
    roamingPeers: {},

    webServerStatus: 'unknown',
    wireguardStatus: 'unknown',
    wireguardToggleTo: null,

    currentRelease: null,
    latestRelease: null,

    chartOptions: {
      chart: {
        background: 'transparent',
        type: 'area',
        toolbar: {
          show: false,
        },
      },
      fill: {
        type: 'gradient',
      },
      colors: ['#CCCCCC'],
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: 'smooth',
        width: 0,
      },
      xaxis: {
        labels: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        axisBorder: {
          show: false,
        },
      },
      yaxis: {
        labels: {
          show: false,
        },
        min: 0,
      },
      tooltip: {
        enabled: false,
      },
      legend: {
        show: false,
      },
      grid: {
        show: false,
        padding: {
          left: -10,
          right: 0,
          bottom: -15,
          top: -15,
        },
        column: {
          opacity: 0,
        },
        xaxis: {
          lines: {
            show: false,
          },
        },
      },
    },
  },
  methods: {
    dateTime: value => {
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }).format(value);
    },
    async refresh() {
      if (!this.authenticated) return;
      if (document.hidden) return;

      // Get WirGuard Server Status
      await this.api.getWirGuardStatus().then(wgStatus => {
        this.webServerStatus = 'up';
        if (wgStatus['status'] === 'up') {
          this.wireguardStatus = 'up';
        } else if (wgStatus['status'] === 'down') {
          this.wireguardStatus = 'down';
        }
      }).catch(() => {
        this.webServerStatus = 'down';
        this.wireguardStatus = 'unknown';
      });
      if (this.wireguardStatus !== 'up') return;

      let detectedChange = false;
      // Get the network-wide config
      await this.api.getNetwork().then(network => {
        // start appending from network.connections
        for (const [connectionId, connectionDetails] of Object.entries(network.connections)) {
          // only parse the connections including root
          if (connectionId.includes('root') && connectionDetails.enabled) {
            if (!this.peersPersist[connectionId]) {
              this.peersPersist[connectionId] = {};
              this.peersPersist[connectionId].transferRxHistory = Array(20).fill(0);
              this.peersPersist[connectionId].transferRxPrevious = connectionDetails.transferRx;
              this.peersPersist[connectionId].transferTxHistory = Array(20).fill(0);
              this.peersPersist[connectionId].transferTxPrevious = connectionDetails.transferTx;

              this.peersPersist[connectionId].chartOptions = {
                ...this.chartOptions,
                yaxis: {
                  ...this.chartOptions.yaxis,
                  max: () => this.peersPersist[connectionId].chartMax,
                },
              };
            }

            this.peersPersist[connectionId].transferRxCurrent = connectionDetails.transferRx - this.peersPersist[connectionId].transferRxPrevious;
            this.peersPersist[connectionId].transferRxPrevious = connectionDetails.transferRx;
            this.peersPersist[connectionId].transferTxCurrent = connectionDetails.transferTx - this.peersPersist[connectionId].transferTxPrevious;
            this.peersPersist[connectionId].transferTxPrevious = connectionDetails.transferTx;

            this.peersPersist[connectionId].transferRxHistory.push(this.peersPersist[connectionId].transferRxCurrent);
            this.peersPersist[connectionId].transferRxHistory.shift();

            this.peersPersist[connectionId].transferTxHistory.push(this.peersPersist[connectionId].transferTxCurrent);
            this.peersPersist[connectionId].transferTxHistory.shift();

            this.peersPersist[connectionId].chartMax = Math.max(...this.peersPersist[connectionId].transferTxHistory, ...this.peersPersist[connectionId].transferRxHistory);
          }
        }
        // end append to network.connections

        const staticPeers = {};
        const roamingPeers = {};
        for (const [peerId, peerDetails] of Object.entries(network.peers)) {
          if (peerDetails.mobility === 'static') {
            staticPeers[peerId] = peerDetails;
          } else if (peerDetails.mobility === 'roaming') {
            roamingPeers[peerId] = peerDetails;
          }

          // if icons are already computed, pass
          if (Object.keys(this.peerAvatarCanvases).includes(peerId)) continue;
          this.peerAvatars[peerId] = new Image();
          // eslint-disable-next-line func-names
          this.peerAvatars[peerId].onload = () => {
            this.peerAvatarCanvases[peerId] = this.getGraphNodeIcon(this.peerAvatars[peerId]);
            if (this.graph) this.graph.d3ReheatSimulation();
          };
          if (peerDetails.name.includes('@') && peerDetails.name.includes('.')) {
            this.peerAvatars[peerId].src = `https://www.gravatar.com/avatar/${md5(peerDetails.name)}?d=blank`;
          } else {
            this.peerAvatars[peerId].src = peerDetails.mobility === 'static' ? staticPeerIconSrc : roamingPeerIconSrc;
          }
        }

        // Check for changes
        Object.keys(network.connections).forEach(connectionId => {
          delete network.connections[connectionId].latestHandshakeAt;
          delete network.connections[connectionId].transferTx;
          delete network.connections[connectionId].transferRx;
        });
        if (JSON.stringify(this.network) !== JSON.stringify(network)) {
          this.network = network;
          this.staticPeers = staticPeers;
          this.roamingPeers = roamingPeers;
          detectedChange = true;
        }
      }).catch(err => {
        if (err.toString() === 'TypeError: Load failed') {
          this.webServerStatus = 'down';
        } else {
          console.log('getNetwork error =>');
          console.log(err);
        }
      });

      if (!this.initializedGraph) {
        try {
          this.graph = ForceGraph()(document.getElementById('graph'))
            .nodeCanvasObject((node, ctx) => {
              if (this.peerAvatarCanvases[node.id]) {
                ctx.drawImage(this.peerAvatarCanvases[node.id], node.x - node.size / 2, node.y - node.size / 2, node.size, node.size);
              } else {
                const img = new Image();
                img.src = node.mobility === 'static' ? staticPeerIconSrc : roamingPeerIconSrc;
                ctx.drawImage(this.getGraphNodeIcon(img), node.x - node.size / 2, node.y - node.size / 2, node.size, node.size);
              }
            })
            .nodePointerAreaPaint((node, color, ctx) => {
              ctx.beginPath();
              ctx.arc(node.x, node.y, node.size / 2, 0, Math.PI * 2, true);
              ctx.fillStyle = color;
              ctx.fill();
            })
            .height(document.getElementById('graph').clientHeight)
            .width(document.getElementById('graph').clientWidth)
            .d3Force('center', null)
            .zoomToFit(100, 20)
            .nodeId('id')
            .nodeLabel('name')
            .nodeAutoColorBy('mobility')
            .linkSource('source')
            .linkTarget('target')
            .linkAutoColorBy('color')
            .linkDirectionalParticles('particleCount')
            .linkWidth('strength')
            .cooldownTicks(10);

          this.graph.onEngineStop(() => this.graph.zoomToFit(400, 20));
          this.graph.onBackgroundClick(() => this.graph.zoomToFit(400, 20));
          this.graph.onNodeClick(node => {
            // Center/zoom on node
            this.graph.centerAt(node.x, node.y, 400);
            this.graph.zoom(8, 400);

            this.peerEditWindowHandler('init', { peerId: node.id });
            this.peerConfigWindow = 'edit';
            this.peerConfigId = node.id;
          });

          this.initializedGraph = true;
        } catch (e) {
          console.log('my error: ');
          console.log(e);
        }
      }

      if (detectedChange) {
        try {
          this.graph.graphData(this.forceGraphComputed);
        } catch (e) {
          console.log(e);
        }
      }
    },

    login(e) {
      e.preventDefault();

      if (!this.password) return;
      if (this.authenticating) return;

      this.authenticating = true;
      this.api.createSession({
        password: this.password,
      })
        .then(async () => {
          const session = await this.api.getSession();
          this.authenticated = session.authenticated;
          this.requiresPassword = session.requiresPassword;
          return this.refresh();
        })
        .catch(err => {
          alert(err.message || err.toString());
        })
        .finally(() => {
          this.authenticating = false;
          this.password = null;
        });
    },
    logout(e) {
      e.preventDefault();

      this.api.deleteSession()
        .then(() => {
          this.authenticated = false;
          this.network = null;
        })
        .catch(err => {
          alert(err.message || err.toString());
        });
    },
    deletePeer(peerId) {
      this.api.deletePeer({ peerId })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    enablePeer(peerId) {
      this.api.enablePeer({ peerId })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    disablePeer(peerId) {
      this.api.disablePeer({ peerId })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    updatePeerName(peerId, name) {
      this.api.updatePeerName({ peerId, name })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    updatePeerAddress(peerId, address) {
      this.api.updatePeerAddress({ peerId, address })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    updatePeerEndpoint(peerId, mobility, endpoint) {
      this.api.updatePeerEndpoint({ peerId, mobility, endpoint })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    updatePeerDNS(peerId, dns) {
      this.api.updatePeerDNS({ peerId, dns })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    updatePeerMTU(peerId, mtu) {
      this.api.updatePeerMTU({ peerId, mtu })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    updatePeerScripts(peerId, scripts) {
      this.api.updatePeerScripts({ peerId, scripts })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    enableConnection(connectionId, enabled) {
      if (enabled) {
        this.api.enableConnection({ connectionId })
          .catch(err => alert(err.message || err.toString()))
          .finally(() => this.refresh().catch(console.error));
      } else {
        this.api.disableConnection({ connectionId })
          .catch(err => alert(err.message || err.toString()))
          .finally(() => this.refresh().catch(console.error));
      }
    },
    updateConnectionAllowedIPs(connectionId, AtoB, BtoA) {
      this.api.updateConnectionAllowedIPs({ connectionId, AtoB, BtoA })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    updateConnectionPersistentKeepalive(connectionId, enabled, value) {
      this.api.updateConnectionPersistentKeepalive({ connectionId, enabled, value })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    getPeerConf(peerId) {
      return WireGuardHelper.getPeerConfig(this.network, peerId);
    },
    downloadPeerConf(peerId) {
      WireGuardHelper.downloadPeerConfig(this.network, peerId);
    },
    toggleWireGuardNetworking() {
      if (this.wireguardStatus === 'up' && this.wireguardToggleTo === 'disable') {
        this.wireguardStatus = 'unknown';
        this.api.wireguardDisable()
          .catch(err => alert(err.message || err.toString()))
          .finally(() => this.refresh().catch(console.error));
      } else if (this.wireguardStatus === 'down' && this.wireguardToggleTo === 'enable') {
        this.wireguardStatus = 'unknown';
        this.api.wireguardEnable()
          .catch(err => alert(err.message || err.toString()))
          .finally(() => this.refresh().catch(console.error));
      }
      this.wireguardToggleTo = null;
    },
    getConnectionId(peer1, peer2) {
      return WireGuardHelper.getConnectionId(peer1, peer2);
    },
    async peerCreateWindowHandler(mode) {
      if (mode === 'init') {
        if ((new Date()).getTime() > this.peerCreatePreambleExpiration) {
          try {
            const { peerId, address, expiration } = await this.api.preamblePeer({ });
            this.peerCreatePeerId = peerId;
            this.peerCreateAddress = address;
            this.peerCreatePreambleExpiration = expiration;
          } catch (e) {
            this.peerCreateMobility = '';
            this.peerCreateNoAddress = true;
            return;
          }
          this.peerCreateNoAddress = false;
        }

        this.peerCreateName = '';
        this.peerCreateEndpoint = '';
        this.peerCreateShowAdvance = false;

        for (const peerId of Object.keys(this.staticPeers)) {
          this.peerCreateAllowedIPsNewToOld[peerId] = this.peerCreateMobility === 'static' ? this.network.subnet : '0.0.0.0/0';
          this.peerCreateAllowedIPsOldToNew[peerId] = `${this.peerCreateAddress}/32`;
          this.peerCreatePersistentKeepaliveEnabledData[peerId] = this.network.defaults.connections.persistentKeepalive.enabled;
          this.peerCreatePersistentKeepaliveValueData[peerId] = this.network.defaults.connections.persistentKeepalive.value;
        }
        for (const peerId of Object.keys(this.roamingPeers)) {
          this.peerCreateAllowedIPsNewToOld[peerId] = `${this.network.peers[peerId].address}/32`;
          this.peerCreateAllowedIPsOldToNew[peerId] = `${this.peerCreateAddress}/32`;
          this.peerCreatePersistentKeepaliveEnabledData[peerId] = this.network.defaults.connections.persistentKeepalive.enabled;
          this.peerCreatePersistentKeepaliveValueData[peerId] = this.network.defaults.connections.persistentKeepalive.value;
        }

        this.peerCreateDNS = this.network.defaults.peers.dns;
        this.peerCreateMTU = this.network.defaults.peers.mtu;
        this.peerCreateScripts = this.network.defaults.peers.scripts;

        // enable the root server as default
        this.peerCreateAttachedStaticPeerIds = ['root'];
        this.peerCreateAttachedRoamingPeerIds = [];
        this.peerCreateIsConnectionEnabled['root'] = true;
      } else if (mode === 'delete-preamble') {
        await this.api.deletePreamble({ peerId: this.peerCreatePeerId, address: this.peerCreateAddress });

        // Reset the peerId, address and expiration time
        this.peerCreatePeerId = '';
        this.peerCreateAddress = '';
        this.peerCreatePreambleExpiration = (new Date()).getTime();
      }
    },
    createPeer() {
      const attachedPeersCompact = [];

      for (const peerId of [...this.peerCreateAttachedStaticPeerIds, ...this.peerCreateAttachedRoamingPeerIds]) {
        attachedPeersCompact.push({
          peer: peerId,
          enabled: this.peerCreateIsConnectionEnabled[peerId],
          allowedIPsNewToOld: this.peerCreateAllowedIPsNewToOld[peerId],
          allowedIPsOldToNew: this.peerCreateAllowedIPsOldToNew[peerId],
          persistentKeepalive: {
            enabled: this.peerCreatePersistentKeepaliveEnabledData[peerId],
            value: this.peerCreatePersistentKeepaliveValueData[peerId],
          },
        });
      }
      const dns = {
        enabled: this.peerCreateDNS.enabled,
        value: this.peerCreateDNS.value,
      };
      const mtu = {
        enabled: this.peerCreateMTU.enabled,
        value: this.peerCreateMTU.value,
      };
      const peerId = this.peerCreatePeerId;
      const address = this.peerCreateAddress;
      const name = this.peerCreateName;
      const mobility = this.peerCreateMobility;
      const endpoint = this.peerCreateEndpoint;
      const scripts = this.peerCreateScripts;

      this.api.createPeer({
        peerId, address, name, mobility, dns, mtu, endpoint, scripts, attachedPeers: attachedPeersCompact,
      }).catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));

      // Reset the peerId, address and expiration time
      this.peerCreatePeerId = '';
      this.peerCreateAddress = '';
      this.peerCreatePreambleExpiration = (new Date()).getTime();
    },
    peerEditWindowHandler(mode, options = {}) {
      if (mode === 'init') {
        const { peerId } = options;
        this.peerEditName = this.network.peers[peerId]['name'];
        this.peerEditAddress = this.network.peers[peerId]['address'];
        this.peerEditMobility = this.network.peers[peerId]['mobility'];
        this.peerEditEndpoint = this.network.peers[peerId]['endpoint'];
        this.peerEditDNS.enabled = this.network.peers[peerId]['dns'].enabled;
        this.peerEditDNS.value = this.network.peers[peerId]['dns'].value;
        this.peerEditMTU.enabled = this.network.peers[peerId]['mtu'].enabled;
        this.peerEditMTU.value = this.network.peers[peerId]['mtu'].value;
        this.peerEditScripts.PreUp.enabled = this.network.peers[peerId].scripts.PreUp.enabled;
        this.peerEditScripts.PreUp.value = this.network.peers[peerId].scripts.PreUp.value;
        this.peerEditScripts.PostUp.enabled = this.network.peers[peerId].scripts.PostUp.enabled;
        this.peerEditScripts.PostUp.value = this.network.peers[peerId].scripts.PostUp.value;
        this.peerEditScripts.PreDown.enabled = this.network.peers[peerId].scripts.PreDown.enabled;
        this.peerEditScripts.PreDown.value = this.network.peers[peerId].scripts.PreDown.value;
        this.peerEditScripts.PostDown.enabled = this.network.peers[peerId].scripts.PostDown.enabled;
        this.peerEditScripts.PostDown.value = this.network.peers[peerId].scripts.PostDown.value;
        this.peerEditPublicKey = this.network.peers[peerId].publicKey;
        this.peerEditPrivateKey = this.network.peers[peerId].privateKey;

        // store all the connections related to this peer
        this.peerEditIsConnectionEnabled = {};
        this.peerEditAllowedIPsAtoB = {};
        this.peerEditAllowedIPsBtoA = {};
        this.peerEditPersistentKeepaliveEnabledData = {};
        this.peerEditPersistentKeepaliveValueData = {};
        for (const connectionId of Object.keys(this.network.connections)) {
          if (connectionId.includes(peerId)) {
            this.peerEditIsConnectionEnabled[connectionId] = this.network.connections[connectionId].enabled;
            this.peerEditAllowedIPsAtoB[connectionId] = this.network.connections[connectionId].allowedIPsAtoB;
            this.peerEditAllowedIPsBtoA[connectionId] = this.network.connections[connectionId].allowedIPsBtoA;
            this.peerEditPersistentKeepaliveEnabledData[connectionId] = this.network.connections[connectionId].persistentKeepalive.enabled;
            this.peerEditPersistentKeepaliveValueData[connectionId] = this.network.connections[connectionId].persistentKeepalive.value.toString();
          }
        }
        // To enforce order of static > roaming connections when listed in the view
        this.peerEditStaticConnectionIds = [];
        this.peerEditRoamingConnectionIds = [];
        Object.keys(this.staticPeers).forEach(staticPeerId => {
          if (staticPeerId !== peerId) {
            const connectionId = WireGuardHelper.getConnectionId(staticPeerId, peerId);
            if (Object.keys(this.network.connections).includes(connectionId)) this.peerEditStaticConnectionIds.push(connectionId);
          }
        });
        Object.keys(this.roamingPeers).forEach(roamingPeerId => {
          if (roamingPeerId !== peerId) {
            const connectionId = WireGuardHelper.getConnectionId(roamingPeerId, peerId);
            if (Object.keys(this.network.connections).includes(connectionId)) this.peerEditRoamingConnectionIds.push(connectionId);
          }
        });
      }

      if (mode === 'init-connection') {
        const { peerId } = options;
        const connectionId = WireGuardHelper.getConnectionId(this.peerConfigId, peerId);
        this.peerEditIsConnectionEnabled[connectionId] = true;
        if (!Object.keys(this.network.connections).includes(connectionId)) {
          if (connectionId.startsWith(peerId)) {
            this.peerEditAllowedIPsAtoB[connectionId] = `${this.network.peers[this.peerConfigId].address}/32`;
            this.peerEditAllowedIPsBtoA[connectionId] = `${this.network.peers[peerId].address}/32`;
          } else {
            this.peerEditAllowedIPsAtoB[connectionId] = `${this.network.peers[peerId].address}/32`;
            this.peerEditAllowedIPsBtoA[connectionId] = `${this.network.peers[this.peerConfigId].address}/32`;
          }
          this.peerEditPersistentKeepaliveEnabledData[connectionId] = this.network.defaults.connections.persistentKeepalive.enabled;
          this.peerEditPersistentKeepaliveValueData[connectionId] = this.network.defaults.connections.persistentKeepalive.value;
        }
      }

      if (mode === 'init-connections') {
        for (const connectionId of this.peerEditConnectionIds) {
          this.peerEditIsConnectionEnabled[connectionId] = true;
          if (!Object.keys(this.network.connections).includes(connectionId)) {
            const peerId = connectionId.replace(this.peerConfigId, '').replace('*', '');
            if (connectionId.startsWith(peerId)) {
              this.peerEditAllowedIPsAtoB[connectionId] = `${this.network.peers[this.peerConfigId].address}/32`;
              this.peerEditAllowedIPsBtoA[connectionId] = `${this.network.peers[peerId].address}/32`;
            } else {
              this.peerEditAllowedIPsAtoB[connectionId] = `${this.network.peers[peerId].address}/32`;
              this.peerEditAllowedIPsBtoA[connectionId] = `${this.network.peers[this.peerConfigId].address}/32`;
            }
            this.peerEditPersistentKeepaliveEnabledData[connectionId] = this.network.defaults.connections.persistentKeepalive.enabled;
            this.peerEditPersistentKeepaliveValueData[connectionId] = this.network.defaults.connections.persistentKeepalive.value;
          }
        }
      }
    },
    async peerConfigEditUpdateConfirmation() {
      const [changedFields, addedFields, removedFields, errorNotFound] = this.peerEditChangedFieldsCompute;
      if (!errorNotFound || Object.keys(changedFields).length + Object.keys(addedFields).length + Object.keys(removedFields).length === 0) return;

      this.peerEditOldConfig.peers[this.peerConfigId] = {
        name: this.network.peers[this.peerConfigId].name,
        address: this.network.peers[this.peerConfigId].address,
        publicKey: this.network.peers[this.peerConfigId].publicKey,
        privateKey: this.network.peers[this.peerConfigId].privateKey,
        mobility: this.network.peers[this.peerConfigId].mobility,
        endpoint: this.network.peers[this.peerConfigId].endpoint,
        dns: this.network.peers[this.peerConfigId].dns,
        mtu: this.network.peers[this.peerConfigId].mtu,
        scripts: this.network.peers[this.peerConfigId].scripts,
      };
      this.peerEditOldConfig.connections = {};
      for (const [connectionId, connection] of Object.entries(this.network.connections)) {
        if (connectionId.includes(this.peerConfigId)) {
          this.peerEditOldConfig.connections[connectionId] = {
            preSharedKey: connection.preSharedKey,
            enabled: connection.enabled,
            allowedIPsAtoB: connection.allowedIPsAtoB,
            allowedIPsBtoA: connection.allowedIPsBtoA,
            persistentKeepalive: connection.persistentKeepalive,
          };
        }
      }
      this.peerEditNewConfig = JSON.parse(JSON.stringify(this.peerEditOldConfig)); // deep copy

      // apply changed fields
      if (Object.keys(changedFields).length) {
        if (Object.keys(changedFields.peers).length) {
          for (const [field, value] of Object.entries(changedFields.peers[this.peerConfigId])) {
            if (field === 'dns' || field === 'mtu') {
              for (const [fieldDNSMTU, valueDNSMTU] of Object.entries(value)) {
                this.peerEditNewConfig.peers[this.peerConfigId][field][fieldDNSMTU] = valueDNSMTU;
              }
            } else if (field === 'scripts') {
              for (const [scriptField, scriptValue] of Object.entries(value)) {
                for (const [scriptSubField, scriptSubValue] of Object.entries(scriptValue)) {
                  this.peerEditNewConfig.peers[this.peerConfigId]['scripts'][scriptField][scriptSubField] = scriptSubValue;
                }
              }
            } else {
              this.peerEditNewConfig.peers[this.peerConfigId][field] = value;
            }
          }
        }
        for (const [connectionId, connection] of Object.entries(changedFields.connections)) {
          for (const [field, value] of Object.entries(connection)) {
            if (field === 'persistentKeepalive') {
              if ('enabled' in value) this.peerEditNewConfig.connections[connectionId][field].enabled = value.enabled;
              if ('value' in value) this.peerEditNewConfig.connections[connectionId][field].value = value.value;
            } else {
              this.peerEditNewConfig.connections[connectionId][field] = value;
            }
          }
        }
      }

      // apply added fields
      if (Object.keys(addedFields).length) {
        for (const [connectionId, connection] of Object.entries(addedFields.connections)) {
          this.peerEditNewConfig.connections[connectionId] = connection;
        }
      }

      // apply removed fields
      if (Object.keys(removedFields).length) {
        for (const connectionId of Object.keys(removedFields.connections)) {
          delete this.peerEditNewConfig.connections[connectionId];
        }
      }
    },
    async peerConfigEditApply() {
      const [changedFields, addedFields, removedFields, errorNotFound] = this.peerEditChangedFieldsCompute;
      if (!errorNotFound || Object.keys(changedFields).length + Object.keys(addedFields).length + Object.keys(removedFields).length === 0) return;

      if (Object.keys(changedFields).length > 0) {
        let mobilityValue = null;
        let endpointValue = null;
        if (Object.keys(changedFields.peers).length) {
          for (const [field, value] of Object.entries(changedFields.peers[this.peerConfigId])) {
            switch (field) {
              case 'name':
                this.updatePeerName(this.peerConfigId, value);
                break;
              case 'address':
                this.updatePeerAddress(this.peerConfigId, value);
                break;
              case 'mobility':
                mobilityValue = value;
                break;
              case 'endpoint':
                endpointValue = value;
                break;
              case 'dns':
                this.updatePeerDNS(this.peerConfigId, value);
                break;
              case 'mtu':
                this.updatePeerMTU(this.peerConfigId, value);
                break;
              case 'scripts':
                this.updatePeerScripts(this.peerConfigId, value);
                break;
              default:
                break;
            }
          }
        }
        if (mobilityValue || endpointValue) this.updatePeerEndpoint(this.peerConfigId, mobilityValue, endpointValue);

        for (const [connectionId, connection] of Object.entries(changedFields.connections)) {
          let AtoBValue = null;
          let BtoAValue = null;
          let persistentKeepaliveEnabled = null;
          let persistentKeepaliveValue = null;
          for (const [field, value] of Object.entries(connection)) {
            switch (field) {
              case 'enabled':
                this.enableConnection(connectionId, value);
                break;
              case 'allowedIPsAtoB':
                AtoBValue = value;
                break;
              case 'allowedIPsBtoA':
                BtoAValue = value;
                break;
              case 'persistentKeepalive':
                if ('enabled' in value) persistentKeepaliveEnabled = value.enabled;
                if ('value' in value) persistentKeepaliveValue = value.value;
                break;
              default:
                break;
            }
          }
          if (AtoBValue || BtoAValue) this.updateConnectionAllowedIPs(connectionId, AtoBValue, BtoAValue);
          if (persistentKeepaliveEnabled || persistentKeepaliveValue) this.updateConnectionPersistentKeepalive(connectionId, persistentKeepaliveEnabled, persistentKeepaliveValue);
        }
      }

      if (Object.keys(addedFields).length > 0) {
        for (const [connectionId, connectionDetails] of Object.entries(addedFields.connections)) {
          await this.api.createConnection({
            connectionId,
            enabled: connectionDetails.enabled,
            persistentKeepalive: connectionDetails.persistentKeepalive,
            allowedIPsAtoB: connectionDetails.allowedIPsAtoB,
            allowedIPsBtoA: connectionDetails.allowedIPsBtoA,
          });
        }
      }

      if (Object.keys(removedFields).length > 0) {
        for (const connectionId of Object.keys(removedFields.connections)) {
          await this.api.deleteConnection({ connectionId });
        }
      }
    },
    getGraphNodeIcon(image) {
      const size = image.src === staticPeerIconSrc || image.src === roamingPeerIconSrc ? 96 * 2 : 80;
      const tmpCanvas = document.createElement('canvas');
      const tmpCtx = tmpCanvas.getContext('2d');

      tmpCanvas.width = size;
      tmpCanvas.height = size;

      // draw the cached images to temporary canvas and return the context
      tmpCtx.save();
      tmpCtx.beginPath();
      tmpCtx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2, true);
      tmpCtx.closePath();
      tmpCtx.clip();
      if (image.src === staticPeerIconSrc || image.src === roamingPeerIconSrc) {
        tmpCtx.fillStyle = 'rgb(249 250 251)';
        tmpCtx.fillRect(0, 0, size, size);
        tmpCtx.drawImage(image, size / 4, size / 4, size / 2, size / 2);
      } else {
        tmpCtx.drawImage(image, 0, 0, size, size);
      }
      return tmpCanvas;
    },
    peerEditResetConnectionFields(connectionId) {
      if (Object.keys(this.network.connections).includes(connectionId)) {
        this.peerEditIsConnectionEnabled[connectionId] = this.network.connections[connectionId].enabled;
        this.peerEditPersistentKeepaliveEnabledData[connectionId] = this.network.connections[connectionId].persistentKeepalive.enabled;
        this.peerEditPersistentKeepaliveValueData[connectionId] = this.network.connections[connectionId].persistentKeepalive.value;
        this.peerEditAllowedIPsAtoB[connectionId] = this.network.connections[connectionId].allowedIPsAtoB;
        this.peerEditAllowedIPsBtoA[connectionId] = this.network.connections[connectionId].allowedIPsBtoA;
        this.peerEditConnectionColorRefresh += 1;
      } else {
        this.peerEditIsConnectionEnabled[connectionId] = true;
        this.peerEditPersistentKeepaliveEnabledData[connectionId] = this.network.defaults.connections.persistentKeepalive.enabled;
        this.peerEditPersistentKeepaliveValueData[connectionId] = this.network.defaults.connections.persistentKeepalive.value;
        const { a, b } = WireGuardHelper.getConnectionPeers(connectionId);
        this.peerEditAllowedIPsAtoB[connectionId] = `${this.network.peers[b].address}/32`;
        this.peerEditAllowedIPsBtoA[connectionId] = `${this.network.peers[a].address}/32`;
        this.peerEditConnectionColorRefresh += 1;
      }
    },
    peerCreateResetConnectionFields(peerId) {
      this.peerCreateIsConnectionEnabled[peerId] = true;
      this.peerCreatePersistentKeepaliveEnabledData[peerId] = this.network.defaults.connections.persistentKeepalive.enabled;
      this.peerCreatePersistentKeepaliveValueData[peerId] = this.network.defaults.connections.persistentKeepalive.value;
      if (Object.keys(this.staticPeers).includes(peerId)) {
        this.peerCreateAllowedIPsNewToOld[peerId] = this.peerCreateMobility === 'static' ? this.network.subnet : '0.0.0.0/0';
        this.peerCreateAllowedIPsOldToNew[peerId] = `${this.peerCreateAddress}/32`;
      } else {
        this.peerCreateAllowedIPsNewToOld[peerId] = `${this.network.peers[peerId].address}/32`;
        this.peerCreateAllowedIPsOldToNew[peerId] = `${this.peerCreateAddress}/32`;
      }
      this.peerCreateConnectionColorRefresh += 1;
    },
    async refreshPeerEditKeys() {
      const { privateKey, publicKey } = await this.api.getNewKeyPairs();
      this.peerEditPrivateKey = privateKey;
      this.peerEditPublicKey = publicKey;
    },
  },
  computed: {
    peerCreateNameColor() {
      this.peerCreateAssignedColor.name = WireGuardHelper.checkField('name', this.peerCreateName) ? 'bg-green-50' : 'bg-red-50';
      return this.peerCreateAssignedColor.name;
    },
    peerCreateEndpointColor() {
      this.peerCreateAssignedColor.endpoint = WireGuardHelper.checkField('endpoint', this.peerCreateEndpoint) ? 'bg-green-50' : 'bg-red-50';
      return this.peerCreateAssignedColor.endpoint;
    },
    peerCreateDNSMTUColor() {
      this.peerCreateAssignedColor.dnsmtu.dnsInput = WireGuardHelper.checkField('dns', { enabled: true, value: this.peerCreateDNS.value }) ? 'enabled:bg-green-200' : 'enabled:bg-red-200';
      this.peerCreateAssignedColor.dnsmtu.mtuInput = WireGuardHelper.checkField('mtu', { enabled: true, value: this.peerCreateMTU.value }) ? 'enabled:bg-green-200' : 'enabled:bg-red-200';
      // eslint-disable-next-line no-nested-ternary
      this.peerCreateAssignedColor.dnsmtu.div = this.peerCreateDNS.enabled || this.peerCreateMTU.enabled ? ((this.peerCreateDNS.enabled && this.peerCreateAssignedColor.dnsmtu.dnsInput === 'enabled:bg-red-200') || (this.peerCreateMTU.enabled && this.peerCreateAssignedColor.dnsmtu.mtuInput === 'enabled:bg-red-200') ? 'bg-red-50' : 'bg-green-50') : 'bg-gray-100';
      return this.peerCreateAssignedColor.dnsmtu;
    },
    peerCreateScriptsColor() {
      this.peerCreateAssignedColor.scripts.PreUp = WireGuardHelper.checkField('script', this.peerCreateScripts.PreUp) ? 'enabled:bg-green-200' : 'enabled:bg-red-200';
      this.peerCreateAssignedColor.scripts.PostUp = WireGuardHelper.checkField('script', this.peerCreateScripts.PostUp) ? 'enabled:bg-green-200' : 'enabled:bg-red-200';
      this.peerCreateAssignedColor.scripts.PreDown = WireGuardHelper.checkField('script', this.peerCreateScripts.PreDown) ? 'enabled:bg-green-200' : 'enabled:bg-red-200';
      this.peerCreateAssignedColor.scripts.PostDown = WireGuardHelper.checkField('script', this.peerCreateScripts.PostDown) ? 'enabled:bg-green-200' : 'enabled:bg-red-200';
      // eslint-disable-next-line no-nested-ternary
      this.peerCreateAssignedColor.scripts.div = (this.peerCreateScripts.PreUp.enabled
      || this.peerCreateScripts.PostUp.enabled
      || this.peerCreateScripts.PreDown.enabled
      || this.peerCreateScripts.PostDown.enabled)
        ? (((this.peerCreateScripts.PreUp.enabled && this.peerCreateAssignedColor.scripts.PreUp === 'enabled:bg-red-200')
              || (this.peerCreateScripts.PostUp.enabled && this.peerCreateAssignedColor.scripts.PostUp === 'enabled:bg-red-200')
              || (this.peerCreateScripts.PreDown.enabled && this.peerCreateAssignedColor.scripts.PreDown === 'enabled:bg-red-200')
              || (this.peerCreateScripts.PostDown.enabled && this.peerCreateAssignedColor.scripts.PostDown === 'enabled:bg-red-200')) ? 'bg-red-50' : 'bg-green-50') : 'bg-gray-100';
      return this.peerCreateAssignedColor.scripts;
    },
    peerCreateStaticSelectAll: {
      get() {
        return this.staticPeers ? Object.keys(this.staticPeers).length === this.peerCreateAttachedStaticPeerIds.length : false;
      },
      set(value) {
        const attached = [];

        if (value) {
          Object.keys(this.staticPeers).forEach(peerId => {
            attached.push(peerId);
            if (!(peerId in this.peerCreateAttachedStaticPeerIds)) {
              this.peerCreateIsConnectionEnabled[peerId] = true;
            }
          });
        }

        this.peerCreateAttachedStaticPeerIds = attached;
      },
    },
    peerCreateRoamingSelectAll: {
      get() {
        return this.roamingPeers ? Object.keys(this.roamingPeers).length === this.peerCreateAttachedRoamingPeerIds.length : false;
      },
      set(value) {
        const attached = [];

        if (value) {
          Object.keys(this.roamingPeers).forEach(peerId => {
            attached.push(peerId);
            if (!(peerId in this.peerCreateAttachedRoamingPeerIds)) {
              this.peerCreateIsConnectionEnabled[peerId] = true;
            }
          });
        }

        this.peerCreateAttachedRoamingPeerIds = attached;
      },
    },
    peerCreateAttachedPeersCountDivColor() {
      this.peerCreateAssignedColor.connections.attachedPeerCountDiv = WireGuardHelper.checkField('peerCount', this.peerCreateAttachedStaticPeerIds) || WireGuardHelper.checkField('peerCount', this.peerCreateAttachedRoamingPeerIds) ? 'bg-green-50' : 'bg-red-50';
      return this.peerCreateAssignedColor.connections.attachedPeerCountDiv;
    },
    peerCreateConnectionColor() {
      this.peerCreateConnectionColorRefresh &&= this.peerCreateConnectionColorRefresh;
      for (const peerId of [...this.peerCreateAttachedStaticPeerIds, ...this.peerCreateAttachedRoamingPeerIds]) {
        try {
          this.peerCreateAssignedColor.connections.allowedIPsOldToNew[peerId] = WireGuardHelper.checkField('allowedIPs', this.peerCreateAllowedIPsOldToNew[peerId]) ? 'bg-green-200' : 'bg-red-200';
          this.peerCreateAssignedColor.connections.allowedIPsNewToOld[peerId] = WireGuardHelper.checkField('allowedIPs', this.peerCreateAllowedIPsNewToOld[peerId]) ? 'bg-green-200' : 'bg-red-200';
          // eslint-disable-next-line no-nested-ternary
          this.peerCreateAssignedColor.connections.attachedPeerDiv[peerId] = this.peerCreateIsConnectionEnabled[peerId] && this.peerCreateAssignedColor.connections.allowedIPsOldToNew[peerId] !== 'bg-red-200' && this.peerCreateAssignedColor.connections.allowedIPsNewToOld[peerId] !== 'bg-red-200' ? 'bg-green-50' : 'bg-red-50';
          // eslint-disable-next-line no-nested-ternary
          this.peerCreateAssignedColor.connections.persistentKeepalive[peerId] = this.peerCreatePersistentKeepaliveEnabledData[peerId] && WireGuardHelper.checkField('persistentKeepalive', this.peerCreatePersistentKeepaliveValueData[peerId]) ? 'bg-green-200' : 'bg-red-200';
        } catch (e) {
          this.peerCreateAssignedColor.connections.attachedPeerDiv[peerId] = 'bg-red-50';
          this.peerCreateAssignedColor.connections.allowedIPsOldToNew[peerId] = 'bg-red-50';
          this.peerCreateAssignedColor.connections.allowedIPsNewToOld[peerId] = 'bg-red-50';
        }
      }
      return this.peerCreateAssignedColor.connections;
    },
    peerCreateEligibilityOverall() {
      return this.peerCreateNameColor !== 'bg-red-50'
          && !(this.peerCreateMobility === 'static' && this.peerCreateEndpointColor === 'bg-red-50')
          && this.peerCreateDNSMTUColor.div !== 'bg-red-50'
          && this.peerCreateScriptsColor.div !== 'bg-red-50'
          && this.peerCreateAttachedPeersCountDivColor !== 'bg-red-50'
          && Object.values(this.peerCreateConnectionColor.allowedIPsOldToNew).every(color => color === 'bg-green-200')
          && Object.values(this.peerCreateConnectionColor.allowedIPsNewToOld).every(color => color === 'bg-green-200');
    },
    peerEditNameColor() {
      // eslint-disable-next-line no-nested-ternary
      this.peerEditAssignedColor.name = this.peerEditName !== this.network.peers[this.peerConfigId].name
        ? (WireGuardHelper.checkField('name', this.peerEditName) ? 'bg-green-200' : 'bg-red-200') : 'bg-white';
      return this.peerEditAssignedColor.name;
    },
    peerEditAddressColor() {
      // eslint-disable-next-line no-nested-ternary
      this.peerEditAssignedColor.address = this.peerEditAddress !== this.network.peers[this.peerConfigId].address
        ? (WireGuardHelper.checkField('address', this.peerEditAddress) ? 'bg-green-200' : 'bg-red-200') : 'bg-white';
      return this.peerEditAssignedColor.address;
    },
    peerEditEndpointColor() {
      // eslint-disable-next-line no-nested-ternary
      this.peerEditAssignedColor.endpoint = this.peerEditMobility === 'static' ? this.peerEditEndpoint !== this.network.peers[this.peerConfigId].endpoint
        ? (WireGuardHelper.checkField('endpoint', this.peerEditEndpoint) ? 'bg-green-200' : 'bg-red-200') : 'bg-white' : 'bg-gray-100';
      return this.peerEditAssignedColor.endpoint;
    },
    peerEditDNSMTUColor() {
      let error = false;
      let changeDetected = false;
      // eslint-disable-next-line no-nested-ternary
      this.peerEditAssignedColor.dnsmtu.dnsInput = (this.network.peers[this.peerConfigId].dns.value === '' || this.peerEditDNS.value !== this.network.peers[this.peerConfigId].dns.value)
        ? (WireGuardHelper.checkField('dns', { enabled: true, value: this.peerEditDNS.value }) ? 'bg-green-200' : 'bg-red-200') : 'bg-white';
      // eslint-disable-next-line no-nested-ternary
      this.peerEditAssignedColor.dnsmtu.mtuInput = (this.network.peers[this.peerConfigId].mtu.value === '' || this.peerEditMTU.value !== this.network.peers[this.peerConfigId].mtu.value)
        ? (WireGuardHelper.checkField('mtu', { enabled: true, value: this.peerEditMTU.value }) ? 'bg-green-200' : 'bg-red-200') : 'bg-white';

      error ||= this.peerEditDNS.enabled && this.peerEditAssignedColor.dnsmtu.dnsInput === 'bg-red-200';
      changeDetected ||= this.peerEditAssignedColor.dnsmtu.dnsInput === 'bg-green-200';
      error ||= this.peerEditMTU.enabled && this.peerEditAssignedColor.dnsmtu.mtuInput === 'bg-red-200';
      changeDetected ||= this.peerEditAssignedColor.dnsmtu.mtuInput === 'bg-green-200';
      // eslint-disable-next-line no-nested-ternary
      this.peerEditAssignedColor.dnsmtu.div = this.peerEditDNS.enabled || this.peerEditMTU.enabled ? error ? 'bg-red-50' : changeDetected ? 'bg-green-100' : 'bg-green-50' : 'bg-gray-100';
      return this.peerEditAssignedColor.dnsmtu;
    },
    peerEditScriptsColor() {
      let anyEnabled = false;
      let error = false;
      let changeDetected = false;
      for (const script of ['PreUp', 'PreDown', 'PostUp', 'PostDown']) {
        // eslint-disable-next-line no-nested-ternary
        this.peerEditAssignedColor.scripts[script] = (this.network.peers[this.peerConfigId].scripts[script].value === '' || this.peerEditScripts[script].value !== this.network.peers[this.peerConfigId].scripts[script].value) ? WireGuardHelper.checkField('script', this.peerEditScripts[script]) ? 'bg-green-200' : 'bg-red-200' : 'bg-white';
        error ||= this.peerEditScripts[script].enabled && this.peerEditAssignedColor.scripts[script] === 'bg-red-200';
        changeDetected ||= this.peerEditAssignedColor.scripts[script] === 'bg-green-200';
        anyEnabled ||= this.peerEditScripts[script].enabled;
      }
      // eslint-disable-next-line no-nested-ternary
      this.peerEditAssignedColor.scripts.div = anyEnabled ? error ? 'bg-red-50' : changeDetected ? 'bg-green-100' : 'bg-green-50' : 'bg-gray-100';
      return this.peerEditAssignedColor.scripts;
    },
    peerEditConfigColor() {
      let error = false;
      let changeDetected = false;
      error ||= this.peerEditNameColor === 'bg-red-200';
      changeDetected ||= this.peerEditNameColor === 'bg-green-200';
      error ||= this.peerEditAddressColor === 'bg-red-200';
      changeDetected ||= this.peerEditAddressColor === 'bg-green-200';
      error ||= this.peerEditEndpointColor === 'bg-red-200';
      changeDetected ||= this.peerEditEndpointColor === 'bg-green-200';
      // eslint-disable-next-line no-nested-ternary
      return error ? 'bg-red-50' : changeDetected ? 'bg-green-100' : 'bg-green-50';
    },
    peerEditAttachablePeerIds() {
      const staticPeers = [];
      Object.keys(this.staticPeers).forEach(peerId => {
        if (peerId !== this.peerConfigId) {
          staticPeers.push(peerId);
        }
      });
      const roamingPeers = [];
      Object.keys(this.roamingPeers).forEach(peerId => {
        if (peerId !== this.peerConfigId) {
          roamingPeers.push(peerId);
        }
      });
      return { staticPeers, roamingPeers };
    },
    peerEditStaticSelectAll: {
      get() {
        return this.peerEditAttachablePeerIds.staticPeers.every(peerId => {
          const connectionId = WireGuardHelper.getConnectionId(this.peerConfigId, peerId);
          return this.peerEditStaticConnectionIds.includes(connectionId);
        });
      },
      set(value) {
        const attached = [];

        if (value) {
          this.peerEditAttachablePeerIds.staticPeers.forEach(peerId => {
            const connectionId = WireGuardHelper.getConnectionId(this.peerConfigId, peerId);
            attached.push(connectionId);
            if (!(connectionId in this.peerEditStaticConnectionIds)) {
              this.peerEditIsConnectionEnabled[connectionId] = true;
            }
          });
        }

        this.peerEditStaticConnectionIds = attached;
      },
    },
    peerEditRoamingSelectAll: {
      get() {
        return this.peerEditAttachablePeerIds.roamingPeers.every(peerId => {
          const connectionId = WireGuardHelper.getConnectionId(this.peerConfigId, peerId);
          return this.peerEditRoamingConnectionIds.includes(connectionId);
        });
      },
      set(value) {
        const attached = [];

        if (value) {
          this.peerEditAttachablePeerIds.roamingPeers.forEach(peerId => {
            const connectionId = WireGuardHelper.getConnectionId(this.peerConfigId, peerId);
            attached.push(connectionId);
            if (!(connectionId in this.peerEditRoamingConnectionIds)) {
              this.peerEditIsConnectionEnabled[connectionId] = true;
            }
          });
        }

        this.peerEditRoamingConnectionIds = attached;
      },
    },
    peerEditConnectionIds() {
      const connectionIds = [];
      this.peerEditAttachablePeerIds.staticPeers.forEach(peerId => {
        const connectionId = WireGuardHelper.getConnectionId(this.peerConfigId, peerId);
        if (this.peerEditStaticConnectionIds.includes(connectionId)) connectionIds.push(connectionId);
      });
      this.peerEditAttachablePeerIds.roamingPeers.forEach(peerId => {
        const connectionId = WireGuardHelper.getConnectionId(this.peerConfigId, peerId);
        if (this.peerEditRoamingConnectionIds.includes(connectionId)) connectionIds.push(connectionId);
      });

      return connectionIds;
    },
    peerEditAttachedPeersCountDivColor() {
      this.peerEditAssignedColor.connections.attachedPeerCountDiv = WireGuardHelper.checkField('peerCount', this.peerEditConnectionIds) ? 'bg-green-50' : 'bg-red-50';
      return this.peerEditAssignedColor.connections.attachedPeerCountDiv;
    },
    peerEditConnectionColor() {
      this.peerEditConnectionColorRefresh &&= this.peerEditConnectionColorRefresh;
      for (const connectionId of this.peerEditConnectionIds) {
        try {
          let error = false;
          let change = false;
          if (Object.keys(this.network.connections).includes(connectionId)) {
            // eslint-disable-next-line no-nested-ternary
            this.peerEditAssignedColor.connections.allowedIPsAtoB[connectionId] = this.peerEditAllowedIPsAtoB[connectionId] !== this.network.connections[connectionId].allowedIPsAtoB
              ? (WireGuardHelper.checkField('allowedIPs', this.peerEditAllowedIPsAtoB[connectionId]) ? 'bg-green-200' : 'bg-red-200') : 'bg-white';
            error ||= this.peerEditAssignedColor.connections.allowedIPsAtoB[connectionId] === 'bg-red-200';
            change ||= this.peerEditAssignedColor.connections.allowedIPsAtoB[connectionId] !== 'bg-white';
            // eslint-disable-next-line no-nested-ternary
            this.peerEditAssignedColor.connections.allowedIPsBtoA[connectionId] = this.peerEditAllowedIPsBtoA[connectionId] !== this.network.connections[connectionId].allowedIPsBtoA
              ? (WireGuardHelper.checkField('allowedIPs', this.peerEditAllowedIPsBtoA[connectionId]) ? 'bg-green-200' : 'bg-red-200') : 'bg-white';
            error ||= this.peerEditAssignedColor.connections.allowedIPsBtoA[connectionId] === 'bg-red-200';
            change ||= this.peerEditAssignedColor.connections.allowedIPsBtoA[connectionId] !== 'bg-white';
            // eslint-disable-next-line no-nested-ternary
            this.peerEditAssignedColor.connections.persistentKeepalive[connectionId] = this.peerEditPersistentKeepaliveValueData[connectionId] !== this.network.connections[connectionId].persistentKeepalive.value
              ? (WireGuardHelper.checkField('persistentKeepalive', this.peerEditPersistentKeepaliveValueData[connectionId]) ? 'bg-green-200' : 'bg-red-200') : 'bg-white';
            error ||= this.peerEditAssignedColor.connections.persistentKeepalive[connectionId] === 'bg-red-200';
            change ||= this.peerEditAssignedColor.connections.persistentKeepalive[connectionId] !== 'bg-white';
            change ||= this.peerEditPersistentKeepaliveEnabledData[connectionId] !== this.network.connections[connectionId].persistentKeepalive.enabled;
          } else {
            this.peerEditAssignedColor.connections.allowedIPsAtoB[connectionId] = WireGuardHelper.checkField('allowedIPs', this.peerEditAllowedIPsAtoB[connectionId]) ? 'bg-green-200' : 'bg-red-200';
            error ||= this.peerEditAssignedColor.connections.allowedIPsAtoB[connectionId] === 'bg-red-200';
            change ||= this.peerEditAssignedColor.connections.allowedIPsAtoB[connectionId] !== 'bg-white';
            this.peerEditAssignedColor.connections.allowedIPsBtoA[connectionId] = WireGuardHelper.checkField('allowedIPs', this.peerEditAllowedIPsBtoA[connectionId]) ? 'bg-green-200' : 'bg-red-200';
            error ||= this.peerEditAssignedColor.connections.allowedIPsBtoA[connectionId] === 'bg-red-200';
            change ||= this.peerEditAssignedColor.connections.allowedIPsBtoA[connectionId] !== 'bg-white';
            this.peerEditAssignedColor.connections.persistentKeepalive[connectionId] = WireGuardHelper.checkField('persistentKeepalive', this.peerEditPersistentKeepaliveValueData[connectionId]) ? 'bg-green-200' : 'bg-red-200';
            error ||= this.peerEditAssignedColor.connections.persistentKeepalive[connectionId] === 'bg-red-200';
            change ||= this.peerEditAssignedColor.connections.persistentKeepalive[connectionId] !== 'bg-white';
            change ||= this.peerEditPersistentKeepaliveEnabledData[connectionId] !== this.network.connections[connectionId].persistentKeepalive.enabled;
          }
          // eslint-disable-next-line no-nested-ternary
          this.peerEditAssignedColor.connections.div[connectionId] = !error ? this.peerEditIsConnectionEnabled[connectionId] ? change ? 'bg-green-100' : 'bg-green-50' : 'bg-red-50' : 'bg-red-100';
        } catch (e) {
          console.log(e);
          this.peerEditAssignedColor.connections.div[connectionId] = 'bg-red-50';
          this.peerEditAssignedColor.connections.allowedIPsAtoB[connectionId] = 'bg-red-50';
          this.peerEditAssignedColor.connections.allowedIPsBtoA[connectionId] = 'bg-red-50';
          this.peerEditAssignedColor.connections.persistentKeepalive[connectionId] = 'bg-red-50';
        }
      }
      return this.peerEditAssignedColor.connections;
    },
    peerEditChangedFieldsCompute() {
      // this.peerEditConnectionColorRefresh &&= this.peerEditConnectionColorRefresh;
      let errorNotFound = true;
      let changeDetectedPeer = false;
      let addDetectedPeer = false;
      const changedFields = { peers: {}, connections: {} };
      const addedFields = { connections: {} };
      const removedFields = { connections: {} };

      let peerErrorField = '';
      // check errors
      if (this.peerEditConfigColor.div === 'bg-red-50') {
        peerErrorField = this.peerEditNameColor === 'bg-red-200' ? 'name' : peerErrorField;
        peerErrorField = this.peerEditAddressColor === 'bg-red-200' ? 'address' : peerErrorField;
        peerErrorField = this.peerEditEndpointColor === 'bg-red-200' ? 'endpoint' : peerErrorField;
        errorNotFound = false;
      }
      changeDetectedPeer ||= this.peerEditMobility !== this.network.peers[this.peerConfigId].mobility;
      if (this.peerEditDNSMTUColor.div === 'bg-red-50') {
        peerErrorField = this.peerEditDNS.enabled && this.peerEditDNSMTUColor.dnsInput === 'bg-red-200' ? 'dns' : peerErrorField;
        peerErrorField = this.peerEditMTU.enabled && this.peerEditDNSMTUColor.mtuInput === 'bg-red-200' ? 'mtu' : peerErrorField;
        errorNotFound = false;
      }
      changeDetectedPeer ||= this.peerEditDNS.enabled !== this.network.peers[this.peerConfigId].dns.enabled;
      changeDetectedPeer ||= this.peerEditMTU.enabled !== this.network.peers[this.peerConfigId].mtu.enabled;
      if (this.peerEditScriptsColor.div === 'bg-red-50') {
        for (const script of ['PreUp', 'PreDown', 'PostUp', 'PostDown']) {
          peerErrorField = this.peerEditScripts[script].enabled && this.peerEditScriptsColor[script] === 'bg-red-200' ? script : peerErrorField;
        }
        errorNotFound = false;
      }
      for (const script of ['PreUp', 'PreDown', 'PostUp', 'PostDown']) {
        changeDetectedPeer ||= this.peerEditScripts[script].enabled !== this.network.peers[this.peerConfigId]['scripts'][script].enabled;
      }
      for (const peerEditFieldColor of [
        this.peerEditNameColor,
        this.peerEditAddressColor,
        this.peerEditEndpointColor,
        this.peerEditDNSMTUColor.dnsInput,
        this.peerEditDNSMTUColor.mtuInput,
        this.peerEditScriptsColor.PreUp,
        this.peerEditScriptsColor.PostUp,
        this.peerEditScriptsColor.PreDown,
        this.peerEditScriptsColor.PostDown,
      ]) {
        changeDetectedPeer ||= peerEditFieldColor === 'bg-green-200';
      }
      changeDetectedPeer ||= this.network.peers[this.peerConfigId].publicKey !== this.peerEditPublicKey;
      changeDetectedPeer ||= this.network.peers[this.peerConfigId].privateKey !== this.peerEditPrivateKey;

      if (!errorNotFound) {
        return [
          { msg: `Error detected in the peer's '${peerErrorField}' field. Changes can't be considered until this is fixed.` },
          {},
          {},
          false,
        ];
      }

      this.peerChangedPeer = changeDetectedPeer;
      if (changeDetectedPeer) {
        changedFields.peers[this.peerConfigId] = {};
        for (const [peerConfigField, peerConfigValue] of Object.entries({
          name: this.peerEditName,
          address: this.peerEditAddress,
          mobility: this.peerEditMobility,
          endpoint: this.peerEditEndpoint,
          publicKey: this.peerEditPublicKey,
          privateKey: this.peerEditPrivateKey,
        })) {
          if (peerConfigValue !== this.network.peers[this.peerConfigId][peerConfigField]) {
            changedFields.peers[this.peerConfigId][peerConfigField] = peerConfigValue;
          }
        }

        for (const [peerConfigField, peerConfigValue] of Object.entries({
          dns: this.peerEditDNS,
          mtu: this.peerEditMTU,
        })) {
          const changedDNSMTUFields = {};
          for (const subField of ['enabled', 'value']) {
            if (peerConfigValue[subField] !== this.network.peers[this.peerConfigId][peerConfigField][subField]) {
              changedDNSMTUFields[subField] = peerConfigValue[subField];
            }
          }
          if (Object.keys(changedDNSMTUFields).length > 0) {
            changedFields.peers[this.peerConfigId][peerConfigField] = changedDNSMTUFields;
          }
        }

        const changedScriptFields = {};
        for (const [peerScriptField, peerConfigValue] of Object.entries({
          PreUp: this.peerEditScripts.PreUp,
          PostUp: this.peerEditScripts.PostUp,
          PreDown: this.peerEditScripts.PreDown,
          PostDown: this.peerEditScripts.PostDown,
        })) {
          const changedSubScriptFields = {};
          for (const subField of ['enabled', 'value']) {
            if (peerConfigValue[subField] !== this.network.peers[this.peerConfigId]['scripts'][peerScriptField][subField]) {
              changedSubScriptFields[subField] = peerConfigValue[subField];
            }
          }
          if (Object.keys(changedSubScriptFields).includes('enabled')
              || Object.keys(changedSubScriptFields).includes('value')) {
            changedScriptFields[peerScriptField] = changedSubScriptFields;
          }
        }
        if (Object.keys(changedScriptFields).length > 0) {
          changedFields.peers[this.peerConfigId].scripts = changedScriptFields;
        }
      }

      let changeDetectedConnection = false;
      let connectionIdError = '';
      let connectionErrorField = '';

      // check errors
      for (const connectionId of this.peerEditConnectionIds) {
        if (Object.keys(this.network.connections).includes(connectionId)) {
          for (const connectionField of ['allowedIPsAtoB', 'allowedIPsBtoA', 'persistentKeepalive']) {
            if (this.peerEditConnectionColor[connectionField][connectionId] === 'bg-red-200') {
              connectionIdError = connectionId;
              connectionErrorField = connectionField;
              errorNotFound = false;
            }
            if (connectionField === 'persistentKeepalive') {
              changeDetectedConnection ||= this.peerEditPersistentKeepaliveEnabledData[connectionId] !== this.network.connections[connectionId].persistentKeepalive.enabled;
            }
            changeDetectedConnection ||= this.peerEditConnectionColor[connectionField][connectionId] === 'bg-green-200';
          }
          changeDetectedConnection ||= this.peerEditConnectionColor.persistentKeepalive[connectionId] === 'bg-green-200';
          changeDetectedConnection ||= this.peerEditIsConnectionEnabled[connectionId] !== this.network.connections[connectionId].enabled;
        } else {
          addDetectedPeer = true;
          for (const connectionField of ['allowedIPsAtoB', 'allowedIPsBtoA', 'persistentKeepalive']) {
            if (this.peerEditConnectionColor[connectionField][connectionId] === 'bg-red-200') {
              connectionIdError = connectionId;
              connectionErrorField = connectionField;
              errorNotFound = false;
            }
          }
        }
      }

      if (!errorNotFound) {
        return [
          { msg: `Error detected in the connection '${connectionIdError}'s '${connectionErrorField}' field. Changes can't be considered until this is fixed.` },
          {},
          {},
          false,
        ];
      }

      this.peerChangedConnections = changeDetectedConnection;
      if (changeDetectedConnection) {
        const changedConnections = {};
        for (const connectionId of this.peerEditConnectionIds) {
          const changedSubFields = {};
          if (Object.keys(this.network.connections).includes(connectionId)) {
            if (this.peerEditIsConnectionEnabled[connectionId] !== this.network.connections[connectionId].enabled) {
              changedSubFields.enabled = this.peerEditIsConnectionEnabled[connectionId];
            }

            if (this.peerEditAllowedIPsAtoB[connectionId] !== this.network.connections[connectionId].allowedIPsAtoB) {
              changedSubFields.allowedIPsAtoB = this.peerEditAllowedIPsAtoB[connectionId];
            }

            if (this.peerEditAllowedIPsBtoA[connectionId] !== this.network.connections[connectionId].allowedIPsBtoA) {
              changedSubFields.allowedIPsBtoA = this.peerEditAllowedIPsBtoA[connectionId];
            }

            if (this.peerEditPersistentKeepaliveEnabledData[connectionId] !== this.network.connections[connectionId].persistentKeepalive.enabled) {
              changedSubFields.persistentKeepalive = { enabled: this.peerEditPersistentKeepaliveEnabledData[connectionId] };
            }

            if (this.peerEditPersistentKeepaliveValueData[connectionId] !== this.network.connections[connectionId].persistentKeepalive.value) {
              if ('persistentKeepalive' in changedSubFields) {
                changedSubFields.persistentKeepalive.value = this.peerEditPersistentKeepaliveValueData[connectionId];
              } else {
                changedSubFields.persistentKeepalive = { value: this.peerEditPersistentKeepaliveValueData[connectionId] };
              }
            }

            if (Object.keys(changedSubFields).length > 0) {
              changedConnections[connectionId] = changedSubFields;
            }
          }
        }

        if (Object.keys(changedConnections).length > 0) {
          changedFields.connections = changedConnections;
        }
      }

      this.peerAddedConnections = addDetectedPeer;
      if (addDetectedPeer) {
        for (const connectionId of this.peerEditConnectionIds) {
          if (!Object.keys(this.network.connections).includes(connectionId)) {
            addedFields.connections[connectionId] = {
              enabled: this.peerEditIsConnectionEnabled[connectionId],
              allowedIPsAtoB: this.peerEditAllowedIPsAtoB[connectionId],
              allowedIPsBtoA: this.peerEditAllowedIPsBtoA[connectionId],
              persistentKeepalive: {
                enabled: this.peerEditPersistentKeepaliveEnabledData[connectionId],
                value: this.peerEditPersistentKeepaliveValueData[connectionId],
              },
            };
          }
        }
      }

      for (const connectionId of Object.keys(this.network.connections)) {
        if (connectionId.includes(this.peerConfigId)
            && !this.peerEditConnectionIds.includes(connectionId)) {
          removedFields.connections[connectionId] = {
            enabled: this.network.connections[connectionId].enabled,
            allowedIPsAtoB: this.network.connections[connectionId].allowedIPsAtoB,
            allowedIPsBtoA: this.network.connections[connectionId].allowedIPsBtoA,
            persistentKeepalive: this.network.connections[connectionId].persistentKeepalive,
          };
        }
      }
      this.peerRemovedConnections = Object.keys(removedFields.connections).length > 0;

      return [
        changeDetectedPeer || changeDetectedConnection ? changedFields : {},
        this.peerAddedConnections ? addedFields : {},
        this.peerRemovedConnections ? removedFields : {},
        true,
      ];
    },
    peerEditResetConnectionFieldsDisabled() {
      this.peerEditConnectionColorRefresh &&= this.peerEditConnectionColorRefresh;
      const resetFields = {};
      for (const connectionId of [...this.peerEditStaticConnectionIds, ...this.peerEditRoamingConnectionIds]) {
        let changed = false;
        if (Object.keys(this.network.connections).includes(connectionId)) {
          changed ||= this.peerEditIsConnectionEnabled[connectionId] !== this.network.connections[connectionId].enabled;
          changed ||= this.peerEditPersistentKeepaliveEnabledData[connectionId] !== this.network.connections[connectionId].persistentKeepalive.enabled;
          changed ||= this.peerEditPersistentKeepaliveValueData[connectionId] !== this.network.connections[connectionId].persistentKeepalive.value;
          changed ||= this.peerEditAllowedIPsAtoB[connectionId] !== this.network.connections[connectionId].allowedIPsAtoB;
          changed ||= this.peerEditAllowedIPsBtoA[connectionId] !== this.network.connections[connectionId].allowedIPsBtoA;
        } else {
          changed ||= this.peerEditIsConnectionEnabled[connectionId] !== true;
          changed ||= this.peerEditPersistentKeepaliveEnabledData[connectionId] !== this.network.defaults.connections.persistentKeepalive.enabled;
          changed ||= this.peerEditPersistentKeepaliveValueData[connectionId] !== this.network.defaults.connections.persistentKeepalive.value;
          const { a, b } = WireGuardHelper.getConnectionPeers(connectionId);
          changed ||= this.peerEditAllowedIPsAtoB[connectionId] !== `${this.network.peers[b].address}/32`;
          changed ||= this.peerEditAllowedIPsBtoA[connectionId] !== `${this.network.peers[a].address}/32`;
        }
        resetFields[connectionId] = !changed;
      }
      return resetFields;
    },
    peerCreateResetConnectionFieldsDisabled() {
      this.peerCreateConnectionColorRefresh &&= this.peerCreateConnectionColorRefresh;
      const resetFields = {};
      for (const peerId of [...this.peerCreateAttachedStaticPeerIds, ...this.peerCreateAttachedRoamingPeerIds]) {
        let changed = false;
        changed ||= this.peerCreateIsConnectionEnabled[peerId] !== true;
        changed ||= this.peerCreatePersistentKeepaliveEnabledData[peerId] !== this.network.defaults.connections.persistentKeepalive.enabled;
        changed ||= this.peerCreatePersistentKeepaliveValueData[peerId] !== this.network.defaults.connections.persistentKeepalive.value;
        if (this.peerCreateAttachedStaticPeerIds.includes(peerId)) {
          changed ||= this.peerCreateAllowedIPsNewToOld[peerId] !== (this.peerCreateMobility === 'static' ? this.network.subnet : '0.0.0.0/0');
          changed ||= this.peerCreateAllowedIPsOldToNew[peerId] !== `${this.peerCreateAddress}/32`;
        } else {
          changed ||= this.peerCreateAllowedIPsNewToOld[peerId] !== `${this.network.peers[peerId].address}/32`;
          changed ||= this.peerCreateAllowedIPsOldToNew[peerId] !== `${this.peerCreateAddress}/32`;
        }
        resetFields[peerId] = !changed;
      }
      return resetFields;
    },
    forceGraphComputed() {
      const peerSize = {};
      Object.keys(this.network.peers).forEach(peerId => {
        peerSize[peerId] = 1;
      });
      const forceG = { nodes: [], links: [] };
      for (const [connectionId, connectionDetails] of Object.entries(this.network.connections)) {
        if (connectionDetails.enabled) {
          const { a, b } = WireGuardHelper.getConnectionPeers(connectionId);
          const linkColorStrength = 1
              + Object.keys(this.staticPeers).includes(a)
              + Object.keys(this.staticPeers).includes(b);
          let color = '';
          // eslint-disable-next-line default-case
          switch (linkColorStrength) {
            case 1:
              color = 'rgb(229 231 235)';
              break;
            case 2:
              color = 'rgb(209 213 219)';
              break;
            case 3:
              color = 'rgb(107 114 128)';
              break;
          }
          forceG.links.push({
            source: a, target: b, particleCount: 0, color, strength: linkColorStrength,
          });
          forceG.links.push({
            source: b, target: a, particleCount: 0, color, strength: linkColorStrength,
          });
          for (const ab of [a, b]) {
            peerSize[ab] += Object.keys(this.staticPeers).includes(ab) ? 0.25 : 0.0625;
            peerSize[ab] += connectionDetails.enabled ? 0.125 : 0.03125;
          }
        }
      }

      for (const [peerId, peerDetails] of Object.entries(this.network.peers)) {
        forceG.nodes.push({
          id: peerId, name: peerDetails.name, mobility: peerDetails.mobility, size: Math.sqrt(peerSize[peerId]) * 7, icon: this.peerAvatarCanvases[peerId],
        });
      }
      return forceG;
    },
  },
  filters: {
    bytes,
    timeago: value => {
      return timeago().format(value);
    },
  },
  mounted() {
    this.api = new API();
    this.api.getSession()
      .then(session => {
        this.authenticated = session.authenticated;
        this.requiresPassword = session.requiresPassword;
        this.refresh().catch(err => {
          alert(err.message || err.toString());
        });
      })
      .catch(err => {
        alert(err.message || err.toString());
      });

    setInterval(() => {
      this.refresh().catch(error => {
        console.log(error);
      });
    }, 1000);

    // Promise.resolve().then(async () => {
    //   const currentRelease = await this.api.getRelease();
    //   const latestRelease = await fetch('https://weejewel.github.io/wg-easy/changelog.json')
    //     .then(res => res.json())
    //     .then(releases => {
    //       const releasesArray = Object.entries(releases).map(([version, changelog]) => ({
    //         version: parseInt(version, 10),
    //         changelog,
    //       }));
    //       releasesArray.sort((a, b) => {
    //         return b.version - a.version;
    //       });
    //
    //       return releasesArray[0];
    //     });
    //
    //   console.log(`Current Release: ${currentRelease}`);
    //   console.log(`Latest Release: ${latestRelease.version}`);
    //
    //   if (currentRelease >= latestRelease.version) return;
    //
    //   this.currentRelease = currentRelease;
    //   this.latestRelease = latestRelease;
    // }).catch(console.error);
  },
});
