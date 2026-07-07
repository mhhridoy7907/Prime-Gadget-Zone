
        // ============ FIREBASE CONFIG ============
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "p",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};

        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        const database = firebase.database();
        const MAIL_FUNCTION_URL = 'https://script.google.com/macros/s/AKfycbxDYP2Y4CQxc_NbYv2RdsgMYE-KuSTW0A5AW2lFeRjcXK5YSsFb-9agg-Ek6xXLPA8G/exec';

        // ============ STATE ============
        let products = [];
        let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
        let isDarkMode = localStorage.getItem('darkMode') === 'true';
        let currentOrderProduct = null;

        // ============ INIT ============
        document.addEventListener('DOMContentLoaded', () => {
            if (isDarkMode) document.body.classList.add('dark-mode');
            updateThemeToggle();
            loadProducts();
            loadCategories();
            setupSearch();
            updateWishlistBadge();
        });

        // ============ LOAD PRODUCTS FROM FIREBASE ============
        function loadProducts() {
            database.ref('products').on('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    products = Object.entries(data).map(([key, value]) => ({
                        id: key,
                        ...value
                    }));
                    renderFeaturedProducts();
                    renderTrendingProducts();
                } else {
                    showToast('No products available', 'info');
                }
            }, (error) => {
                console.error('Failed to load products:', error);
                showToast('Failed to load products. Please refresh.', 'error');
            });
        }

        function renderFeaturedProducts() {
            renderProducts('featuredProducts', products.slice(0, 8));
        }

        function renderTrendingProducts() {
            const trending = [...products].sort((a, b) => (b.orders || 0) - (a.orders || 0)).slice(0, 8);
            renderProducts('trendingProducts', trending);
        }

        function renderProducts(containerId, productsToRender) {
            const container = document.getElementById(containerId);
            if (!productsToRender || productsToRender.length === 0) {
                container.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:2rem;color:#999;">No products found.</p>';
                return;
            }

            container.innerHTML = productsToRender.map(product => {
                const inWishlist = wishlist.some(w => w.id === product.id);
                const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
                const isOutOfStock = product.quantity <= 0;
                const isLowStock = product.quantity > 0 && product.quantity <= 3;

                let badgeClass = 'new';
                let badgeText = 'New';
                if (isOutOfStock) {
                    badgeClass = 'out-of-stock';
                    badgeText = 'Out of Stock';
                } else if (isLowStock) {
                    badgeClass = 'low-stock';
                    badgeText = `Only ${product.quantity} left!`;
                } else if (discount > 0) {
                    badgeClass = '';
                    badgeText = `-${discount}%`;
                }

                let stockIndicatorClass = 'available';
                let stockIndicatorText = `📦 ${product.quantity} in stock`;
                if (isOutOfStock) {
                    stockIndicatorClass = 'out';
                    stockIndicatorText = 'Out of Stock';
                } else if (isLowStock) {
                    stockIndicatorClass = 'low';
                }

                return `
                    <div class="product-card">
                        <div class="product-image">
                            <img src="${product.image || 'https://via.placeholder.com/260x280?text=Product'}" alt="${product.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/260x280?text=No+Image'">
                            <div class="product-badge ${badgeClass}">${badgeText}</div>
                            <div class="stock-indicator ${stockIndicatorClass}">${stockIndicatorText}</div>
                        </div>
                        <div class="product-info">
                            <div class="product-category">Electronics</div>
                            <h3 class="product-title">${product.name}</h3>
                            <div class="product-rating">
                                <span class="stars">⭐⭐⭐⭐⭐</span>
                                <span style="color:#999;font-size:0.85rem;">(${product.orders || 0} sold)</span>
                            </div>
                            <div class="product-price">
                                <span class="price-current">৳${product.price.toLocaleString('en-BD')}</span>
                                ${product.originalPrice ? `<span class="price-original">৳${product.originalPrice.toLocaleString('en-BD')}</span>` : ''}
                            </div>
                            <div class="product-actions">
                                <button class="btn-buy-now"
                                    onclick="openOrderModal('${product.id}', '${product.name.replace(/'/g, "\\'")}', ${product.price}, ${product.quantity})"
                                    ${isOutOfStock ? 'disabled' : ''}>
                                    ${isOutOfStock ? 'Out of Stock' : 'Buy Now'}
                                </button>
                                <button class="btn-wishlist ${inWishlist ? 'active' : ''}"
                                    onclick="toggleWishlist('${product.id}', '${product.name.replace(/'/g, "\\'")}')"
                                    title="Add to Wishlist">❤️</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function loadCategories() {
            const categories = [
                { name: 'Smartphones', icon: '📱' },
                { name: 'Laptops', icon: '💻' },
                { name: 'Tablets', icon: '📲' },
                { name: 'Headphones', icon: '🎧' },
                { name: 'Accessories', icon: '🔌' },
                { name: 'Gaming', icon: '🎮' }
            ];

            document.getElementById('categoriesGrid').innerHTML = categories.map(cat => `
                <div class="category-card" onclick="showToast('Coming soon: ${cat.name}', 'info')">
                    <span class="category-icon">${cat.icon}</span>
                    <h3>${cat.name}</h3>
                </div>
            `).join('');
        }

        // ============ SEARCH ============
        function setupSearch() {
            const searchInput = document.getElementById('searchInput');
            let timeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(timeout);
                const query = e.target.value.toLowerCase().trim();
                timeout = setTimeout(() => {
                    if (query.length > 1) {
                        const filtered = products.filter(p => p.name.toLowerCase().includes(query));
                        if (filtered.length > 0) {
                            renderProducts('featuredProducts', filtered);
                            renderProducts('trendingProducts', filtered);
                            showToast(`${filtered.length} product(s) found`, 'info');
                        } else {
                            showToast('No products match your search', 'warning');
                        }
                    } else if (query.length === 0) {
                        renderFeaturedProducts();
                        renderTrendingProducts();
                    }
                }, 300);
            });
        }

        // ============ ORDER ============
        function openOrderModal(productId, productName, price, stock) {
            if (stock <= 0) {
                showToast('This product is out of stock', 'error');
                return;
            }

            currentOrderProduct = { id: productId, name: productName, price: price, maxStock: stock };

            ['customerName','customerEmail','customerPhone','customerAddress','orderNotes'].forEach(id => {
                document.getElementById(id).value = '';
            });
            document.getElementById('productQuantity').value = '1';

            const qtySelect = document.getElementById('productQuantity');
            qtySelect.innerHTML = '';
            const maxQty = Math.min(stock, 10);
            for (let i = 1; i <= maxQty; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = i;
                qtySelect.appendChild(opt);
            }

            updateOrderSummary();
            document.getElementById('orderModal').classList.add('active');
        }

        function closeOrderModal() {
            document.getElementById('orderModal').classList.remove('active');
            currentOrderProduct = null;
        }

        function updateOrderSummary() {
            if (!currentOrderProduct) return;
            const quantity = parseInt(document.getElementById('productQuantity').value) || 1;
            const itemTotal = currentOrderProduct.price * quantity;
            const total = itemTotal + 100;

            document.getElementById('productSummary').innerHTML = `
                <h4>${currentOrderProduct.name}</h4>
                <div class="summary-item">
                    <span>Unit Price:</span>
                    <strong>৳${currentOrderProduct.price.toLocaleString('en-BD')}</strong>
                </div>
                <div class="summary-item">
                    <span>Quantity:</span>
                    <strong>${quantity}</strong>
                </div>
                <div class="summary-item">
                    <span>Stock Available:</span>
                    <strong>${currentOrderProduct.maxStock} units</strong>
                </div>
            `;

            document.getElementById('totalItemPrice').textContent = '৳' + itemTotal.toLocaleString('en-BD');
            document.getElementById('totalAmount').textContent = '৳' + total.toLocaleString('en-BD');
        }

        function updateOrderTotal() {
            updateOrderSummary();
        }

        async function submitOrder() {
            const name = document.getElementById('customerName').value.trim();
            const email = document.getElementById('customerEmail').value.trim();
            const phone = document.getElementById('customerPhone').value.trim();
            const address = document.getElementById('customerAddress').value.trim();
            const notes = document.getElementById('orderNotes').value.trim();
            const quantity = parseInt(document.getElementById('productQuantity').value) || 1;

            if (!name || !email || !phone || !address) {
                showToast('Please fill in all required fields', 'error');
                return;
            }

            if (quantity > currentOrderProduct.maxStock) {
                showToast(`Only ${currentOrderProduct.maxStock} unit(s) available`, 'error');
                return;
            }

            const itemTotal = currentOrderProduct.price * quantity;
            const total = itemTotal + 100;

            const orderData = {
                customerName: name,
                customerEmail: email,
                customerPhone: phone,
                customerAddress: address,
                orderNotes: notes,
                items: [{
                    id: currentOrderProduct.id,
                    name: currentOrderProduct.name,
                    price: currentOrderProduct.price,
                    quantity: quantity
                }],
                total: total,
                date: new Date().toLocaleString('en-BD'),
                timestamp: new Date().getTime(),
                status: 'Pending'
            };

            const btn = document.getElementById('checkoutBtn');
            btn.disabled = true;
            btn.textContent = 'Processing...';

            try {
                // Save to Firebase
                const orderId = database.ref('orders').push().key;
                await database.ref('orders/' + orderId).set(orderData);

                // Update product stock in Firebase
                const product = products.find(p => p.id === currentOrderProduct.id);
                if (product) {
                    const newQuantity = Math.max(0, product.quantity - quantity);
                    const newOrders = (product.orders || 0) + quantity;
                    await database.ref('products/' + currentOrderProduct.id).update({
                        quantity: newQuantity,
                        orders: newOrders
                    });
                }

                // Send email via Apps Script
                await sendOrderEmail(orderData);

                closeOrderModal();
                showToast('✓ Order placed successfully! We will contact you shortly.', 'success');
                renderFeaturedProducts();
                renderTrendingProducts();

            } catch (error) {
                console.error('Order submission error:', error);
                showToast('Failed to place order. Please try again.', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Confirm Order';
            }
        }

        async function sendOrderEmail(orderData) {
            try {
                const response = await fetch(MAIL_FUNCTION_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'sendEmail',
                        orderData: orderData
                    })
                });
                const result = await response.json();
                if (!result.success) {
                    console.warn('Email send warning:', result.message);
                }
            } catch (error) {
                console.warn('Email send failed (non-critical):', error);
            }
        }

        // ============ WISHLIST ============
        function toggleWishlist(productId, productName) {
            const existingIndex = wishlist.findIndex(w => w.id === productId);
            if (existingIndex > -1) {
                wishlist.splice(existingIndex, 1);
                showToast('Removed from wishlist', 'info');
            } else {
                const product = products.find(p => p.id === productId);
                wishlist.push({ id: productId, name: productName, price: product.price });
                showToast('❤️ Added to wishlist!', 'success');
            }
            saveWishlist();
            updateWishlistBadge();
            renderFeaturedProducts();
            renderTrendingProducts();
        }

        function openWishlist() {
            document.getElementById('wishlistModal').classList.add('active');
            renderWishlistModal();
        }

        function closeWishlist() {
            document.getElementById('wishlistModal').classList.remove('active');
        }

        function renderWishlistModal() {
            const container = document.getElementById('wishlistItems');
            if (wishlist.length === 0) {
                container.innerHTML = '<p style="padding:2rem;text-align:center;color:#999;">Your wishlist is empty.</p>';
                return;
            }

            container.innerHTML = wishlist.map(item => `
                <div class="wishlist-item">
                    <div>
                        <h4>${item.name}</h4>
                        <div class="wishlist-item-price">৳${item.price.toLocaleString('en-BD')}</div>
                    </div>
                    <div class="wishlist-item-actions">
                        <button class="btn-sm btn-sm-primary" onclick="buyFromWishlist('${item.id}', '${item.name.replace(/'/g,"\\'")}', ${item.price})">Buy</button>
                        <button class="btn-sm btn-sm-danger" onclick="removeFromWishlist('${item.id}')">✕</button>
                    </div>
                </div>
            `).join('');
        }

        function buyFromWishlist(productId, productName, price) {
            closeWishlist();
            const product = products.find(p => p.id === productId);
            if (!product) { showToast('Product not found', 'error'); return; }
            openOrderModal(productId, productName, price, product.quantity);
        }

        function removeFromWishlist(productId) {
            wishlist = wishlist.filter(item => item.id !== productId);
            saveWishlist();
            updateWishlistBadge();
            renderWishlistModal();
            showToast('Removed from wishlist', 'info');
        }

        function saveWishlist() {
            localStorage.setItem('wishlist', JSON.stringify(wishlist));
        }

        function updateWishlistBadge() {
            const badge = document.getElementById('wishlistBadge');
            if (wishlist.length > 0) {
                badge.textContent = wishlist.length > 99 ? '99+' : wishlist.length;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }

        // ============ THEME ============
        function toggleTheme() {
            isDarkMode = !isDarkMode;
            localStorage.setItem('darkMode', isDarkMode);
            document.body.classList.toggle('dark-mode');
            updateThemeToggle();
        }

        function updateThemeToggle() {
            const themeBtn = document.getElementById('themeBtn');
            themeBtn.classList.toggle('active', isDarkMode);
        }

        // ============ UTILS ============
        function scrollToSection(sectionId) {
            const el = document.getElementById(sectionId);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }

        function showToast(message, type = 'info') {
            const container = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.textContent = message;
            container.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
 
