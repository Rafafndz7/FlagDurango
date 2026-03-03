import webpush from "web-push"

// Configure VAPID keys (PARA LA WEB)
const vapidKeys = {
  publicKey:
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    "BEl62iUYgUivxIkv69yViEuiBIa40HI80NM9f53NlqKOYWsSBhjuXPiQfzuVAl9Hs4HcKSVdJiKz0g5JwQw5Y8g",
  privateKey: process.env.VAPID_PRIVATE_KEY || "your-private-key-here",
}

webpush.setVapidDetails("mailto:admin@ligaflagdurango.com", vapidKeys.publicKey, vapidKeys.privateKey)

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  data?: any
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
  tag?: string
  requireInteraction?: boolean
}

export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

// 1. FUNCIÓN PARA ENVIAR A LA WEB (Navegadores)
export async function sendNotification(subscription: PushSubscription, payload: NotificationPayload): Promise<boolean> {
  try {
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icons/icon-192x192.png",
      badge: payload.badge || "/icons/icon-72x72.png",
      image: payload.image,
      data: payload.data || {},
      actions: payload.actions || [],
      tag: payload.tag,
      requireInteraction: payload.requireInteraction || false,
      vibrate: [200, 100, 200],
      timestamp: Date.now(),
    })

    await webpush.sendNotification(subscription, notificationPayload)
    return true
  } catch (error) {
    console.error("Error sending web notification:", error)
    return false
  }
}

// 2. NUEVA FUNCIÓN PARA ENVIAR A LA APP MÓVIL (Expo iOS/Android)
export async function sendExpoNotification(expoPushToken: string, payload: NotificationPayload): Promise<boolean> {
  // Los tokens de Expo siempre empiezan con "ExponentPushToken"
  if (!expoPushToken || typeof expoPushToken !== 'string' || !expoPushToken.includes('ExponentPushToken')) {
    console.error("Token de Expo inválido:", expoPushToken);
    return false;
  }

  const message = {
    to: expoPushToken,
    sound: 'default',
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    return true;
  } catch (error) {
    console.error("Error sending Expo notification:", error);
    return false;
  }
}

// 3. GENERADOR DE MENSAJES (Sirve para ambos)
export function createGameNotification(gameData: {
  homeTeam: string
  awayTeam: string
  homeScore?: number
  awayScore?: number
  status: string
  gameId: number
}): NotificationPayload {
  let title = ""
  let body = ""

  if (gameData.status === "en_vivo" || gameData.status === "en vivo") {
    title = "🔴 Partido EN VIVO"
    body = `${gameData.homeTeam} ${gameData.homeScore || 0} - ${gameData.awayScore || 0} ${gameData.awayTeam}`
  } else if (gameData.status === "finalizado") {
    title = "🏆 Partido Finalizado"
    body = `${gameData.homeTeam} ${gameData.homeScore || 0} - ${gameData.awayScore || 0} ${gameData.awayTeam}`
  } else {
    title = "📅 Próximo Partido"
    body = `${gameData.homeTeam} vs ${gameData.awayTeam}`
  }

  return {
    title,
    body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    data: {
      url: "/partidos",
      gameId: gameData.gameId,
      type: "game-update",
    },
    actions: [
      {
        action: "view",
        title: "Ver partido",
        icon: "/icons/icon-96x96.png",
      },
    ],
    tag: `game-${gameData.gameId}`,
    requireInteraction: gameData.status === "en_vivo" || gameData.status === "en vivo",
  }
}