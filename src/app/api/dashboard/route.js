import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { cached } from '@/lib/redis';
import {
  getDashboardMetrics,
  getActivityHeatmap,
  getActivityOverTime,
  getTopRepositories,
} from '@/lib/analytics/metrics';

export async function GET(request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const heatmapMonths = parseInt(searchParams.get('heatmapMonths') || '12', 10);
    const activityDays = parseInt(searchParams.get('activityDays') || '30', 10);

    const data = await cached(
      `devtrace:${userId}:dashboard:${heatmapMonths}:${activityDays}`,
      async () => {
        const [metrics, heatmap, activity, topRepos] = await Promise.all([
          getDashboardMetrics(userId),
          getActivityHeatmap(userId, heatmapMonths),
          getActivityOverTime(userId, activityDays <= 14 ? 'day' : 'week', activityDays),
          getTopRepositories(userId, 5),
        ]);

        return { ...metrics, heatmap, activity, topRepos };
      },
      300 // 5 min cache
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard data.' },
      { status: 500 }
    );
  }
}
