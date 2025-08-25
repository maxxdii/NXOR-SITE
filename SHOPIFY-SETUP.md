# NXOR Shopify Integration Setup Guide

## Overview
Your NXOR site is now ready to connect to Shopify's backend! This integration uses the Shopify Storefront API to:
- Fetch products dynamically from your Shopify store
- Add items to cart
- Create checkouts and redirect to Shopify's secure checkout

## Setup Steps

### 1. Shopify Store Setup
1. **Create/Access your Shopify store** at `your-store.myshopify.com`
2. **Create products** in your Shopify admin that match your NXOR aesthetic
3. **Add product images** and descriptions

### 2. Generate Storefront Access Token
1. Go to your Shopify Admin
2. Navigate to **Apps** → **App and sales channel settings**
3. Click **Develop apps for your store**
4. Click **Create an app**
5. Name it "NXOR Frontend" or similar
6. Go to **Configuration** → **Storefront API access**
7. Enable the following permissions:
   - `unauthenticated_read_product_listings`
   - `unauthenticated_read_product_inventory` 
   - `unauthenticated_read_checkouts`
   - `unauthenticated_write_checkouts`
8. **Save** and **Install app**
9. Copy the **Storefront access token**

### 3. Configure Your Site
Edit `shopify-config.js` and replace:

```javascript
const SHOPIFY_CONFIG = {
  // Replace with your actual store domain
  domain: 'your-nxor-store.myshopify.com',
  
  // Replace with your Storefront Access Token
  storefrontAccessToken: 'your_actual_token_here',
  
  apiVersion: '2024-07'
};
```

### 4. Update Product Variant IDs
In `index.html`, replace the placeholder variant IDs:
- Find `VARIANT_ID_1`, `VARIANT_ID_2`, etc.
- Replace with actual Shopify variant IDs from your products
- You can find these in Shopify Admin → Products → [Product] → Variants

### 5. Test Your Integration

#### Local Testing:
```bash
python3 -m http.server 8080
```
Then visit `http://localhost:8080`

#### What Should Work:
- ✅ Products load from Shopify (or show fallback)
- ✅ Cart icon shows item count
- ✅ "Add to Cart" creates Shopify checkout
- ✅ "Checkout" redirects to Shopify's secure checkout

## Features Included

### 🛒 **Shopping Cart**
- Local storage persistence
- Real-time cart count badge
- Shopify checkout integration

### 📦 **Product Management**
- Dynamic product loading from Shopify
- Fallback to static products if API fails
- Japanese/English product display

### 💳 **Checkout Flow**
- Creates Shopify checkout sessions
- Redirects to secure Shopify checkout
- Handles multiple items and quantities

### 🎨 **NXOR Aesthetic Maintained**
- All new elements match your brutalist design
- Japanese text with English translations
- Black/white/purple color scheme

## File Structure
```
/
├── index.html              # Main site with Shopify integration
├── style.css              # Updated with cart styling
├── shopify-config.js       # Shopify API configuration
├── shopify-integration.js  # Cart and product functionality
└── README.md              # This setup guide
```

## Deployment Options

### Option 1: Static Hosting (Recommended)
- **Netlify**: Deploy directly from GitHub
- **Vercel**: Connect your repo for auto-deployment  
- **GitHub Pages**: Enable in repo settings

### Option 2: Custom Domain
1. Deploy to your preferred host
2. Configure your domain DNS
3. Update Shopify checkout URLs if needed

## Troubleshooting

### Products Not Loading
- Check Shopify store domain in config
- Verify Storefront Access Token
- Check browser console for API errors

### Cart Not Working
- Ensure variant IDs are correct Shopify IDs
- Check that Storefront API permissions are enabled
- Verify checkout creation in browser network tab

### CORS Errors
- Shopify Storefront API supports CORS
- Ensure you're using HTTPS in production
- Check that access token has correct permissions

## Next Steps
1. **Configure your actual Shopify credentials**
2. **Add your real product variant IDs**
3. **Test the full checkout flow**
4. **Deploy to production**
5. **Add analytics/tracking if needed**

Your NXOR site is now e-commerce ready! 🖤
