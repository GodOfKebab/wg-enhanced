/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable no-alert */
/* eslint-disable no-undef */
/* eslint-disable no-new */

'use strict';

const createWindow = Vue.component('create-window', {
  props: {
    value: String,
    api: Object,
    network: Object,
    staticPeers: Object,
    roamingPeers: Object,
  },
  data() {
    return {
      dialogId: '',

      dnsmtuIslandData: {
        dns: this.network.defaults.peers.dns,
        mtu: this.network.defaults.peers.mtu,
        context: 'create',
        changedFields: {},
        error: null,
      },
      scriptsIslandData: {
        scripts: this.network.defaults.peers.scripts,
        changedFields: {},
        error: null,
      },
      // enable the root server as default
      connectionIslandsData: {
        selectionBoxTitles: { static: 'Attach to these static peers:', roaming: 'Attach to these roaming peers:' },
        staticPeers: this.staticPeers,
        roamingPeers: this.roamingPeers,
        attachedStaticPeers: ['root'],
        attachedRoamingPeers: [],
        isConnectionEnabled: {},
        persistentKeepaliveEnabled: {},
        persistentKeepaliveValue: {},
        allowedIPsAtoB: {},
        allowedIPsBtoA: {},
        latestHandshakeAt: {},
        preSharedKey: {},
        context: 'create',
        addedFields: {},
        removedFields: {},
        changedFields: {},
        error: null,
      },

      peerCreatePeerId: '',
      peerCreateName: '',
      peerCreateAddress: '',
      peerCreatePreambleExpiration: 0,
      peerCreateEndpoint: '',
      peerCreateShowAdvance: false,
    };
  },
  created() {
    this.api.preamblePeer({ })
      .then(resp => {
        const { peerId, address, expiration } = resp;
        this.peerCreatePeerId = peerId;
        this.peerCreateAddress = address;
        this.peerCreatePreambleExpiration = expiration;

        for (const [peerId, peerDetails] of Object.entries(this.network.peers)) {
          const connectionId = WireGuardHelper.getConnectionId(this.peerCreatePeerId, peerId);
          const { a, b } = WireGuardHelper.getConnectionPeers(connectionId);

          this.connectionIslandsData.isConnectionEnabled[connectionId] = true;
          this.connectionIslandsData.persistentKeepaliveEnabled[connectionId] = this.network.defaults.connections.persistentKeepalive.enabled;
          this.connectionIslandsData.persistentKeepaliveValue[connectionId] = this.network.defaults.connections.persistentKeepalive.value;
          // eslint-disable-next-line no-nested-ternary
          const allowedIPsNewToOld = peerDetails.mobility === 'static' ? (this.value.mobility === 'static' ? this.network.subnet : '0.0.0.0/0') : `${this.network.peers[peerId].address}/32`;
          const allowedIPsOldToNew = `${this.peerCreateAddress}/32`;
          this.connectionIslandsData.allowedIPsAtoB[connectionId] = (a === peerId && b === this.peerCreatePeerId) ? allowedIPsOldToNew : allowedIPsNewToOld;
          this.connectionIslandsData.allowedIPsBtoA[connectionId] = (a === peerId && b === this.peerCreatePeerId) ? allowedIPsNewToOld : allowedIPsOldToNew;

          this.connectionIslandsData.latestHandshakeAt[connectionId] = null;
          this.connectionIslandsData.preSharedKey[connectionId] = null;
        }
      }).catch(() => {
        this.dialogId = 'cant-create-peer';
      });
  },
  template: `<div>
               <custom-dialog class="z-10"
                        :left-button-text="'Cancel'"
                        :left-button-click="() => { value.mobility = ''; peerCreateWindowDeletePreamble().then(); }"
                        :right-button-text="'Create'"
                        :right-button-click="() => { createPeer(value.mobility); value.mobility = '';}"
                        :right-button-classes="['enabled:bg-green-700', 'enabled:hover:bg-green-800', 'enabled:focus:outline-none', 'bg-gray-200', 'disabled:hover:bg-gray-200', 'disabled:cursor-not-allowed', 'text-white']"
                        :right-button-disabled="!peerCreateEligibilityOverall"
                        icon="add">
                 <div class="text-center sm:text-left">
                   <h3 class="text-lg leading-6 font-medium text-gray-900">
                     New Peer
                   </h3>
                   <div class="mt-2">
                     <p class="text-sm text-gray-500">
                       <input class="rounded p-2 border-2 border-gray-100 focus:border-gray-200 outline-none w-full"
                              type="text" v-model.trim="peerCreateName" placeholder="Name" :class="[peerCreateNameColor]"/>
                     </p>
                   </div>
                   <div v-show="value.mobility === 'static'" class="mt-2">
                     <p class="text-sm text-gray-500">
                       <input class="rounded p-2 border-2 border-gray-100 focus:border-gray-200 outline-none w-full"
                              type="text" v-model.trim="peerCreateEndpoint" placeholder="Endpoint (e.g. 1.2.3.4:51820 example.com:51820)" :class="[peerCreateEndpointColor]" />
                     </p>
                   </div>
                   <div class="mt-2">
                     <button type="button" @click="peerCreateShowAdvance = !peerCreateShowAdvance;">
                       <span class="text-sm text-gray-500 hover:underline">Advanced settings</span>
                       <span v-show="peerCreateShowAdvance === true" class="text-sm text-gray-500 hover:underline">&#x25B2;</span>
                       <span v-show="peerCreateShowAdvance === false" class="text-sm text-gray-500 hover:underline">&#x25BC;</span>
                     </button>
  
                     <div v-show="peerCreateShowAdvance === true" class="h-[18rem] w-[26rem] overflow-y-auto pr-3">
                       <div class="my-2 p-1 shadow-md border rounded bg-gray-100">
                         <div class="text-gray-800">
                           Reserved address: <strong>{{ peerCreateAddress }}</strong>
                         </div>
                       </div>
                       <dnsmtu-island v-model="dnsmtuIslandData"
                                      :defaults="network.defaults.peers" ></dnsmtu-island>
                       <scripts-island v-model="scriptsIslandData"
                                       :defaults="network.defaults.peers"></scripts-island>
                       <connection-islands v-if="peerCreatePeerId"
                                           v-model="connectionIslandsData"
                                           :focus-peer-id="peerCreatePeerId"
                                           :focus-peer-name="peerCreateName"></connection-islands>
                     </div>
                   </div>
                 </div>
               </custom-dialog>

               <!-- Dialog: Can't Create Peer -->
               <custom-dialog v-if="dialogId" class="z-20"
                              :left-button-text="'Cancel'"
                              :left-button-click="() => { dialogId = null; value.mobility = ''; peerCreateWindowDeletePreamble().then(); }"
                              :right-button-text="''"
                              icon="danger">
                 <h3 class="text-lg leading-6 font-medium text-gray-900">
                   Error while preparing peer creation window
                 </h3>
                 <div class="mt-2 text-sm text-gray-500">
                   There are no addresses left to be reserved. A new peer can't be created until the reserved addresses pool is reset, or you have reached the peer limit.
                 </div>
               </custom-dialog>
             </div>`,
  methods: {
    async peerCreateWindowDeletePreamble() {
      if (!(this.peerCreatePeerId || this.peerCreateAddress)) return;
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
        mobility: this.value.mobility,
        endpoint: this.peerCreateEndpoint,
        dns: this.dnsmtuIslandData.dns,
        mtu: this.dnsmtuIslandData.mtu,
        scripts: this.scriptsIslandData.scripts,
        attachedPeers: attachedPeersCompact,
      }).then();

      // Reset the peerId, address and expiration time
      this.peerCreatePeerId = '';
      this.peerCreateAddress = '';
      this.peerCreatePreambleExpiration = (new Date()).getTime();
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
          && !(this.value.mobility === 'static' && this.peerCreateEndpointColor === 'bg-red-50')
          && !this.dnsmtuIslandData.error
          && !this.scriptsIslandData.error
          && !this.connectionIslandsData.error;
    },
  },
});
