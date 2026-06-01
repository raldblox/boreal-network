import {
  findJsonSchemaAsset,
  readDiscoveryAsset,
} from "@/lib/agent-discovery";

export async function GET(
  _request: Request,
  context: { params: Promise<{ schema: string }> }
) {
  const { schema } = await context.params;
  const asset = findJsonSchemaAsset(schema);

  if (!asset) {
    return Response.json({ error: "JSON Schema not found" }, { status: 404 });
  }

  return new Response(await readDiscoveryAsset(asset), {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=3600",
      "content-type": asset.contentType,
    },
  });
}
