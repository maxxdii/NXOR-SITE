// Shopify Storefront API Configuration
// Replace these with your actual Shopify store credentials

export const SHOPIFY_CONFIG = {
  // Your Shopify store domain (e.g., 'your-store.myshopify.com')
  domain: 'xxmdnxx.myshopify.com',
  
  // Your Shopify Storefront Access Token
  // Use your actual token below
  storefrontAccessToken: '055c416dfc0c03e343a6a156121b9127',
  
  // API Version
  apiVersion: '2024-07'
};

// Shopify Storefront API Client
export class ShopifyClient {
  constructor(config) {
    this.domain = config.domain;
    this.accessToken = config.storefrontAccessToken;
    this.apiVersion = config.apiVersion;
    this.endpoint = `https://${this.domain}/api/${this.apiVersion}/graphql.json`;
  }

  async query(query, variables = {}) {
    console.log('🚀 Making Shopify API call to:', this.endpoint);
    console.log('🔑 Using token:', this.accessToken.substring(0, 8) + '...');
    
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': this.accessToken,
        },
        body: JSON.stringify({ query, variables }),
      });

      console.log('📡 API Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📋 API Response data:', data);
      
      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      return data.data;
    } catch (error) {
      console.error('🔥 Shopify API Error:', error);
      throw error;
    }
  }

  // Fetch all products
  async getProducts(first = 20) {
    const query = `
      query getProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
              description
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 1) {
                edges {
                  node {
                    originalSrc
                    altText
                  }
                }
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    availableForSale
                    selectedOptions {
                      name
                      value
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    return this.query(query, { first });
  }

  // Create cart (updated API)
  async createCart(lineItems = []) {
    const query = `
      mutation cartCreate($input: CartInput!) {
        cartCreate(input: $input) {
          cart {
            id
            checkoutUrl
            totalQuantity
            cost {
              totalAmount {
                amount
                currencyCode
              }
            }
            lines(first: 10) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      product {
                        title
                      }
                    }
                  }
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    return this.query(query, { input: { lines: lineItems } });
  }

  // Add items to cart (updated API)
  async addToCart(cartId, lineItems) {
    const query = `
      mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
        cartLinesAdd(cartId: $cartId, lines: $lines) {
          cart {
            id
            checkoutUrl
            totalQuantity
            cost {
              totalAmount {
                amount
                currencyCode
              }
            }
            lines(first: 10) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      product {
                        title
                      }
                    }
                  }
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    return this.query(query, { cartId, lines: lineItems });
  }
}

// Initialize and export Shopify client
const shopify = new ShopifyClient(SHOPIFY_CONFIG);
export { shopify };

// Also expose globally for backward compatibility
window.shopify = shopify;
