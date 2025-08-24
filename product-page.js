// Product page functionality
import { SHOPIFY_CONFIG } from './shopify-config.js';
import { Cart } from './shopify-integration.js';

class ProductPage {
  constructor() {
    this.product = null;
    this.selectedVariant = null;
    this.selectedOptions = {};
    this.quantity = 1;
    this.shopifyClient = null;
    this.init();
  }

  async init() {
    console.log('ProductPage init called');
    
    try {
      // Initialize Shopify client
      this.shopifyClient = {
        graphql: async (query, variables = {}) => {
          const response = await fetch(`https://${SHOPIFY_CONFIG.domain}/api/2023-07/graphql.json`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Storefront-Access-Token': SHOPIFY_CONFIG.storefrontAccessToken
            },
            body: JSON.stringify({ query, variables })
          });
          return response.json();
        }
      };

      console.log('Shopify client initialized');

      // Get product ID from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const productId = urlParams.get('id');
      const productHandle = urlParams.get('handle');

      console.log('URL params - ID:', productId, 'Handle:', productHandle);

      if (productId || productHandle) {
        await this.loadProduct(productId, productHandle);
      } else {
        console.error('No product ID or handle provided');
        this.showError();
      }
    } catch (error) {
      console.error('Error in ProductPage init:', error);
      this.showError('Failed to initialize product page');
    }

    // Initialize cart
    window.cart = new Cart();
  }

  async loadProduct(productId, productHandle) {
    try {
      let query;
      let variables = {};

      if (productHandle) {
        query = `
          query getProductByHandle($handle: String!) {
            productByHandle(handle: $handle) {
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
              variants(first: 100) {
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
              options {
                id
                name
                values
              }
            }
          }
        `;
        variables = { handle: productHandle };
      } else {
        query = `
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
              variants(first: 100) {
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
              options {
                id
                name
                values
              }
            }
          }
        `;
        variables = { id: productId };
      }

      const response = await this.shopifyClient.graphql(query, variables);
      
      if (response.data && (response.data.product || response.data.productByHandle)) {
        this.product = response.data.product || response.data.productByHandle;
        this.renderProduct();
      } else {
        console.error('Product not found');
        this.showError();
      }
    } catch (error) {
      console.error('Error loading product:', error);
      this.showError();
    }
  }

  renderProduct() {
    if (!this.product) return;

    // Update page title
    document.title = `${this.product.title} - NXOR`;

    // Render product title
    document.getElementById('productTitle').textContent = this.product.title;
    document.getElementById('productTitleEn').textContent = this.product.title;

    // Render images
    this.renderImages();

    // Render price (use first variant price)
    const firstVariant = this.product.variants.edges[0]?.node;
    if (firstVariant) {
      this.selectedVariant = firstVariant;
      this.updatePrice();
    }

    // Render description
    document.getElementById('productDescription').innerHTML = this.product.description || 'No description available.';

    // Render variant options
    this.renderVariantOptions();

    // Initialize with first available variant
    this.selectDefaultVariant();
  }

  renderImages() {
    const images = this.product.images.edges;
    if (images.length === 0) return;

    // Set main image
    const mainImg = document.getElementById('mainProductImg');
    mainImg.src = images[0].node.originalSrc;
    mainImg.alt = images[0].node.altText || this.product.title;

    // Render thumbnails
    const thumbnailsContainer = document.getElementById('productThumbnails');
    thumbnailsContainer.innerHTML = '';

    images.forEach((image, index) => {
      const thumbnail = document.createElement('div');
      thumbnail.className = `thumbnail ${index === 0 ? 'active' : ''}`;
      thumbnail.innerHTML = `
        <img src="${image.node.originalSrc}" alt="${image.node.altText || this.product.title}">
      `;
      thumbnail.onclick = () => this.switchMainImage(image.node.originalSrc, thumbnail);
      thumbnailsContainer.appendChild(thumbnail);
    });
  }

  switchMainImage(imageSrc, thumbnailElement) {
    document.getElementById('mainProductImg').src = imageSrc;
    
    // Update active thumbnail
    document.querySelectorAll('.thumbnail').forEach(thumb => thumb.classList.remove('active'));
    thumbnailElement.classList.add('active');
  }

  renderVariantOptions() {
    const options = this.product.options;
    
    options.forEach(option => {
      const optionName = option.name.toLowerCase();
      
      if (optionName.includes('color') || optionName.includes('colour')) {
        this.renderColorOptions(option);
      } else if (optionName.includes('size')) {
        this.renderSizeOptions(option);
      }
    });
  }

  renderColorOptions(option) {
    const colorGroup = document.getElementById('colorGroup');
    const colorOptions = document.getElementById('colorOptions');
    
    colorGroup.style.display = 'block';
    colorOptions.innerHTML = '';

    option.values.forEach(value => {
      const optionElement = document.createElement('button');
      optionElement.className = 'variant-option';
      optionElement.textContent = value;
      optionElement.onclick = () => this.selectOption(option.name, value, optionElement);
      colorOptions.appendChild(optionElement);
    });
  }

  renderSizeOptions(option) {
    const sizeGroup = document.getElementById('sizeGroup');
    const sizeOptions = document.getElementById('sizeOptions');
    
    sizeGroup.style.display = 'block';
    sizeOptions.innerHTML = '';

    option.values.forEach(value => {
      const optionElement = document.createElement('button');
      optionElement.className = 'variant-option';
      optionElement.textContent = value;
      optionElement.onclick = () => this.selectOption(option.name, value, optionElement);
      sizeOptions.appendChild(optionElement);
    });
  }

  selectOption(optionName, value, element) {
    // Update selected options
    this.selectedOptions[optionName] = value;

    // Update UI
    const container = element.parentElement;
    container.querySelectorAll('.variant-option').forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');

    // Find matching variant
    this.updateSelectedVariant();
  }

  selectDefaultVariant() {
    // Select first available variant by default
    const firstVariant = this.product.variants.edges.find(edge => edge.node.availableForSale)?.node;
    if (firstVariant) {
      this.selectedVariant = firstVariant;
      
      // Select default options based on first variant
      firstVariant.selectedOptions.forEach(option => {
        this.selectedOptions[option.name] = option.value;
        
        // Update UI to show selected options
        const optionElements = document.querySelectorAll('.variant-option');
        optionElements.forEach(element => {
          if (element.textContent === option.value) {
            element.classList.add('selected');
          }
        });
      });
    }
  }

  updateSelectedVariant() {
    // Find variant that matches selected options
    const matchingVariant = this.product.variants.edges.find(edge => {
      const variant = edge.node;
      return variant.selectedOptions.every(option => 
        this.selectedOptions[option.name] === option.value
      );
    });

    if (matchingVariant) {
      this.selectedVariant = matchingVariant.node;
      this.updatePrice();
    }
  }

  updatePrice() {
    if (this.selectedVariant && this.selectedVariant.price) {
      const priceElement = document.getElementById('productPrice');
      const price = parseFloat(this.selectedVariant.price.amount);
      priceElement.textContent = `$${price.toFixed(2)}`;
    }
  }

  showError() {
    document.getElementById('productTitle').textContent = 'Product Not Found';
    document.getElementById('productTitleEn').textContent = 'Product Not Found';
    document.getElementById('productPrice').textContent = '$0.00';
    document.getElementById('productDescription').innerHTML = 'The requested product could not be found.';
  }
}

// Global functions for UI interactions
window.changeQuantity = function(delta) {
  const quantityInput = document.getElementById('quantity');
  const currentQuantity = parseInt(quantityInput.value);
  const newQuantity = Math.max(1, currentQuantity + delta);
  quantityInput.value = newQuantity;
  window.productPage.quantity = newQuantity;
};

// Global function to add item to cart (called from HTML)
window.addToCartFromProduct = async function(productId) {
  console.log('addToCartFromProduct called');
  
  try {
    const quantity = parseInt(document.getElementById('quantity').value) || 1;
    console.log('Quantity:', quantity);
    
    // For testing, use a hardcoded variant ID
    let selectedVariantId = 'gid://shopify/ProductVariant/VARIANT_ID_1'; // Default fallback
    
    // Try to get the actual product variant if available
    const product = window.productPage?.product;
    if (product && product.variants && product.variants.edges.length > 0) {
      selectedVariantId = product.variants.edges[0].node.id;
      console.log('Using product variant:', selectedVariantId);
    } else {
      console.log('Using fallback variant ID');
    }
    
    console.log('Selected variant ID:', selectedVariantId);
    
    // Check if cart exists
    if (!window.cart) {
      console.error('Cart not available');
      alert('Cart not available. Please refresh the page.');
      return;
    }
    
    console.log('Adding to cart...');
    await window.cart.addItem(selectedVariantId, quantity);
    console.log('Successfully added to cart');
    
    // Show success message
    const addToCartBtn = document.querySelector('.add-to-cart-main');
    if (addToCartBtn) {
      const originalText = addToCartBtn.textContent;
      addToCartBtn.textContent = 'Added to Cart!';
      addToCartBtn.style.backgroundColor = '#28a745';
      
      setTimeout(() => {
        addToCartBtn.textContent = originalText;
        addToCartBtn.style.backgroundColor = '';
      }, 2000);
    }
  } catch (error) {
    console.error('Error in addToCartFromProduct:', error);
    alert('Error adding to cart: ' + error.message);
  }
};

window.buyWithShopPay = async function() {
  try {
    // First add the item to cart
    await window.addToCartFromProduct();
    
    // Then redirect to checkout page
    // In a real implementation, this would integrate with Shopify checkout
    // For now, redirect to cart page
    window.location.href = 'cart.html';
  } catch (error) {
    console.error('Error with Shop Pay:', error);
    alert('Error processing Shop Pay. Please try again.');
  }
};

window.showTab = function(tabName) {
  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Remove active class from all tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected tab
  document.getElementById(tabName).classList.add('active');
  event.target.classList.add('active');
};

// Wait for other scripts to load
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Product page DOM loaded, initializing...');
  
  // Initialize cart
  try {
    console.log('Creating new Cart instance...');
    window.cart = new Cart();
    console.log('Cart initialized successfully:', window.cart);
  } catch (error) {
    console.error('Error initializing cart:', error);
  }
  
  // Initialize product page
  try {
    console.log('Creating new ProductPage instance...');
    window.productPage = new ProductPage();
    console.log('ProductPage initialized successfully:', window.productPage);
  } catch (error) {
    console.error('Error initializing ProductPage:', error);
  }
});

export { ProductPage };
