import { createApp } from 'vue'
import App from './App.vue'
import './assets/style.scss'

createApp(App).mount('#app')

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
