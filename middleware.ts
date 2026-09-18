import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Admin: solo admin
  if (pathname.startsWith("/admin")) {
    const authCookie = request.cookies.get("auth-token")
    if (!authCookie) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    try {
      const user = JSON.parse(authCookie.value)
      if (user.role !== "admin") {
        return NextResponse.redirect(new URL("/", request.url))
      }
    } catch {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  // Portal de árbitros: admin o referee_coordinator
  if (pathname.startsWith("/arbitros")) {
    const authCookie = request.cookies.get("auth-token")
    if (!authCookie) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    try {
      const user = JSON.parse(authCookie.value)
      if (user.role !== "admin" && user.role !== "referee_coordinator") {
        return NextResponse.redirect(new URL("/", request.url))
      }
    } catch {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/arbitros/:path*"],
}
