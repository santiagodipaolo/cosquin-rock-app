import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcrypt";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "username",
      credentials: {
        username: { label: "Username", type: "text" },
        pin: { label: "PIN", type: "text" },
        isRegistering: { label: "IsRegistering", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.username) {
          return null;
        }

        // Normalizar username a minúsculas para que sea case-insensitive
        const username = (credentials.username as string).trim().toLowerCase();
        const pin = (credentials.pin as string) || "";
        const isRegistering = (credentials.isRegistering as string) === "true";

        // Buscar usuario existente (case-insensitive via lowercase)
        let user = await prisma.user.findUnique({
          where: { username },
        });

        if (!user) {
          // Crear nuevo usuario - requiere PIN de 4 dígitos
          if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            throw new Error("PIN_REQUIRED");
          }

          const hashedPin = await bcrypt.hash(pin, 10);
          const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
          user = await prisma.user.create({
            data: {
              username,
              pin: hashedPin,
              avatar: randomColor,
            },
          });
        } else {
          // Usuario existente - verificar PIN
          if (!user.pin) {
            // Usuario viejo sin PIN - pedirle que setee uno
            if (isRegistering && pin && pin.length === 4 && /^\d{4}$/.test(pin)) {
              const hashedPin = await bcrypt.hash(pin, 10);
              user = await prisma.user.update({
                where: { id: user.id },
                data: { pin: hashedPin },
              });
            } else {
              throw new Error("PIN_SETUP_REQUIRED");
            }
          } else {
            // Verificar PIN
            if (!pin) {
              throw new Error("PIN_NEEDED");
            }
            const valid = await bcrypt.compare(pin, user.pin);
            if (!valid) {
              throw new Error("INVALID_PIN");
            }
          }
        }

        return {
          id: user.id,
          name: user.username,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
