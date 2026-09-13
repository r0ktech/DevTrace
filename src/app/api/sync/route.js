import { NextResponse } from 'next/server';
import { getServerSession, getAccessToken } from '@/lib/auth';
import { runSync } from '@/lib/github/sync';
import prisma from '@/lib/db';

export async function POST() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = await getAccessToken(session.user.id);
    if (!accessToken) {
      return NextResponse.json(
        { error: 'GitHub account not connected. Please reconnect.' },
        { status: 400 }
      );
    }

    // Start sync in background — don't await
    runSync(session.user.id, accessToken).catch((error) => {
      console.error('Sync failed:', error);
    });

    // Return immediately with the sync job
    const syncJob = await prisma.syncJob.findFirst({
      where: { userId: session.user.id, status: 'running' },
      orderBy: { startedAt: 'desc' },
    });

    return NextResponse.json({ syncJob });
  } catch (error) {
    console.error('Sync trigger error:', error);
    return NextResponse.json(
      { error: 'Failed to start synchronization.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const syncJob = await prisma.syncJob.findFirst({
      where: { userId: session.user.id },
      orderBy: { startedAt: 'desc' },
    });

    return NextResponse.json({ syncJob });
  } catch (error) {
    console.error('Sync status error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status.' },
      { status: 500 }
    );
  }
}
