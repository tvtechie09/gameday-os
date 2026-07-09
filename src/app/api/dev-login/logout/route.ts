import { NextResponse, type NextRequest } from "next/server";
import { impersonatorCookieName, sessionCookieName } from "@/lib/access/session-cookie";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/dev-login", request.url));
  response.cookies.delete(sessionCookieName);
  response.cookies.delete(impersonatorCookieName);
  return response;
}
