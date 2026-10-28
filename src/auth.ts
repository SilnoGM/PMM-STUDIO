import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verify } from "argon2";

import { prismaBase } from "@/lib/db/client";
import { loginSchema } from "@/lib/auth/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) {
          return null;
        }

        // accounts 不在账号作用域内，登录必须能跨账号查询
        const account = await prismaBase.account.findUnique({
          where: { email: parsed.data.email },
        });

        if (!account || account.status !== "active") {
          return null;
        }

        const passwordMatches = await verify(account.passwordHash, parsed.data.password);
        if (!passwordMatches) {
          return null;
        }

        return {
          id: account.id,
          email: account.email,
          name: account.displayName,
          isAdmin: account.isAdmin,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.accountId = user.id;
        token.isAdmin = user.isAdmin ?? false;
      }
      return token;
    },
    session({ session, token }) {
      // token 的扩展字段在运行期可能是 unknown，必须显式收窄
      if (typeof token.accountId === "string" && token.accountId.length > 0) {
        session.user.id = token.accountId;
      }
      session.user.isAdmin = token.isAdmin === true;
      return session;
    },
  },
});
