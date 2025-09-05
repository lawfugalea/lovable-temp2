export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/finances", "/shopping", "/dashboard", "/settings", "/household"],
};
