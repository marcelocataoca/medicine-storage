/**
 * Busca nome e descrição por código de barras (GTIN/EAN).
 * 1) Open Food Facts — cobertura ampla, poucos medicamentos.
 * 2) GTINHub — fallback para GTINs brasileiros (789/790).
 *
 * A ANVISA não expõe consulta por EAN (apenas portal web / bulário por nome).
 * A OBM (Ministério da Saúde) suporta EAN, mas exige token autenticado.
 */

export type BarcodeProductInfo = {
  name: string;
  description?: string;
};

const OFF_USER_AGENT = 'MedicineStorage/1.0 (React Native; medicine barcode lookup)';

export async function lookupProductByBarcode(code: string): Promise<BarcodeProductInfo | null> {
  const normalized = code.trim();
  if (!normalized) return null;

  return (await lookupOpenFoodFacts(normalized)) ?? (await lookupGtinHub(normalized));
}

async function lookupOpenFoodFacts(code: string): Promise<BarcodeProductInfo | null> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`,
      { headers: { 'User-Agent': OFF_USER_AGENT } },
    );
    if (!response.ok) return null;

    const json = (await response.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        product_name_pt?: string;
        generic_name?: string;
        brands?: string;
        categories?: string;
        ingredients_text?: string;
        ingredients_text_pt?: string;
      };
    };

    if (json.status !== 1 || !json.product) return null;

    const { product } = json;
    const name =
      product.product_name_pt?.trim() ||
      product.product_name?.trim() ||
      product.generic_name?.trim() ||
      '';

    if (!name) return null;

    const description =
      [product.generic_name, product.brands, product.categories]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(' · ') ||
      product.ingredients_text_pt?.trim() ||
      product.ingredients_text?.trim() ||
      undefined;

    return { name, description };
  } catch {
    return null;
  }
}

async function lookupGtinHub(code: string): Promise<BarcodeProductInfo | null> {
  try {
    const response = await fetch(
      `https://gtinhub.com/api/v1/product/${encodeURIComponent(code)}`,
    );
    if (!response.ok) return null;

    const json = (await response.json()) as {
      found?: boolean;
      product?: {
        name?: string;
        brand?: string;
        description?: string;
        category?: string;
      };
    };

    if (!json.found || !json.product) return null;

    const name = json.product.name?.trim();
    if (!name || name.toLowerCase() === 'unknown') return null;

    const descriptionParts = [
      json.product.description?.trim(),
      json.product.brand?.trim(),
      json.product.category?.trim(),
    ].filter((part) => part && part.toLowerCase() !== 'no description found.');

    const description =
      descriptionParts.length > 0 ? [...new Set(descriptionParts)].join(' · ') : undefined;

    return { name, description };
  } catch {
    return null;
  }
}
