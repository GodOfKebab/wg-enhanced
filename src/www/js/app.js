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
      changedFields: {},
      error: null,
    },
    scriptsIslandData: {
      scripts: {
        PreUp: { enabled: false, value: '' },
        PostUp: { enabled: false, value: '' },
        PreDown: { enabled: false, value: '' },
        PostDown: { enabled: false, value: '' },
      },
      changedFields: {},
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
      addedFields: {},
      removedFields: {},
      changedFields: {},
      error: null,
    },

    peerCreateWindow: {
      mobility: '',
    },
    peerEditWindow: {
      id: '',
    },

    peerQuickEditName: null,
    peerQuickEditNameId: null,
    peerQuickEditAddress: null,
    peerQuickEditAddressId: null,

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

            this.peerEditWindow.id = node.id;
          });

          this.graph.graphData(this.forceGraphComputed);
          this.initializedGraph = true;
        } catch (e) {
          console.log('my error: ');
          console.log(e);
        }
      }

      // keep reserving the peer create address 10 seconds before it expires TODO: move this to component
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
          this.dialogId = 'cant-create-peer';
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
  },
  computed: {
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
    'create-window': createWindow,
    'config-peer-window': configPeerWindow,
  },
});
