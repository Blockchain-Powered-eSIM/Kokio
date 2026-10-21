import appBootstrap from "@/utils/appBootstrap";
import { REGION_CONFIG } from "@/constants/general.constants";

export function regionImageForCode(code: string | null | undefined) {
  if (!code) return null;
  return REGION_CONFIG[code]?.imagePath ?? null;
}

// Purchased eSIMs only snapshot the region's display name (e.g. "Europe"),
// not its code — resolve it back via the bootstrap region list so the same
// REGION_CONFIG illustration used while browsing can be reused here.
export function regionCodeFromName(name: string | null | undefined): string | null {
  if (!name) return null;
  const regions = appBootstrap.getRegionConfig;
  if (!regions) return null;
  const match = Object.values(regions).find((r) => r.name === name);
  return match?.code ?? null;
}
