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
    refreshInterval: 1000,
    authenticated: null,
    authenticating: false,
    password: null,
    requiresPassword: null,

    api: null,

    initializedGraph: false,
    graph: null,

    network: { peers: { root: { address: '' } }, connections: {} },

    peerAvatars: {},
    peerAvatarSources: {},
    peerAvatarCanvases: {},
    peerDeleteId: null,
    peerConfigId: null,
    peerConfigWindow: 'edit',
    peerQRId: null,

    dnsmtuIslandData: {
      dns: { enabled: false, value: '' },
      mtu: { enabled: false, value: '' },
      context: '',
      changed: false,
      error: null,
    },
    scriptsIslandData: {
      scripts: {
        PreUp: { enabled: false, value: '' },
        PostUp: { enabled: false, value: '' },
        PreDown: { enabled: false, value: '' },
        PostDown: { enabled: false, value: '' },
      },
      changed: false,
      error: null,
    },
    connectionIslandsData: {
      selectionBoxTitles: { static: 'Attach to these static peers:', roaming: 'Attach to these roaming peers:' },
      staticPeers: {},
      roamingPeers: {},
      attachedStaticPeers: [],
      attachedRoamingPeers: [],
      isConnectionEnabled: {},
      persistentKeepaliveEnabled: {},
      persistentKeepaliveValue: {},
      allowedIPsAtoB: {},
      allowedIPsBtoA: {},
      latestHandshakeAt: {},
      preSharedKey: {},
      context: '',
      changed: false,
      error: null,
    },

    peerCreatePeerId: '',
    peerCreateName: '',
    peerCreateAddress: '',
    peerCreatePreambleExpiration: (new Date()).getTime(),
    peerCreateMobility: '',
    peerCreateEndpoint: '',
    peerCreateShowAdvance: '',

    peerQuickEditName: null,
    peerQuickEditNameId: null,
    peerQuickEditAddress: null,
    peerQuickEditAddressId: null,
    peerEditName: '',
    peerEditAddress: '',
    peerEditMobility: '',
    peerEditEndpoint: '',
    peerEditPublicKey: '',
    peerEditPrivateKey: '',
    peerChangedPeer: false,
    peerChangedConnections: false,
    peerAddedConnections: false,
    peerRemovedConnections: false,
    peerEditOldConfig: { peers: {}, connections: {} },
    peerEditNewConfig: { peers: {}, connections: {} },

    dialogId: null,
    dialogPeerId: null,
    dialogTitle: null,
    dialogBody: null,
    dialogLeftButton: null,
    dialogLeftButtonClick: null,
    dialogRightButton: null,
    dialogRightButtonClick: null,
    dialogRightButtonClasses: null,

    staticPeers: {},
    roamingPeers: {},

    webServerStatus: 'unknown',
    wireguardStatus: 'unknown',
    wireguardToggleTo: null,

    currentRelease: null,
    latestRelease: null,

    networkSeriesRefresh: 0,
    networkSeriesLength: 50,
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
    peersPersist: { prevTimeStamp: 0 },
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
        let totalRootRx = 0;
        let totalRootTx = 0;
        // start appending from network.connections
        for (const [connectionId, connectionDetails] of Object.entries(network.connections)) {
          if (!this.peersPersist[connectionId]) {
            this.peersPersist[connectionId] = {};
            this.peersPersist[connectionId].transferRxHistory = Array(this.networkSeriesLength).fill(0);
            this.peersPersist[connectionId].transferRxPrevious = connectionDetails.transferRx;
            this.peersPersist[connectionId].transferTxHistory = Array(this.networkSeriesLength).fill(0);
            this.peersPersist[connectionId].transferTxPrevious = connectionDetails.transferTx;
            this.peersPersist[connectionId].transferRxCurrent = 0;
            this.peersPersist[connectionId].transferTxCurrent = 0;

            this.peersPersist[connectionId].chartOptions = {
              ...this.chartOptions,
              yaxis: {
                ...this.chartOptions.yaxis,
                max: () => this.peersPersist[connectionId].chartMax,
              },
            };
          } else {
            totalRootTx += connectionDetails.transferRx;
            totalRootRx += connectionDetails.transferTx;

            this.peersPersist[connectionId].transferRxCurrent = (connectionDetails.transferRx - this.peersPersist[connectionId].transferRxPrevious) / ((network.timestamp - this.peersPersist.prevTimeStamp) / 1000);
            this.peersPersist[connectionId].transferRxPrevious = connectionDetails.transferRx;
            this.peersPersist[connectionId].transferTxCurrent = (connectionDetails.transferTx - this.peersPersist[connectionId].transferTxPrevious) / ((network.timestamp - this.peersPersist.prevTimeStamp) / 1000);
            this.peersPersist[connectionId].transferTxPrevious = connectionDetails.transferTx;
          }

          this.peersPersist[connectionId].transferRxHistory.push(this.peersPersist[connectionId].transferRxCurrent);
          this.peersPersist[connectionId].transferRxHistory.shift();

          this.peersPersist[connectionId].transferTxHistory.push(this.peersPersist[connectionId].transferTxCurrent);
          this.peersPersist[connectionId].transferTxHistory.shift();

          this.peersPersist[connectionId].chartMax = Math.max(...this.peersPersist[connectionId].transferTxHistory, ...this.peersPersist[connectionId].transferRxHistory);

          this.graphDisplayTraffic(connectionId);
        }
        if (!this.peersPersist['root*root']) {
          this.peersPersist['root*root'] = {};
          this.peersPersist['root*root'].transferRxHistory = Array(this.networkSeriesLength).fill(0);
          this.peersPersist['root*root'].transferRxPrevious = totalRootRx;
          this.peersPersist['root*root'].transferTxHistory = Array(this.networkSeriesLength).fill(0);
          this.peersPersist['root*root'].transferTxPrevious = totalRootTx;
          this.peersPersist['root*root'].transferRxCurrent = 0;
          this.peersPersist['root*root'].transferTxCurrent = 0;

          this.peersPersist['root*root'].chartOptions = {
            ...this.chartOptions,
            yaxis: {
              ...this.chartOptions.yaxis,
              max: () => this.peersPersist['root*root'].chartMax,
            },
          };
        } else {
          this.peersPersist['root*root'].transferRxCurrent = totalRootRx - this.peersPersist['root*root'].transferRxPrevious;
          this.peersPersist['root*root'].transferRxPrevious = totalRootRx;
          this.peersPersist['root*root'].transferTxCurrent = totalRootTx - this.peersPersist['root*root'].transferTxPrevious;
          this.peersPersist['root*root'].transferTxPrevious = totalRootTx;
        }
        this.peersPersist['root*root'].transferRxHistory.push(this.peersPersist['root*root'].transferRxCurrent);
        this.peersPersist['root*root'].transferRxHistory.shift();

        this.peersPersist['root*root'].transferTxHistory.push(this.peersPersist['root*root'].transferTxCurrent);
        this.peersPersist['root*root'].transferTxHistory.shift();

        this.peersPersist['root*root'].chartMax = Math.max(...this.peersPersist['root*root'].transferTxHistory, ...this.peersPersist['root*root'].transferRxHistory);
        // const lastTenAverage = array => array.slice(-10).reduce((a, b) => a + b) / array.slice(-10).length;
        // detectedChange ||= Math.floor(lastTenAverage(this.peersPersist['root*root'].transferRxHistory)) > 0
        //     || Math.floor(lastTenAverage(this.peersPersist['root*root'].transferTxHistory)) > 0;

        this.peersPersist.prevTimeStamp = network.timestamp;
        this.networkSeriesRefresh += 1;
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
        delete network.timestamp;
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

      if (this.initializedGraph && detectedChange) {
        try {
          this.graph.graphData(this.forceGraphComputed);
        } catch (e) {
          console.log(e);
        }
      }

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

            this.peerEditWindowInitialize({ peerId: node.id });
            this.peerConfigWindow = 'edit';
            this.peerConfigId = node.id;
          });

          this.graph.graphData(this.forceGraphComputed);
          this.initializedGraph = true;
        } catch (e) {
          console.log('my error: ');
          console.log(e);
        }
      }

      // keep reserving the peer create address 10 seconds before it expires
      if (this.peerCreatePeerId !== ''
          && this.peerCreateAddress !== ''
          && (new Date()).getTime() > (this.peerCreatePreambleExpiration - 10 * 1000 - this.refreshInterval)) {
        try {
          const { peerId, address, expiration } = await this.api.preamblePeer({
            peerId: this.peerCreatePeerId,
            address: this.peerCreateAddress,
          });
          this.peerCreatePeerId = peerId;
          this.peerCreateAddress = address;
          this.peerCreatePreambleExpiration = expiration;
        } catch (e) {
          this.peerCreateMobility = '';
          this.peerCreatePeerId = '';
          this.peerCreateAddress = '';
          this.prepDialog('cant-create-peer');
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
    toggleWireGuardNetworking() {
      if (this.wireguardStatus === 'up') {
        this.wireguardStatus = 'unknown';
        this.api.wireguardDisable().then();
      } else if (this.wireguardStatus === 'down') {
        this.wireguardStatus = 'unknown';
        this.api.wireguardEnable().then();
      }
    },
    async peerCreateWindowInitialize() {
      if ((new Date()).getTime() > this.peerCreatePreambleExpiration) {
        try {
          const { peerId, address, expiration } = await this.api.preamblePeer({ });
          this.peerCreatePeerId = peerId;
          this.peerCreateAddress = address;
          this.peerCreatePreambleExpiration = expiration;
        } catch (e) {
          this.peerCreateMobility = '';
          this.prepDialog('cant-create-peer');
        }
      }

      this.peerCreateName = '';
      this.peerCreateEndpoint = '';
      this.peerCreateShowAdvance = false;

      this.dnsmtuIslandData.context = 'create';
      this.dnsmtuIslandData.dns = JSON.parse(JSON.stringify(this.network.defaults.peers.dns));
      this.dnsmtuIslandData.mtu = JSON.parse(JSON.stringify(this.network.defaults.peers.mtu));
      this.dnsmtuIslandData.error = null;

      this.scriptsIslandData.scripts = JSON.parse(JSON.stringify(this.network.defaults.peers.scripts));
      this.scriptsIslandData.error = null;

      this.connectionIslandsData.context = 'create';
      this.connectionIslandsData.selectionBoxTitles = { static: 'Attach to these static peers:', roaming: 'Attach to these roaming peers:' };
      this.connectionIslandsData.staticPeers = this.staticPeers;
      this.connectionIslandsData.roamingPeers = this.roamingPeers;
      // enable the root server as default
      this.connectionIslandsData.attachedStaticPeers = ['root'];
      this.connectionIslandsData.attachedRoamingPeers = [];
      this.connectionIslandsData.error = null;

      for (const [peerId, peerDetails] of Object.entries(this.network.peers)) {
        const connectionId = WireGuardHelper.getConnectionId(this.peerCreatePeerId, peerId);
        const { a, b } = WireGuardHelper.getConnectionPeers(connectionId);

        this.connectionIslandsData.isConnectionEnabled[connectionId] = true;
        this.connectionIslandsData.persistentKeepaliveEnabled[connectionId] = this.network.defaults.connections.persistentKeepalive.enabled;
        this.connectionIslandsData.persistentKeepaliveValue[connectionId] = this.network.defaults.connections.persistentKeepalive.value;
        // eslint-disable-next-line no-nested-ternary
        const allowedIPsNewToOld = peerDetails.mobility === 'static' ? (this.peerCreateMobility === 'static' ? this.network.subnet : '0.0.0.0/0') : `${this.network.peers[peerId].address}/32`;
        const allowedIPsOldToNew = `${this.peerCreateAddress}/32`;
        this.connectionIslandsData.allowedIPsAtoB[connectionId] = (a === peerId && b === this.peerCreatePeerId) ? allowedIPsOldToNew : allowedIPsNewToOld;
        this.connectionIslandsData.allowedIPsBtoA[connectionId] = (a === peerId && b === this.peerCreatePeerId) ? allowedIPsNewToOld : allowedIPsOldToNew;

        this.connectionIslandsData.latestHandshakeAt[connectionId] = null;
        this.connectionIslandsData.preSharedKey[connectionId] = null;
      }
    },
    async peerCreateWindowDeletePreamble() {
      await this.api.deletePreamble({ peerId: this.peerCreatePeerId, address: this.peerCreateAddress });

      // Reset the peerId, address and expiration time
      this.peerCreatePeerId = '';
      this.peerCreateAddress = '';
      this.peerCreatePreambleExpiration = (new Date()).getTime();
    },
    createPeer() {
      const attachedPeersCompact = [];
      for (const peerId of [...this.connectionIslandsData.attachedStaticPeers, ...this.connectionIslandsData.attachedRoamingPeers]) {
        const connectionId = WireGuardHelper.getConnectionId(this.peerCreatePeerId, peerId);
        attachedPeersCompact.push({
          peer: peerId,
          enabled: this.connectionIslandsData.isConnectionEnabled[connectionId],
          allowedIPsAtoB: this.connectionIslandsData.allowedIPsAtoB[connectionId],
          allowedIPsBtoA: this.connectionIslandsData.allowedIPsBtoA[connectionId],
          persistentKeepalive: {
            enabled: this.connectionIslandsData.persistentKeepaliveEnabled[connectionId],
            value: this.connectionIslandsData.persistentKeepaliveValue[connectionId],
          },
        });
      }

      this.api.createPeer({
        peerId: this.peerCreatePeerId,
        address: this.peerCreateAddress,
        name: this.peerCreateName,
        mobility: this.peerCreateMobility,
        endpoint: this.peerCreateEndpoint,
        dns: {
          enabled: this.dnsmtuIslandData.dns.enabled,
          value: this.dnsmtuIslandData.dns.value,
        },
        mtu: {
          enabled: this.dnsmtuIslandData.mtu.enabled,
          value: this.dnsmtuIslandData.mtu.value,
        },
        scripts: this.scriptsIslandData.scripts,
        attachedPeers: attachedPeersCompact,
      }).catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));

      // Reset the peerId, address and expiration time
      this.peerCreatePeerId = '';
      this.peerCreateAddress = '';
      this.peerCreatePreambleExpiration = (new Date()).getTime();
    },
    peerEditWindowInitialize(options = {}) {
      const { peerId } = options;
      this.peerEditName = this.network.peers[peerId]['name'];
      this.peerEditAddress = this.network.peers[peerId]['address'];
      this.peerEditMobility = this.network.peers[peerId]['mobility'];
      this.peerEditEndpoint = this.network.peers[peerId]['endpoint'];

      this.peerEditPublicKey = this.network.peers[peerId].publicKey;
      this.peerEditPrivateKey = this.network.peers[peerId].privateKey;

      this.dnsmtuIslandData.context = 'edit';
      this.dnsmtuIslandData.dns = JSON.parse(JSON.stringify(this.network.peers[peerId]['dns']));
      this.dnsmtuIslandData.mtu = JSON.parse(JSON.stringify(this.network.peers[peerId]['mtu']));
      this.dnsmtuIslandData.error = null;

      this.scriptsIslandData.scripts = JSON.parse(JSON.stringify(this.network.peers[peerId]['scripts']));
      this.scriptsIslandData.error = null;

      this.connectionIslandsData.context = 'edit';
      this.connectionIslandsData.selectionBoxTitles = { static: 'Attached static peers:', roaming: 'Attached roaming peers:' };
      this.connectionIslandsData.staticPeers = {};
      for (const [staticPeerId, staticPeerDetails] of Object.entries(this.staticPeers)) {
        if (staticPeerId === peerId) continue;
        this.connectionIslandsData.staticPeers[staticPeerId] = staticPeerDetails;
      }
      this.connectionIslandsData.roamingPeers = {};
      for (const [roamingPeerId, roamingPeerDetails] of Object.entries(this.roamingPeers)) {
        if (roamingPeerId === peerId) continue;
        this.connectionIslandsData.roamingPeers[roamingPeerId] = roamingPeerDetails;
      }

      // To enforce order of static > roaming connections when listed in the view
      this.connectionIslandsData.attachedStaticPeers = [];
      this.connectionIslandsData.attachedRoamingPeers = [];
      for (const staticPeerId of Object.keys(this.staticPeers)) {
        if (staticPeerId === peerId) continue;
        const connectionId = WireGuardHelper.getConnectionId(staticPeerId, peerId);
        if (Object.keys(this.network.connections).includes(connectionId)) this.connectionIslandsData.attachedStaticPeers.push(staticPeerId);
      }
      for (const roamingPeerId of Object.keys(this.roamingPeers)) {
        if (roamingPeerId === peerId) continue;
        const connectionId = WireGuardHelper.getConnectionId(roamingPeerId, peerId);
        if (Object.keys(this.network.connections).includes(connectionId)) this.connectionIslandsData.attachedRoamingPeers.push(roamingPeerId);
      }
      this.connectionIslandsData.error = null;

      this.connectionIslandsData.isConnectionEnabled = {};
      this.connectionIslandsData.persistentKeepaliveEnabled = {};
      this.connectionIslandsData.persistentKeepaliveValue = {};
      this.connectionIslandsData.allowedIPsAtoB = {};
      this.connectionIslandsData.allowedIPsBtoA = {};
      for (const connectionId of Object.keys(this.network.connections)) {
        if (connectionId.includes(peerId)) {
          this.connectionIslandsData.isConnectionEnabled[connectionId] = this.network.connections[connectionId].enabled;
          this.connectionIslandsData.persistentKeepaliveEnabled[connectionId] = this.network.connections[connectionId].persistentKeepalive.enabled;
          this.connectionIslandsData.persistentKeepaliveValue[connectionId] = this.network.connections[connectionId].persistentKeepalive.value.toString();
          this.connectionIslandsData.allowedIPsAtoB[connectionId] = this.network.connections[connectionId].allowedIPsAtoB;
          this.connectionIslandsData.allowedIPsBtoA[connectionId] = this.network.connections[connectionId].allowedIPsBtoA;
          this.connectionIslandsData.latestHandshakeAt[connectionId] = this.network.connections[connectionId].latestHandshakeAt;
          this.connectionIslandsData.preSharedKey[connectionId] = this.network.connections[connectionId].preSharedKey;
        }
      }
      for (const [otherPeerId, peerDetails] of Object.entries(this.network.peers)) {
        if (otherPeerId === this.peerConfigId) continue;
        const connectionId = WireGuardHelper.getConnectionId(peerId, otherPeerId);
        const { a, b } = WireGuardHelper.getConnectionPeers(connectionId);

        if (Object.keys(this.connectionIslandsData.isConnectionEnabled).includes(connectionId)) continue;

        this.connectionIslandsData.isConnectionEnabled[connectionId] = true;
        this.connectionIslandsData.persistentKeepaliveEnabled[connectionId] = this.network.defaults.connections.persistentKeepalive.enabled;
        this.connectionIslandsData.persistentKeepaliveValue[connectionId] = this.network.defaults.connections.persistentKeepalive.value;
        // eslint-disable-next-line no-nested-ternary
        const allowedIPsNewToOld = peerDetails.mobility === 'static' ? (this.peerCreateMobility === 'static' ? this.network.subnet : '0.0.0.0/0') : `${this.network.peers[otherPeerId].address}/32`;
        const allowedIPsOldToNew = `${this.network.peers[peerId].address}/32`;
        this.connectionIslandsData.allowedIPsAtoB[connectionId] = (a === otherPeerId && b === this.peerCreatePeerId) ? allowedIPsOldToNew : allowedIPsNewToOld;
        this.connectionIslandsData.allowedIPsBtoA[connectionId] = (a === otherPeerId && b === this.peerCreatePeerId) ? allowedIPsNewToOld : allowedIPsOldToNew;

        this.connectionIslandsData.latestHandshakeAt[connectionId] = null;
        this.connectionIslandsData.preSharedKey[connectionId] = null;
      }
    },
    async refreshPeerEditKeys() {
      const { publicKey, privateKey } = await this.api.getNewKeyPairs();
      this.peerEditPublicKey = publicKey;
      this.peerEditPrivateKey = privateKey;
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
        let publicKeyValue = null;
        let privateKeyValue = null;
        if (Object.keys(changedFields.peers).length) {
          for (const [field, value] of Object.entries(changedFields.peers[this.peerConfigId])) {
            switch (field) {
              case 'name':
                this.api.updatePeerName(this.peerConfigId, value).then();
                break;
              case 'address':
                this.api.updatePeerAddress(this.peerConfigId, value).then();
                break;
              case 'mobility':
                mobilityValue = value;
                break;
              case 'endpoint':
                endpointValue = value;
                break;
              case 'dns':
                this.api.updatePeerDNS(this.peerConfigId, value).then();
                break;
              case 'mtu':
                this.api.updatePeerMTU(this.peerConfigId, value).then();
                break;
              case 'scripts':
                this.api.updatePeerScripts(this.peerConfigId, value).then();
                break;
              case 'publicKey':
                publicKeyValue = value;
                break;
              case 'privateKey':
                privateKeyValue = value;
                break;
              default:
                break;
            }
          }
        }
        if (mobilityValue || endpointValue) this.api.updatePeerEndpoint(this.peerConfigId, mobilityValue, endpointValue).then();
        if (publicKeyValue || privateKeyValue) this.api.updatePeerKeys(this.peerConfigId, publicKeyValue, privateKeyValue).then();

        for (const [connectionId, connection] of Object.entries(changedFields.connections)) {
          let AtoBValue = null;
          let BtoAValue = null;
          let persistentKeepaliveEnabled = null;
          let persistentKeepaliveValue = null;
          for (const [field, value] of Object.entries(connection)) {
            switch (field) {
              case 'enabled':
                if (value) {
                  this.api.enableConnection(connectionId).then();
                } else {
                  this.api.disableConnection(connectionId).then();
                }
                break;
              case 'allowedIPsAtoB':
                AtoBValue = value;
                break;
              case 'allowedIPsBtoA':
                BtoAValue = value;
                break;
              case 'preSharedKey':
                this.api.updateConnectionKey(connectionId, value).then();
                break;
              case 'persistentKeepalive':
                if ('enabled' in value) persistentKeepaliveEnabled = value.enabled;
                if ('value' in value) persistentKeepaliveValue = value.value;
                break;
              default:
                break;
            }
          }
          if (AtoBValue || BtoAValue) this.api.updateConnectionAllowedIPs(connectionId, AtoBValue, BtoAValue).then();
          if (persistentKeepaliveEnabled || persistentKeepaliveValue) this.api.updateConnectionPersistentKeepalive(connectionId, persistentKeepaliveEnabled, persistentKeepaliveValue).then();
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
    graphDisplayTraffic(connectionId) {
      if (!this.graph) return;
      this.graph.graphData().links.forEach(link => {
        let trafficBytes = 0;
        if (link.source.id === 'root' && link.target.id === connectionId.replaceAll('root*', '')) {
          trafficBytes = this.networkAverageTrafficCompute.tx[connectionId];
        }
        if (link.target.id === 'root' && link.source.id === connectionId.replaceAll('root*', '')) {
          trafficBytes = this.networkAverageTrafficCompute.rx[connectionId];
        }
        const particleCount = Math.max(Math.log10(Math.max(trafficBytes / 1000000, 1)), trafficBytes > 0);
        this.graphEmitParticles(link, particleCount);
      });
    },
    async graphEmitParticles(link, particleCount) {
      for (let i = 0; i < particleCount; i++) {
        this.graph.emitParticle(link);
        await new Promise(r => setTimeout(r, 1000 / particleCount));
      }
    },
    prepDialog(dialogId) {
      switch (dialogId) {
        case 'network-toggle':
          // eslint-disable-next-line no-case-declarations
          const toggle = this.wireguardStatus === 'up' ? 'Disable' : 'Enable';
          this.dialogTitle = `${toggle} the WireGuard Network`;
          this.dialogBody = `Are you sure you want to ${toggle.toLowerCase()} the WireGuard Network?`;
          this.dialogLeftButton = 'Cancel';
          this.dialogLeftButtonClick = () => {
            this.dialogId = null;
          };
          this.dialogRightButton = toggle;
          this.dialogRightButtonClick = () => {
            this.toggleWireGuardNetworking();
            this.dialogId = null;
          };
          this.dialogRightButtonClasses = this.wireguardStatus === 'up' ? ['text-white', 'bg-red-600', 'hover:bg-red-700'] : ['text-white', 'bg-green-600', 'hover:bg-green-700'];
          break;
        case 'delete-peer':
          this.dialogTitle = 'Delete Peer';
          this.dialogBody = `Are you sure you want to delete <strong>${this.network.peers[this.dialogPeerId].name}</strong>? This action cannot be undone.`;
          this.dialogLeftButton = 'Cancel';
          this.dialogLeftButtonClick = () => {
            this.dialogId = null;
          };
          this.dialogRightButton = 'Delete';
          this.dialogRightButtonClick = () => {
            this.api.deletePeer(this.dialogPeerId).then();
            this.dialogId = null;
          };
          this.dialogRightButtonClasses = ['text-white', 'bg-red-600', 'hover:bg-red-700'];
          break;
        case 'cant-create-peer':
          this.dialogTitle = 'Error while preparing peer creation window';
          this.dialogBody = 'There are no addresses left to be reserved. A new peer can\'t be created until the reserved addresses pool is reset, or you have reached the peer limit.';
          this.dialogLeftButton = 'Cancel';
          this.dialogLeftButtonClick = () => {
            this.dialogId = null;
          };
          this.dialogRightButton = null;
          break;
        case 'confirm-changes':
          this.dialogTitle = `Confirm changes for <strong>${this.network.peers[this.peerConfigId].name}</strong>`;
          this.dialogBody = 'Are you sure you want to make these changes?';
          this.dialogLeftButton = 'Cancel';
          this.dialogLeftButtonClick = () => {
            this.dialogId = null;
          };
          this.dialogRightButton = 'Do it!';
          this.dialogRightButtonClick = () => {
            this.peerConfigEditApply().then();
            this.peerConfigId = null;
            this.peerConfigWindow = 'edit';
            this.dialogId = null;
          };
          this.dialogRightButtonClasses = ['text-white', 'bg-green-600', 'hover:bg-green-700'];
          break;
        default:
          break;
      }
      this.dialogId = dialogId;
    },
  },
  computed: {
    peerCreateNameColor() {
      return WireGuardHelper.checkField('name', this.peerCreateName) ? 'bg-green-50' : 'bg-red-50';
    },
    peerCreateEndpointColor() {
      return WireGuardHelper.checkField('endpoint', this.peerCreateEndpoint) ? 'bg-green-50' : 'bg-red-50';
    },
    peerCreateEligibilityOverall() {
      return this.peerCreateNameColor !== 'bg-red-50'
          && !(this.peerCreateMobility === 'static' && this.peerCreateEndpointColor === 'bg-red-50')
          && !this.dnsmtuIslandData.error
          && !this.scriptsIslandData.error
          && !this.connectionIslandsData.error;
    },
    peerEditNameColor() {
      // eslint-disable-next-line no-nested-ternary
      return this.peerEditName !== this.network.peers[this.peerConfigId].name
        ? (WireGuardHelper.checkField('name', this.peerEditName) ? 'bg-green-200' : 'bg-red-200') : 'bg-white';
    },
    peerEditAddressColor() {
      // eslint-disable-next-line no-nested-ternary
      return this.peerEditAddress !== this.network.peers[this.peerConfigId].address
        ? (WireGuardHelper.checkField('address', this.peerEditAddress) ? 'bg-green-200' : 'bg-red-200') : 'bg-white';
    },
    peerEditEndpointColor() {
      // eslint-disable-next-line no-nested-ternary
      return this.peerEditMobility === 'static' ? this.peerEditEndpoint !== this.network.peers[this.peerConfigId].endpoint
        ? (WireGuardHelper.checkField('endpoint', this.peerEditEndpoint) ? 'bg-green-200' : 'bg-red-200') : 'bg-white' : 'bg-gray-100';
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
    peerEditChangedFieldsCompute() {
      let changeDetectedPeer = false;
      const changedFields = { peers: {}, connections: {} };
      const addedFields = { connections: {} };
      const removedFields = { connections: {} };

      let peerErrorField = '';
      // check errors
      if (this.peerEditConfigColor.div === 'bg-red-50') {
        peerErrorField = this.peerEditNameColor === 'bg-red-200' ? 'name' : peerErrorField;
        peerErrorField = this.peerEditAddressColor === 'bg-red-200' ? 'address' : peerErrorField;
        peerErrorField = this.peerEditEndpointColor === 'bg-red-200' ? 'endpoint' : peerErrorField;
      }
      changeDetectedPeer ||= this.peerEditMobility !== this.network.peers[this.peerConfigId].mobility;

      peerErrorField = this.dnsmtuIslandData.error ? this.dnsmtuIslandData.error : peerErrorField;
      changeDetectedPeer ||= this.dnsmtuIslandData.changed;

      peerErrorField = this.scriptsIslandData.error ? this.scriptsIslandData.error : peerErrorField;
      changeDetectedPeer ||= this.scriptsIslandData.changed;

      for (const peerEditFieldColor of [
        this.peerEditNameColor,
        this.peerEditAddressColor,
        this.peerEditEndpointColor,
      ]) {
        changeDetectedPeer ||= peerEditFieldColor === 'bg-green-200';
      }
      changeDetectedPeer ||= this.network.peers[this.peerConfigId].publicKey !== this.peerEditPublicKey;
      changeDetectedPeer ||= this.network.peers[this.peerConfigId].privateKey !== this.peerEditPrivateKey;

      if (peerErrorField) {
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
          dns: this.dnsmtuIslandData.dns,
          mtu: this.dnsmtuIslandData.mtu,
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
          PreUp: this.scriptsIslandData.scripts.PreUp,
          PostUp: this.scriptsIslandData.scripts.PostUp,
          PreDown: this.scriptsIslandData.scripts.PreDown,
          PostDown: this.scriptsIslandData.scripts.PostDown,
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

      if (this.connectionIslandsData.error) {
        return [
          { msg: `Error detected in the '${this.connectionIslandsData.error}' field. Changes can't be considered until this is fixed.` },
          {},
          {},
          false,
        ];
      }

      if (this.connectionIslandsData.changed) {
        const changedConnections = {};
        for (const peerId of [...this.connectionIslandsData.attachedStaticPeers, ...this.connectionIslandsData.attachedRoamingPeers]) {
          const connectionId = WireGuardHelper.getConnectionId(this.peerConfigId, peerId);
          const changedSubFields = {};
          if (Object.keys(this.network.connections).includes(connectionId)) {
            if (this.connectionIslandsData.isConnectionEnabled[connectionId] !== this.network.connections[connectionId].enabled) {
              changedSubFields.enabled = this.connectionIslandsData.isConnectionEnabled[connectionId];
            }

            if (this.connectionIslandsData.allowedIPsAtoB[connectionId] !== this.network.connections[connectionId].allowedIPsAtoB) {
              changedSubFields.allowedIPsAtoB = this.connectionIslandsData.allowedIPsAtoB[connectionId];
            }

            if (this.connectionIslandsData.allowedIPsBtoA[connectionId] !== this.network.connections[connectionId].allowedIPsBtoA) {
              changedSubFields.allowedIPsBtoA = this.connectionIslandsData.allowedIPsBtoA[connectionId];
            }

            if (this.connectionIslandsData.persistentKeepaliveEnabled[connectionId] !== this.network.connections[connectionId].persistentKeepalive.enabled) {
              changedSubFields.persistentKeepalive = { enabled: this.connectionIslandsData.persistentKeepaliveEnabled[connectionId] };
            }

            if (this.connectionIslandsData.persistentKeepaliveValue[connectionId] !== this.network.connections[connectionId].persistentKeepalive.value) {
              if ('persistentKeepalive' in changedSubFields) {
                changedSubFields.persistentKeepalive.value = this.connectionIslandsData.persistentKeepaliveValue[connectionId];
              } else {
                changedSubFields.persistentKeepalive = { value: this.connectionIslandsData.persistentKeepaliveValue[connectionId] };
              }
            }

            if (this.connectionIslandsData.preSharedKey[connectionId] !== this.network.connections[connectionId].preSharedKey) {
              changedSubFields.preSharedKey = this.connectionIslandsData.preSharedKey[connectionId];
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

      const attachedPeerIds = [...this.connectionIslandsData.attachedStaticPeers, ...this.connectionIslandsData.attachedRoamingPeers];
      for (const peerId of attachedPeerIds) {
        const connectionId = WireGuardHelper.getConnectionId(this.peerConfigId, peerId);
        if (!Object.keys(this.network.connections).includes(connectionId)) {
          addedFields.connections[connectionId] = {
            enabled: this.connectionIslandsData.isConnectionEnabled[connectionId],
            allowedIPsAtoB: this.connectionIslandsData.allowedIPsAtoB[connectionId],
            allowedIPsBtoA: this.connectionIslandsData.allowedIPsBtoA[connectionId],
            persistentKeepalive: {
              enabled: this.connectionIslandsData.persistentKeepaliveEnabled[connectionId],
              value: this.connectionIslandsData.persistentKeepaliveValue[connectionId],
            },
          };
        }
      }

      for (const connectionId of Object.keys(this.network.connections)) {
        const { a, b } = WireGuardHelper.getConnectionPeers(connectionId);
        if ((a === this.peerConfigId && !attachedPeerIds.includes(b))
            || (b === this.peerConfigId && !attachedPeerIds.includes(a))) {
          removedFields.connections[connectionId] = {
            enabled: this.network.connections[connectionId].enabled,
            allowedIPsAtoB: this.network.connections[connectionId].allowedIPsAtoB,
            allowedIPsBtoA: this.network.connections[connectionId].allowedIPsBtoA,
            persistentKeepalive: this.network.connections[connectionId].persistentKeepalive,
          };
        }
      }

      return [
        Object.keys(changedFields.peers).length + Object.keys(changedFields.connections).length > 0 ? changedFields : {},
        Object.keys(addedFields.connections).length > 0 ? addedFields : {},
        Object.keys(removedFields.connections).length > 0 ? removedFields : {},
        true,
      ];
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
    networkSeriesCompute() {
      this.networkSeriesRefresh &&= this.networkSeriesRefresh;
      const series = {
        rx: { 'root*root': { name: 'rx', data: this.peersPersist['root*root'].transferRxHistory } },
        tx: { 'root*root': { name: 'tx', data: this.peersPersist['root*root'].transferTxHistory } },
      };
      for (const connectionId of [...Object.keys(this.network.connections), 'root*root']) {
        // only parse the connections including root
        series.rx[connectionId] = { name: 'rx', data: this.peersPersist[connectionId].transferRxHistory };
        series.tx[connectionId] = { name: 'tx', data: this.peersPersist[connectionId].transferTxHistory };
      }
      return series;
    },
    networkAverageTrafficCompute() {
      const avgTraffic = { rx: { 'root*root': 0 }, tx: { 'root*root': 0 } };
      const lastTenAverage = array => array.slice(-10).reduce((a, b) => a + b) / array.slice(-10).length;
      for (const connectionId of Object.keys(this.network.connections)) {
        avgTraffic.rx[connectionId] = Math.floor(lastTenAverage(this.networkSeriesCompute.rx[connectionId].data));
        avgTraffic.tx[connectionId] = Math.floor(lastTenAverage(this.networkSeriesCompute.tx[connectionId].data));
        avgTraffic.rx['root*root'] += avgTraffic.tx[connectionId];
        avgTraffic.tx['root*root'] += avgTraffic.rx[connectionId];
      }
      return avgTraffic;
    },
  },
  filters: {
    bytes,
    timeago: value => {
      return timeago().format(value);
    },
  },
  mounted() {
    this.api = new API(
      err => alert(err.message || err.toString()),
      () => this.refresh().catch(console.error),
    );

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

    // eslint-disable-next-line no-unused-expressions
    this.peersPersist['root*root'] = {
      transferRxHistory: Array(this.networkSeriesLength).fill(0),
      transferRxPrevious: 0,
      transferTxHistory: Array(this.networkSeriesLength).fill(0),
      transferTxPrevious: 0,

      chartOptions: {
        ...this.chartOptions,
        yaxis: {
          ...this.chartOptions.yaxis,
          max: () => this.peersPersist['root*root'].chartMax,
        },
      },
    };

    setInterval(() => {
      this.refresh().catch(error => {
        console.log(error);
      });
    }, this.refreshInterval);

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
  component: {
    'dnsmtu-island': dnsmtuIsland,
    'scripts-island': scriptsIsland,
    'connection-islands': connectionIslands,
    'custom-dialog': customDialog,
  },
});
