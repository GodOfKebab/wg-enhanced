/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable no-alert */
/* eslint-disable no-undef */
/* eslint-disable no-new */

'use strict';

const connectionIslands = Vue.component('connection-islands', {
  props: {
    value: Object,
    focusPeerId: String,
    focusPeerName: String,
    getNewPreSharedKey: Function,
  },
  data() {
    return {
      rollbackData: {},
      colorRefresh: 0,
      connectionChanged: {},
    };
  },
  created() {
    this.rollbackData = JSON.parse(JSON.stringify(this.value));
    this.value.changed = false;
    for (const peerId of [...Object.keys(this.value.staticPeers), ...Object.keys(this.value.roamingPeers)]) {
      const connectionId = WireGuardHelper.getConnectionId(this.focusPeerId, peerId);
      this.connectionChanged[connectionId] = false;
    }
  },
  template: `<div v-if="Object.keys(value.staticPeers).length + Object.keys(value.roamingPeers).length > 0">
               <div class="my-2 p-1 shadow-md border rounded relative" :class="[color.selectionDiv, JSON.stringify(value.attachedStaticPeers) === JSON.stringify(rollbackData.attachedStaticPeers) && JSON.stringify(value.attachedRoamingPeers) === JSON.stringify(rollbackData.attachedRoamingPeers) ? '' : 'highlight-undo-box']">
                 <div v-if="Object.keys(value.staticPeers).length > 0">
                   <div class="text-gray-800">
                     {{ value.selectionBoxTitles.static }}
                   </div>
                   <div class="form-check mt-1">
                     <label class="form-check-label inline-block text-gray-800 cursor-pointer text-sm">
                       <input class="form-check-input appearance-none h-4 w-4 border border-gray-300 rounded-sm bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition duration-200 mt-1 align-top bg-no-repeat bg-center bg-contain float-left mr-2 cursor-pointer" type="checkbox" v-model="selectAllStaticPeers">
                       <span>Select All</span>
                     </label>
                   </div>
                   <div class="flex grid grid-cols-2">
                     <div v-for="(peerDetails, peerId) in value.staticPeers"
                          class="relative overflow-hidden">
                       <div class="form-check truncate">
                         <label>
                           <input class="form-check-input appearance-none h-4 w-4 border border-gray-300 rounded-sm bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition duration-200 mt-1 align-top bg-no-repeat bg-center bg-contain float-left mr-2 cursor-pointer" type="checkbox" v-model="value.attachedStaticPeers" :value="peerId" @change="value.isConnectionEnabled[peerId] = true;">
                           <span class="text-gray-800 cursor-pointer text-xs">
                           <strong class="text-sm">{{ peerDetails.name }}</strong> {{ peerDetails.address }} ({{ peerId }})
                         </span>
                         </label>
                       </div>
                     </div>
                   </div>
                 </div>
                 <div v-if="Object.keys(value.roamingPeers).length > 0">
                   <div class="text-gray-800">
                     {{ value.selectionBoxTitles.roaming }}
                   </div>
                   <div class="form-check mt-1">
                     <label class="form-check-label inline-block text-gray-800 cursor-pointer text-sm">
                       <input class="form-check-input appearance-none h-4 w-4 border border-gray-300 rounded-sm bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition duration-200 mt-1 align-top bg-no-repeat bg-center bg-contain float-left mr-2 cursor-pointer inline-block" type="checkbox" v-model="selectAllRoamingPeers">
                       <span>Select All</span>
                     </label>
                   </div>
                   <div class="flex grid grid-cols-2">
                     <div v-for="(peerDetails, peerId) in value.roamingPeers"
                          class="relative overflow-hidden">
                       <div class="form-check truncate">
                         <label>
                           <input class="form-check-input appearance-none h-4 w-4 border border-gray-300 rounded-sm bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition duration-200 mt-1 align-top bg-no-repeat bg-center bg-contain float-left mr-2 cursor-pointer" type="checkbox" v-model="value.attachedRoamingPeers" :value="peerId" @change="value.isConnectionEnabled[peerId] = true;">
                           <span class="text-gray-800 cursor-pointer text-xs">
                           <strong class="text-sm">{{ peerDetails.name }}</strong> {{ peerDetails.address }} ({{ peerId }})
                         </span>
                         </label>
                       </div>
                     </div>
                   </div>
                 </div>
                 <div class="inline-block float-right absolute z-20 right-[0.2rem] top-[0rem]">
                   <button class="align-middle p-0.5 rounded bg-gray-100 hover:bg-gray-500 hover:text-white opacity-0 transition undo-button-itself"
                           title="Undo Changes"
                           :disabled="JSON.stringify(value.attachedStaticPeers) === JSON.stringify(rollbackData.attachedStaticPeers) && JSON.stringify(value.attachedRoamingPeers) === JSON.stringify(rollbackData.attachedRoamingPeers)"
                           @click="value.attachedStaticPeers = rollbackData.attachedStaticPeers; value.attachedRoamingPeers = rollbackData.attachedRoamingPeers">
                     <img class="w-4" :src="returnIconSrc"/>
                   </button>
                 </div>
               </div>
               
               <div v-for="(peerDetails, peerId) in Object.assign({}, value.staticPeers, value.roamingPeers)" class="relative">
                 <div v-if="value.attachedStaticPeers.includes(peerId) || value.attachedRoamingPeers.includes(peerId)" class="my-2 p-1 shadow-md border rounded bg-blue-50 overflow-x-auto whitespace-nowrap highlight-remove-box" :class="[color.attachedPeerDiv[WireGuardHelper.getConnectionId(focusPeerId, peerId)], connectionChanged[WireGuardHelper.getConnectionId(focusPeerId, peerId)] ? 'highlight-undo-box' : '']">
                   <div class="inline-block float-right absolute z-20 right-[0.5rem] top-[0.25rem]">
                     <button class="align-middle p-0.5 rounded bg-gray-100 hover:bg-red-600 hover:text-white opacity-0 transition remove-button-itself"
                             title="Remove Connection" @click="value.attachedStaticPeers.includes(peerId) ? value.attachedStaticPeers.splice(value.attachedStaticPeers.indexOf(peerId), 1) : value.attachedRoamingPeers.splice(value.attachedRoamingPeers.indexOf(peerId), 1)">
                       <svg class="w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                         <path fill-rule="evenodd"
                               d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                               clip-rule="evenodd" />
                       </svg>
                     </button>
                   </div>
                   <div class="inline-block float-right absolute z-20 right-[2.25rem] top-[0.25rem]">
                     <button class="align-middle p-0.5 rounded bg-gray-100 hover:bg-gray-500 hover:text-white opacity-0 transition undo-button-itself"
                             title="Undo Changes"
                             @click="value.allowedIPsAtoB[WireGuardHelper.getConnectionId(focusPeerId, peerId)] = rollbackData.allowedIPsAtoB[WireGuardHelper.getConnectionId(focusPeerId, peerId)]; value.allowedIPsBtoA[WireGuardHelper.getConnectionId(focusPeerId, peerId)] = rollbackData.allowedIPsBtoA[WireGuardHelper.getConnectionId(focusPeerId, peerId)]; value.persistentKeepaliveEnabled[WireGuardHelper.getConnectionId(focusPeerId, peerId)] = rollbackData.persistentKeepaliveEnabled[WireGuardHelper.getConnectionId(focusPeerId, peerId)]; value.persistentKeepaliveValue[WireGuardHelper.getConnectionId(focusPeerId, peerId)] = rollbackData.persistentKeepaliveValue[WireGuardHelper.getConnectionId(focusPeerId, peerId)]; value.preSharedKey[WireGuardHelper.getConnectionId(focusPeerId, peerId)] = rollbackData.preSharedKey[WireGuardHelper.getConnectionId(focusPeerId, peerId)]; colorRefresh += 1;"
                             :disabled="!connectionChanged[WireGuardHelper.getConnectionId(focusPeerId, peerId)]">
                       <img class="w-4" :src="returnIconSrc"/>
                     </button>
                   </div>
                   <div class=" ml-1">
                     <div class="form-check">
                       <label class="form-check-label inline-block text-gray-800 cursor-pointer text-sm">
                         <input class="form-check-input appearance-none h-4 w-4 border border-gray-300 rounded-sm bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition duration-200 mt-1 align-top bg-no-repeat bg-center bg-contain float-left mr-2 cursor-pointer" type="checkbox"  v-model="value.isConnectionEnabled[WireGuardHelper.getConnectionId(focusPeerId, peerId)]" @change="colorRefresh += 1">
                         <span class="text-gray-800 text-xs">
                           <strong class="text-sm">{{ peerDetails.name }}</strong>
                           {{ peerDetails.address }}
                           ({{ peerId }})
                         </span>
                       </label>
                     </div>
                   </div>
                   <div v-show="value.isConnectionEnabled[WireGuardHelper.getConnectionId(focusPeerId, peerId)]">
                     <div v-for="connectionKey in ['preSharedKey', 'latestHandshakeAt']" class="mb-0.5 refresh-key">
                       <div v-if="value[connectionKey][WireGuardHelper.getConnectionId(focusPeerId, peerId)]" class="flex grid grid-cols-3 gap-1 text-xs mx-6">
                         <div class="col-span-1 text-xs">
                           <span class="text-gray-800 align-middle">
                               <strong class="">{{ connectionKey }}</strong>:
                           </span>
                         </div>
                         <div v-if="connectionKey === 'preSharedKey'" class="col-span-2 text-xs">
                           <button class="align-middle rounded bg-gray-100 hover:bg-gray-600 hover:text-white transition-all" @click="refreshConnectionEditKeys(WireGuardHelper.getConnectionId(focusPeerId, peerId))">
                             <img :src="refreshIconSrc">
                           </button>
                           <span class="text-gray-800 text-xs pr-1 align-middle">
                             {{ value.preSharedKey[WireGuardHelper.getConnectionId(focusPeerId, peerId)] }}
                           </span>
                         </div>
                         <div v-else class="col-span-2 text-xs">
                           <span class="text-gray-800 text-xs pr-1 align-middle">
                             {{ value.latestHandshakeAt[WireGuardHelper.getConnectionId(focusPeerId, peerId)] }}
                           </span>
                         </div>
                       </div>
                     </div>
                     <div class="relative text-gray-800 text-xs mx-6">
                       <div class="text-xs flex items-center">
                         <label class="flex items-center">
                           <input class="form-check-input appearance-none h-3 w-3 border border-gray-300 rounded-sm bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition duration-200 bg-no-repeat bg-center bg-contain float-left mr-1 cursor-pointer inline-block" type="checkbox" v-model="value.persistentKeepaliveEnabled[WireGuardHelper.getConnectionId(focusPeerId, peerId)]" @change="colorRefresh += 1">
                           <span class="text-gray-800 cursor-pointer text-xs mr-1">
                           <strong>Persistent Keepalive:</strong>
                         </span>
                         </label>
                         <input class="text-gray-800 text-xs mr-1 mt-1 rounded-md pl-1 inline-block" v-model="value.persistentKeepaliveValue[WireGuardHelper.getConnectionId(focusPeerId, peerId)]" type="string" :disabled="!value.persistentKeepaliveEnabled[WireGuardHelper.getConnectionId(focusPeerId, peerId)]" :class="[value.persistentKeepaliveEnabled[WireGuardHelper.getConnectionId(focusPeerId, peerId)] ? color.persistentKeepalive[WireGuardHelper.getConnectionId(focusPeerId, peerId)] : 'bg-gray-100']" @change="colorRefresh += 1" @keyup="colorRefresh += 1">
                       </div>
                       
                       <div class="relative text-gray-800 text-xs">
                         <div class="mt-1 flex items-center">
                           <span class="flex-none"><strong>{{ focusPeerName }}</strong> will forward IP subnet(s)</span>
                           <input v-if="WireGuardHelper.getConnectionId(focusPeerId, peerId).startsWith(focusPeerId)" class="text-gray-800 text-xs mx-1 rounded-md px-1 grow" v-model="value.allowedIPsAtoB[WireGuardHelper.getConnectionId(focusPeerId, peerId)]" :class="[color.allowedIPsAtoB[WireGuardHelper.getConnectionId(focusPeerId, peerId)]]" @change="colorRefresh += 1" @keyup="colorRefresh += 1">
                           <input v-else class="text-gray-800 text-xs mx-1 rounded-md px-1 grow" v-model="value.allowedIPsBtoA[WireGuardHelper.getConnectionId(focusPeerId, peerId)]" :class="[color.allowedIPsBtoA[WireGuardHelper.getConnectionId(focusPeerId, peerId)]]" @change="colorRefresh += 1" @keyup="colorRefresh += 1">
                           <span class="flex-none pr-2"> to <strong>{{ peerDetails.name }}</strong></span>
                         </div>
                         <div class="mt-1 flex">
                           <span class="flex-none"><strong>{{ peerDetails.name }}</strong> will forward IP subnet(s)</span>
                           <input v-if="!WireGuardHelper.getConnectionId(focusPeerId, peerId).startsWith(focusPeerId)" class="text-gray-800 text-xs mx-1 rounded-md px-1 grow" v-model="value.allowedIPsAtoB[WireGuardHelper.getConnectionId(focusPeerId, peerId)]" :class="[color.allowedIPsAtoB[WireGuardHelper.getConnectionId(focusPeerId, peerId)]]" @change="colorRefresh += 1" @keyup="colorRefresh += 1">
                           <input v-else class="text-gray-800 text-xs mx-1 rounded-md px-1 grow" v-model="value.allowedIPsBtoA[WireGuardHelper.getConnectionId(focusPeerId, peerId)]" :class="[color.allowedIPsBtoA[WireGuardHelper.getConnectionId(focusPeerId, peerId)]]" @change="colorRefresh += 1" @keyup="colorRefresh += 1">
                           <span class="flex-none pr-2"> to <strong>{{ focusPeerName }}</strong></span>
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             </div>`,
  methods: {
    async refreshConnectionEditKeys(connectionId) {
      const { preSharedKey } = await this.getNewPreSharedKey();
      this.value.preSharedKey[connectionId] = preSharedKey;
      this.colorRefresh += 1;
    },
  },
  computed: {
    selectAllStaticPeers: {
      get() {
        return this.value.staticPeers ? Object.keys(this.value.staticPeers).length === this.value.attachedStaticPeers.length : false;
      },
      set(value) {
        const attached = [];

        if (value) {
          Object.keys(this.value.staticPeers).forEach(peerId => {
            attached.push(peerId);
            if (!(peerId in this.value.attachedStaticPeers)) {
              this.value.isConnectionEnabled[peerId] = true;
            }
          });
        }

        this.value.attachedStaticPeers = attached;
      },
    },
    selectAllRoamingPeers: {
      get() {
        return this.value.roamingPeers ? Object.keys(this.value.roamingPeers).length === this.value.attachedRoamingPeers.length : false;
      },
      set(value) {
        const attached = [];

        if (value) {
          Object.keys(this.value.roamingPeers).forEach(peerId => {
            attached.push(peerId);
            if (!(peerId in this.value.attachedRoamingPeers)) {
              this.value.isConnectionEnabled[peerId] = true;
            }
          });
        }

        this.value.attachedRoamingPeers = attached;
      },
    },
    color() {
      this.colorRefresh &&= this.colorRefresh;
      const color = {
        allowedIPsAtoB: {},
        allowedIPsBtoA: {},
        persistentKeepalive: {},
        attachedPeerDiv: {},
        selectionDiv: WireGuardHelper.checkField('peerCount', [...this.value.attachedStaticPeers, ...this.value.attachedRoamingPeers]) ? 'bg-green-50' : 'bg-red-50',
      };
      let changed = JSON.stringify([...this.value.attachedStaticPeers, ...this.value.attachedRoamingPeers]) !== JSON.stringify([...this.rollbackData.attachedStaticPeers, ...this.rollbackData.attachedRoamingPeers]);
      let error = null;
      for (const peerId of [...this.value.attachedStaticPeers, ...this.value.attachedRoamingPeers]) {
        const connectionId = WireGuardHelper.getConnectionId(this.focusPeerId, peerId);
        try {
          // eslint-disable-next-line no-nested-ternary
          color.allowedIPsAtoB[connectionId] = this.value.context === 'create' || this.value.allowedIPsAtoB[connectionId] !== this.rollbackData.allowedIPsAtoB[connectionId]
            ? WireGuardHelper.checkField('allowedIPs', this.value.allowedIPsAtoB[connectionId]) ? 'bg-green-200' : 'bg-red-200' : 'bg-white';
          error = color.allowedIPsAtoB[connectionId] === 'bg-red-200' ? `${connectionId}'s 'allowedIPsAtoB' field` : error;

          // eslint-disable-next-line no-nested-ternary
          color.allowedIPsBtoA[connectionId] = this.value.context === 'create' || this.value.allowedIPsBtoA[connectionId] !== this.rollbackData.allowedIPsBtoA[connectionId]
            ? WireGuardHelper.checkField('allowedIPs', this.value.allowedIPsBtoA[connectionId]) ? 'bg-green-200' : 'bg-red-200' : 'bg-white';
          error = color.allowedIPsBtoA[connectionId] === 'bg-red-200' ? `${connectionId}'s 'allowedIPsBtoA' field` : error;

          // eslint-disable-next-line no-nested-ternary
          color.persistentKeepalive[connectionId] = this.value.context === 'create' || this.value.persistentKeepaliveValue[connectionId] !== this.rollbackData.persistentKeepaliveValue[connectionId]
            ? this.value.persistentKeepaliveEnabled[connectionId] && WireGuardHelper.checkField('persistentKeepalive', this.value.persistentKeepaliveValue[connectionId]) ? 'bg-green-200' : 'bg-red-200' : 'bg-white';
          error = color.persistentKeepalive[connectionId] === 'bg-red-200' ? `${connectionId}'s 'persistentKeepalive' field` : error;

          this.connectionChanged[connectionId] = this.value.allowedIPsAtoB[connectionId] !== this.rollbackData.allowedIPsAtoB[connectionId]
              || this.value.allowedIPsBtoA[connectionId] !== this.rollbackData.allowedIPsBtoA[connectionId]
              || this.value.persistentKeepaliveEnabled[connectionId] !== this.rollbackData.persistentKeepaliveEnabled[connectionId]
              || this.value.persistentKeepaliveValue[connectionId] !== this.rollbackData.persistentKeepaliveValue[connectionId]
              || this.value.preSharedKey[connectionId] !== this.rollbackData.preSharedKey[connectionId];

          // eslint-disable-next-line no-nested-ternary
          color.attachedPeerDiv[connectionId] = ![color.allowedIPsAtoB[connectionId], color.allowedIPsBtoA[connectionId], this.value.persistentKeepaliveEnabled[connectionId] ? color.persistentKeepalive[connectionId] : ''].includes('bg-red-200') ? this.value.isConnectionEnabled[connectionId] ? this.connectionChanged[connectionId] || !(this.rollbackData.attachedStaticPeers.includes(peerId) || this.rollbackData.attachedRoamingPeers.includes(peerId)) ? 'bg-green-100' : 'bg-green-50' : 'bg-red-50' : 'bg-red-100';
        } catch (e) {
          this.connectionChanged[connectionId] = true;
          for (const colorField of Object.keys(color)) {
            if (colorField === 'selectionDiv') continue;
            color[colorField][connectionId] = 'bg-red-50';
          }
          console.log(e);
        }
        changed ||= this.connectionChanged[connectionId];
      }
      this.value.changed = changed;
      this.value.error = error;

      return color;
    },
  },
});
