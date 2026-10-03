// Service Worker para Liga Flag Durango
// Cambiar CACHE_NAME borra en "activate" todo lo guardado por versiones anteriores.
const CACHE_NAME = "liga-flag-durango-v3"
const OFFLINE_PAGES_CACHE = "liga-flag-durango-pages-v3"
const STATIC_ASSETS = ["/icons/icon-192x192.png", "/icons/icon-512x512.png"]

// Solo archivos que nunca cambian con la misma URL (Next los publica con hash)
function isImmutableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/imagenes/")
  )
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => Promise.resolve()),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== CACHE_NAME && name !== OFFLINE_PAGES_CACHE)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // API y datos: siempre a la red, nunca se guardan
  if (url.pathname.startsWith("/api/")) return

  // JS/CSS con hash, íconos e imágenes: caché primero
  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
            }
            return response
          }),
      ),
    )
    return
  }

  // Páginas: red primero (siempre la versión nueva); la copia solo se usa sin internet
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(OFFLINE_PAGES_CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match("/"))
            .then((cached) => cached || new Response("Sin conexión", { status: 503 })),
        ),
    )
  }
  // Todo lo demás (RSC de Next, etc.) va directo a la red sin pasar por caché
})

// 🔔 MANEJAR NOTIFICACIONES PUSH
self.addEventListener("push", (event) => {
  console.log("📱 Push event received:", event)

  let notificationData = {
    title: "Liga Flag Durango",
    body: "Nueva notificación",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    data: { url: "/" },
  }

  if (event.data) {
    try {
      notificationData = event.data.json()
      console.log("📄 Notification data:", notificationData)
    } catch (error) {
      console.error("❌ Error parsing notification data:", error)
      notificationData.body = event.data.text()
    }
  }

  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon || "/icons/icon-192x192.png",
    badge: notificationData.badge || "/icons/icon-72x72.png",
    image: notificationData.image,
    data: notificationData.data || { url: "/" },
    actions: notificationData.actions || [
      {
        action: "view",
        title: "Ver",
        icon: "/icons/icon-96x96.png",
      },
      {
        action: "close",
        title: "Cerrar",
      },
    ],
    tag: notificationData.tag || "default",
    requireInteraction: notificationData.requireInteraction || true,
    vibrate: notificationData.vibrate || [200, 100, 200],
    timestamp: Date.now(),
    silent: false,
  }

  console.log("🔔 Showing notification with options:", notificationOptions)

  event.waitUntil(
    self.registration
      .showNotification(notificationData.title, notificationOptions)
      .then(() => {
        console.log("✅ Notification shown successfully")
      })
      .catch((error) => {
        console.error("❌ Error showing notification:", error)
      }),
  )
})

// 👆 MANEJAR CLICKS EN NOTIFICACIONES
self.addEventListener("notificationclick", (event) => {
  console.log("👆 Notification click received:", event)

  event.notification.close()

  const action = event.action
  const data = event.notification.data || {}

  if (action === "close") {
    console.log("🚫 User closed notification")
    return
  }

  const urlToOpen = data.url || "/"
  console.log("🌐 Opening URL:", urlToOpen)

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Si ya hay una ventana abierta con la URL, enfocarla
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && "focus" in client) {
            console.log("🎯 Focusing existing window")
            return client.focus()
          }
        }

        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          console.log("🆕 Opening new window")
          return clients.openWindow(urlToOpen)
        }
      })
      .catch((error) => {
        console.error("❌ Error handling notification click:", error)
      }),
  )
})

// 🚫 MANEJAR CIERRE DE NOTIFICACIONES
self.addEventListener("notificationclose", (event) => {
  console.log("🚫 Notification closed:", event.notification.tag)
})

// 💬 MANEJAR MENSAJES DEL CLIENTE
self.addEventListener("message", (event) => {
  console.log("💬 Message received:", event.data)

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})

// 🔄 BACKGROUND SYNC (para futuras funcionalidades)
self.addEventListener("sync", (event) => {
  console.log("🔄 Background sync:", event.tag)

  if (event.tag === "background-sync") {
    event.waitUntil(
      fetch("/api/sync")
        .then((response) => {
          if (response.ok) {
            console.log("✅ Background sync completed")
          }
        })
        .catch((error) => {
          console.error("❌ Background sync failed:", error)
        }),
    )
  }
})

console.log("🚀 Service Worker loaded and ready!")
