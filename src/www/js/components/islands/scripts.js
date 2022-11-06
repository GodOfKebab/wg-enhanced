/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable no-alert */
/* eslint-disable no-undef */
/* eslint-disable no-new */

'use strict';

const scriptsIsland = Vue.component('scripts-island', {
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
    this.value.changedFields = {};
    this.value.error = null;
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
      const changedFields = {
        scripts: {
          PreUp: {}, PostUp: {}, PreDown: {}, PostDown: {},
        },
      };
      let error = null;
      const colors = {};
      for (const field of ['PreUp', 'PostUp', 'PreDown', 'PostDown']) {
        // eslint-disable-next-line no-nested-ternary
        colors[field] = this.value.context === 'create' || this.value.scripts[field].enabled !== this.rollbackData.scripts[field].enabled || this.value.scripts[field].value !== this.rollbackData.scripts[field].value
          ? WireGuardHelper.checkField('script', this.value.scripts[field]) ? 'bg-green-200' : 'bg-red-200' : 'bg-white';

        if (this.value.scripts[field].enabled !== this.rollbackData.scripts[field].enabled) changedFields.scripts[field].enabled = this.value.scripts[field].enabled;
        if (this.value.scripts[field].value !== this.rollbackData.scripts[field].value) changedFields.scripts[field].value = this.value.scripts[field].value;
        if (Object.keys(changedFields.scripts[field]).length === 0) delete changedFields.scripts[field];

        error = this.value.scripts[field].enabled && colors[field] === 'bg-red-200' ? field : error;
      }
      if (Object.keys(changedFields.scripts).length === 0) delete changedFields.scripts;

      // eslint-disable-next-line no-nested-ternary
      colors.div = (this.value.scripts.PreUp.enabled
                || this.value.scripts.PostUp.enabled
                || this.value.scripts.PreDown.enabled
                || this.value.scripts.PostDown.enabled)
        ? (((this.value.scripts.PreUp.enabled && colors.PreUp === 'bg-red-200')
                    || (this.value.scripts.PostUp.enabled && colors.PostUp === 'bg-red-200')
                    || (this.value.scripts.PreDown.enabled && colors.PreDown === 'bg-red-200')
                    || (this.value.scripts.PostDown.enabled && colors.PostDown === 'bg-red-200')) ? 'bg-red-50' : 'bg-green-50') : 'bg-gray-100';
      this.value.changedFields = changedFields;
      this.value.error = error;

      return colors;
    },
  },
});
