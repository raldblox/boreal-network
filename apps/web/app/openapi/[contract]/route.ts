import {
  findOpenApiAsset,
  readDiscoveryAsset,
} from "@/lib/agent-discovery";

export async function GET(
  _request: Request,
  context: { params: Promise<{ contract: string }> }
) {
  const { contract } = await context.params;
  const asset = findOpenApiAsset(contract);

  if (!asset) {
    return Response.json(
      { error: "OpenAPI contract not found" },
      { status: 404 }
    );
  }

  return new Response(await readDiscoveryAsset(asset), {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=3600",
      "content-type": asset.contentType,
    },
  });
}
