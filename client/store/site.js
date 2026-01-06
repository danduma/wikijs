import { make } from 'vuex-pathify'

/* global siteConfig */

const state = {
  company: siteConfig.company,
  contentLicense: siteConfig.contentLicense,
  footerOverride: siteConfig.footerOverride,
  darkDefault: siteConfig.darkMode,
  dark: siteConfig.darkMode,
  appearanceMode: 'auto',
  systemPrefersDark: false,
  tocPosition: siteConfig.tocPosition,
  mascot: true,
  title: siteConfig.title,
  logoUrl: siteConfig.logoUrl,
  search: '',
  searchIsFocused: false,
  searchIsLoading: false,
  searchRestrictLocale: false,
  searchRestrictPath: false,
  printView: false
}

export default {
  namespaced: true,
  state,
  mutations: make.mutations(state)
}
