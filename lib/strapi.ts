import type { StrapiProduct, StrapiCategory } from "./types";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || "";

// ─── Generic fetch helper ────────────────────────────────────
async function fetchStrapi<T>(
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(path, STRAPI_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) =>
      url.searchParams.set(key, value)
    );
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${STRAPI_TOKEN}`,
    },
    next: { revalidate: 60 }, // ISR: revalidate every 60 seconds
  });

  if (!res.ok) {
    throw new Error(`Strapi fetch failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// ─── Products ────────────────────────────────────────────────

type StrapiListResponse<T> = {
  data: T[];
  meta: {
    pagination: { page: number; pageSize: number; pageCount: number; total: number };
  };
};

type StrapiSingleResponse<T> = {
  data: T;
};

/**
 * Fetch all products with fields needed for the grid card.
 * Populates category, mainImage, and keyBenefits.
 */
export async function getProducts(): Promise<StrapiProduct[]> {
  const response = await fetchStrapi<StrapiListResponse<StrapiProduct>>(
    "/api/products",
    {
      "populate[category]": "true",
      "populate[mainImage]": "true",
      "populate[keyBenefits]": "true",
      "sort": "productName:asc",
      "pagination[pageSize]": "100",
    }
  );
  return response.data;
}

/**
 * Fetch a single product by slug with ALL components populated.
 */
export async function getProductBySlug(
  slug: string
): Promise<StrapiProduct | null> {
  const response = await fetchStrapi<StrapiListResponse<StrapiProduct>>(
    "/api/products",
    {
      "filters[slug][$eq]": slug,
      // Deep populate all components
      "populate[category]": "true",
      "populate[mainImage]": "true",
      "populate[galleryImages]": "true",
      "populate[keyBenefits]": "true",
      "populate[ayurvedicProfile]": "true",
      "populate[usageInfo]": "true",
      "populate[benefitsTable]": "true",
      "populate[usageTable]": "true",
      "populate[faqs]": "true",
      "populate[productComparison]": "true",
      "populate[seo]": "true",
      "populate[relatedProducts][populate][0]": "mainImage",
      "populate[relatedProducts][populate][1]": "category",
      "populate[relatedProducts][populate][2]": "keyBenefits",
    }
  );

  return response.data[0] ?? null;
}

/**
 * Get all product slugs for static generation.
 */
export async function getAllProductSlugs(): Promise<string[]> {
  const response = await fetchStrapi<StrapiListResponse<{ slug: string }>>(
    "/api/products",
    {
      "fields[0]": "slug",
      "pagination[pageSize]": "100",
    }
  );
  return response.data.map((p) => p.slug);
}

// ─── Categories ──────────────────────────────────────────────

export async function getCategories(): Promise<StrapiCategory[]> {
  const response = await fetchStrapi<StrapiListResponse<StrapiCategory>>(
    "/api/categories",
    {
      "populate": "*",
      "sort": "name:asc",
    }
  );
  return response.data;
}

// ─── Image URL helper ────────────────────────────────────────

const PLACEHOLDER_IMAGE = "/products/placeholder.svg";

export function getStrapiImageUrl(
  image: { url: string } | null | undefined
): string {
  if (!image?.url) return PLACEHOLDER_IMAGE;
  // If the URL is already absolute, return as-is
  if (image.url.startsWith("http")) return image.url;
  // Otherwise prepend the Strapi base URL
  return `${STRAPI_URL}${image.url}`;
}
