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

// Vue.config.debug = true; Vue.config.devtools = true;
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

    network: { peers: { root: { address: '' } }, connections: {} },

    peersPersist: {},
    peerDeleteId: null,
    peerConfigId: null,
    peerConfigWindow: 'edit',
    peerQRId: null,

    peerCreatePeerId: '',
    peerCreateName: '',
    peerCreateAddress: '',
    peerCreateMobility: '',
    peerCreateEndpoint: '',
    peerCreateShowAdvance: '',
    peerCreateDNS: { enabled: null, value: '' },
    peerCreateMTU: { enabled: null, value: '' },
    peerCreateAttachedPeerIds: [],
    peerCreateIsConnectionEnabled: {},
    peerCreatePersistentKeepaliveData: {},
    peerCreateAllowedIPsNewToOld: {},
    peerCreateAllowedIPsOldToNew: {},
    peerCreateEligibilityAllowedIPsONRefresh: 0,
    peerCreateEligibilityAllowedIPsNORefresh: 0,
    peerEditConnectionColorRefresh: 0,

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
    peerEditConnectionIds: [],
    peerEditIsConnectionEnabled: {},
    peerEditPersistentKeepaliveData: {},
    peerEditAllowedIPsAtoB: {},
    peerEditAllowedIPsBtoA: {},
    peerChangedPeer: false,
    peerChangedConnections: false,
    // peerEditChangedFields: {},
    peerEditOldConfig: { peers: {}, connections: {} },
    peerEditNewConfig: { peers: {}, connections: {} },
    peerEditDisableSaveChanges: true,
    peerEditAssignedColor: {
      name: 'bg-white',
      address: 'bg-white',
      endpoint: 'bg-white',
      dns: 'bg-white',
      mtu: 'bg-white',
      connections: {
        div: {},
        allowedIPsAtoB: {},
        allowedIPsBtoA: {},
      },
    },

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

      // Get the network-wide config
      await this.api.getNetwork().then(network => {
        const staticPeers = {};
        const roamingPeers = {};
        this.network = network;

        // start append to network.connections
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

            this.network.connections[connectionId].transferTxCurrent = this.peersPersist[connectionId].transferTxCurrent;
            this.network.connections[connectionId].transferTxSeries = [{
              name: 'tx',
              data: this.peersPersist[connectionId].transferTxHistory,
            }];

            this.network.connections[connectionId].transferRxCurrent = this.peersPersist[connectionId].transferRxCurrent;
            this.network.connections[connectionId].transferRxSeries = [{
              name: 'rx',
              data: this.peersPersist[connectionId].transferRxHistory,
            }];

            this.peersPersist[connectionId].chartMax = Math.max(...this.peersPersist[connectionId].transferTxHistory, ...this.peersPersist[connectionId].transferRxHistory);

            this.network.connections[connectionId].chartOptions = this.peersPersist[connectionId].chartOptions;
          }
        }
        // end append to network.connections

        // start append to network.peers
        for (const [peerId, peerDetails] of Object.entries(network.peers)) {
          if (peerDetails.name.includes('@') && peerDetails.name.includes('.')) {
            this.network.peers[peerId].avatar = `https://www.gravatar.com/avatar/${md5(peerDetails.name)}?d=blank`;
          }

          if (peerDetails.mobility === 'static') {
            staticPeers[peerId] = peerDetails;
          } else if (peerDetails.mobility === 'roaming') {
            roamingPeers[peerId] = peerDetails;
          }
        }
        this.staticPeers = staticPeers;
        this.roamingPeers = roamingPeers;
        // end append to network.peers
      }).catch(err => {
        if (err.toString() === 'TypeError: Load failed') {
          this.webServerStatus = 'down';
        } else {
          console.log('getNetwork error =>');
          console.log(err);
        }
      });
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
        this.peerCreateName = '';
        this.peerCreateEndpoint = '';
        this.peerCreateShowAdvance = false;

        const { peerId, address } = await this.api.preamblePeer({ });

        this.peerCreatePeerId = peerId;
        this.peerCreateAddress = address;

        for (const peerId of Object.keys(this.staticPeers)) {
          this.peerCreateAllowedIPsNewToOld[peerId] = this.peerCreateMobility === 'static' ? '10.8.0.1/24' : '0.0.0.0/0';
          this.peerCreateAllowedIPsOldToNew[peerId] = `${this.peerCreateAddress}/32`;
        }

        this.peerCreateDNS.enabled = false;
        this.peerCreateMTU.enabled = false;
        this.peerCreateDNS.value = '';
        this.peerCreateMTU.value = '';

        // enable the root server as default
        this.peerCreateAttachedPeerIds = ['root'];
        this.peerCreateIsConnectionEnabled['root'] = true;
      }
    },
    createPeer() {
      const attachedPeersCompact = [];

      for (const peerId of this.peerCreateAttachedPeerIds) {
        attachedPeersCompact.push({
          peer: peerId,
          allowedIPs: this.peerCreateAllowedIPsNewToOld[peerId],
          persistentKeepalive: 25, // TODO: remove hard coding
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
      const endpoint = this.peerCreateEndpoint;
      const mobility = this.peerCreateMobility;

      this.api.createPeer({
        peerId, address, name, mobility, dns, mtu, endpoint, attachedPeers: attachedPeersCompact,
      }).catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    peerEditWindowHandler(mode, options = {}) {
      // const tailwindLightGreen = 'bg-green-50';
      // const tailwindDarkerGreen = 'bg-green-200';
      // const tailwindLightRed = 'bg-red-50';
      // const tailwindDarkerRed = 'bg-red-200';
      // const tailwindWhite = 'bg-white';

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

        // store all the conections related to this peer
        this.peerEditConnectionIds = [];
        this.peerEditIsConnectionEnabled = {};
        this.peerEditPersistentKeepaliveData = {};
        this.peerEditAllowedIPsAtoB = {};
        this.peerEditAllowedIPsBtoA = {};
        for (const connectionId of Object.keys(this.network.connections)) {
          if (connectionId.includes(peerId)) {
            this.peerEditConnectionIds.push(connectionId);
            this.peerEditIsConnectionEnabled[connectionId] = this.network.connections[connectionId]['enabled'];
            this.peerEditPersistentKeepaliveData[connectionId] = this.network.connections[connectionId]['persistentKeepalive'] === 'on';
            this.peerEditAllowedIPsAtoB[connectionId] = this.network.connections[connectionId].allowedIPsAtoB;
            this.peerEditAllowedIPsBtoA[connectionId] = this.network.connections[connectionId].allowedIPsBtoA;
          }
        }
      }
    },
    async peerConfigEditUpdateConfirmation() {
      const [changedFields, errorNotFound] = this.peerEditChangedFieldsCompute;
      if (!errorNotFound) return;

      this.peerEditOldConfig.peers[this.peerConfigId] = {
        name: this.network.peers[this.peerConfigId].name,
        address: this.network.peers[this.peerConfigId].address,
        publicKey: this.network.peers[this.peerConfigId].publicKey,
        privateKey: this.network.peers[this.peerConfigId].privateKey,
        mobility: this.network.peers[this.peerConfigId].mobility,
        endpoint: this.network.peers[this.peerConfigId].endpoint,
        dns: this.network.peers[this.peerConfigId].dns,
        mtu: this.network.peers[this.peerConfigId].mtu,
      };
      this.peerEditOldConfig.connections = {};
      for (const [connectionId, connection] of Object.entries(this.network.connections)) {
        if (connectionId.includes(this.peerConfigId)) {
          this.peerEditOldConfig.connections[connectionId] = {
            preSharedKey: connection.preSharedKey,
            enabled: connection.enabled,
            allowedIPsAtoB: connection.allowedIPsAtoB,
            allowedIPsBtoA: connection.allowedIPsBtoA,
          };
        }
      }

      this.peerEditNewConfig = JSON.parse(JSON.stringify(this.peerEditOldConfig)); // deep copy
      for (const [field, value] of Object.entries(changedFields.peers[this.peerConfigId])) {
        if (field === 'dns' || field === 'mtu') {
          for (const [fieldDNSMTU, valueDNSMTU] of Object.entries(value)) {
            this.peerEditNewConfig.peers[this.peerConfigId][field][fieldDNSMTU] = valueDNSMTU;
          }
        } else {
          this.peerEditNewConfig.peers[this.peerConfigId][field] = value;
        }
      }
      for (const [connectionId, connection] of Object.entries(changedFields.connections)) {
        for (const [field, value] of Object.entries(connection)) {
          this.peerEditNewConfig.connections[connectionId][field] = value;
        }
      }
    },
    async peerConfigEditApply() {
      const [changedFields, errorNotFound] = this.peerEditChangedFieldsCompute;
      if (!errorNotFound) return;

      let mobilityValue = null;
      let endpointValue = null;
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
          default:
            break;
        }
      }
      if (mobilityValue || endpointValue) this.updatePeerEndpoint(this.peerConfigId, mobilityValue, endpointValue);

      for (const [connectionId, connection] of Object.entries(changedFields.connections)) {
        let AtoBValue = null;
        let BtoAValue = null;
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
            default:
              break;
          }
        }
        if (AtoBValue || BtoAValue) this.updateConnectionAllowedIPs(connectionId, AtoBValue, BtoAValue);
      }
      console.log('changes applied!');
    },
  },
  computed: {
    peerCreateSelectAll: {
      get() {
        return this.staticPeers ? this.staticPeers.length === this.peerCreateAttachedPeerIds.length : false;
      },
      set(value) {
        const attached = [];

        if (value) {
          Object.keys(this.staticPeers).forEach(peerId => {
            attached.push(peerId);
            if (!(peerId in this.peerCreateAttachedPeerIds)) {
              this.peerCreateIsConnectionEnabled[peerId] = true;
            }
          });
        }

        this.peerCreateAttachedPeerIds = attached;
      },
    },
    peerCreateEligibilityName() {
      return WireGuardHelper.checkField('name', this.peerCreateName);
    },
    peerCreateEligibilityEndpoint() {
      return WireGuardHelper.checkField('endpoint', this.peerCreateEndpoint);
    },
    peerCreateEligibilityDNS() {
      return WireGuardHelper.checkField('dns', { enabled: true, value: this.peerCreateDNS.value });
    },
    peerCreateEligibilityMTU() {
      return WireGuardHelper.checkField('mtu', { enabled: true, value: this.peerCreateMTU.value });
    },
    peerCreateEligibilityPeerCount() {
      return WireGuardHelper.checkField('peerCount', this.peerCreateAttachedPeerIds);
    },
    peerCreateEligibilityAllowedIPsON() {
      this.peerCreateEligibilityAllowedIPsONRefresh -= 1;
      const allowedIPsON = {};
      for (const peerId of this.peerCreateAttachedPeerIds) {
        allowedIPsON[peerId] = WireGuardHelper.checkField('allowedIPs', this.peerCreateAllowedIPsOldToNew[peerId]);
      }
      return allowedIPsON;
    },
    peerCreateEligibilityAllowedIPsNO() {
      this.peerCreateEligibilityAllowedIPsNORefresh -= 1;
      const allowedIPsNO = {};
      for (const peerId of this.peerCreateAttachedPeerIds) {
        allowedIPsNO[peerId] = WireGuardHelper.checkField('allowedIPs', this.peerCreateAllowedIPsNewToOld[peerId]);
      }
      return allowedIPsNO;
    },
    peerCreateEligibilityOverall() {
      return this.peerCreateEligibilityName
          && !(this.peerCreateMobility === 'static' && !this.peerCreateEligibilityEndpoint)
          && !(this.peerCreateDNS.enabled && !this.peerCreateEligibilityDNS)
          && !(this.peerCreateMTU.enabled && !this.peerCreateEligibilityMTU)
          && this.peerCreateEligibilityPeerCount
          && Object.values(this.peerCreateEligibilityAllowedIPsON).every(ip => ip)
          && Object.values(this.peerCreateEligibilityAllowedIPsNO).every(ip => ip);
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
      this.peerEditAssignedColor.endpoint = this.peerEditEndpoint !== this.network.peers[this.peerConfigId].endpoint
        ? (WireGuardHelper.checkField('endpoint', this.peerEditEndpoint) ? 'bg-green-200' : 'bg-red-200') : 'bg-white';
      return this.peerEditAssignedColor.endpoint;
    },
    peerEditDNSColor() {
      // eslint-disable-next-line no-nested-ternary
      this.peerEditAssignedColor.dns = this.peerEditDNS.value !== this.network.peers[this.peerConfigId].dns.value
        ? (WireGuardHelper.checkField('dns', this.peerEditDNS) ? 'bg-green-200' : 'bg-red-200') : 'bg-white';
      return this.peerEditAssignedColor.dns;
    },
    peerEditMTUColor() {
      // eslint-disable-next-line no-nested-ternary
      this.peerEditAssignedColor.dns = this.peerEditMTU.value !== this.network.peers[this.peerConfigId].mtu.value
        ? (WireGuardHelper.checkField('mtu', this.peerEditMTU) ? 'bg-green-200' : 'bg-red-200') : 'bg-white';
      return this.peerEditAssignedColor.dns;
    },
    peerEditConnectionColor() {
      this.peerEditConnectionColorRefresh &&= this.peerEditConnectionColorRefresh;
      for (const connectionId of this.peerEditConnectionIds) {
        try {
          // eslint-disable-next-line no-nested-ternary
          this.peerEditAssignedColor.connections.allowedIPsAtoB[connectionId] = this.peerEditAllowedIPsAtoB[connectionId] !== this.network.connections[connectionId].allowedIPsAtoB
            ? (WireGuardHelper.checkField('allowedIPs', this.peerEditAllowedIPsAtoB[connectionId]) ? 'bg-green-200' : 'bg-red-200') : 'bg-white';
          // eslint-disable-next-line no-nested-ternary
          this.peerEditAssignedColor.connections.allowedIPsBtoA[connectionId] = this.peerEditAllowedIPsBtoA[connectionId] !== this.network.connections[connectionId].allowedIPsBtoA
            ? (WireGuardHelper.checkField('allowedIPs', this.peerEditAllowedIPsBtoA[connectionId]) ? 'bg-green-200' : 'bg-red-200') : 'bg-white';
          // eslint-disable-next-line no-nested-ternary
          this.peerEditAssignedColor.connections.div[connectionId] = this.peerEditIsConnectionEnabled[connectionId] && this.peerEditAssignedColor.connections.allowedIPsAtoB[connectionId] !== 'bg-red-200' && this.peerEditAssignedColor.connections.allowedIPsBtoA[connectionId] !== 'bg-red-200' ? 'bg-green-50' : 'bg-red-50';
        } catch (e) {
          this.peerEditAssignedColor.connections.div[connectionId] = 'bg-red-50';
          this.peerEditAssignedColor.connections.allowedIPsAtoB[connectionId] = 'bg-red-50';
          this.peerEditAssignedColor.connections.allowedIPsBtoA[connectionId] = 'bg-red-50';
        }
      }
      return this.peerEditAssignedColor.connections;
    },
    peerEditChangedFieldsCompute() {
      let errorNotFound = true;
      let changeDetectedPeer = false;
      const changedFields = { peers: {}, connections: {} };

      let peerErrorField = '';
      // check errors
      for (const [field, peerEditFieldColor] of Object.entries({
        name: this.peerEditNameColor,
        address: this.peerEditAddressColor,
        endpoint: this.peerEditEndpointColor,
        DNS: this.peerEditDNSColor,
        MTU: this.peerEditMTUColor,
      })) {
        if (peerEditFieldColor === 'bg-red-200') {
          peerErrorField = field;
          errorNotFound = false;
        }
        changeDetectedPeer ||= peerEditFieldColor === 'bg-green-200';
      }

      if (!errorNotFound) {
        return [{ msg: `Error detected in the peer's '${peerErrorField}' field. Changes can't be considered until this is fixed.` }, false];
      }

      this.peerChangedPeer = changeDetectedPeer;
      if (changeDetectedPeer) {
        changedFields.peers[this.peerConfigId] = {};
        for (const [peerConfigField, peerConfigValue] of Object.entries({
          name: this.peerEditName,
          address: this.peerEditAddress,
          mobility: this.peerEditMobility,
          endpoint: this.peerEditEndpoint,
          dns: this.peerEditDNS,
          mtu: this.peerEditMTU,
        })) {
          if (peerConfigField === 'dns' || peerConfigField === 'mtu') {
            const changedDNSMTUFields = {};
            if (peerConfigValue.enabled !== this.network.peers[this.peerConfigId][peerConfigField].enabled) {
              changedDNSMTUFields['enabled'] = peerConfigValue.enabled;
            }
            if (peerConfigValue.value !== this.network.peers[this.peerConfigId][peerConfigField].value) {
              changedDNSMTUFields['value'] = peerConfigValue.value;
            }
            if (peerConfigValue.enabled !== this.network.peers[this.peerConfigId][peerConfigField].enabled
                || peerConfigValue.value !== this.network.peers[this.peerConfigId][peerConfigField].value) {
              changedFields.peers[this.peerConfigId][peerConfigField] = changedDNSMTUFields;
            }
          } else if (peerConfigValue !== this.network.peers[this.peerConfigId][peerConfigField]) {
            changedFields.peers[this.peerConfigId][peerConfigField] = peerConfigValue;
          }
        }
      }

      let changeDetectedConnection = false;
      let connectionIdError = '';
      let connectionErrorField = '';

      // check errors
      for (const connectionId of this.peerEditConnectionIds) {
        for (const connectionField of ['allowedIPsAtoB', 'allowedIPsBtoA']) {
          if (this.peerEditConnectionColor[connectionField][connectionId] === 'bg-red-200') {
            connectionIdError = connectionId;
            connectionErrorField = connectionField;
            errorNotFound = false;
          }
          changeDetectedConnection ||= this.peerEditConnectionColor[connectionField][connectionId] === 'bg-green-200';
        }
        changeDetectedConnection ||= this.peerEditIsConnectionEnabled[connectionId] !== this.network.connections[connectionId].enabled;
      }

      if (!errorNotFound) {
        return [{ msg: `Error detected in the connection '${connectionIdError}'s '${connectionErrorField}' field. Changes can't be considered until this is fixed.` }, false];
      }

      this.peerChangedConnections = changeDetectedConnection;
      if (changeDetectedConnection) {
        const changedConnections = {};
        for (const connectionId of this.peerEditConnectionIds) {
          const changedSubFields = {};
          if (this.peerEditIsConnectionEnabled[connectionId] !== this.network.connections[connectionId].enabled) {
            changedSubFields.enabled = this.peerEditIsConnectionEnabled[connectionId];
          }

          if (this.peerEditAllowedIPsAtoB[connectionId] !== this.network.connections[connectionId].allowedIPsAtoB) {
            changedSubFields.allowedIPsAtoB = this.peerEditAllowedIPsAtoB[connectionId];
          }

          if (this.peerEditAllowedIPsBtoA[connectionId] !== this.network.connections[connectionId].allowedIPsBtoA) {
            changedSubFields.allowedIPsBtoA = this.peerEditAllowedIPsBtoA[connectionId];
          }

          if (Object.keys(changedSubFields).length > 0) {
            changedConnections[connectionId] = changedSubFields;
          }
        }
        if (Object.keys(changedConnections).length > 0) {
          changedFields.connections = changedConnections;
        }
      }

      return [changeDetectedPeer || changeDetectedConnection ? changedFields : {}, true];
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
    }, 5000);

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
