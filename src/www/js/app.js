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

    network: { peers: {}, connections: {} },

    peersPersist: {},
    peerDeleteId: null,
    peerConfigId: null,
    peerConfigWindow: 'edit',
    peerEditName: null,
    peerEditNameId: null,
    peerEditAddress: null,
    peerEditAddressId: null,
    peerEditDisableSaveChanges: true,
    peerChangedPeer: false,
    peerChangedConnections: false,
    peerEditChangedFields: {},
    peerEditOldConfig: { peers: {}, connections: {} },
    peerEditNewConfig: { peers: {}, connections: {} },
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
    peerConfigEditData: {
      name: '',
      address: '',
      mobility: '',
      endpoint: '',
      dns: { enabled: null, value: '' },
      mtu: { enabled: null, value: '' },
      connectionIds: [],
      isConnectionEnabled: [],
      persistentKeepaliveData: [],
      allowedIPsAtoB: [],
      allowedIPsBtoA: [],
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
    createPeer(mobility) {
      const name = this.peerCreateName;
      if (!name) return;
      const endpoint = this.peerCreateEndpoint;

      const attachedPeersCompact = [];

      for (const peerId of this.peerCreateAttachedPeerIds) {
        attachedPeersCompact.push({
          peer: peerId,
          allowedIPs: this.peerCreateAllowedIPsNewToOld[peerId],
          persistentKeepalive: 25, // TODO: remove hard coding
        });
      }
      const dns = {
        enabled: document.getElementById('dns_checkbox').checked,
        value: document.getElementById('dns_checkbox').checked ? this.peerCreateDNS.value : '',
      };
      const mtu = {
        enabled: document.getElementById('mtu_checkbox').checked,
        value: document.getElementById('mtu_checkbox').checked ? this.peerCreateMTU.value : '',
      };
      const peerId = this.peerCreatePeerId;
      const address = this.peerCreateAddress;
      this.api.createPeer({
        peerId, address, name, mobility, dns, mtu, endpoint, attachedPeers: attachedPeersCompact,
      })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
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
    async handleAttachPeers(mode) {
      // run when show advance is clicked
      if (mode === 'init') {
        this.peerCreateName = '';
        this.peerCreateEndpoint = '';
        this.peerCreateShowAdvance = false;

        const { peerId, address } = await this.api.preamblePeer({ });

        this.peerCreatePeerId = peerId;
        this.peerCreateAddress = address;

        for (const peerId of Object.keys(this.staticPeers)) {
          // document.getElementById(`${peerId}_checkbox`).checked = false;
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
    getConnectionId(peer1, peer2) {
      return WireGuardHelper.getConnectionId(peer1, peer2);
    },
    async peerConfigEditHandle(mode) {
      const tailwindLightGreen = 'rgb(240 253 244)';
      const tailwindDarkerGreen = 'rgb(187 247 208)';
      const tailwindLightRed = 'rgb(254 242 242)';
      const tailwindDarkerRed = 'rgb(254 202 202)';
      const tailwindWhite = 'rgb(255 255 255)';

      if (mode === 'init') {
        this.peerConfigEditData.name = this.network.peers[this.peerConfigId]['name'];
        this.peerConfigEditData.address = this.network.peers[this.peerConfigId]['address'];
        this.peerConfigEditData.mobility = this.network.peers[this.peerConfigId]['mobility'];
        this.peerConfigEditData.endpoint = this.network.peers[this.peerConfigId]['endpoint'];
        this.peerConfigEditData.dns.enabled = this.network.peers[this.peerConfigId]['dns'].enabled;
        this.peerConfigEditData.dns.value = this.network.peers[this.peerConfigId]['dns'].value;
        this.peerConfigEditData.mtu.enabled = this.network.peers[this.peerConfigId]['mtu'].enabled;
        this.peerConfigEditData.mtu.value = this.network.peers[this.peerConfigId]['mtu'].value;

        // store all the conections related to this peer
        this.peerConfigEditData.connectionIds = [];
        this.peerConfigEditData.isConnectionEnabled = [];
        this.peerConfigEditData.persistentKeepaliveData = [];
        this.peerConfigEditData.allowedIPsAtoB = [];
        this.peerConfigEditData.allowedIPsBtoA = [];
        for (const connectionId of Object.keys(this.network.connections)) {
          if (connectionId.includes(this.peerConfigId)) {
            this.peerConfigEditData.connectionIds.push(connectionId);
            this.peerConfigEditData.isConnectionEnabled.push(this.network.connections[connectionId]['enabled']);
            this.peerConfigEditData.persistentKeepaliveData.push(this.network.connections[connectionId]['persistentKeepalive'] === 'on');
            this.peerConfigEditData.allowedIPsAtoB.push(this.network.connections[connectionId].allowedIPsAtoB);
            this.peerConfigEditData.allowedIPsBtoA.push(this.network.connections[connectionId].allowedIPsBtoA);
          }
        }

        try {
          for (const connectionId of this.peerConfigEditData.connectionIds) {
            if (this.network.connections[connectionId]['enabled']) {
              document.getElementById(`peerConfigEditData.${connectionId}.enabled`).style.backgroundColor = tailwindLightGreen;
            } else {
              document.getElementById(`peerConfigEditData.${connectionId}.enabled`).style.backgroundColor = tailwindLightRed;
            }
          }
        } catch (e) {
          await new Promise(r => setTimeout(r, 100));
          await this.peerConfigEditHandle(mode);
        }
        return;
      }

      let errorNotFound = true;
      const changedFields = { peers: {}, connections: {} };
      changedFields.peers[this.peerConfigId] = {};
      if (['check-changes', 'check-changes-connection', 'check-all'].includes(mode)) {
        for (const peerConfigField of ['name', 'address', 'mobility', 'endpoint', 'dns', 'mtu']) {
          let assignedColor = tailwindWhite;
          if (peerConfigField === 'dns' || peerConfigField === 'mtu') {
            const changedDNSMTUFields = {};
            if (this.peerConfigEditData[peerConfigField].enabled !== this.network.peers[this.peerConfigId][peerConfigField].enabled) {
              changedDNSMTUFields['enabled'] = this.peerConfigEditData[peerConfigField].enabled;
            }
            if (this.peerConfigEditData[peerConfigField].value !== this.network.peers[this.peerConfigId][peerConfigField].value) {
              changedDNSMTUFields['value'] = this.peerConfigEditData[peerConfigField].value;
            }
            if (this.peerConfigEditData[peerConfigField].enabled !== this.network.peers[this.peerConfigId][peerConfigField].enabled
              || this.peerConfigEditData[peerConfigField].value !== this.network.peers[this.peerConfigId][peerConfigField].value) {
              assignedColor = WireGuardHelper.checkField(peerConfigField, this.peerConfigEditData[peerConfigField]) ? tailwindDarkerGreen : tailwindDarkerRed;
              changedFields.peers[this.peerConfigId][peerConfigField] = changedDNSMTUFields;
            }
          } else if (this.peerConfigEditData[peerConfigField] !== this.network.peers[this.peerConfigId][peerConfigField]) {
            assignedColor = WireGuardHelper.checkField(peerConfigField, this.peerConfigEditData[peerConfigField]) ? tailwindDarkerGreen : tailwindDarkerRed;
            changedFields.peers[this.peerConfigId][peerConfigField] = this.peerConfigEditData[peerConfigField];
          }
          try {
            if (peerConfigField !== 'mobility') {
              errorNotFound &= assignedColor !== tailwindDarkerRed;
              document.getElementById(`peerConfigEditData.${peerConfigField}`).style.backgroundColor = assignedColor;
            }
          } catch (e) {
            errorNotFound &= false;
            console.log('edit error!');
            console.log(e);
            await new Promise(r => setTimeout(r, 100));
            await this.peerConfigEditHandle(mode);
          }
        }
      }

      const changedConnections = {};
      if (['check-changes', 'check-changes-connection', 'check-all'].includes(mode)) {
        for (const [index, connectionId] of Object.entries(this.peerConfigEditData.connectionIds)) {
          const changedSubFields = {};
          let assignedColor = tailwindLightGreen;
          if (!this.peerConfigEditData.isConnectionEnabled[index]) {
            assignedColor = tailwindLightRed;
          }
          if (this.peerConfigEditData.isConnectionEnabled[index] !== this.network.connections[connectionId].enabled) {
            changedSubFields['enabled'] = this.peerConfigEditData.isConnectionEnabled[index];
          }
          document.getElementById(`peerConfigEditData.${connectionId}.enabled`).style.backgroundColor = assignedColor;

          assignedColor = tailwindWhite;
          if (this.peerConfigEditData.allowedIPsAtoB[index] !== this.network.connections[connectionId].allowedIPsAtoB) {
            assignedColor = WireGuardHelper.checkField('allowedIPs', this.peerConfigEditData.allowedIPsAtoB[index]) ? tailwindDarkerGreen : tailwindDarkerRed;
            changedSubFields.allowedIPsAtoB = this.peerConfigEditData.allowedIPsAtoB[index];
          }
          errorNotFound &= assignedColor !== tailwindDarkerRed;
          document.getElementById(`peerConfigEditData.${connectionId}.allowedIPsAtoB`).style.backgroundColor = assignedColor;

          assignedColor = tailwindWhite;
          if (this.peerConfigEditData.allowedIPsBtoA[index] !== this.network.connections[connectionId].allowedIPsBtoA) {
            assignedColor = WireGuardHelper.checkField('allowedIPs', this.peerConfigEditData.allowedIPsBtoA[index]) ? tailwindDarkerGreen : tailwindDarkerRed;
            changedSubFields.allowedIPsBtoA = this.peerConfigEditData.allowedIPsBtoA[index];
          }
          errorNotFound &= assignedColor !== tailwindDarkerRed;
          document.getElementById(`peerConfigEditData.${connectionId}.allowedIPsBtoA`).style.backgroundColor = assignedColor;

          if (Object.keys(changedSubFields).length > 0) {
            changedConnections[connectionId] = changedSubFields;
          }
        }
        if (Object.keys(changedConnections).length > 0) {
          changedFields.connections = changedConnections;
        }
      }
      this.peerChangedPeer = Object.keys(changedFields.peers[this.peerConfigId]).length > 0;
      this.peerChangedConnections = Object.keys(changedFields.connections).length > 0;
      this.peerEditDisableSaveChanges = !errorNotFound || !(this.peerChangedPeer || this.peerChangedConnections);
      return [changedFields, errorNotFound];
    },
    async peerConfigEditUpdateConfirmation() {
      const [changedFields, errorNotFound] = await this.peerConfigEditHandle('check-all');
      if (!errorNotFound) return;

      this.peerEditChangedFields = changedFields;

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
      for (const [field, value] of Object.entries(this.peerEditChangedFields.peers[this.peerConfigId])) {
        if (field === 'dns' || field === 'mtu') {
          for (const [fieldDNSMTU, valueDNSMTU] of Object.entries(value)) {
            this.peerEditNewConfig.peers[this.peerConfigId][field][fieldDNSMTU] = valueDNSMTU;
          }
        } else {
          this.peerEditNewConfig.peers[this.peerConfigId][field] = value;
        }
      }
      for (const [connectionId, connection] of Object.entries(this.peerEditChangedFields.connections)) {
        for (const [field, value] of Object.entries(connection)) {
          this.peerEditNewConfig.connections[connectionId][field] = value;
        }
      }
    },
    async peerConfigEditApply() {
      console.log('changes applied!');
      let mobilityValue = null;
      let endpointValue = null;
      for (const [field, value] of Object.entries(this.peerEditChangedFields.peers[this.peerConfigId])) {
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

      for (const [connectionId, connection] of Object.entries(this.peerEditChangedFields.connections)) {
        let AtoBValue = null;
        let BtoAValue = null;
        for (const [field, value] of Object.entries(connection)) {
          switch (field) {
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
    peerCreateEligibilityName: {
      get() {
        return WireGuardHelper.checkField('name', this.peerCreateName);
      },
    },
    peerCreateEligibilityEndpoint: {
      get() {
        return WireGuardHelper.checkField('endpoint', this.peerCreateEndpoint);
      },
    },
    peerCreateEligibilityDNS: {
      get() {
        return WireGuardHelper.checkField('dns', { enabled: true, value: this.peerCreateDNS.value });
      },
    },
    peerCreateEligibilityMTU: {
      get() {
        return WireGuardHelper.checkField('mtu', { enabled: true, value: this.peerCreateMTU.value });
      },
    },
    peerCreateEligibilityPeerCount: {
      get() {
        return WireGuardHelper.checkField('peerCount', this.peerCreateAttachedPeerIds);
      },
    },
    peerCreateEligibilityAllowedIPsON: {
      get() {
        this.peerCreateEligibilityAllowedIPsONRefresh -= 1;
        const allowedIPsON = {};
        for (const peerId of this.peerCreateAttachedPeerIds) {
          allowedIPsON[peerId] = WireGuardHelper.checkField('allowedIPs', this.peerCreateAllowedIPsOldToNew[peerId]);
        }
        return allowedIPsON;
      },
    },
    peerCreateEligibilityAllowedIPsNO: {
      get() {
        this.peerCreateEligibilityAllowedIPsNORefresh -= 1;
        const allowedIPsNO = {};
        for (const peerId of this.peerCreateAttachedPeerIds) {
          allowedIPsNO[peerId] = WireGuardHelper.checkField('allowedIPs', this.peerCreateAllowedIPsNewToOld[peerId]);
        }
        return allowedIPsNO;
      },
    },
    peerCreateEligibilityOverall: {
      get() {
        return this.peerCreateEligibilityName
            && !(this.peerCreateMobility === 'static' && !this.peerCreateEligibilityEndpoint)
            && !(this.peerCreateDNS.enabled && !this.peerCreateEligibilityDNS)
            && !(this.peerCreateMTU.enabled && !this.peerCreateEligibilityMTU)
            && this.peerCreateEligibilityPeerCount
            && Object.values(this.peerCreateEligibilityAllowedIPsON).every(ip => ip)
            && Object.values(this.peerCreateEligibilityAllowedIPsNO).every(ip => ip);
      },
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
