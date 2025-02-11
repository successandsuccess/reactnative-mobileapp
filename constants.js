const STRIPE_PUB_KEYS = {
}

// one of: dev, stg, prd
export const ENV = 'dev';
export const API_BASE_URL = 'https://wwww';
export const STRIPE_PUB_KEY = STRIPE_PUB_KEYS[ENV];

export const BUSINESS_CATEGORIES = [
    "Restaurant",
    "Fitness",
    "Health & Beauty",
    "Retail",
]
