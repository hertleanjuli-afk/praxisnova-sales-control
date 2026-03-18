import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

const users = [
  {
    id: '1',
    email: process.env.USER_1_EMAIL!,
    password: process.env.USER_1_PASSWORD!,
    name: 'Anjuli Hertle',
  },
  {
    id: '2',
    email: process.env.USER_2_EMAIL!,
    password: process.env.USER_2_PASSWORD!,
    name: 'Samantha Meyer',
  },
];

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = users.find((u) => u.email === credentials.email);
        if (!user) return null;

        const isHashed = user.password.startsWith('$2');
        const isValid = isHashed
          ? await bcrypt.compare(credentials.password, user.password)
          : credentials.password === user.password;

        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
};
