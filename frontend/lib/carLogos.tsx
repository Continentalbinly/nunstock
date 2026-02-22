const CDN_BASE = "https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/thumb";

// Map brand display name → CDN filename (without extension)
const BRAND_LOGO_MAP: Record<string, string> = {
    // Japanese
    "Toyota": "toyota",
    "Honda": "honda",
    "Isuzu": "isuzu",
    "Mitsubishi": "mitsubishi",
    "Mazda": "mazda",
    "Nissan": "nissan",
    "Suzuki": "suzuki",
    "Subaru": "subaru",
    "Daihatsu": "daihatsu",
    "Lexus": "lexus",

    // European
    "BMW": "bmw",
    "Mercedes-Benz": "mercedes-benz",
    "Volvo": "volvo",
    "Audi": "audi",
    "Volkswagen": "volkswagen",
    "Porsche": "porsche",
    "Peugeot": "peugeot",

    // Korean
    "Hyundai": "hyundai",
    "Kia": "kia",

    // American
    "Ford": "ford",
    "Chevrolet": "chevrolet",

    // Chinese / New brands popular in Thailand
    "MG": "mg",
    "BYD": "byd",
    "GWM": "great-wall",
    "Changan": "changan",
    "Chery": "chery",
    "Neta": "neta",
    "ORA": "ora",
};

/**
 * Get the logo URL for a given car brand name.
 * Returns null if the brand is not in the mapping (fallback to icon).
 */
export function getCarLogoUrl(brandName: string): string | null {
    const filename = BRAND_LOGO_MAP[brandName];
    if (!filename) return null;
    return `${CDN_BASE}/${filename}.png`;
}

/**
 * React component helper: renders <img> if logo exists, or returns null for fallback.
 */
export function CarBrandLogo({ name, className, size = 40 }: { name: string; className?: string; size?: number }) {
    const url = getCarLogoUrl(name);
    if (!url) return null;
    return (
        <img
            src={url}
            alt={`${name} logo`}
            width={size}
            height={size}
            className={className}
            style={{ objectFit: "contain" }}
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
    );
}
