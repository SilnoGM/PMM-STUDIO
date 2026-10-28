import { db, prismaBase, setAccountContext } from "@/lib/db";

export interface PublicAccount {
  id: string;
  slug: string;
  displayName: string;
}

/**
 * 公开页的账号解析。
 * accounts 表不在账号作用域内，这里按 slug 直查，status 必须是 active。
 */
export async function getPublicAccount(slug: string): Promise<PublicAccount | null> {
  const account = await prismaBase.account.findUnique({
    where: { slug },
    select: { id: true, slug: true, displayName: true, status: true },
  });

  if (!account || account.status !== "active") {
    return null;
  }

  return { id: account.id, slug: account.slug, displayName: account.displayName };
}

/**
 * 公开页查询统一入口：先按 accountId 作用域，再强制 isPublic。
 * 两层条件缺一不可——作用域防跨账号，isPublic 防未发布内容外泄。
 */
function scoped(accountId: string) {
  return {
    products: () =>
      setAccountContext(accountId, () =>
        db.product.findMany({
          where: { isPublic: true },
          orderBy: [{ sort: "asc" }, { createdAt: "desc" }],
          include: {
            category: { select: { nameHant: true, sort: true } },
            media: {
              where: { isPublic: true },
              orderBy: { sort: "asc" },
              select: {
                id: true,
                kind: true,
                storageKey: true,
                posterKey: true,
                externalId: true,
                variants: true,
                width: true,
                height: true,
              },
            },
          },
        }),
      ),

    product: (modelNo: string) =>
      setAccountContext(accountId, () =>
        db.product.findFirst({
          where: { modelNo, isPublic: true },
          include: {
            category: { select: { nameHant: true } },
            media: {
              where: { isPublic: true },
              orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
              select: {
                id: true,
                kind: true,
                storageKey: true,
                posterKey: true,
                provider: true,
                externalId: true,
                durationSec: true,
                variants: true,
                width: true,
                height: true,
              },
            },
            materials: {
              where: { isPublic: true },
              orderBy: { createdAt: "desc" },
              select: { slug: true, titleHant: true },
            },
          },
        }),
      ),

    materials: () =>
      setAccountContext(accountId, () =>
        db.material.findMany({
          where: { isPublic: true },
          orderBy: { createdAt: "desc" },
          select: { slug: true, titleHant: true, product: { select: { nameHant: true, modelNo: true } } },
        }),
      ),

    material: (slug: string) =>
      setAccountContext(accountId, () =>
        db.material.findFirst({
          where: { slug, isPublic: true },
          include: { product: { select: { nameHant: true, modelNo: true } } },
        }),
      ),

    specFields: () =>
      setAccountContext(accountId, () =>
        db.specField.findMany({ orderBy: [{ sort: "asc" }, { key: "asc" }] }),
      ),
  };
}

export type PublicQueries = ReturnType<typeof scoped>;

export function publicQueries(accountId: string): PublicQueries {
  return scoped(accountId);
}
