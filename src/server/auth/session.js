import { cache } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import prisma from "../db.js";
import { authOptions } from "./options.js";

/**
 * The signed-in user for this request, or null. The user id always comes
 * from the server-side session, never from client input.
 */
export const getCurrentUser = cache(async () => {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      isDemo: true,
      createdAt: true,
      connectedAccounts: { where: { provider: "github" }, take: 1 },
    },
  });
});

/** For server components: redirect to the landing page when signed out. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return { ...user, github: user.connectedAccounts[0] || null };
}
