import { NextRequest, NextResponse } from 'next/server'

const publicRoutes = ['/', '/login', '/register','/forget-password', '/reset-password']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublic = publicRoutes.includes(pathname)
  const token = request.cookies.get('access_token')?.value

  let isAuthenticated = false
  let deleteToken = false

  if (token) {
    try {
      const res = await fetch('http://localhost:8000/api/auth/me', {
        method: 'GET',
        headers: {
          Cookie: request.headers.get('cookie') || '',
        },
      })

      if (res.ok) {
        isAuthenticated = true
      }

      // ❌ expired OR invalid OR fake token
      if (res.status === 401 || res.status === 403) {
        deleteToken = true
      }
    } catch (err) {
      deleteToken = true
    }
  }

  // ❌ REMOVE BAD TOKEN (expired or fake)
  if (deleteToken) {
    const res = NextResponse.redirect(new URL('/login', request.url))

    res.cookies.set('access_token', '', {
      expires: new Date(0),
      path: '/',
    })

    return res
  }

  // 🔒 protected route
  if (!isPublic && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 🚫 logged in user can't access login/register
  if (isPublic && isAuthenticated) {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 