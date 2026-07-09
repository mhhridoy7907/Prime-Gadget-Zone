
    // ============ FIREBASE CONFIG ============
const firebaseConfig = {
  apiKey: "*****************************",
  authDomain: "*******************************************",
  databaseURL: "https://websi**********************************ase.app",
  projectId: "we**********be",
  storageBucket: "we************************ge.app",
  messagingSenderId: "4*********************37",
  appId: "1:491663596537:w*********************28",
  measurementId: "G-75****************ZWM"
};


    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    const auth = firebase.auth();

    // ============ STATE ============
    let products = [];
    let orders = [];
    let currentEditId = null;
    const ADMIN_PASSWORD = 'admin123'; //==========PASSSSS==========//

    // ============ INIT ============
    document.addEventListener('DOMContentLoaded', () => {
        checkAuth();
    });

    function checkAuth() {
        const isLoggedIn = sessionStorage.getItem('pgzAdmin');
        if (!isLoggedIn) {
            const password = prompt('Enter Admin Password:');
            if (password === ADMIN_PASSWORD) {
                sessionStorage.setItem('pgzAdmin', 'true');
                loadData();
            } else {
                alert('Invalid Password!');
                window.location.href = '/';
            }
        } else {
            loadData();
        }
    }

    function loadData() {
        loadProducts();
        loadOrders();
    }

    // ============ PRODUCTS ============
    function loadProducts() {
        database.ref('products').on('value', (snapshot) => {
            const data = snapshot.val();
            products = [];
            if (data) {
                Object.entries(data).forEach(([key, value]) => {
                    products.push({ id: key, ...value });
                });
            }
            renderProducts();
            updateDashboard();
        });
    }

    function renderProducts() {
        const tableBody = document.getElementById('productsTable');
        if (products.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;">No products yet</td></tr>';
            return;
        }
 
        tableBody.innerHTML = products.map(p => `
            <tr>
                <td>${p.name}</td>
                <td>৳${p.price.toLocaleString('en-BD')}</td>
                <td>${p.quantity}</td>
                <td>${p.orders || 0}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="editProduct('${p.id}')">Edit</button>
                </td>
            </tr>
        `).join('');
    }

    function addProduct() {
        const name = document.getElementById('productName').value.trim();
        const price = parseFloat(document.getElementById('productPrice').value) || 0;
        const originalPrice = parseFloat(document.getElementById('productOriginalPrice').value) || null;
        const stock = parseFloat(document.getElementById('productStock').value) || 0;
        const image = document.getElementById('productImage').value.trim();

        if (!name || price <= 0 || stock < 0) {
            showToast('Please fill all required fields correctly', 'error');
            return;
        }

        const newProduct = {
            name,
            price,
            originalPrice: originalPrice || null,
            quantity: stock,
            image: image || '',
            orders: 0
        };

        database.ref('products').push().set(newProduct, (error) => {
            if (error) {
                showToast('Error adding product: ' + error.message, 'error');
            } else {
                showToast('Product added successfully!', 'success');
                document.getElementById('productName').value = '';
                document.getElementById('productPrice').value = '';
                document.getElementById('productOriginalPrice').value = '';
                document.getElementById('productStock').value = '';
                document.getElementById('productImage').value = '';
            }
        });
    }

    function editProduct(id) {
        const product = products.find(p => p.id === id);
        if (!product) return;

        currentEditId = id;
        document.getElementById('editProductName').value = product.name;
        document.getElementById('editProductPrice').value = product.price;
        document.getElementById('editProductOriginalPrice').value = product.originalPrice || '';
        document.getElementById('editProductStock').value = product.quantity;
        document.getElementById('editProductImage').value = product.image || '';

        document.getElementById('editModal').classList.add('active');
    }

    function updateProduct() {
        if (!currentEditId) return;

        const name = document.getElementById('editProductName').value.trim();
        const price = parseFloat(document.getElementById('editProductPrice').value) || 0;
        const originalPrice = parseFloat(document.getElementById('editProductOriginalPrice').value) || null;
        const stock = parseFloat(document.getElementById('editProductStock').value) || 0;
        const image = document.getElementById('editProductImage').value.trim();

        if (!name || price <= 0) {
            showToast('Invalid input', 'error');
            return;
        }

        const updated = {
            name,
            price,
            originalPrice: originalPrice || null,
            quantity: stock,
            image
        };

        database.ref('products/' + currentEditId).update(updated, (error) => {
            if (error) {
                showToast('Error updating: ' + error.message, 'error');
            } else {
                showToast('Product updated!', 'success');
                closeEditModal();
            }
        });
    }

    function deleteProduct() {
        if (!currentEditId || !confirm('Are you sure?')) return;

        database.ref('products/' + currentEditId).remove((error) => {
            if (error) {
                showToast('Error deleting: ' + error.message, 'error');
            } else {
                showToast('Product deleted!', 'success');
                closeEditModal();
            }
        });
    }

    function closeEditModal() {
        document.getElementById('editModal').classList.remove('active');
        currentEditId = null;
    }

    // ============ ORDERS ============
    function loadOrders() {
        database.ref('orders').on('value', (snapshot) => {
            const data = snapshot.val();
            orders = [];
            if (data) {
                Object.entries(data).forEach(([key, value]) => {
                    orders.push({ id: key, ...value });
                });
            }
            orders.sort((a, b) => b.timestamp - a.timestamp);
            renderOrders();
            updateDashboard();
        });
    }

    function renderOrders() {
        const container = document.getElementById('ordersList');
        if (orders.length === 0) {
            container.innerHTML = '<div class="empty-state">No orders yet</div>';
            return;
        }

        container.innerHTML = orders.map(order => {
            const itemsList = order.items.map(item => 
                `<div class="item"><span class="item-name">${item.name} × ${item.quantity}</span><span class="item-price">৳${(item.price * item.quantity).toLocaleString('en-BD')}</span></div>`
            ).join('');

            return `
                <div class="order-card">
                    <div class="order-header">
                        <div class="order-id">Order #${order.id.substring(0, 8).toUpperCase()}</div>
                        <span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span>
                    </div>
                    <div class="order-details">
                        <div class="detail-item">
                            <div class="detail-label">Customer</div>
                            <div class="detail-value">${order.customerName}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Phone</div>
                            <div class="detail-value">${order.customerPhone}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Email</div>
                            <div class="detail-value">${order.customerEmail}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Date</div>
                            <div class="detail-value">${order.date}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Address</div>
                            <div class="detail-value">${order.customerAddress}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Total</div>
                            <div class="detail-value">৳${order.total.toLocaleString('en-BD')}</div>
                        </div>
                    </div>
                    <div class="items-list">
                        <div style="font-weight:600;margin-bottom:0.75rem;">Items:</div>
                        ${itemsList}
                    </div>
                    ${order.orderNotes ? `<p><strong>Notes:</strong> ${order.orderNotes}</p>` : ''}
                </div>
            `;
        }).join('');
    }

    // ============ DASHBOARD ============
    function updateDashboard() {
        document.getElementById('totalProducts').textContent = products.length;
        document.getElementById('totalOrders').textContent = orders.length;
        document.getElementById('pendingOrders').textContent = orders.filter(o => o.status === 'Pending').length;

        const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        document.getElementById('totalRevenue').textContent = '৳' + revenue.toLocaleString('en-BD');

        const dashTable = document.getElementById('dashboardProducts');
        if (products.length === 0) {
            dashTable.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;">No products</td></tr>';
        } else {
            dashTable.innerHTML = products.slice(0, 5).map(p => `
                <tr>
                    <td>${p.name}</td>
                    <td>৳${p.price.toLocaleString('en-BD')}</td>
                    <td>${p.quantity}</td>
                    <td>${p.orders || 0}</td>
                </tr>
            `).join('');
        }
    }

    // ============ NAVIGATION ============
    function showSection(sectionId, evt) {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-menu button').forEach(b => b.classList.remove('active'));

        document.getElementById(sectionId).classList.add('active');
        if (evt && evt.target) {
            evt.target.classList.add('active');
        }
    }

    function logout() {
        sessionStorage.removeItem('pgzAdmin');
        window.location.href = '/';
    }

    // ============ TOAST ============
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
