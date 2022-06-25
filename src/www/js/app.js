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

    peers: null,
    peersPersist: {},
    peerDelete: null,
    peerCreate: null,
    peerConfig: null,
    peerCreateName: '',
    peerCreateEndpoint: '',
    peerEditName: null,
    peerEditNameId: null,
    peerEditAddress: null,
    peerEditAddressId: null,
    qrcode: null,

    webServerStatus: 'unknown',
    wireguardStatus: 'unknown',
    wireguardToggleTo: null,

    peerCreateShowAdvance: false,
    peerCreateEligibility: false,
    peerCreateEligibilityName: false,
    peerCreateEligibilityEndpoint: false,
    peerCreateEligibilityPeers: false,
    peerCreateEligibilityAllowedIPs: false,
    attachedPeers: [],

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

      // Get WirGuard Peers
      await this.api.getPeers().then(peers => {
        this.peers = peers.map(peer => {
          if (peer.name.includes('@') && peer.name.includes('.')) {
            peer.avatar = `https://www.gravatar.com/avatar/${md5(peer.name)}?d=blank`;
          }

          if (!this.peersPersist[peer.id]) {
            this.peersPersist[peer.id] = {};
            this.peersPersist[peer.id].transferRxHistory = Array(20).fill(0);
            this.peersPersist[peer.id].transferRxPrevious = peer.transferRx;
            this.peersPersist[peer.id].transferTxHistory = Array(20).fill(0);
            this.peersPersist[peer.id].transferTxPrevious = peer.transferTx;

            this.peersPersist[peer.id].chartOptions = {
              ...this.chartOptions,
              yaxis: {
                ...this.chartOptions.yaxis,
                max: () => this.peersPersist[peer.id].chartMax,
              },
            };
          }

          this.peersPersist[peer.id].transferRxCurrent = peer.transferRx - this.peersPersist[peer.id].transferRxPrevious;
          this.peersPersist[peer.id].transferRxPrevious = peer.transferRx;
          this.peersPersist[peer.id].transferTxCurrent = peer.transferTx - this.peersPersist[peer.id].transferTxPrevious;
          this.peersPersist[peer.id].transferTxPrevious = peer.transferTx;

          this.peersPersist[peer.id].transferRxHistory.push(this.peersPersist[peer.id].transferRxCurrent);
          this.peersPersist[peer.id].transferRxHistory.shift();

          this.peersPersist[peer.id].transferTxHistory.push(this.peersPersist[peer.id].transferTxCurrent);
          this.peersPersist[peer.id].transferTxHistory.shift();

          peer.transferTxCurrent = this.peersPersist[peer.id].transferTxCurrent;
          peer.transferTxSeries = [{
            name: 'tx',
            data: this.peersPersist[peer.id].transferTxHistory,
          }];

          peer.transferRxCurrent = this.peersPersist[peer.id].transferRxCurrent;
          peer.transferRxSeries = [{
            name: 'rx',
            data: this.peersPersist[peer.id].transferRxHistory,
          }];

          this.peersPersist[peer.id].chartMax = Math.max(...this.peersPersist[peer.id].transferTxHistory, ...this.peersPersist[peer.id].transferRxHistory);

          peer.chartOptions = this.peersPersist[peer.id].chartOptions;

          return peer;
        });
      }).catch(err => {
        if (err.toString() === 'TypeError: Load failed') {
          this.webServerStatus = 'down';
        } else {
          console.log('getPeers error =>');
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
          this.peers = null;
        })
        .catch(err => {
          alert(err.message || err.toString());
        });
    },
    createPeer(newPeerType) {
      const name = this.peerCreateName;
      if (!name) return;
      const endpoint = this.peerCreateEndpoint;
      if (!endpoint && newPeerType === 'static') return;

      const attachedPeersCompact = [];

      for (let i = 0; i < this.attachedPeers.length; i++) {
        attachedPeersCompact.push({
          peer: this.attachedPeers[i].id,
          allowedIPs: document.getElementById(`${this.attachedPeers[i].id}_ip_subnet`).value,
        });
      }
      this.api.createPeer({ name, endpoint, attachedPeers: attachedPeersCompact })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    deletePeer(peer) {
      this.api.deletePeer({ peerId: peer.id })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    enablePeer(peer) {
      this.api.enablePeer({ peerId: peer.id })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    disablePeer(peer) {
      this.api.disablePeer({ peerId: peer.id })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    updatePeerName(peer, name) {
      this.api.updatePeerName({ peerId: peer.id, name })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    updatePeerAddress(peer, address) {
      this.api.updatePeerAddress({ peerId: peer.id, address })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    getPeerConf(peer) {
      this.api.getPeerConf({ peerId: peer.id })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error))
        .then(res => {
          peer.config = res;
        });
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
    handleAttachPeers(mode) {
      const checkboxArray = [];
      const peersArray = this.peers.slice();
      for (let i = 0; i < this.peers.length; i++) {
        if (peersArray.at(i).endpoint.startsWith('static')) {
          checkboxArray.push(document.getElementById(`${peersArray.at(i).id}_checkbox`));
        }
      }

      // run when show advance is clicked
      if (mode === 'init') {
        this.peerCreateName = '';
        this.peerCreateEndpoint = '';
        this.peerCreateShowAdvance = false;

        for (let i = 0; i < this.peers.length; i++) {
          if (peersArray.at(i).endpoint.startsWith('static')) {
            document.getElementById(`${peersArray.at(i).id}_checkbox`).checked = false;
            document.getElementById(`${peersArray.at(i).id}_ip_subnet`).value = `${peersArray.at(i).address}/32`;
          }
        }
        // enable the root server as default
        this.attachedPeers = [peersArray.at(0)];
        document.getElementById('selectall checkbox').checked = false;
        document.getElementById('root_checkbox').checked = true;
        document.getElementById('root_ip_subnet').value = '0.0.0.0/0';

        this.checkPeerCreateEligibility('all');
        return;
      }

      // run when select all is clicked
      let allChecked = true;
      if (mode === 'all') {
        for (let i = 0; i < checkboxArray.length; i++) {
          allChecked &= checkboxArray.at(i).checked;
        }
        for (let i = 0; i < checkboxArray.length; i++) {
          checkboxArray.at(i).checked = !allChecked;
        }
      }

      // run when individual peer boxes are clicked
      if (mode === 'individual') {
        for (let i = 0; i < checkboxArray.length; i++) {
          allChecked &= checkboxArray.at(i).checked;
        }
        document.getElementById('selectall checkbox').checked = allChecked;
      }

      const attachedPeersArray = [];
      for (let i = 0; i < checkboxArray.length; i++) {
        if (checkboxArray.at(i).checked) {
          attachedPeersArray.push(peersArray.at(i));
        }
      }
      this.attachedPeers = attachedPeersArray;

      // check peer create eligibility
      this.checkPeerCreateEligibility('peers');
    },
    checkPeerCreateEligibility(mode) {
      const tailwindLightGreen = 'rgb(240 253 244)';
      const tailwindDarkerGreen = 'rgb(187 247 208)';
      const tailwindLightRed = 'rgb(254 242 242)';
      const tailwindDarkerRed = 'rgb(254 202 202)';

      // check name
      if (mode === 'name') {
        this.peerCreateEligibilityName = this.peerCreateName.length > 0;
        document.getElementById('peerCreateName').style.backgroundColor = this.peerCreateEligibilityName ? tailwindLightGreen : tailwindLightRed;
      }

      // check endpoint
      if (mode === 'endpoint') {
        this.peerCreateEligibilityEndpoint = this.peerCreateEndpoint.match('^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?):(0|6[0-5][0-5][0-3][0-5]|[1-5][0-9][0-9][0-9][0-9]|[1-9][0-9]{0,3})$');
        this.peerCreateEligibilityEndpoint ||= this.peerCreateEndpoint.match('^(((?!\\-))(xn\\-\\-)?[a-z0-9\\-_]{0,61}[a-z0-9]{1,1}\\.)*(xn\\-\\-)?([a-z0-9\\-]{1,61}|[a-z0-9\\-]{1,30})\\.[a-z]{2,}:(0|6[0-5][0-5][0-3][0-5]|[1-5][0-9][0-9][0-9][0-9]|[1-9][0-9]{0,3})$');
        document.getElementById('peerCreateEndpoint').style.backgroundColor = this.peerCreateEligibilityEndpoint ? tailwindLightGreen : tailwindLightRed;
      }

      // check peer count
      if (mode === 'peerCount') {
        this.peerCreateEligibilityPeers = this.attachedPeers.length > 0;
        document.getElementById('attachPeersDiv').style.backgroundColor = this.peerCreateEligibilityPeers ? tailwindLightGreen : tailwindLightRed;
        this.checkPeerCreateEligibility('allowedIPs');
      }

      // check allowedIPs
      if (mode === 'allowedIPs') {
        this.peerCreateEligibilityAllowedIPs = true;
        for (let i = 0; i < this.attachedPeers.length; i++) {
          const allowedIPsEligibility = document.getElementById(`${this.attachedPeers[i].id}_ip_subnet`).value.match('^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\/(3[0-2]|2[0-9]|[0-9]))(,((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\/(3[0-2]|2[0-9]|[0-9])))*$');
          this.peerCreateEligibilityAllowedIPs &&= allowedIPsEligibility;
          document.getElementById(`${this.attachedPeers[i].id}_ip_subnet`).style.backgroundColor = allowedIPsEligibility ? tailwindDarkerGreen : tailwindDarkerRed;
        }
        document.getElementById('networkRulesDiv').style.backgroundColor = this.peerCreateEligibilityAllowedIPs ? tailwindLightGreen : tailwindLightRed;
      }

      // check all
      if (mode === 'all') {
        const modes = ['name', 'endpoint', 'peerCount', 'allowedIPs'];
        for (let i = 0; i < mode.length; i++) {
          this.checkPeerCreateEligibility(modes[i]);
        }
      }

      // final AND check
      this.peerCreateEligibility = this.peerCreateEligibilityName && this.peerCreateEligibilityEndpoint && this.peerCreateEligibilityPeers && this.peerCreateEligibilityAllowedIPs;
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

    Promise.resolve().then(async () => {
      const currentRelease = await this.api.getRelease();
      const latestRelease = await fetch('https://weejewel.github.io/wg-easy/changelog.json')
        .then(res => res.json())
        .then(releases => {
          const releasesArray = Object.entries(releases).map(([version, changelog]) => ({
            version: parseInt(version, 10),
            changelog,
          }));
          releasesArray.sort((a, b) => {
            return b.version - a.version;
          });

          return releasesArray[0];
        });

      console.log(`Current Release: ${currentRelease}`);
      console.log(`Latest Release: ${latestRelease.version}`);

      if (currentRelease >= latestRelease.version) return;

      this.currentRelease = currentRelease;
      this.latestRelease = latestRelease;
    }).catch(console.error);
  },
});
