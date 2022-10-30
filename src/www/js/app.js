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
Vue.component('dnsmtu-island', {
  props: {
    value: {
      type: Object,
    },
    defaults: {
      type: Object,
    },
  },
  data() {
    return {
      rollbackData: {},
    };
  },
  created() {
    this.rollbackData = JSON.parse(JSON.stringify(this.value));
  },
  emits: ['update:value'],
  template: `<div class="my-2 p-1 shadow-md border rounded" :class="[colors.div]">
               <div class="text-gray-800 mb-0.5">
                 Configure DNS and MTU:
               </div>
               <div class="flex grid grid-cols-2 gap-2 mb-0.5">
                 <div v-for="field in ['dns', 'mtu']">
                   <div class="truncate">
                     <div class="form-check truncate relative" :class="[value[field].enabled !== rollbackData[field].enabled || value[field].value !== rollbackData[field].value ? 'highlight-undo-box' : '']">
                       <label>
                         <input class="form-check-input appearance-none h-4 w-4 border border-gray-300 rounded-sm bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition duration-200 mt-1 align-top bg-no-repeat bg-center bg-contain float-left mr-1 cursor-pointer" type="checkbox" v-model="value[field].enabled">
                         <span class="text-gray-800 cursor-pointer text-xs">
                           <strong class="text-sm">{{ field.toUpperCase() }}: </strong>
                         </span>
                       </label>
                       <input :list="field + 'Recommendations'" style="width: 25vw;" type="text" :placeholder="defaults[field].value ? 'Click to see recommendations' : 'No recommendations'"
                              class="rounded p-1 border-1 border-gray-100 focus:border-gray-200 outline-none w-full text-xs text-gray-500 grow disabled:bg-gray-100"
                              v-model="value[field].value"
                              :class="[\`enabled:\${field === 'dns' ? colors.dns : colors.mtu}\`]"
                              :disabled="!value[field].enabled"/>
                       <datalist :id="field + 'Recommendations'">
                         <option v-if="field === 'dns'" :value="defaults[field].value">
                           Forward all {{ field.toUpperCase() }} related traffic to {{ defaults[field].value }}
                         </option>
                         <option v-if="field === 'mtu'" :value="defaults[field].value">
                           Set MTU to {{ defaults[field].value }}
                         </option>
                       </datalist>
                       <div class="inline-block float-right absolute z-20 right-[0.2rem] top-[0rem]">
                         <button class="align-middle p-0.5 rounded bg-gray-100 hover:bg-gray-500 hover:text-white opacity-0 transition undo-button-itself"
                                 title="Undo Changes"
                                 :disabled="value[field].enabled === rollbackData[field].enabled && value[field].value === rollbackData[field].value"
                                 @click="value[field].enabled = rollbackData[field].enabled; value[field].value = rollbackData[field].value;">
                           <img class="w-4" :src="returnIconSrc"/>
                         </button>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             </div>`,
  computed: {
    colors() {
      const colors = {};
      for (const field of ['dns', 'mtu']) {
        // eslint-disable-next-line no-nested-ternary
        colors[field] = this.value.context === 'create' || this.value[field].enabled !== this.rollbackData[field].enabled || this.value[field].value !== this.rollbackData[field].value
          ? WireGuardHelper.checkField(field, this.value[field]) ? 'bg-green-200' : 'bg-red-200' : 'bg-white';
      }
      // eslint-disable-next-line no-nested-ternary
      colors.div = this.value.dns.enabled || this.value.mtu.enabled ? ((this.value.dns.enabled && colors.dns === 'bg-red-200') || (this.value.mtu.enabled && colors.mtu === 'bg-red-200') ? 'bg-red-50' : 'bg-green-50') : 'bg-gray-100';
      this.value.changed = JSON.stringify(this.value) !== JSON.stringify(this.rollbackData);
      this.value.hasError = colors.div === 'bg-red-50';
      return colors;
    },
  },
});
Vue.component('scripts-island', {
  props: {
    value: {
      type: Object,
    },
    // TODO: add recommendations based on the defaults
    defaults: {
      type: Object,
    },
  },
  data() {
    return {
      rollbackData: {},
    };
  },
  created() {
    this.rollbackData = JSON.parse(JSON.stringify(this.value));
  },
  template: `<div class="p-1 shadow-md border rounded" :class="[colors.div]">
               <div class="text-gray-800 mb-0.5">
                 Configure Script Snippets:
               </div>
               <div v-for="scriptField in ['PreUp', 'PostUp', 'PreDown', 'PostDown']">
                 <div class="form-check truncate flex items-center relative mb-0.5" :class="[value.scripts[scriptField].enabled !== rollbackData.scripts[scriptField].enabled || value.scripts[scriptField].value !== rollbackData.scripts[scriptField].value ? 'highlight-undo-box' : '']">
                   <label class="flex-none">
                     <input class="form-check-input appearance-none h-4 w-4 border border-gray-300 rounded-sm bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition duration-200 mt-1 align-top bg-no-repeat bg-center bg-contain float-left mr-1 cursor-pointer" type="checkbox" @change="value.scripts[scriptField].enabled = !value.scripts[scriptField].enabled;" :checked="value.scripts[scriptField].enabled">
                     <span class="text-gray-800 cursor-pointer text-xs mr-1">
                       <strong class="text-sm">{{ scriptField }}:</strong>
                      </span>
                   </label>
                   <input class="rounded p-1 border-1 border-gray-100 focus:border-gray-200 outline-none w-full text-xs text-gray-500 grow disabled:bg-gray-100"
                          type="text" :placeholder="\`\${scriptField} Script (e.g. echo 'Hey, this is \${scriptField} Script';)\`"
                          v-model="value.scripts[scriptField].value"
                          :class="[\`enabled:\${colors[scriptField]}\`]"
                          :disabled="!value.scripts[scriptField].enabled"/>
                   <div class="inline-block float-right absolute z-20 right-[0.2rem] top-[-0.1rem]">
                     <button class="align-middle p-0.5 rounded bg-gray-100 hover:bg-gray-500 hover:text-white opacity-0 transition undo-button-itself"
                             title="Undo Changes"
                             :disabled="value.scripts[scriptField].enabled === rollbackData.scripts[scriptField].enabled && value.scripts[scriptField].value === rollbackData.scripts[scriptField].value"
                             @click="value.scripts[scriptField].enabled = rollbackData.scripts[scriptField].enabled; value.scripts[scriptField].value = rollbackData.scripts[scriptField].value;">
                       <img class="w-4" :src="returnIconSrc"/>
                     </button>
                   </div>
                 </div>
               </div>
             </div>`,
  computed: {
    colors() {
      const colors = {};
      for (const field of ['PreUp', 'PostUp', 'PreDown', 'PostDown']) {
        // eslint-disable-next-line no-nested-ternary
        colors[field] = this.value.context === 'create' || this.value.scripts[field].enabled !== this.rollbackData.scripts[field].enabled || this.value.scripts[field].value !== this.rollbackData.scripts[field].value
          ? WireGuardHelper.checkField('script', this.value.scripts[field]) ? 'bg-green-200' : 'bg-red-200' : 'bg-white';
      }
      // eslint-disable-next-line no-nested-ternary
      colors.div = (this.value.scripts.PreUp.enabled
        || this.value.scripts.PostUp.enabled
        || this.value.scripts.PreDown.enabled
        || this.value.scripts.PostDown.enabled)
        ? (((this.value.scripts.PreUp.enabled && colors.PreUp === 'bg-red-200')
            || (this.value.scripts.PostUp.enabled && colors.PostUp === 'bg-red-200')
            || (this.value.scripts.PreDown.enabled && colors.PreDown === 'bg-red-200')
            || (this.value.scripts.PostDown.enabled && colors.PostDown === 'bg-red-200')) ? 'bg-red-50' : 'bg-green-50') : 'bg-gray-100';
      this.value.changed = JSON.stringify(this.value) !== JSON.stringify(this.rollbackData);
      this.value.hasError = colors.div === 'bg-red-50';
      return colors;
    },
  },
});
Vue.component('connection-islands', {
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
      let hasError = color.selectionDiv === 'bg-red-50';
      for (const peerId of [...this.value.attachedStaticPeers, ...this.value.attachedRoamingPeers]) {
        const connectionId = WireGuardHelper.getConnectionId(this.focusPeerId, peerId);
        try {
          // eslint-disable-next-line no-nested-ternary
          color.allowedIPsAtoB[connectionId] = this.value.context === 'create' || this.value.allowedIPsAtoB[connectionId] !== this.rollbackData.allowedIPsAtoB[connectionId]
            ? WireGuardHelper.checkField('allowedIPs', this.value.allowedIPsAtoB[connectionId]) ? 'bg-green-200' : 'bg-red-200' : 'bg-white';
          // eslint-disable-next-line no-nested-ternary
          color.allowedIPsBtoA[connectionId] = this.value.context === 'create' || this.value.allowedIPsBtoA[connectionId] !== this.rollbackData.allowedIPsBtoA[connectionId]
            ? WireGuardHelper.checkField('allowedIPs', this.value.allowedIPsBtoA[connectionId]) ? 'bg-green-200' : 'bg-red-200' : 'bg-white';
          // eslint-disable-next-line no-nested-ternary
          color.persistentKeepalive[connectionId] = this.value.context === 'create' || this.value.persistentKeepaliveValue[connectionId] !== this.rollbackData.persistentKeepaliveValue[connectionId]
            ? this.value.persistentKeepaliveEnabled[connectionId] && WireGuardHelper.checkField('persistentKeepalive', this.value.persistentKeepaliveValue[connectionId]) ? 'bg-green-200' : 'bg-red-200' : 'bg-white';

          this.connectionChanged[connectionId] = this.value.allowedIPsAtoB[connectionId] !== this.rollbackData.allowedIPsAtoB[connectionId]
              || this.value.allowedIPsBtoA[connectionId] !== this.rollbackData.allowedIPsBtoA[connectionId]
              || this.value.persistentKeepaliveEnabled[connectionId] !== this.rollbackData.persistentKeepaliveEnabled[connectionId]
              || this.value.persistentKeepaliveValue[connectionId] !== this.rollbackData.persistentKeepaliveValue[connectionId]
              || this.value.preSharedKey[connectionId] !== this.rollbackData.preSharedKey[connectionId];

          // eslint-disable-next-line no-nested-ternary
          color.attachedPeerDiv[connectionId] = ![color.allowedIPsAtoB[connectionId], color.allowedIPsBtoA[connectionId], this.value.persistentKeepaliveEnabled[connectionId] ? color.persistentKeepalive[connectionId] : ''].includes('bg-red-200') ? this.value.isConnectionEnabled[connectionId] ? this.connectionChanged[connectionId] ? 'bg-green-100' : 'bg-green-50' : 'bg-red-50' : 'bg-red-100';
        } catch (e) {
          this.connectionChanged[connectionId] = true;
          for (const colorField of Object.keys(color)) {
            if (colorField === 'selectionDiv') continue;
            color[colorField][connectionId] = 'bg-red-50';
          }
          console.log(e);
        }
        hasError ||= color.attachedPeerDiv[connectionId] === 'bg-red-50';
      }
      this.value.hasError = hasError;
      return color;
    },
  },
});
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
      changed: true,
      hasError: false,
    },
    scriptsIslandData: {
      scripts: {
        PreUp: { enabled: false, value: '' },
        PostUp: { enabled: false, value: '' },
        PreDown: { enabled: false, value: '' },
        PostDown: { enabled: false, value: '' },
      },
      hasError: false,
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
      hasError: false,
    },

    peerCreatePeerId: '',
    peerCreateName: '',
    peerCreateAddress: '',
    peerCreatePreambleExpiration: (new Date()).getTime(),
    peerCreateMobility: '',
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
    peerEditConnectionPreSharedKeys: {},
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

            this.peerEditWindowHandler('init', { peerId: node.id });
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
    updatePeerKeys(peerId, publicKey, privateKey) {
      this.api.updatePeerKeys({ peerId, publicKey, privateKey })
        .catch(err => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    updateConnectionKey(connectionId, preSharedKey) {
      this.api.updateConnectionKey({ connectionId, preSharedKey })
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
      if (this.wireguardStatus === 'up') {
        this.wireguardStatus = 'unknown';
        this.api.wireguardDisable()
          .catch(err => alert(err.message || err.toString()))
          .finally(() => this.refresh().catch(console.error));
      } else if (this.wireguardStatus === 'down') {
        this.wireguardStatus = 'unknown';
        this.api.wireguardEnable()
          .catch(err => alert(err.message || err.toString()))
          .finally(() => this.refresh().catch(console.error));
      }
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
            this.prepDialog('cant-create-peer');
          }
        }

        this.peerCreateName = '';
        this.peerCreateEndpoint = '';
        this.peerCreateShowAdvance = false;

        this.dnsmtuIslandData.context = 'create';
        this.dnsmtuIslandData.dns = JSON.parse(JSON.stringify(this.network.defaults.peers.dns));
        this.dnsmtuIslandData.mtu = JSON.parse(JSON.stringify(this.network.defaults.peers.mtu));
        this.dnsmtuIslandData.hasError = false;

        this.scriptsIslandData.scripts = JSON.parse(JSON.stringify(this.network.defaults.peers.scripts));
        this.scriptsIslandData.hasError = false;

        this.connectionIslandsData.context = 'create';
        this.connectionIslandsData.selectionBoxTitles = { static: 'Attach to these static peers:', roaming: 'Attach to these roaming peers:' };
        this.connectionIslandsData.staticPeers = this.staticPeers;
        this.connectionIslandsData.roamingPeers = this.roamingPeers;
        // enable the root server as default
        this.connectionIslandsData.attachedStaticPeers = ['root'];
        this.connectionIslandsData.attachedRoamingPeers = [];
        this.connectionIslandsData.hasError = false;

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
    peerEditWindowHandler(mode, options = {}) {
      if (mode === 'init') {
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
        this.dnsmtuIslandData.hasError = false;

        this.scriptsIslandData.scripts = JSON.parse(JSON.stringify(this.network.peers[peerId]['scripts']));
        this.scriptsIslandData.hasError = false;

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
        this.connectionIslandsData.hasError = false;

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
        let publicKeyValue = null;
        let privateKeyValue = null;
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
        if (mobilityValue || endpointValue) this.updatePeerEndpoint(this.peerConfigId, mobilityValue, endpointValue);
        if (publicKeyValue || privateKeyValue) this.updatePeerKeys(this.peerConfigId, publicKeyValue, privateKeyValue);

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
              case 'preSharedKey':
                this.updateConnectionKey(connectionId, value);
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
    async refreshPeerEditKeys() {
      const { publicKey, privateKey } = await this.api.getNewKeyPairs();
      this.peerEditPublicKey = publicKey;
      this.peerEditPrivateKey = privateKey;
    },
    // async refreshConnectionEditKeys(connectionId) {
    //   const { preSharedKey } = await this.api.getNewPreSharedKey();
    //   this.peerEditConnectionPreSharedKeys[connectionId] = preSharedKey;
    //   this.peerEditConnectionColorRefresh += 1;
    // },
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
            this.deletePeer(this.dialogPeerId);
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
          && !this.dnsmtuIslandData.hasError
          && !this.scriptsIslandData.hasError
          && !this.connectionIslandsData.hasError;
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
      // this.peerEditConnectionColorRefresh &&= this.peerEditConnectionColorRefresh;
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
            change ||= this.peerEditConnectionPreSharedKeys[connectionId] !== this.network.connections[connectionId].preSharedKey;
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
      const addDetectedPeer = false;
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

      const changeDetectedConnection = false;
      const connectionIdError = '';
      const connectionErrorField = '';

      // check errors
      // for (const connectionId of this.peerEditConnectionIds) {
      //   if (Object.keys(this.network.connections).includes(connectionId)) {
      //     for (const connectionField of ['allowedIPsAtoB', 'allowedIPsBtoA', 'persistentKeepalive']) {
      //       if (this.peerEditConnectionColor[connectionField][connectionId] === 'bg-red-200') {
      //         connectionIdError = connectionId;
      //         connectionErrorField = connectionField;
      //         errorNotFound = false;
      //       }
      //       if (connectionField === 'persistentKeepalive') {
      //         changeDetectedConnection ||= this.peerEditPersistentKeepaliveEnabledData[connectionId] !== this.network.connections[connectionId].persistentKeepalive.enabled;
      //       }
      //       changeDetectedConnection ||= this.peerEditConnectionColor[connectionField][connectionId] === 'bg-green-200';
      //     }
      //     changeDetectedConnection ||= this.peerEditConnectionColor.persistentKeepalive[connectionId] === 'bg-green-200';
      //     changeDetectedConnection ||= this.peerEditIsConnectionEnabled[connectionId] !== this.network.connections[connectionId].enabled;
      //     changeDetectedConnection ||= this.peerEditConnectionPreSharedKeys[connectionId] !== this.network.connections[connectionId].preSharedKey;
      //   } else {
      //     addDetectedPeer = true;
      //     for (const connectionField of ['allowedIPsAtoB', 'allowedIPsBtoA', 'persistentKeepalive']) {
      //       if (this.peerEditConnectionColor[connectionField][connectionId] === 'bg-red-200') {
      //         connectionIdError = connectionId;
      //         connectionErrorField = connectionField;
      //         errorNotFound = false;
      //       }
      //     }
      //   }
      // }

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

            if (this.peerEditConnectionPreSharedKeys[connectionId] !== this.network.connections[connectionId].preSharedKey) {
              changedSubFields.preSharedKey = this.peerEditConnectionPreSharedKeys[connectionId];
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
          changed ||= this.peerEditConnectionPreSharedKeys[connectionId] !== this.network.connections[connectionId].preSharedKey;
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

    // eslint-disable-next-line no-unused-expressions
    this.peersPersist['root*root'] = {
      transferRxHistory: Array(this.networkSeriesLength).fill(2),
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
});
