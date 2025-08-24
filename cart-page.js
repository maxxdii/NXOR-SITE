// NXOR Cart Page - Enhanced Cart Management
import { shopify } from './shopify-config.js';

class CartPage {
  constructor() {
    this.cart = null;
    this.cartData = this.loadLocalCart();
    this.init();
  }

  init() {
    console.log('Initializing cart page...');
    this.loadCartFromShopify();
    this.updateCartDisplay();
    this.setupEventListeners();
  }

  loadLocalCart() {
    const saved = localStorage.getItem('nxor_cart');
    return saved ? JSON.parse(saved) : [];
  }

  saveLocalCart() {
    localStorage.setItem('nxor_cart', JSON.stringify(this.cartData));
  }

  async loadCartFromShopify() {
    const cartId = localStorage.getItem('nxor_cart_id');
    if (!cartId) {
      this.showEmptyCart();
      return;
    }

    try {
      const query = `
        query getCart($id: ID!) {
          cart(id: $id) {
            id
            checkoutUrl
            totalQuantity
            cost {
              totalAmount {
                amount
                currencyCode
              }
              subtotalAmount {
                amount
                currencyCode
              }
            }
            lines(first: 50) {
              edges {
                node {
                  id
                  quantity
                  cost {
                    totalAmount {
                      amount
                      currencyCode
                    }
                  }
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      price {
                        amount
                        currencyCode
                      }
                      product {
                        id
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
      this.cart = response.cart;
      
      if (this.cart && this.cart.lines.edges.length > 0) {
        this.updateCartDisplay();
      } else {
        this.showEmptyCart();
      }
    } catch (error) {
      console.error('Error loading cart:', error);
      this.showEmptyCart();
    }
  }

  updateCartDisplay() {
    if (!this.cart || this.cart.lines.edges.length === 0) {
      this.showEmptyCart();
      return;
    }

    this.showCartItems();
    this.updateCartSummary();
  }

  showEmptyCart() {
    console.log('Showing empty cart state');
    document.getElementById('cartEmpty').style.display = 'block';
    document.getElementById('cartItems').style.display = 'none';
    document.getElementById('checkoutBtn').disabled = true;
    
    // Update cart summary to show zero values
    document.getElementById('subtotal').textContent = '$0.00';
    document.getElementById('total').textContent = '$0.00';
  }

  showCartItems() {
    console.log('Showing cart items, cart:', this.cart);
    document.getElementById('cartEmpty').style.display = 'none';
    document.getElementById('cartItems').style.display = 'block';
    
    const cartItemsContainer = document.getElementById('cartItems');
    cartItemsContainer.innerHTML = '';

    if (!this.cart || !this.cart.lines || !this.cart.lines.edges) {
      console.error('Invalid cart data structure');
      this.showEmptyCart();
      return;
    }

    this.cart.lines.edges.forEach(edge => {
      const line = edge.node;
      const product = line.merchandise.product;
      const variant = line.merchandise;
      
      const itemElement = this.createCartItemElement(line, product, variant);
      cartItemsContainer.appendChild(itemElement);
    });

    document.getElementById('checkoutBtn').disabled = false;
  }

  createCartItemElement(line, product, variant) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'cart-item';
    itemDiv.setAttribute('data-line-id', line.id);

    const imageUrl = product.images.edges.length > 0 
      ? product.images.edges[0].node.originalSrc 
      : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzIyMiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmb250LWZhbWlseT0iQXJpYWwiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5OWE9SPC90ZXh0Pjwvc3ZnPg==';

    const price = parseFloat(variant.price.amount);
    const totalPrice = price * line.quantity;
    
    console.log('Rendering cart item:');
    console.log('- Product title:', product.title);
    console.log('- Variant title:', variant.title);
    console.log('- Variant ID:', variant.id);
    console.log('- Price:', price, 'Total:', totalPrice);

    itemDiv.innerHTML = `
      <div class="cart-item-image">
        <img src="${imageUrl}" alt="${product.title}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzIyMiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmb250LWZhbWlseT0iQXJpYWwiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5OWE9SPC90ZXh0Pjwvc3ZnPg=='">
      </div>
      
      <div class="cart-item-details">
        <div class="cart-item-title">${product.title}</div>
        <div class="cart-item-variant">Size: ${variant.title !== 'Default Title' ? variant.title : 'One Size'}</div>
        <div class="cart-item-price">$${price.toFixed(2)} each</div>
        <div class="cart-item-total">Total: $${totalPrice.toFixed(2)}</div>
      </div>
      
      <div class="quantity-controls">
        <button class="quantity-btn" onclick="cartPage.updateQuantity('${line.id}', ${line.quantity - 1})" ${line.quantity <= 1 ? 'disabled' : ''}>
          −
        </button>
        <input type="number" class="quantity-input" value="${line.quantity}" min="1" 
               onchange="cartPage.updateQuantity('${line.id}', parseInt(this.value))"
               onkeyup="if(event.key==='Enter') cartPage.updateQuantity('${line.id}', parseInt(this.value))">
        <button class="quantity-btn" onclick="cartPage.updateQuantity('${line.id}', ${line.quantity + 1})">
          +
        </button>
      </div>
      
      <button class="remove-item" onclick="cartPage.removeItem('${line.id}')" title="Remove from cart">
        🗑️
      </button>
    `;

    return itemDiv;
  }

  async updateQuantity(lineId, newQuantity) {
    if (newQuantity < 1) {
      this.removeItem(lineId);
      return;
    }

    try {
      const query = `
        mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
          cartLinesUpdate(cartId: $cartId, lines: $lines) {
            cart {
              id
              totalQuantity
              cost {
                totalAmount {
                  amount
                  currencyCode
                }
                subtotalAmount {
                  amount
                  currencyCode
                }
              }
              lines(first: 50) {
                edges {
                  node {
                    id
                    quantity
                    cost {
                      totalAmount {
                        amount
                        currencyCode
                      }
                    }
                    merchandise {
                      ... on ProductVariant {
                        id
                        title
                        price {
                          amount
                          currencyCode
                        }
                        product {
                          id
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
            userErrors {
              field
              message
            }
          }
        }
      `;

      const response = await shopify.query(query, {
        cartId: this.cart.id,
        lines: [{ id: lineId, quantity: newQuantity }]
      });

      if (response.cartLinesUpdate.userErrors.length > 0) {
        throw new Error(response.cartLinesUpdate.userErrors[0].message);
      }

      this.cart = response.cartLinesUpdate.cart;
      this.updateCartDisplay();
      this.showNotification('数量が更新されました', 'success');
    } catch (error) {
      console.error('Error updating quantity:', error);
      this.showNotification('更新エラーが発生しました', 'error');
    }
  }

  async removeItem(lineId) {
    try {
      const query = `
        mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
          cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
            cart {
              id
              totalQuantity
              cost {
                totalAmount {
                  amount
                  currencyCode
                }
                subtotalAmount {
                  amount
                  currencyCode
                }
              }
              lines(first: 50) {
                edges {
                  node {
                    id
                    quantity
                    cost {
                      totalAmount {
                        amount
                        currencyCode
                      }
                    }
                    merchandise {
                      ... on ProductVariant {
                        id
                        title
                        price {
                          amount
                          currencyCode
                        }
                        product {
                          id
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
            userErrors {
              field
              message
            }
          }
        }
      `;

      const response = await shopify.query(query, {
        cartId: this.cart.id,
        lineIds: [lineId]
      });

      if (response.cartLinesRemove.userErrors.length > 0) {
        throw new Error(response.cartLinesRemove.userErrors[0].message);
      }

      this.cart = response.cartLinesRemove.cart;
      this.updateCartDisplay();
      // Silent removal - no notification
    } catch (error) {
      console.error('Error removing item:', error);
      // Silent error - no notification, just console log
    }
  }

  updateCartSummary() {
    console.log('Updating cart summary, cart:', this.cart);
    if (!this.cart) {
      console.log('No cart data available');
      return;
    }

    if (!this.cart.cost) {
      console.log('No cost data in cart');
      return;
    }

    const subtotal = parseFloat(this.cart.cost.subtotalAmount.amount);
    const total = parseFloat(this.cart.cost.totalAmount.amount);

    console.log('Cart subtotal:', subtotal, 'Cart total:', total);
    console.log('Updating summary with formatted values: $' + subtotal.toFixed(2), '$' + total.toFixed(2));

    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('total').textContent = `$${total.toFixed(2)}`;

    // Update cart count in navigation
    const cartCountElement = document.querySelector('.cart-count');
    if (cartCountElement) {
      cartCountElement.textContent = this.cart.totalQuantity || 0;
    }
  }

  setupEventListeners() {
    // Any additional event listeners can be added here
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `cart-notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      background: ${type === 'error' ? '#ff4444' : '#4CAF50'};
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      font-weight: 600;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;

    // Add CSS animation
    if (!document.getElementById('notification-style')) {
      const style = document.createElement('style');
      style.id = 'notification-style';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Global functions for cart operations
window.cartPage = null;

// Proceed to checkout
window.proceedToCheckout = function() {
  if (cartPage.cart && cartPage.cart.checkoutUrl) {
    window.location.href = cartPage.cart.checkoutUrl;
  } else {
    alert('チェックアウトURLが見つかりません\nCheckout URL not found');
  }
};

// Toggle cart (for navigation compatibility)
window.toggleCart = function() {
  // This can redirect to cart page or show a mini cart
  window.location.href = 'cart.html';
};

// Initialize cart page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('Cart page DOM loaded');
  console.log('Cart empty element:', document.getElementById('cartEmpty'));
  console.log('Cart items element:', document.getElementById('cartItems'));
  window.cartPage = new CartPage();
});

export { CartPage };
