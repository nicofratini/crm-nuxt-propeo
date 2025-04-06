
import { updateAppConfig } from '#app/config'
import { defuFn } from 'defu'

const inlineConfig = {
  "nuxt": {}
}

// Vite - webpack is handled directly in #app/config
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    updateAppConfig(newModule.default)
  })
}

import cfg0 from "/Users/Nico/Downloads/crm-nuxt-propeo/app.config.ts"

export default /*@__PURE__*/ defuFn(cfg0, inlineConfig)
