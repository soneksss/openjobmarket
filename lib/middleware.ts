import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req });

  const protectedRoutes = [
    "/dashboard",
    "/messages",
    "/applications",
    "/profile",
    "/company/profile",
    "/admin"
  ];

  const pathname = req.nextUrl.pathname;

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtected) return res;

  try {
    const supabase = createMiddlewareClient({
      req,
      res,
    });

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const url = req.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }

    return res;
  } catch (err) {
    console.error("MIDDLEWARE ERROR:", err);
    return res; // fail open
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/messages/:path*",
    "/applications/:path*",
    "/profile/:path*",
    "/company/profile/:path*",
    "/admin/:path*",
  ],
};
