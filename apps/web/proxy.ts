import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { guestRegex, isDevelopmentEnvironment } from "./lib/constants";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const mode = request.nextUrl.searchParams.get("mode");
  const isPublicHomeView = pathname === "/" && !mode;
  const isPublicRequestBoardView = pathname === "/open-requests";
  const isPublicDesktopView =
    pathname === "/download/boreal-desktop" || pathname === "/download/desktop";
  const isPublicAuthView = pathname === "/login" || pathname === "/register";

  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  if (pathname.startsWith("/matching-lab")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/matching-lab")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/requests")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/commitments")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/fulfillments")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/supplies")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/document")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  if (
    !token &&
    (isPublicHomeView ||
      isPublicRequestBoardView ||
      isPublicDesktopView ||
      isPublicAuthView)
  ) {
    return NextResponse.next();
  }

  if (!token) {
    const redirectTarget = new URL(request.url);
    const redirectUrl = encodeURIComponent(
      `${redirectTarget.pathname}${redirectTarget.search}`,
    );

    return NextResponse.redirect(
      new URL(`${base}/api/auth/guest?redirectUrl=${redirectUrl}`, request.url)
    );
  }

  const isGuest = guestRegex.test(token?.email ?? "");

  if (token && !isGuest && isPublicAuthView) {
    return NextResponse.redirect(new URL(`${base}/`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/chat/:id",
    "/api/:path*",
    "/login",
    "/register",

    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
