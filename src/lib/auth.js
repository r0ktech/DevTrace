import NextAuth from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
import { PrismaAdapter } from '@auth/prisma-adapter';
import prisma from '@/lib/db';

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'read:user user:email repo read:org',
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async signIn({ account, profile }) {
      // Store the GitHub profile after sign-in
      if (account?.provider === 'github' && profile) {
        try {
          const user = await prisma.user.findFirst({
            where: {
              accounts: {
                some: {
                  provider: 'github',
                  providerAccountId: String(profile.id),
                },
              },
            },
          });

          if (user) {
            await prisma.gitHubProfile.upsert({
              where: { userId: user.id },
              create: {
                userId: user.id,
                githubId: profile.id,
                login: profile.login,
                avatarUrl: profile.avatar_url,
                bio: profile.bio || null,
                company: profile.company || null,
                location: profile.location || null,
                blog: profile.blog || null,
                publicRepos: profile.public_repos || 0,
                followers: profile.followers || 0,
                following: profile.following || 0,
              },
              update: {
                login: profile.login,
                avatarUrl: profile.avatar_url,
                bio: profile.bio || null,
                company: profile.company || null,
                location: profile.location || null,
                blog: profile.blog || null,
                publicRepos: profile.public_repos || 0,
                followers: profile.followers || 0,
                following: profile.following || 0,
              },
            });
          }
        } catch (error) {
          console.error('Failed to upsert GitHub profile on sign-in:', error);
        }
      }
      return true;
    },
  },
  pages: {
    signIn: '/',
    error: '/auth/error',
  },
  session: {
    strategy: 'database',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);

/**
 * Get the current user's session server-side.
 * @returns {Promise<{user: {id: string, name: string, email: string, image: string}} | null>}
 */
export async function getServerSession() {
  const { getServerSession: getSession } = await import('next-auth');
  return getSession(authOptions);
}

/**
 * Get the GitHub access token for a user.
 * Never expose this to the client.
 * @param {string} userId
 * @returns {Promise<string | null>}
 */
export async function getAccessToken(userId) {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: 'github',
    },
    select: {
      access_token: true,
    },
  });
  return account?.access_token || null;
}
