import { NextResponse } from 'next/server'

export function middleware(request) {
  const url = request.nextUrl.clone()
  
  // Remove /pages/ from URL if present
  if (url.pathname.startsWith('/pages/')) {
    url.pathname = url.pathname.replace('/pages/', '/')
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/:path*'
}
