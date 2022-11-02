/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable no-alert */
/* eslint-disable no-undef */
/* eslint-disable no-new */

'use strict';

const dnsmtuIsland = Vue.component('dnsmtu-island', {
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
    this.value.changed = false;
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
      let changed = false;
      let error = null;
      const colors = {};
      for (const field of ['dns', 'mtu']) {
        // eslint-disable-next-line no-nested-ternary
        colors[field] = this.value.context === 'create' || this.value[field].enabled !== this.rollbackData[field].enabled || this.value[field].value !== this.rollbackData[field].value
          ? WireGuardHelper.checkField(field, this.value[field]) ? 'bg-green-200' : 'bg-red-200' : 'bg-white';
        changed ||= colors[field] !== 'bg-white';
        error = this.value[field].enabled && colors[field] === 'bg-red-200' ? field : error;
      }
      // eslint-disable-next-line no-nested-ternary
      colors.div = this.value.dns.enabled || this.value.mtu.enabled ? ((this.value.dns.enabled && colors.dns === 'bg-red-200') || (this.value.mtu.enabled && colors.mtu === 'bg-red-200') ? 'bg-red-50' : 'bg-green-50') : 'bg-gray-100';
      this.value.changed = changed;
      this.value.error = error;

      return colors;
    },
  },
});
