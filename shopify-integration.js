// NXOR Site - Shopify Integration
// Main functionality for connecting static site to Shopify backend

import { shopify } from './shopify-config.js';

// Cart management
export class Cart {
  constructor() {
    this.items = this.loadCart();
    this.cartId = localStorage.getItem('nxor_cart_id');
    this.updateCartUI();
  }

  loadCart() {
    const saved = localStorage.getItem('nxor_cart');
    return saved ? JSON.parse(saved) : [];
  }

  saveCart() {
    localStorage.setItem('nxor_cart', JSON.stringify(this.items));
    this.updateCartUI();
  }

  async addItem(variantId, quantity = 1) {
    // Add to local cart
    const existingItem = this.items.find(item => item.variantId === variantId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this.items.push({ variantId, quantity });
    }

    this.saveCart();
    
    // Update UI immediately
    this.updateCartUI();

    // Add to Shopify cart
    try {
      if (!this.cartId) {
        await this.createCart();
      }

      const lines = [{ merchandiseId: variantId, quantity }];
      await shopify.addToCart(this.cartId, lines);
      
      this.showCartNotification('アイテムがカートに追加されました');
    } catch (error) {
      console.error('Error adding to cart:', error);
      this.showCartNotification('エラーが発生しました', 'error');
    }
  }

  async createCart() {
    try {
      const lines = this.items.map(item => ({
        merchandiseId: item.variantId,
        quantity: item.quantity
      }));

      const result = await shopify.createCart(lines);
      
      if (result.cartCreate.cart) {
        this.cartId = result.cartCreate.cart.id;
        localStorage.setItem('nxor_cart_id', this.cartId);
      }
    } catch (error) {
      console.error('Error creating cart:', error);
    }
  }

  async updateCartUI() {
    let cartCount = 0;
    
    // Try to get cart count from Shopify cart
    try {
      const cartId = localStorage.getItem('nxor_cart_id');
      if (cartId) {
        const query = `
          query getCart($id: ID!) {
            cart(id: $id) {
              totalQuantity
            }
          }
        `;
        const response = await shopify.query(query, { id: cartId });
        if (response && response.cart) {
          cartCount = response.cart.totalQuantity || 0;
        }
      }
    } catch (error) {
      console.log('Could not fetch cart count from Shopify, using local count');
      // Fallback to local cart count
      cartCount = this.items.reduce((total, item) => total + item.quantity, 0);
    }
    
    // Update header cart icon with count - ALWAYS show the count
    const cartLink = document.querySelector('.cart-link');
    if (cartLink) {
      let countElement = cartLink.querySelector('.cart-count');
      
      // Always ensure count element exists
      if (!countElement) {
        countElement = document.createElement('span');
        countElement.className = 'cart-count';
        cartLink.appendChild(countElement);
      }
      
      // Always update the count, even when 0
      const oldCount = parseInt(countElement.textContent) || 0;
      countElement.textContent = cartCount;
      countElement.style.display = 'flex'; // ensure it's visible
      
      // Add visual feedback when count changes
      if (cartCount !== oldCount) {
        countElement.classList.add('updating');
        setTimeout(() => {
          countElement.classList.remove('updating');
        }, 300);
      }
      
      // Adjust styling based on count
      if (cartCount > 0) {
        countElement.style.background = '#7877c6';
        countElement.style.opacity = '1';
      } else {
        countElement.style.background = 'rgba(120, 119, 198, 0.5)';
        countElement.style.opacity = '0.7';
      }
    }

    // Update floating cart icon
    const floatingCart = document.querySelector('.floating-cart');
    if (floatingCart) {
      let floatingCountElement = floatingCart.querySelector('.floating-cart-count');
      
      if (!floatingCountElement) {
        floatingCountElement = document.createElement('span');
        floatingCountElement.className = 'floating-cart-count';
        floatingCart.appendChild(floatingCountElement);
      }
      
      // Update floating cart count
      const oldFloatingCount = parseInt(floatingCountElement.textContent) || 0;
      floatingCountElement.textContent = cartCount;
      
      // Add animation when count changes
      if (cartCount !== oldFloatingCount) {
        floatingCountElement.classList.add('updating');
        setTimeout(() => {
          floatingCountElement.classList.remove('updating');
        }, 400);
      }
      
      // Show/hide floating cart based on preference - always show but adjust opacity
      if (cartCount > 0) {
        floatingCart.style.opacity = '1';
        floatingCart.style.transform = 'scale(1)';
      } else {
        floatingCart.style.opacity = '0.8';
        floatingCart.style.transform = 'scale(0.9)';
      }
    }

    // Update cart page
    this.updateCartPage();
  }

  async updateCartPage() {
    const cartContent = document.querySelector('.cart-content');
    if (!cartContent) return;
    
    // Skip if we're on the dedicated cart page (cart.html)
    if (window.location.pathname.includes('cart.html')) {
      console.log('Skipping cart update - on dedicated cart page');
      return;
    }

    if (this.items.length === 0) {
      cartContent.innerHTML = `
        <div class="empty-cart">
          <div class="empty-cart-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="m1 1 4 4 0 9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6H7"></path>
            </svg>
          </div>
          <p translate="no">カートは空です</p>
          <div class="translation" aria-hidden="true">Your cart is empty</div>
          <a href="#shop" class="continue-shopping" translate="no">ショッピングを続ける</a>
          <div class="translation" aria-hidden="true">Continue Shopping</div>
        </div>
      `;
    } else {
      // Fetch real product details for cart items
      try {
        const cartItemsHtml = await this.getCartItemsWithProductData();
        cartContent.innerHTML = `
          <div class="cart-items">
            <h3>カート内のアイテム</h3>
            <div class="translation">Items in Cart</div>
            ${cartItemsHtml}
            <button onclick="cart.proceedToCheckout()" class="checkout-btn">
              チェックアウト
              <div class="translation">Proceed to Checkout</div>
            </button>
          </div>
        `;
      } catch (error) {
        console.error('Error loading cart items:', error);
        // Fallback to basic display
        cartContent.innerHTML = `
          <div class="cart-items">
            <h3>カート内のアイテム</h3>
            <div class="translation">Items in Cart</div>
            ${this.items.map(item => `
              <div class="cart-item" data-variant-id="${item.variantId}">
                <span>商品読み込み中...</span>
                <span>数量: ${item.quantity}</span>
              </div>
            `).join('')}
            <button onclick="cart.proceedToCheckout()" class="checkout-btn">
              チェックアウト
              <div class="translation">Proceed to Checkout</div>
            </button>
          </div>
        `;
      }
    }
  }

  async getCartItemsWithProductData() {
    // Fetch real product data from Shopify for cart items
    const cartId = localStorage.getItem('nxor_cart_id');
    if (!cartId) return '';

    try {
      const query = `
        query getCart($id: ID!) {
          cart(id: $id) {
            lines(first: 50) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      price {
                        amount
                        currencyCode
                      }
                      product {
                        title
                        handle
                        images(first: 1) {
                          edges {
                            node {
                              originalSrc
                              altText
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await shopify.query(query, { id: cartId });
      if (!response.cart || !response.cart.lines.edges.length) {
        return '<p>カートが空です</p>';
      }

      return response.cart.lines.edges.map(edge => {
        const line = edge.node;
        const product = line.merchandise.product;
        const variant = line.merchandise;
        const imageUrl = product.images.edges.length > 0 
          ? product.images.edges[0].node.originalSrc 
          : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzIyMiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmb250LWZhbWlseT0iQXJpYWwiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5OWE9SPC90ZXh0Pjwvc3ZnPg==';
        
        const price = parseFloat(variant.price.amount);
        const totalPrice = price * line.quantity;

        return `
          <div class="cart-item" data-variant-id="${variant.id}">
            <div class="cart-item-image">
              <img src="${imageUrl}" alt="${product.title}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">
            </div>
            <div class="cart-item-details">
              <div class="cart-item-title">${product.title}</div>
              <div class="cart-item-variant">${variant.title !== 'Default Title' ? variant.title : ''}</div>
              <div class="cart-item-price">$${price.toFixed(2)} × ${line.quantity} = $${totalPrice.toFixed(2)}</div>
            </div>
          </div>
        `;
      }).join('');

    } catch (error) {
      console.error('Error fetching cart product data:', error);
      return this.items.map(item => `
        <div class="cart-item" data-variant-id="${item.variantId}">
          <span>商品読み込みエラー</span>
          <span>数量: ${item.quantity}</span>
        </div>
      `).join('');
    }
  }

  async proceedToCheckout() {
    try {
      // 1) Ensure Shopify cart exists
      if (!this.cartId) {
        await this.createCart();
      }

      // 2) Compute delta between local items and Shopify cart, then add only needed quantities
      const localDesired = (this.items || []).reduce((acc, i) => {
        acc[i.variantId] = (acc[i.variantId] || 0) + (i.quantity || 0);
        return acc;
      }, {});

      if (Object.keys(localDesired).length > 0) {
        // Fetch current cart lines to compare
        const currentCartRes = await shopify.query(
          `query getCartLines($id: ID!) { cart(id: $id) { lines(first: 100) { edges { node { quantity merchandise { ... on ProductVariant { id } } } } } } }`,
          { id: this.cartId }
        );
        const remote = {};
        currentCartRes?.cart?.lines?.edges?.forEach(e => {
          const vid = e.node?.merchandise?.id;
          const qty = e.node?.quantity || 0;
          if (vid) remote[vid] = (remote[vid] || 0) + qty;
        });

        const linesToAdd = Object.entries(localDesired)
          .map(([vid, qty]) => ({ merchandiseId: vid, quantity: Math.max(0, qty - (remote[vid] || 0)) }))
          .filter(l => l.quantity > 0);

        if (linesToAdd.length > 0) {
          try {
            await shopify.addToCart(this.cartId, linesToAdd);
          } catch (addErr) {
            console.warn('cartLinesAdd failed or partially failed:', addErr);
          }
        }
      }

      // 3) Refetch the cart to get a fresh checkoutUrl
      const result = await shopify.query(
        `query getCart($id: ID!) { cart(id: $id) { checkoutUrl } }`,
        { id: this.cartId }
      );

      const checkoutUrl = result?.cart?.checkoutUrl;
      if (checkoutUrl) {
        // If Shopify returned a checkout URL on an old/custom domain, rewrite it to the alias domain
        try {
          const targetHost = window?.shopify?.domain || 'xxmdnxx.myshopify.com';
          const u = new URL(checkoutUrl);
          if (u.hostname !== targetHost) {
            u.hostname = targetHost;
            window.location.href = u.toString();
            return;
          }
        } catch (_) {
          // Fall through to default redirect
        }
        window.location.href = checkoutUrl;
        return;
      }

      throw new Error('No checkoutUrl returned');
    } catch (error) {
      console.error('Error proceeding to checkout:', error);
      this.showCartNotification('チェックアウトに進めませんでした', 'error');
      // As a last resort, try creating a fresh cart and redirecting again
      try {
        this.cartId = null;
        localStorage.removeItem('nxor_cart_id');
        await this.createCart();
        const retry = await shopify.query(
          `query getCart($id: ID!) { cart(id: $id) { checkoutUrl } }`,
          { id: this.cartId }
        );
        const url2 = retry?.cart?.checkoutUrl;
        if (url2) {
          const targetHost = window?.shopify?.domain || 'xxmdnxx.myshopify.com';
          try {
            const u2 = new URL(url2);
            if (u2.hostname !== targetHost) u2.hostname = targetHost;
            window.location.href = u2.toString();
            return;
          } catch (_) {
            window.location.href = url2;
            return;
          }
        }
      } catch (e2) {
        console.error('Final checkout retry failed:', e2);
      }
    }
  }

  showCartNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `cart-notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Show and auto-hide
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Product loading and display
async function loadProducts() {
  console.log('🔍 Attempting to load products from Shopify...');
    // Log the configured endpoint for visibility
    const endpointInfo = (window?.shopify?.endpoint) || 'unknown endpoint';
    console.log('🌐 API Endpoint:', endpointInfo);
  
  try {
    const productsData = await shopify.getProducts();
    console.log('📦 Raw Shopify API Response:', productsData);
    const products = productsData.products.edges.map(edge => edge.node);
    console.log('🛍️ Processed products:', products);
    
    if (products.length === 0) {
      console.log('⚠️ No products found in Shopify store');
    } else {
      console.log(`✅ Found ${products.length} products, rendering them...`);
      renderProducts(products);
    }
  } catch (error) {
    console.error('❌ Error loading products:', error);
    console.log('🔄 Using static product display as fallback');
  }
}

function renderProducts(products) {
  const productsContainer = document.querySelector('.products');
  if (!productsContainer) return;

  // Clear existing products
  productsContainer.innerHTML = '';

  // Filter out products without proper images, titles, or prices
  const validProducts = products.filter(product => {
    const hasImage = product.images.edges.length > 0;
    const hasTitle = product.title && !product.title.includes('Untitled');
    const hasPrice = product.variants.edges.length > 0 && 
                    parseFloat(product.variants.edges[0].node.price.amount) > 0;
    
    return hasImage && hasTitle && hasPrice;
  });

  console.log(`🔍 Filtered ${products.length} products down to ${validProducts.length} valid products`);

  validProducts.forEach(product => {
    const variant = product.variants.edges[0]?.node;
    const image = product.images.edges[0]?.node;
    
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    productCard.setAttribute('translate', 'no');
    
    productCard.innerHTML = `
      ${product.tags?.includes('new') ? '<span class="badge new">新作</span>' : ''}
      ${product.tags?.includes('limited') ? '<span class="badge limited">限定</span>' : ''}
      ${!variant?.availableForSale ? '<span class="badge sold-out">完売</span>' : ''}
      <div class="product-image" onclick="showProductPreview('${product.id}', '${product.handle}')">
        <img src="${image?.originalSrc || 'placeholder.jpg'}" alt="${image?.altText || product.title}" />
        <div class="image-overlay">
          <span class="overlay-text">詳細を見る</span>
          <div class="translation" aria-hidden="true">View Details</div>
        </div>
      </div>
      <div class="product-info">
        <h3 onclick="window.location.href='product.html?handle=${product.handle}'" style="cursor: pointer; transition: color 0.3s ease;">${product.title}</h3>
        <div class="translation" aria-hidden="true">${product.title}</div>
        <div class="product-description">
          <span translate="no">プレミアム品質・快適フィット・高品質素材</span>
          <div class="translation" aria-hidden="true">Premium Quality • Comfortable Fit • High-Quality Materials</div>
        </div>
        <div class="size-info">
          <span class="size-label">サイズ:</span>
          <div class="translation size-label" aria-hidden="true">Sizes:</div>
          <div class="sizes">
            ${(() => {
              console.log('Product variants:', product.variants.edges);
              if (product.variants.edges.length > 1) {
                return product.variants.edges.slice(0, 5).map(v => {
                  const sizeTitle = v.node.title === 'Default Title' ? 'フリー' : v.node.title;
                  console.log('Variant:', v.node.title, 'ID:', v.node.id);
                  return `<span class="size" data-variant-id="${v.node.id}">${sizeTitle}</span>`;
                }).join('');
              } else {
                console.log('Product has only one variant, using default sizes');
                return `<span class="size" data-variant-id="${variant?.id}">S</span><span class="size" data-variant-id="${variant?.id}">M</span><span class="size" data-variant-id="${variant?.id}">L</span><span class="size" data-variant-id="${variant?.id}">XL</span><span class="size" data-variant-id="${variant?.id}">XXL</span>`;
              }
            })()}
          </div>
        </div>
        <div class="price">$${parseFloat(variant?.price.amount || 0).toFixed(2)}</div>
        <button class="add-to-cart-btn" data-product-id="${product.id}" ${!variant?.availableForSale ? 'disabled' : ''}>
          ${variant?.availableForSale ? 'Add to Cart' : 'Sold Out'}
        </button>
        <div class="translation" aria-hidden="true">${variant?.availableForSale ? 'カートに追加' : '完売'}</div>
        <a href="product.html?handle=${product.handle}" class="view-details-link">
          <span translate="no">詳細を見る</span>
          <div class="translation" aria-hidden="true">View Details</div>
        </a>
      </div>
    `;
    
    // Add debug logging
    console.log('Product card created for:', product.title, 'ID:', product.id);
    
    productsContainer.appendChild(productCard);
    
    // Add size click functionality to this product card
    const sizeElements = productCard.querySelectorAll('.size');
    const addToCartBtn = productCard.querySelector('.add-to-cart-btn');
    
    sizeElements.forEach(size => {
      size.addEventListener('click', function() {
        // Remove active class from siblings
        const siblings = this.parentNode.querySelectorAll('.size');
        siblings.forEach(sibling => sibling.classList.remove('active'));
        
        // Add active class to clicked size
        this.classList.add('active');
        
        // Store selected size and variant ID
        const selectedSize = this.textContent.trim();
        const variantId = this.dataset.variantId;
        
        productCard.dataset.selectedSize = selectedSize;
        productCard.dataset.selectedVariantId = variantId;
        
        // Update the Add to Cart button functionality
        if (addToCartBtn && variantId) {
          addToCartBtn.onclick = (event) => {
            // Store reference to clicked button for notifications
            window.lastClickedCartButton = event.target;
            addToCart(variantId);
          };
          console.log(`Size ${selectedSize} selected, variant ID: ${variantId}`);
        }
      });
      
      // Set first size as default selected
      if (sizeElements[0] === size) {
        size.click();
      }
    });
  });
}

// Add to cart function for buttons
async function addToCart(variantId) {
  console.log('Adding to cart:', variantId);
  
  try {
    // Get or create cart ID
    let cartId = localStorage.getItem('nxor_cart_id');
    
    if (!cartId) {
      console.log('Creating new cart...');
      const createResult = await shopify.createCart([]);
      cartId = createResult.cartCreate.cart.id;
      localStorage.setItem('nxor_cart_id', cartId);
      console.log('Created cart with ID:', cartId);
    }
    
    // Add item to cart
    const lines = [{ merchandiseId: variantId, quantity: 1 }];
    const result = await shopify.addToCart(cartId, lines);
    
    console.log('Item added to cart successfully:', result);
    
    // Update cart UI
    if (window.cart) {
      await window.cart.updateCartUI();
    }
    
    // Show success feedback with notification
    // Try to find the button that was clicked
    let addToCartBtn = window.lastClickedCartButton;
    
    // Fallback: try to find by onclick attribute (static HTML buttons)
    if (!addToCartBtn) {
      addToCartBtn = document.querySelector(`button[onclick*="${variantId}"]`);
    }
    
    console.log('Found add to cart button:', addToCartBtn);
    
    if (addToCartBtn) {
      const originalText = addToCartBtn.textContent;
      const originalBg = addToCartBtn.style.backgroundColor;
      
      // Update button appearance
      addToCartBtn.textContent = 'Added to Cart!';
      addToCartBtn.style.backgroundColor = '#28a745';
      addToCartBtn.style.color = '#fff';
      addToCartBtn.style.transform = 'scale(1.05)';
      addToCartBtn.style.transition = 'all 0.3s ease';
      
      // Reset button after delay
      setTimeout(() => {
        addToCartBtn.textContent = originalText;
        addToCartBtn.style.backgroundColor = originalBg;
        addToCartBtn.style.color = '';
        addToCartBtn.style.transform = '';
      }, 2000);
    }
    
    // Always show the floating notification
    const notification = document.createElement('div');
    notification.innerHTML = '✓ Added to Cart';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Animate notification in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove notification
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 2000);
    
  } catch (error) {
    console.error('Error adding to cart:', error);
    // No alert for errors either - just console log
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
  // Initialize cart
  window.cart = new Cart();
  
  // Add global click tracking for static Add to Cart buttons
  document.addEventListener('click', function(event) {
    if (event.target.classList.contains('add-to-cart-btn')) {
      window.lastClickedCartButton = event.target;
    }
  });
  
  // Ensure cart UI is updated on load with Shopify data
  setTimeout(async () => {
    await window.cart.updateCartUI();
  }, 100);
  
  // Load products from Shopify
  if (window.shopify) {
    loadProducts();
  }
  
  console.log('NXOR Shopify integration initialized');
});

// Export functions for global use
window.addToCart = addToCart;

// Cart navigation function
window.toggleCart = function() {
  window.location.href = 'cart.html';
};

// Product preview functionality
window.showProductPreview = async function(productId, productHandle) {
  console.log('Opening product preview for:', productId);
  
  try {
    // Fetch full product data with all images
    const query = `
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          title
          description
          handle
          images(first: 10) {
            edges {
              node {
                originalSrc
                altText
              }
            }
          }
          variants(first: 5) {
            edges {
              node {
                id
                title
                price {
                  amount
                  currencyCode
                }
                availableForSale
              }
            }
          }
        }
      }
    `;

  const response = await shopify.query(query, { id: productId });
  console.log('GraphQL response:', response);
    
  const product = response?.product;
    
    if (product) {
      createProductModal(product);
    } else {
      console.error('No product found for ID:', productId);
    }
  } catch (error) {
    console.error('Error fetching product details:', error);
  }
};

function createProductModal(product) {
  // Remove existing modal if any
  const existingModal = document.querySelector('.product-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Create modal overlay
  const modal = document.createElement('div');
  modal.className = 'product-modal';
  
  const images = product.images.edges;
  const variants = product.variants.edges;
  
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeProductModal()"></div>
    <div class="modal-content">
      <button class="modal-close" onclick="closeProductModal()">×</button>
      
      <div class="modal-body">
        <div class="modal-images">
          <div class="main-image">
            <img id="modalMainImage" src="${images[0]?.node.originalSrc || ''}" alt="${product.title}">
          </div>
          ${images.length > 1 ? `
            <div class="image-thumbnails">
              ${images.map((image, index) => `
                <img src="${image.node.originalSrc}" 
                     alt="${image.node.altText || product.title}" 
                     class="thumbnail ${index === 0 ? 'active' : ''}"
                     onclick="switchMainImage('${image.node.originalSrc}', this)">
              `).join('')}
            </div>
          ` : ''}
        </div>
        
        <div class="modal-details">
          <h2>${product.title}</h2>
          <div class="translation">Product Details</div>
          
          ${product.description ? `
            <div class="product-description">
              <p>${product.description}</p>
            </div>
          ` : ''}
          
          <div class="product-variants">
            ${variants.map(variant => `
              <div class="variant-option">
                <span class="variant-title">${variant.node.title !== 'Default Title' ? variant.node.title : ''}</span>
                <span class="variant-price">$${parseFloat(variant.node.price.amount).toFixed(2)}</span>
                <button onclick="addToCart('${variant.node.id}'); closeProductModal();" 
                        class="modal-add-to-cart" 
                        ${!variant.node.availableForSale ? 'disabled' : ''}>
                  ${variant.node.availableForSale ? 'Add to Cart' : 'Sold Out'}
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Prevent body scroll when modal is open
  document.body.style.overflow = 'hidden';
}

window.switchMainImage = function(imageSrc, thumbnailElement) {
  document.getElementById('modalMainImage').src = imageSrc;
  
  // Update active thumbnail
  document.querySelectorAll('.thumbnail').forEach(thumb => thumb.classList.remove('active'));
  thumbnailElement.classList.add('active');
};

window.closeProductModal = function() {
  const modal = document.querySelector('.product-modal');
  if (modal) {
    modal.remove();
  }
  document.body.style.overflow = 'auto';
};
