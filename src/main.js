import { createApp } from 'vue'
import { SplashScreen } from '@capacitor/splash-screen'
import App from './App.vue'
import '@fontsource/noto-sans-jp/japanese-400.css'
import '@fontsource/noto-sans-jp/japanese-600.css'
import '@fontsource/noto-sans-jp/japanese-700.css'
import '@fontsource/noto-sans-jp/japanese-800.css'
import './assets/style.scss'

createApp(App).mount('#app')
requestAnimationFrame(() => {
  SplashScreen.hide().catch(() => {})
})

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
      return
    }

    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => registration.unregister())
    })

    if ('caches' in window) {
      caches.keys().then(keys => {
        keys.forEach(key => caches.delete(key))
      })
    }
  })
}
