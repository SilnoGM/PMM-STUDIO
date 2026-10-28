import { db, setAccountContext } from "@/lib/db";

export interface SearchResults {
  products: Array<{
    id: string;
    nameHans: string;
    nameHant: string;
    modelNo: string;
    isPublic: boolean;
  }>;
  materials: Array<{
    id: string;
    titleHans: string;
    titleHant: string;
    slug: string;
    isPublic: boolean;
  }>;
}

const MAX_QUERY_LENGTH = 60;
const LIMIT = 30;

/**
 * 全局搜索：产品与资料一起搜。
 *
 * 只搜简繁标题与型号/slug，不搜正文——2 个账号的数据量下 ILIKE 足够，
 * 引入全文索引属于过度设计（见 docs/技术选型方案.md §3 的「刻意不引入」）。
 * 简繁两种写法都要能命中：客户用繁体搜、自己用简体搜都该有结果。
 */
export async function searchAll(accountId: string, rawQuery: string): Promise<SearchResults> {
  const keyword = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);

  if (!keyword) {
    return { products: [], materials: [] };
  }

  const contains = { contains: keyword, mode: "insensitive" as const };

  return setAccountContext(accountId, async () => {
    const [products, materials] = await Promise.all([
      db.product.findMany({
        where: {
          OR: [{ nameHans: contains }, { nameHant: contains }, { modelNo: contains }],
        },
        orderBy: { updatedAt: "desc" },
        take: LIMIT,
        select: { id: true, nameHans: true, nameHant: true, modelNo: true, isPublic: true },
      }),
      db.material.findMany({
        where: {
          OR: [{ titleHans: contains }, { titleHant: contains }, { slug: contains }],
        },
        orderBy: { updatedAt: "desc" },
        take: LIMIT,
        select: { id: true, titleHans: true, titleHant: true, slug: true, isPublic: true },
      }),
    ]);

    return { products, materials };
  });
}
