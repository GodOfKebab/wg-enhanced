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

    peerCreateData: {
      peerId: '',
      name: '',
      address: '',
      mobility: '',
      endpoint: '',
      showAdvance: false,
      eligibility: {
        overall: false,
        name: false,
        endpoint: false,
        DNSMTU: false,
        peers: false,
        allowedIPs: false,
      },
      dns: { enabled: null, value: '' },
      mtu: { enabled: null, value: '' },
      attachedPeerIds: [],
      isConnectionEnabled: {},
      persistentKeepaliveData: {},
      allowedIPsNewToOld: {},
      allowedIPsOldToNew: {},
    },
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
      const { name } = this.peerCreateData;
      if (!name) return;
      const { endpoint } = this.peerCreateData;

      const attachedPeersCompact = [];

      for (const peerId of this.peerCreateData.attachedPeerIds) {
        attachedPeersCompact.push({
          peer: peerId,
          allowedIPs: this.peerCreateData.allowedIPsNewToOld[peerId],
          persistentKeepalive: 25, // TODO: remove hard coding
        });
      }
      const dns = {
        enabled: document.getElementById('dns_checkbox').checked,
        value: document.getElementById('dns_checkbox').checked ? this.peerCreateData.dns.value : '',
      };
      const mtu = {
        enabled: document.getElementById('mtu_checkbox').checked,
        value: document.getElementById('mtu_checkbox').checked ? this.peerCreateData.mtu.value : '',
      };
      const { peerId, address } = this.peerCreateData;
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
      const tailwindLightGreen = 'rgb(240 253 244)';
      const tailwindLightRed = 'rgb(254 242 242)';

      const checkboxDictSelection = {};
      const checkboxDictEnabled = {};
      for (const peerId of Object.keys(this.staticPeers)) {
        checkboxDictSelection[peerId] = document.getElementById(`${peerId}_checkbox`);
        checkboxDictEnabled[peerId] = document.getElementById(`peerCreateData.${peerId}.enabled`);
      }

      // run when show advance is clicked
      if (mode === 'init') {
        this.peerCreateData.name = '';
        this.peerCreateData.endpoint = '';
        this.peerCreateData.showAdvance = false;

        const { peerId, address } = await this.api.preamblePeer({ });

        this.peerCreateData.peerId = peerId;
        this.peerCreateData.address = address;

        for (const peerId of Object.keys(this.staticPeers)) {
          document.getElementById(`${peerId}_checkbox`).checked = false;
          this.peerCreateData.allowedIPsNewToOld[peerId] = this.peerCreateData.mobility === 'static' ? '10.8.0.1/24' : '0.0.0.0/0';
          this.peerCreateData.allowedIPsOldToNew[peerId] = `${this.peerCreateData.address}/32`;
        }

        this.peerCreateData.dns.enabled = false;
        this.peerCreateData.mtu.enabled = false;
        this.peerCreateData.dns.value = '';
        this.peerCreateData.mtu.value = '';

        // enable the root server as default
        this.peerCreateData.attachedPeerIds = ['root'];
        this.peerCreateData.isConnectionEnabled['root'] = true;
        document.getElementById('root_checkbox').checked = true;
        document.getElementById('peerCreateData.root.enabled').checked = true;
        document.getElementById('selectall_checkbox').checked = checkboxDictSelection.length === 1;
        document.getElementById('peerCreateData.root.island').style.backgroundColor = tailwindLightGreen;

        this.checkPeerCreateEligibility('all');
        return;
      }

      // run when select all is clicked
      let allChecked = true;
      if (mode === 'all') {
        for (const checkboxId of Object.keys(checkboxDictSelection)) {
          allChecked &= checkboxDictSelection[checkboxId].checked;
        }
        for (const checkboxId of Object.keys(checkboxDictSelection)) {
          checkboxDictSelection[checkboxId].checked = !allChecked;
          checkboxDictEnabled[checkboxId].checked = !allChecked;
        }
      }

      // run when individual peer boxes are clicked
      if (mode === 'individual') {
        for (const checkboxId of Object.keys(checkboxDictSelection)) {
          allChecked &= checkboxDictSelection[checkboxId].checked;
        }
        document.getElementById('selectall_checkbox').checked = allChecked;
      }

      const attachedPeersArray = [];
      for (const checkboxId of Object.keys(checkboxDictSelection)) {
        if (checkboxDictSelection[checkboxId].checked) {
          attachedPeersArray.push(checkboxDictSelection[checkboxId].id.replace('_checkbox', ''));
        }
      }
      this.peerCreateData.attachedPeerIds = attachedPeersArray;

      if (mode === 'connectionEnable') {
        for (const [peerId, conn] of Object.entries(this.peerCreateData.isConnectionEnabled)) {
          if (conn) {
            document.getElementById(`peerCreateData.${peerId}.island`).style.backgroundColor = tailwindLightGreen;
          } else {
            document.getElementById(`peerCreateData.${peerId}.island`).style.backgroundColor = tailwindLightRed;
          }
        }
      }

      // check peer create eligibility
      this.checkPeerCreateEligibility('peer');
    },
    checkPeerCreateEligibility(mode) {
      const tailwindLightGreen = 'rgb(240 253 244)';
      const tailwindDarkerGreen = 'rgb(187 247 208)';
      const tailwindLightRed = 'rgb(254 242 242)';
      const tailwindDarkerRed = 'rgb(254 202 202)';

      // check name
      if (mode === 'name') {
        this.peerCreateData.eligibility.name = WireGuardHelper.checkField('name', this.peerCreateData.name);
        document.getElementById('peerCreateName').style.backgroundColor = this.peerCreateData.eligibility.name ? tailwindLightGreen : tailwindLightRed;
      }

      // check endpoint
      if (mode === 'endpoint') {
        this.peerCreateData.eligibility.endpoint = WireGuardHelper.checkField('endpoint', this.peerCreateData.endpoint);
        document.getElementById('peerCreateEndpoint').style.backgroundColor = this.peerCreateData.eligibility.endpoint ? tailwindLightGreen : tailwindLightRed;
      }

      // check endpoint
      if (mode === 'DNSMTU') {
        let peerCreateEligibilityDNS = true;
        let peerCreateEligibilityMTU = true;
        if (document.getElementById('dns_checkbox').checked) {
          document.getElementById('inputDNS').disabled = false;
          peerCreateEligibilityDNS &&= WireGuardHelper.checkField('dns', { enabled: true, value: this.peerCreateData.dns.value });
          document.getElementById('inputDNS').style.backgroundColor = peerCreateEligibilityDNS ? tailwindDarkerGreen : tailwindDarkerRed;
        } else {
          document.getElementById('inputDNS').disabled = true;
          document.getElementById('inputDNS').style.backgroundColor = 'rgb(230 230 230)'; // TODO: update with the tailwind bg
        }
        if (document.getElementById('mtu_checkbox').checked) {
          document.getElementById('inputMTU').disabled = false;
          peerCreateEligibilityMTU &&= WireGuardHelper.checkField('dns', { enabled: true, value: this.peerCreateData.mtu.value });
          document.getElementById('inputMTU').style.backgroundColor = peerCreateEligibilityMTU ? tailwindDarkerGreen : tailwindDarkerRed;
        } else {
          document.getElementById('inputMTU').disabled = true;
          document.getElementById('inputMTU').style.backgroundColor = 'rgb(230 230 230)'; // TODO: update with the tailwind bg
        }
        this.peerCreateData.eligibility.DNSMTU = peerCreateEligibilityDNS && peerCreateEligibilityMTU;
        if (!document.getElementById('dns_checkbox').checked
            && !document.getElementById('mtu_checkbox').checked) {
          document.getElementById('peerConfigDiv').style.backgroundColor = 'rgb(230 230 230)'; // TODO: update with the tailwind bg
        } else {
          document.getElementById('peerConfigDiv').style.backgroundColor = this.peerCreateData.eligibility.DNSMTU ? tailwindLightGreen : tailwindLightRed;
        }
      }

      // check peer count
      if (mode === 'peerCount') {
        this.peerCreateData.eligibility.peers = this.peerCreateData.attachedPeerIds.length > 0;
        document.getElementById('attachPeersDiv').style.backgroundColor = this.peerCreateData.eligibility.peers ? tailwindLightGreen : tailwindLightRed;
        this.checkPeerCreateEligibility('allowedIPs');
      }

      // check allowedIPs
      if (mode === 'allowedIPs') {
        this.peerCreateData.eligibility.allowedIPs = WireGuardHelper.checkField('peerCount', this.peerCreateData.attachedPeerIds);
        for (const peerId of this.peerCreateData.attachedPeerIds) {
          const allowedIPsEligibilityNO = WireGuardHelper.checkField('allowedIPs', this.peerCreateData.allowedIPsNewToOld[peerId]);
          this.peerCreateData.eligibility.allowedIPs &&= allowedIPsEligibilityNO;
          document.getElementById(`peerCreateData.${peerId}.allowedIPsNewToOld`).style.backgroundColor = allowedIPsEligibilityNO ? tailwindDarkerGreen : tailwindDarkerRed;
          const allowedIPsEligibilityON = WireGuardHelper.checkField('allowedIPs', this.peerCreateData.allowedIPsOldToNew[peerId]);
          this.peerCreateData.eligibility.allowedIPs &&= allowedIPsEligibilityON;
          document.getElementById(`peerCreateData.${peerId}.allowedIPsOldToNew`).style.backgroundColor = allowedIPsEligibilityON ? tailwindDarkerGreen : tailwindDarkerRed;
          document.getElementById(`peerCreateData.${peerId}.island`).style.backgroundColor = allowedIPsEligibilityNO && allowedIPsEligibilityON ? tailwindLightGreen : tailwindLightRed;
        }
      }

      // check all
      if (mode === 'all') {
        const modes = ['name', 'endpoint', 'DNSMTU', 'peerCount', 'allowedIPs'];
        for (const mode of modes) {
          this.checkPeerCreateEligibility(mode);
        }
      }

      // final AND check
      this.peerCreateData.eligibility.overall = this.peerCreateData.eligibility.name && (this.peerCreateData.eligibility.endpoint || this.peerCreateData.mobility === 'roaming') && this.peerCreateData.eligibility.DNSMTU && this.peerCreateData.eligibility.peers && this.peerCreateData.eligibility.allowedIPs;
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
