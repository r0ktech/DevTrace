import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET(request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const language = searchParams.get('language') || '';
    const visibility = searchParams.get('visibility') || '';
    const archived = searchParams.get('archived');
    const fork = searchParams.get('fork');
    const sort = searchParams.get('sort') || 'pushedAt';
    const order = searchParams.get('order') || 'desc';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const where = { userId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (language) {
      where.language = language;
    }
    if (visibility) {
      where.visibility = visibility;
    }
    if (archived === 'true') where.isArchived = true;
    if (archived === 'false') where.isArchived = false;
    if (fork === 'true') where.isFork = true;
    if (fork === 'false') where.isFork = false;

    const [repositories, total] = await Promise.all([
      prisma.repository.findMany({
        where,
        orderBy: { [sort]: order },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              commits: true,
              pullRequests: true,
              issues: true,
            },
          },
        },
      }),
      prisma.repository.count({ where }),
    ]);

    // Get distinct languages for filter options
    const languages = await prisma.repository.findMany({
      where: { userId, language: { not: null } },
      distinct: ['language'],
      select: { language: true },
      orderBy: { language: 'asc' },
    });

    return NextResponse.json({
      repositories,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      languages: languages.map((l) => l.language).filter(Boolean),
    });
  } catch (error) {
    console.error('Repositories API error:', error);
    return NextResponse.json(
      { error: 'Failed to load repositories.' },
      { status: 500 }
    );
  }
}
