/* eslint-disable no-undef */
// Firebase Cloud Messaging Service Worker (Web Push)
// Uses compat builds because service workers run outside the normal bundler.

importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js")

firebase.initializeApp({
  apiKey: "AIzaSyDDngEE_H_9uMpXGPHZG6qRERT9aDeifWk",
  authDomain: "nuerolearn.firebaseapp.com",
  projectId: "nuerolearn",
  storageBucket: "nuerolearn.firebasestorage.app",
  messagingSenderId: "597132645812",
  appId: "1:597132645812:web:ecd1e6dea42a6c91b90ee1",
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const title = (payload && payload.notification && payload.notification.title) || "NeuroLearn"
  const options = {
    body: (payload && payload.notification && payload.notification.body) || "",
    data: payload && payload.data ? payload.data : {},
  }
  self.registration.showNotification(title, options)
})
