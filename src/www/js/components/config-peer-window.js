/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable no-alert */
/* eslint-disable no-undef */
/* eslint-disable no-new */

'use strict';

const changeSum = Vue.component('change-sum', {
  props: {
    peerEditChangedFieldsCompute: Object,
    peerEditOldConfig: Object,
    peerEditNewConfig: Object,
  },
  template: `<div class="text-sm text-gray-500 whitespace-pre grid grid-cols-2 gap-1">
               <div class="col-span-2 bg-blue-100 rounded-md overflow-scroll">
                 <strong class="text-gray-600 justify-center rounded-md bg-blue-200 p-1">Changed fields</strong>
                 <div v-if="Object.keys(peerEditChangedFieldsCompute[0]).length > 0 || !peerEditChangedFieldsCompute[3]">
                   <div v-if="!peerEditChangedFieldsCompute[3]" class="p-1">{{ JSON.stringify(peerEditChangedFieldsCompute[0], false, 2) }}</div>
                   <div v-else-if="('peers' in peerEditChangedFieldsCompute[0]) && !('connections' in peerEditChangedFieldsCompute[0])" class="p-1">{{ JSON.stringify({ peers: peerEditChangedFieldsCompute[0].peers }, false, 2) }}</div>
                   <div v-else-if="!('peers' in peerEditChangedFieldsCompute[0]) && ('connections' in peerEditChangedFieldsCompute[0])" class="p-1">{{ JSON.stringify({ connections: peerEditChangedFieldsCompute[0].connections }, false, 2) }}</div>
                   <div v-else class="p-1">{{ JSON.stringify(peerEditChangedFieldsCompute[0], false, 2) }}</div>
                 </div>
               </div>
               <div class="col-span-2 bg-green-100 rounded-md overflow-scroll">
                 <strong class="text-gray-600 justify-center rounded-md bg-green-200 p-1">Added fields</strong>
                 <div v-if="Object.keys(peerEditChangedFieldsCompute[1]).length > 0" class="p-1">{{ JSON.stringify(peerEditChangedFieldsCompute[1], false, 2) }}</div>
               </div>
               <div class="col-span-2 bg-red-100 rounded-md overflow-scroll">
                 <strong class="text-gray-600 justify-center rounded-md bg-red-200 p-1">Removed fields</strong>
                 <div v-if="Object.keys(peerEditChangedFieldsCompute[2]).length > 0" class="p-1">{{ JSON.stringify(peerEditChangedFieldsCompute[2], false, 2) }}</div>
               </div>
               <div class="bg-red-100 rounded-md overflow-scroll">
                 <strong class="text-gray-600 justify-center rounded-md bg-red-200 p-1">Old configuration</strong>
                 <div v-if="!peerEditChangedFieldsCompute[3]" class="p-1">{}</div>
                 <div v-else class="p-1">{{ JSON.stringify(peerEditOldConfig, false, 2) }}</div>
               </div>
               <div class="bg-green-100 rounded-md overflow-scroll">
                 <strong class="text-gray-600 justify-center rounded-md bg-green-200 p-1">New configuration</strong>
                 <div v-if="!peerEditChangedFieldsCompute[3]" class="p-1">{}</div>
                 <div v-else class="p-1">{{ JSON.stringify(peerEditNewConfig, false, 2) }}</div>
               </div>
             </div>`,
});

const configPeerWindow = Vue.component('config-peer-window', {
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
        dns: this.network.peers[this.value.id].dns,
        mtu: this.network.peers[this.value.id].mtu,
        context: 'edit',
        changedFields: {},
        error: null,
      },
      scriptsIslandData: {
        scripts: this.network.peers[this.value.id].scripts,
        changedFields: {},
        error: null,
      },
      connectionIslandsData: {
        selectionBoxTitles: { static: 'Attached static peers:', roaming: 'Attached roaming peers:' },
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
        context: 'edit',
        addedFields: {},
        removedFields: {},
        changedFields: {},
        error: null,
      },

      peerConfigWindow: 'edit',
      peerEditName: this.network.peers[this.value.id].name,
      peerEditAddress: this.network.peers[this.value.id].address,
      peerEditMobility: this.network.peers[this.value.id].mobility,
      peerEditEndpoint: this.network.peers[this.value.id].endpoint,
      peerEditPublicKey: this.network.peers[this.value.id].publicKey,
      peerEditPrivateKey: this.network.peers[this.value.id].privateKey,
      peerEditOldConfig: { peers: {}, connections: {} },
      peerEditNewConfig: { peers: {}, connections: {} },
    };
  },
  created() {
    this.peerEditOldConfig.peers[this.value.id] = {
      name: this.network.peers[this.value.id].name,
      address: this.network.peers[this.value.id].address,
      mobility: this.network.peers[this.value.id].mobility,
      endpoint: this.network.peers[this.value.id].endpoint,
      publicKey: this.network.peers[this.value.id].publicKey,
      privateKey: this.network.peers[this.value.id].privateKey,
      dns: this.network.peers[this.value.id].dns,
      mtu: this.network.peers[this.value.id].mtu,
      scripts: this.network.peers[this.value.id].scripts,
    };

    // To enforce order of static > roaming connections when listed in the view
    for (const [staticPeerId, staticPeerDetails] of Object.entries(this.staticPeers)) {
      if (staticPeerId === this.value.id) continue;
      this.connectionIslandsData.staticPeers[staticPeerId] = staticPeerDetails;
      const connectionId = WireGuardHelper.getConnectionId(staticPeerId, this.value.id);
      if (Object.keys(this.network.connections).includes(connectionId)) this.connectionIslandsData.attachedStaticPeers.push(staticPeerId);
    }
    for (const [roamingPeerId, roamingPeerDetails] of Object.entries(this.roamingPeers)) {
      if (roamingPeerId === this.value.id) continue;
      this.connectionIslandsData.roamingPeers[roamingPeerId] = roamingPeerDetails;
      const connectionId = WireGuardHelper.getConnectionId(roamingPeerId, this.value.id);
      if (Object.keys(this.network.connections).includes(connectionId)) this.connectionIslandsData.attachedRoamingPeers.push(roamingPeerId);
    }

    for (const [connectionId, connection] of Object.entries(this.network.connections)) {
      if (connectionId.includes(this.value.id)) {
        this.connectionIslandsData.isConnectionEnabled[connectionId] = connection.enabled;
        this.connectionIslandsData.persistentKeepaliveEnabled[connectionId] = connection.persistentKeepalive.enabled;
        this.connectionIslandsData.persistentKeepaliveValue[connectionId] = connection.persistentKeepalive.value.toString();
        this.connectionIslandsData.allowedIPsAtoB[connectionId] = connection.allowedIPsAtoB;
        this.connectionIslandsData.allowedIPsBtoA[connectionId] = connection.allowedIPsBtoA;
        this.connectionIslandsData.latestHandshakeAt[connectionId] = connection.latestHandshakeAt;
        this.connectionIslandsData.preSharedKey[connectionId] = connection.preSharedKey;

        this.peerEditOldConfig.connections[connectionId] = {
          enabled: connection.enabled,
          persistentKeepalive: connection.persistentKeepalive,
          allowedIPsAtoB: connection.allowedIPsAtoB,
          allowedIPsBtoA: connection.allowedIPsBtoA,
          preSharedKey: connection.preSharedKey,
        };
      }
    }

    // Fill out the default fields for new connections
    for (const [otherPeerId, peerDetails] of Object.entries(this.network.peers)) {
      if (otherPeerId === this.value.id) continue;
      const connectionId = WireGuardHelper.getConnectionId(this.value.id, otherPeerId);
      const { a, b } = WireGuardHelper.getConnectionPeers(connectionId);

      if (Object.keys(this.network.connections).includes(connectionId)) continue;

      this.connectionIslandsData.isConnectionEnabled[connectionId] = true;
      this.connectionIslandsData.persistentKeepaliveEnabled[connectionId] = this.network.defaults.connections.persistentKeepalive.enabled;
      this.connectionIslandsData.persistentKeepaliveValue[connectionId] = this.network.defaults.connections.persistentKeepalive.value;
      // eslint-disable-next-line no-nested-ternary
      const allowedIPsThisToOther = `${this.network.peers[otherPeerId].address}/32`;
      const allowedIPsOtherToThis = `${this.network.peers[this.value.id].address}/32`;
      this.connectionIslandsData.allowedIPsAtoB[connectionId] = (a === otherPeerId && b === this.value.id) ? allowedIPsOtherToThis : allowedIPsThisToOther;
      this.connectionIslandsData.allowedIPsBtoA[connectionId] = (a === otherPeerId && b === this.value.id) ? allowedIPsThisToOther : allowedIPsOtherToThis;

      this.connectionIslandsData.latestHandshakeAt[connectionId] = null;
      this.connectionIslandsData.preSharedKey[connectionId] = null;
    }
  },
  template: `<div>
               <custom-dialog class="z-10"
                               :left-button-text="'Cancel'"
                               :left-button-click="() => { value.id = null }"
                               :right-button-text="peerConfigWindow === 'file' ? 'Copy To Clipboard' : 'Save Configuration'"
                               :right-button-classes="['enabled:bg-green-700', 'enabled:hover:bg-green-800', 'enabled:focus:outline-none', 'bg-gray-200', 'disabled:hover:bg-gray-200', 'disabled:cursor-not-allowed', 'text-white']"
                               :right-button-disabled="peerConfigWindow !== 'file' && ((Object.keys(peerEditChangedFieldsCompute[0]).length + Object.keys(peerEditChangedFieldsCompute[1]).length + Object.keys(peerEditChangedFieldsCompute[2]).length === 0) || !peerEditChangedFieldsCompute[3])"
                               :right-button-click="peerConfigWindow === 'file' ? () => { navigator.clipboard.writeText(WireGuardHelper.getPeerConfig(network, value.id)).then(() => {
                                          alert('successfully copied');
                                          })
                                          .catch(() => {
                                          alert('something went wrong');
                                          }); } : () => { dialogId = 'confirm-changes'; }">
                 <div class="flex justify-between items-center">
                   <h3 class="text-lg leading-6 font-medium text-gray-900 inline">
                     Configuration for <strong>{{network.peers[value.id].name}}</strong>:
                   </h3>
                   <span class="order-last">
                       <button v-show="peerConfigWindow === 'edit'" class="align-middle bg-gray-100 hover:enabled:bg-gray-600 hover:enabled:text-white disabled:text-blue-100 disabled:bg-gray-50 p-2 rounded transition special-fill"
                               title="See the configuration differences for this peer" @click="peerConfigWindow = 'view-changes'" :disabled="Object.keys(peerEditChangedFieldsCompute[0]).length + Object.keys(peerEditChangedFieldsCompute[1]).length + Object.keys(peerEditChangedFieldsCompute[2]).length === 0">
                         <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="20px" height="20px" viewBox="0 0 122.742 122.881" xml:space="preserve">
                           <g>
                             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="0"
                                   d="M5.709,23.974h47.709V5.691c0-1.581,0.643-3.015,1.679-4.05C56.108,0.629,57.492,0,59,0h58.163 c1.508,0,2.891,0.628,3.902,1.641c1.035,1.036,1.678,2.469,1.678,4.05v87.524c0,1.582-0.643,3.016-1.678,4.051 c-1.012,1.012-2.395,1.641-3.902,1.641H69.453v18.283c0,1.582-0.645,3.016-1.68,4.051c-1.012,1.012-2.395,1.641-3.902,1.641H5.709 c-1.509,0-2.891-0.629-3.903-1.641c-1.036-1.035-1.679-2.469-1.679-4.051V74.389C0.044,74.082,0,73.76,0,73.428 c0-0.334,0.044-0.656,0.127-0.963V29.666c0-1.582,0.643-3.016,1.679-4.051C2.818,24.603,4.2,23.974,5.709,23.974L5.709,23.974z M94.113,29.137c1.395-1.468,3.717-1.525,5.184-0.129c1.469,1.396,1.525,3.718,0.129,5.185L88.514,45.609h27.131V7.319H60.517 v16.655h3.354c1.508,0,2.891,0.628,3.902,1.641c1.035,1.035,1.68,2.469,1.68,4.051v61.922h46.191V52.963h-27.15l10.932,11.476 c1.396,1.469,1.34,3.789-0.129,5.186c-1.467,1.396-3.789,1.338-5.184-0.129L77.27,51.815c-1.34-1.407-1.354-3.634,0-5.057 L94.113,29.137L94.113,29.137z M22.943,58.333c-1.396-1.468-1.338-3.789,0.129-5.185c1.468-1.396,3.789-1.338,5.185,0.129 L45.1,70.898c1.354,1.424,1.34,3.65-0.001,5.057L28.257,93.637c-1.396,1.467-3.717,1.525-5.185,0.129 c-1.467-1.395-1.525-3.717-0.129-5.184l10.932-11.479H7.227v38.459h55.127v-84.27H7.227V69.75h26.628L22.943,58.333L22.943,58.333z"/>
                           </g>
                         </svg>
                       </button>
                       <button v-show="peerConfigWindow === 'file' || peerConfigWindow === 'view-changes'" class="align-middle bg-gray-100 hover:bg-gray-600 hover:text-white p-2 rounded transition special-fill-edit"
                               title="Edit the configuration for this peer" @click="peerConfigWindow = 'edit'">
                         <svg xmlns="http://www.w3.org/2000/svg"
                              class="w-5" fill="none" viewBox="0 0 24 24"
                              stroke="currentColor">
                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                 d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                         </svg>
                       </button>
                       <button v-show="peerConfigWindow === 'edit'" class="align-middle bg-gray-100 hover:bg-gray-600 hover:text-white p-2 rounded transition special-fill"
                               title="See the configuration file for this peer" @click="peerConfigWindow = 'file'">
                         <svg xmlns="http://www.w3.org/2000/svg"
                              class="w-5" fill="none" viewBox="0 0 24 24"
                              stroke="currentColor">
                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="0"
                                 d="M 6 2 C 4.9057453 2 4 2.9057453 4 4 L 4 20 C 4 21.094255 4.9057453 22 6 22 L 18 22 C 19.094255 22 20 21.094255 20 20 L 20 8 L 14 2 L 6 2 z M 6 4 L 13 4 L 13 9 L 18 9 L 18 20 L 6 20 L 6 4 z M 8 12 L 8 14 L 16 14 L 16 12 L 8 12 z M 8 16 L 8 18 L 16 18 L 16 16 L 8 16 z"/>
                         </svg>
                       </button>
                     </span>
                 </div>
         
                 <!-- show config -->
                 <div v-show="peerConfigWindow === 'file'" class="mt-2 w-full overflow-scroll h-96">
                   <span class="text-sm text-gray-500 whitespace-pre">{{ WireGuardHelper.getPeerConfig(network, value.id) }}</span>
                 </div>
         
                  <!-- edit config -->
                 <div v-show="peerConfigWindow === 'edit'" class="mt-2 w-full overflow-auto h-96">
         
                   <div class="my-2 mr-2 p-1 shadow-md border rounded" :class="[peerEditConfigColor]">
                     <div class="my-0.5 truncate flex items-center relative" :class="[peerEditNameColor !== 'bg-white' ? 'highlight-undo-box' : '']">
                                   <span class="text-gray-800 text-xs mr-1">
                                     <strong class="text-sm">Name:</strong>
                                   </span>
                       <input class="rounded p-1 border-1 border-gray-100 focus:border-gray-200 outline-none w-full text-xs text-gray-500 grow"
                              type="text" placeholder="Name"
                              v-model="peerEditName" :class="[peerEditNameColor]"/>
                       <div v-if="peerEditNameColor !== 'bg-white'" class="inline-block float-right absolute z-20 right-[0.2rem] top-[-0.1rem]">
                         <button class="align-middle p-0.5 rounded bg-gray-100 hover:bg-gray-500 hover:text-white opacity-0 transition undo-button-itself"
                                 title="Undo Changes"
                                 :disabled="peerEditNameColor === 'bg-white'"
                                 @click="peerEditName = network.peers[value.id].name">
                           <img class="w-4" :src="returnIconSrc"/>
                         </button>
                       </div>
                     </div>
         
                     <div class="mb-0.5 truncate flex items-center relative" :class="[peerEditAddressColor !== 'bg-white' ? 'highlight-undo-box' : '']">
                                   <span class="text-gray-800 text-xs mr-1">
                                     <strong class="text-sm">Address:</strong>
                                   </span>
                       <input class="rounded p-1 border-1 border-gray-100 focus:border-gray-200 outline-none w-full text-xs text-gray-500 grow"
                              type="text" :placeholder="\`Address (e.g. \${WireGuardHelper.getNextAvailableAddress(network)})\`"
                              v-model="peerEditAddress" :class="[peerEditAddressColor]"/>
                       <div v-if="peerEditAddressColor !== 'bg-white'" class="inline-block float-right absolute z-20 right-[0.2rem] top-[-0.1rem]">
                         <button class="align-middle p-0.5 rounded bg-gray-100 hover:bg-gray-500 hover:text-white opacity-0 transition undo-button-itself"
                                 title="Undo Changes"
                                 :disabled="peerEditAddressColor === 'bg-white'"
                                 @click="peerEditAddress = network.peers[value.id].address">
                           <img class="w-4" :src="returnIconSrc"/>
                         </button>
                       </div>
                     </div>
          
                     <div class="form-check truncate flex items-center relative" :class="[peerEditEndpoint !== network.peers[value.id].endpoint || peerEditMobility !== network.peers[value.id].mobility ? 'highlight-undo-box' : '']">
                       <label class="flex-none">
                         <input class="form-check-input appearance-none h-4 w-4 border border-gray-300 rounded-sm bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition duration-200 mt-1 align-top bg-no-repeat bg-center bg-contain float-left mr-1 cursor-pointer" type="checkbox" @change="peerEditMobility = peerEditMobility === 'static' ? 'roaming' : 'static';" :checked="peerEditMobility === 'static'">
                         <span class="text-gray-800 cursor-pointer text-xs mr-1">
                                       <strong class="text-sm">Static Endpoint:</strong>
                                   </span>
                       </label>
                       <input class="rounded p-1 border-1 border-gray-100 focus:border-gray-200 outline-none w-full text-xs text-gray-500 grow"
                              type="text" placeholder="Endpoint (e.g. 1.2.3.4:51820 example.com:51820)"
                              v-model="peerEditEndpoint"
                              :class="[peerEditEndpointColor]"
                              :disabled="peerEditMobility !== 'static'"/>
                       <div v-if="!(peerEditEndpoint === network.peers[value.id].endpoint && peerEditMobility === network.peers[value.id].mobility)" class="inline-block float-right absolute z-20 right-[0.2rem] top-[-0.1rem]">
                         <button class="align-middle p-0.5 rounded bg-gray-100 hover:bg-gray-500 hover:text-white opacity-0 transition undo-button-itself"
                                 title="Undo Changes"
                                 :disabled="peerEditEndpoint === network.peers[value.id].endpoint && peerEditMobility === network.peers[value.id].mobility"
                                 @click="peerEditEndpoint = network.peers[value.id].endpoint; peerEditMobility = network.peers[value.id].mobility;">
                          <img class="w-4" :src="returnIconSrc"/>
                        </button>
                       </div>
                     </div>
                   </div>
         
                   <dnsmtu-island v-model="dnsmtuIslandData"
                                  :defaults="network.defaults.peers" class="my-2 mr-2"></dnsmtu-island>
                   <scripts-island v-model="scriptsIslandData"
                                   :defaults="network.defaults.peers" class="my-2 mr-2"></scripts-island>
         
                   <div class="my-2 mr-2 p-1 shadow-md border rounded relative" :class="[peerEditPublicKey !== network.peers[value.id].publicKey || peerEditPrivateKey !== network.peers[value.id].privateKey ? 'bg-green-100' : 'bg-green-50', peerEditPublicKey !== network.peers[value.id].publicKey || peerEditPrivateKey !== network.peers[value.id].privateKey ? 'highlight-undo-box' : '']">
                     <div v-if="!(peerEditPublicKey === network.peers[value.id].publicKey || peerEditPrivateKey === network.peers[value.id].privateKey)"  class="inline-block float-right absolute z-20 right-[0.2rem] top-[0rem]">
                       <button class="align-middle p-0.5 rounded bg-gray-100 hover:bg-gray-500 hover:text-white opacity-0 transition undo-button-itself"
                               title="Undo Changes"
                               :disabled="peerEditPublicKey === network.peers[value.id].publicKey || peerEditPrivateKey === network.peers[value.id].privateKey"
                               @click="peerEditPublicKey = network.peers[value.id].publicKey; peerEditPrivateKey = network.peers[value.id].privateKey">
                         <img class="w-4" :src="returnIconSrc"/>
                       </button>
                     </div>
                     <div class="overflow-x-auto">
                       <div v-for="peerConfigKey in ['publicKey', 'privateKey', 'createdAt', 'updatedAt']">
                         <div class="flex grid grid-cols-10 text-sm refresh-key">
                           <div class="col-span-2">
                                       <span class="text-gray-800">
                                           <strong>{{ peerConfigKey }}</strong>
                                       </span>
                           </div>
                           <div class="col-span-8 text-sm whitespace-nowrap">
                             <span class="text-gray-800 text-xs">:</span>
                             <div v-if="['createdAt', 'updatedAt'].includes(peerConfigKey)" class="text-gray-800 text-xs pr-4 inline-block">{{ new Date(network.peers[value.id][peerConfigKey]).toString() }}</div>
                             <div v-else class="pr-4 inline-block">
                               <button class="align-middle rounded bg-gray-100 hover:bg-gray-600 hover:text-white transition-all" @click="refreshPeerEditKeys()">
                                 <img :src="refreshIconSrc">
                               </button>
                               <span v-if="peerConfigKey === 'publicKey'" class="text-gray-800 text-xs">{{ peerEditPublicKey }}</span>
                               <span v-else class="text-gray-800 text-xs">{{ peerEditPrivateKey }}</span>
                             </div>
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>
        
                   <connection-islands v-model="connectionIslandsData"
                                       :focus-peer-id="value.id"
                                       :focus-peer-name="peerEditName"
                                       :get-new-pre-shared-key="async () => { return await api.getNewPreSharedKey() }" class="my-2 mr-2"></connection-islands>
                 </div>
         
                  <!-- show config -->
                 <div v-show="peerConfigWindow === 'view-changes'" class="mt-2 w-full overflow-scroll h-96">
                   <change-sum :peer-edit-changed-fields-compute="peerEditChangedFieldsCompute"
                               :peer-edit-old-config="peerEditOldConfig"
                               :peer-edit-new-config="peerEditNewConfig"></change-sum>
                 </div>
               </custom-dialog>
               
               <!-- Dialog: Confirm -->
               <custom-dialog v-if="dialogId === 'confirm-changes'" class="z-20"
                              :left-button-text="'Cancel'"
                              :left-button-click="() => { dialogId = null }"
                              :right-button-text="'Do it!'"
                              :right-button-classes="['text-white', 'bg-green-600', 'hover:bg-green-700']"
                              :right-button-click="() => { peerConfigEditApply().then(); value.id = null; peerConfigWindow = 'edit'; dialogId = null; }"
                              icon="danger">
                 <h3 class="text-lg leading-6 font-medium text-gray-900">
                   Confirm changes for <strong>{{ network.peers[value.id].name }}</strong>
                 </h3>
                 <div class="mt-2 text-sm text-gray-500">
                  Are you sure you want to make these changes?
                 </div>
         
                 <change-sum :peer-edit-changed-fields-compute="peerEditChangedFieldsCompute"
                             :peer-edit-old-config="peerEditOldConfig"
                             :peer-edit-new-config="peerEditNewConfig"></change-sum>
               </custom-dialog>
             </div>`,
  methods: {
    async refreshPeerEditKeys() {
      const { publicKey, privateKey } = await this.api.getNewKeyPairs();
      this.peerEditPublicKey = publicKey;
      this.peerEditPrivateKey = privateKey;
    },
    async peerConfigEditApply() {
      const [changedFields, addedFields, removedFields, errorNotFound] = this.peerEditChangedFieldsCompute;
      if (!errorNotFound || Object.keys(changedFields).length + Object.keys(addedFields).length + Object.keys(removedFields).length === 0) return;

      if (Object.keys(changedFields).includes('peers')) {
        let mobilityValue = null;
        let endpointValue = null;
        let publicKeyValue = null;
        let privateKeyValue = null;
        for (const [field, value] of Object.entries(changedFields.peers[this.value.id])) {
          switch (field) {
            case 'name':
              this.api.updatePeerName(this.value.id, value).then();
              break;
            case 'address':
              this.api.updatePeerAddress(this.value.id, value).then();
              break;
            case 'mobility':
              mobilityValue = value;
              break;
            case 'endpoint':
              endpointValue = value;
              break;
            case 'dns':
              this.api.updatePeerDNS(this.value.id, value).then();
              break;
            case 'mtu':
              this.api.updatePeerMTU(this.value.id, value).then();
              break;
            case 'scripts':
              this.api.updatePeerScripts(this.value.id, value).then();
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
        if (mobilityValue || endpointValue) this.api.updatePeerEndpoint(this.value.id, mobilityValue, endpointValue).then();
        if (publicKeyValue || privateKeyValue) this.api.updatePeerKeys(this.value.id, publicKeyValue, privateKeyValue).then();
      }

      if (Object.keys(changedFields).includes('connections')) {
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
          if (persistentKeepaliveEnabled !== null || persistentKeepaliveValue !== null) this.api.updateConnectionPersistentKeepalive(connectionId, persistentKeepaliveEnabled, persistentKeepaliveValue).then();
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
  },
  computed: {
    peerEditNameColor() {
      // eslint-disable-next-line no-nested-ternary
      return this.peerEditName !== this.network.peers[this.value.id].name
        ? (WireGuardHelper.checkField('name', this.peerEditName) ? 'bg-green-200' : 'bg-red-200') : 'bg-white';
    },
    peerEditAddressColor() {
      // eslint-disable-next-line no-nested-ternary
      return this.peerEditAddress !== this.network.peers[this.value.id].address
        ? (WireGuardHelper.checkField('address', this.peerEditAddress) ? 'bg-green-200' : 'bg-red-200') : 'bg-white';
    },
    peerEditEndpointColor() {
      // eslint-disable-next-line no-nested-ternary
      return this.peerEditMobility === 'static' ? this.peerEditEndpoint !== this.network.peers[this.value.id].endpoint || !WireGuardHelper.checkField('endpoint', this.peerEditEndpoint)
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
      const changedFields = { peers: {}, connections: {} };

      let peerErrorField = '';
      // check for the errors in the peer's config
      if (this.peerEditConfigColor === 'bg-red-50') {
        peerErrorField = this.peerEditNameColor === 'bg-red-200' ? 'name' : peerErrorField;
        peerErrorField = this.peerEditAddressColor === 'bg-red-200' ? 'address' : peerErrorField;
        peerErrorField = this.peerEditEndpointColor === 'bg-red-200' ? 'endpoint' : peerErrorField;
      }

      peerErrorField = this.dnsmtuIslandData.error ? this.dnsmtuIslandData.error : peerErrorField;
      peerErrorField = this.scriptsIslandData.error ? this.scriptsIslandData.error : peerErrorField;

      if (peerErrorField) {
        return [
          { msg: `Error detected in the peer's '${peerErrorField}' field. Changes can't be considered until this is fixed.` },
          {},
          {},
          false,
        ];
      }
      this.peerEditNewConfig = JSON.parse(JSON.stringify(this.peerEditOldConfig)); // deep copy

      // check for the changes in the peer's config
      changedFields.peers[this.value.id] = {};
      for (const [peerConfigField, peerConfigValue] of Object.entries({
        name: this.peerEditName,
        address: this.peerEditAddress,
        mobility: this.peerEditMobility,
        endpoint: this.peerEditEndpoint,
        publicKey: this.peerEditPublicKey,
        privateKey: this.peerEditPrivateKey,
      })) {
        if (peerConfigValue !== this.network.peers[this.value.id][peerConfigField]) {
          changedFields.peers[this.value.id][peerConfigField] = peerConfigValue;
          this.peerEditNewConfig.peers[this.value.id][peerConfigField] = peerConfigValue;
        }
      }

      for (const [field, value] of Object.entries(this.dnsmtuIslandData.changedFields)) {
        changedFields.peers[this.value.id][field] = value;

        for (const [fieldDNSMTU, valueDNSMTU] of Object.entries(value)) {
          this.peerEditNewConfig.peers[this.value.id][field][fieldDNSMTU] = valueDNSMTU;
        }
      }

      if ('scripts' in this.scriptsIslandData.changedFields) {
        changedFields.peers[this.value.id].scripts = this.scriptsIslandData.changedFields.scripts;

        for (const [scriptField, scriptValue] of Object.entries(this.scriptsIslandData.changedFields.scripts)) {
          for (const [scriptSubField, scriptSubValue] of Object.entries(scriptValue)) {
            this.peerEditNewConfig.peers[this.value.id].scripts[scriptField][scriptSubField] = scriptSubValue;
          }
        }
      }
      if (Object.keys(changedFields.peers[this.value.id]).length === 0) delete changedFields.peers;

      // check for the errors in the peer's connections
      if (this.connectionIslandsData.error) {
        return [
          { msg: `Error detected in the '${this.connectionIslandsData.error}' field. Changes can't be considered until this is fixed.` },
          {},
          {},
          false,
        ];
      }

      if (Object.keys(this.connectionIslandsData.addedFields).length > 0) {
        for (const [connectionId, connection] of Object.entries(this.connectionIslandsData.addedFields)) {
          this.peerEditNewConfig.connections[connectionId] = connection;
        }
      }

      // check for the changes in the peer's connections
      if (Object.keys(this.connectionIslandsData.changedFields).length > 0) {
        changedFields.connections = this.connectionIslandsData.changedFields;

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
      } else {
        delete changedFields.connections;
      }

      if (Object.keys(this.connectionIslandsData.removedFields).length > 0) {
        for (const connectionId of Object.keys(this.connectionIslandsData.removedFields)) {
          delete this.peerEditNewConfig.connections[connectionId];
        }
      }

      return [
        changedFields,
        Object.keys(this.connectionIslandsData.addedFields).length > 0 ? { connections: this.connectionIslandsData.addedFields } : {},
        Object.keys(this.connectionIslandsData.removedFields).length > 0 ? { connections: this.connectionIslandsData.removedFields } : {},
        true,
      ];
    },
  },
  components: {
    'change-sum': changeSum,
  },
});
