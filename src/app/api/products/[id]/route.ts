import { getSessionAccount } from "@/lib/auth/session";
import { db, setAccountContext } from "@/lib/db";

/**
 * P0 的隔离验收端点。
 * 越权时返回 404 而不是 403：403 会暴露「该资源存在但不属于你」这一信息。
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getSessionAccount();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const product = await setAccountContext(session.accountId, () =>
    db.product.findFirst({ where: { id } }),
  );

  if (!product) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  return Response.json({
    id: product.id,
    modelNo: product.modelNo,
    nameHans: product.nameHans,
    nameHant: product.nameHant,
    isPublic: product.isPublic,
  });
}
