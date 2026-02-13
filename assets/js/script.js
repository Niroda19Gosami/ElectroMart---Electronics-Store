/* ===========================
   ElectroMart - UI JS (DOM only)
   - Scroll to top
   - Smooth nav scrolling
   - IntersectionObserver reveal
   - Cart state + counter
   - Quick view modal fill
   =========================== */

(function () {
  "use strict";

  function qs(sel, parent) { return (parent || document).querySelector(sel); }
  function qsa(sel, parent) { return Array.from((parent || document).querySelectorAll(sel)); }

  var CART_STORAGE_KEY = "electromart_cart_v1";
  var WISHLIST_STORAGE_KEY = "electromart_wishlist_v1";
  var ORDERS_STORAGE_KEY = "electromart_orders_v1";

  function formatPrice(value){
    return "\u20B9" + Number(value || 0).toLocaleString("en-IN");
  }

  function parsePrice(value){
    var cleaned = String(value || "").replace(/[^\d.]/g, "");
    var amount = Number(cleaned);
    return Number.isFinite(amount) ? amount : 0;
  }

  function slugify(value){
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function clampQty(value){
    var qty = parseInt(value, 10);
    if (!Number.isFinite(qty)) return 1;
    if (qty < 1) return 1;
    if (qty > 5) return 5;
    return qty;
  }

  function parseProductIdFromUrl(url){
    if(!url) return "";
    try {
      var full = new URL(url, window.location.href);
      return full.searchParams.get("product") || "";
    } catch (err) {
      return "";
    }
  }

  function sanitizeCategory(raw){
    var category = String(raw || "").replace(/\s+/g, " ").trim();
    if(!category) return "Products";
    return category.split(/•|â€¢/)[0].trim() || "Products";
  }

  function readCart(){
    try {
      var raw = window.localStorage.getItem(CART_STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      if(!Array.isArray(parsed)) return [];
      return parsed
        .map(function(item){
          return {
            id: String(item.id || "").trim(),
            title: String(item.title || "Product").trim(),
            category: sanitizeCategory(item.category),
            image: String(item.image || "").trim(),
            price: parsePrice(item.price),
            qty: clampQty(item.qty),
            detailUrl: String(item.detailUrl || "product-details.html").trim()
          };
        })
        .filter(function(item){ return Boolean(item.id) && item.price > 0; });
    } catch (err) {
      return [];
    }
  }

  function getCartCount(items){
    return (items || []).reduce(function(sum, item){
      return sum + clampQty(item.qty);
    }, 0);
  }

  function setCartCount(value){
    var count = String(Math.max(0, Number(value) || 0));
    qsa("[data-cart-count]").forEach(function(node){
      node.textContent = count;
    });
  }

  function writeCart(items){
    var normalized = (items || []).map(function(item){
      return {
        id: String(item.id || "").trim(),
        title: String(item.title || "Product").trim(),
        category: sanitizeCategory(item.category),
        image: String(item.image || "").trim(),
        price: parsePrice(item.price),
        qty: clampQty(item.qty),
        detailUrl: String(item.detailUrl || "product-details.html").trim()
      };
    }).filter(function(item){ return Boolean(item.id) && item.price > 0; });

    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalized));
    } catch (err) {
      // keep UI usable even if storage fails
    }

    setCartCount(getCartCount(normalized));
    return normalized;
  }

  function normalizeWishlistItem(item){
    return {
      id: String(item.id || "").trim(),
      title: String(item.title || "Product").trim(),
      category: sanitizeCategory(item.category),
      image: String(item.image || "").trim(),
      price: parsePrice(item.price),
      detailUrl: String(item.detailUrl || "product-details.html").trim()
    };
  }

  function readWishlist(){
    try {
      var raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      if(!Array.isArray(parsed)) return [];
      return parsed
        .map(normalizeWishlistItem)
        .filter(function(item){ return Boolean(item.id) && item.price > 0; });
    } catch (err) {
      return [];
    }
  }

  function writeWishlist(items){
    var normalized = (items || [])
      .map(normalizeWishlistItem)
      .filter(function(item){ return Boolean(item.id) && item.price > 0; });
    try {
      window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(normalized));
    } catch (err) {
      // keep UI usable even if storage fails
    }
    return normalized;
  }

  function isWishlisted(productId){
    if(!productId) return false;
    return readWishlist().some(function(item){ return item.id === productId; });
  }

  function toggleWishlistItem(product){
    if(!product || !product.id) return false;
    var items = readWishlist();
    var idx = items.findIndex(function(item){ return item.id === product.id; });
    if(idx === -1){
      items.unshift(normalizeWishlistItem(product));
      writeWishlist(items);
      return true;
    }
    items.splice(idx, 1);
    writeWishlist(items);
    return false;
  }

  function removeWishlistItemById(productId){
    if(!productId) return;
    var items = readWishlist().filter(function(item){ return item.id !== productId; });
    writeWishlist(items);
  }

  function normalizeOrderItem(item){
    return {
      orderId: String(item.orderId || "").trim(),
      productId: String(item.productId || "").trim(),
      title: String(item.title || "Product").trim(),
      date: String(item.date || "").trim(),
      status: "Delivered",
      total: parsePrice(item.total),
      detailUrl: String(item.detailUrl || "product-details.html").trim()
    };
  }

  function readOrders(){
    try {
      var raw = window.localStorage.getItem(ORDERS_STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      if(!Array.isArray(parsed)) return [];
      return parsed
        .map(normalizeOrderItem)
        .filter(function(item){
          return Boolean(item.orderId) && Boolean(item.title) && item.total > 0;
        });
    } catch (err) {
      return [];
    }
  }

  function writeOrders(items){
    var normalized = (items || [])
      .map(normalizeOrderItem)
      .filter(function(item){
        return Boolean(item.orderId) && Boolean(item.title) && item.total > 0;
      });
    try {
      window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(normalized));
    } catch (err) {
      // keep UI usable even if storage fails
    }
    return normalized;
  }

  function getQtyFromScope(scope){
    var input = qs("[data-qty]", scope || document);
    return input ? clampQty(input.value) : 1;
  }

  function getProductFromCard(card){
    if(!card) return null;

    var title = ((qs(".product-title", card) || {}).textContent || "").trim();
    var category = sanitizeCategory((qs(".product-meta", card) || {}).textContent || "Products");
    var price = parsePrice((qs(".product-price", card) || {}).textContent || "0");
    var image = ((qs("img", card) || {}).src || "").trim();

    var linkEl = qs("[data-product-link]", card) || qs('a[href*="product-details"]', card);
    var detailUrl = linkEl ? (linkEl.getAttribute("href") || "product-details.html") : "product-details.html";

    var explicitId = card.getAttribute("data-product-id") || "";
    var idFromUrl = parseProductIdFromUrl(detailUrl);
    var productId = explicitId || idFromUrl || slugify(title);

    if(!productId || !title || price <= 0) return null;

    return {
      id: productId,
      title: title,
      category: category,
      image: image,
      price: price,
      detailUrl: detailUrl
    };
  }

  function setWishlistButtonState(button, isActive){
    if(!button) return;
    button.classList.toggle("active", Boolean(isActive));
    var icon = qs("i", button);
    if(!icon) return;
    icon.classList.toggle("bi-heart", !isActive);
    icon.classList.toggle("bi-heart-fill", Boolean(isActive));
  }

  function syncWishlistButtons(){
    qsa("[data-wishlist]").forEach(function(button){
      var card = button.closest("[data-product-item], .product-card");
      var product = getProductFromCard(card);
      var active = Boolean(product && isWishlisted(product.id));
      setWishlistButtonState(button, active);
    });
  }

  function getProductFromQuickView(modal){
    if(!modal) return null;

    var title = ((qs("#qvTitle", modal) || {}).textContent || "").trim();
    var category = sanitizeCategory((qs("#qvCat", modal) || {}).textContent || "Products");
    var price = parsePrice((qs("#qvPrice", modal) || {}).textContent || "0");
    var image = ((qs("#qvImg", modal) || {}).src || "").trim();
    var detailEl = qs("[data-qv-details]", modal);
    var detailUrl = detailEl ? (detailEl.getAttribute("href") || "product-details.html") : "product-details.html";
    var productId = parseProductIdFromUrl(detailUrl) || slugify(title);

    if(!productId || !title || price <= 0) return null;

    return {
      id: productId,
      title: title,
      category: category,
      image: image,
      price: price,
      detailUrl: detailUrl
    };
  }

  function getProductFromPdp(page){
    if(!page) return null;

    var params;
    try { params = new URLSearchParams(window.location.search); }
    catch (err) { params = new URLSearchParams(""); }

    var id = params.get("product") || "";
    var title = ((qs("[data-pd-title]", page) || {}).textContent || "").trim();
    var category = sanitizeCategory((qs("[data-pd-category]", page) || {}).textContent || "Products");
    var price = parsePrice((qs("[data-pd-price]", page) || {}).textContent || "0");
    var image = ((qs("#pdMain", page) || {}).src || "").trim();

    if(!id) id = slugify(title);
    if(!id || !title || price <= 0) return null;

    return {
      id: id,
      title: title,
      category: category,
      image: image,
      price: price,
      detailUrl: "product-details.html?product=" + encodeURIComponent(id)
    };
  }

  function resolveProductFromTrigger(trigger){
    var modal = trigger.closest("#quickViewModal");
    if(modal){
      return {
        product: getProductFromQuickView(modal),
        qty: 1
      };
    }

    var pdPage = trigger.closest("[data-product-details-page]");
    if(pdPage){
      return {
        product: getProductFromPdp(pdPage),
        qty: getQtyFromScope(pdPage)
      };
    }

    var card = trigger.closest("[data-product-item], .product-card");
    return {
      product: getProductFromCard(card),
      qty: 1
    };
  }

  function addProductToCart(product, qty){
    if(!product || !product.id) return false;

    var amount = clampQty(qty);
    var items = readCart();
    var existing = items.find(function(item){ return item.id === product.id; });

    if(existing){
      existing.qty = Math.min(5, clampQty(existing.qty) + amount);
      existing.title = product.title;
      existing.category = product.category;
      existing.image = product.image;
      existing.price = product.price;
      existing.detailUrl = product.detailUrl;
    } else {
      items.push({
        id: product.id,
        title: product.title,
        category: product.category,
        image: product.image,
        price: product.price,
        qty: amount,
        detailUrl: product.detailUrl
      });
    }

    writeCart(items);
    return true;
  }

  function addToCartFromTrigger(trigger){
    var resolved = resolveProductFromTrigger(trigger);
    if(!resolved || !resolved.product) return false;
    return addProductToCart(resolved.product, resolved.qty);
  }

  function formatOrderDate(date){
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function buildOrderId(seed){
    var value = Math.abs(Number(seed) || Date.now()) % 1000000;
    return "EM-" + String(value).padStart(6, "0");
  }

  function placeOrderFromCart(){
    var items = readCart();
    if(!items.length) return false;

    var orders = readOrders();
    var now = new Date();
    var dateText = formatOrderDate(now);
    var baseSeed = now.getTime() % 1000000;

    items.forEach(function(item, idx){
      orders.unshift({
        orderId: buildOrderId(baseSeed + idx),
        productId: item.id,
        title: item.title,
        date: dateText,
        status: "Delivered",
        total: item.price * clampQty(item.qty),
        detailUrl: item.detailUrl
      });
    });

    writeOrders(orders);
    writeCart([]);
    return true;
  }

  function showAddFeedback(button){
    if(!button || button.tagName !== "BUTTON") return;

    button.classList.add("disabled");
    var previous = button.innerHTML;
    button.innerHTML = '<i class="bi bi-check2 me-2"></i>Added';

    setTimeout(function(){
      button.classList.remove("disabled");
      button.innerHTML = previous;
    }, 900);
  }

  function escapeHtml(value){
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderAccountOrders(){
    var tbody = qs("[data-account-orders-body]");
    if(!tbody) return;

    var orders = readOrders();
    if(!orders.length){
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No recent orders yet.</td></tr>';
      return;
    }

    tbody.innerHTML = orders.slice(0, 10).map(function(order){
      return [
        "<tr>",
        "  <td><div><strong>" + escapeHtml(order.orderId) + "</strong></div><div class=\"small text-muted\">" + escapeHtml(order.title) + "</div></td>",
        "  <td>" + escapeHtml(order.date) + "</td>",
        "  <td><span class=\"badge text-bg-success\">Delivered</span></td>",
        "  <td>" + formatPrice(order.total) + "</td>",
        "</tr>"
      ].join("");
    }).join("");
  }

  function renderAccountWishlist(){
    var list = qs("[data-account-wishlist-list]");
    if(!list) return;

    var emptyState = qs("[data-account-wishlist-empty]");
    var items = readWishlist();

    if(!items.length){
      list.innerHTML = "";
      if(emptyState) emptyState.classList.remove("d-none");
      return;
    }

    if(emptyState) emptyState.classList.add("d-none");
    list.innerHTML = items.map(function(item){
      return [
        '<div class="col-md-6" data-account-wishlist-item-id="' + escapeHtml(item.id) + '">',
        '  <div class="spec-item d-flex justify-content-between align-items-center gap-2">',
        "    <div>",
        '      <a class="text-reset text-decoration-none d-block" href="' + escapeHtml(item.detailUrl) + '">' + escapeHtml(item.title) + "</a>",
        "      <strong>" + formatPrice(item.price) + "</strong>",
        "    </div>",
        '    <div class="d-flex gap-2">',
        '      <button class="btn btn-outline-dark btn-sm" type="button" data-account-wishlist-add="' + escapeHtml(item.id) + '">Add to Cart</button>',
        '      <button class="btn btn-outline-danger btn-sm" type="button" data-account-wishlist-remove="' + escapeHtml(item.id) + '" aria-label="Remove from wishlist"><i class="bi bi-x-lg"></i></button>',
        "    </div>",
        "  </div>",
        "</div>"
      ].join("");
    }).join("");
  }

  function renderAccountDashboard(){
    var totalOrdersEl = qs("[data-account-total-orders]");
    var wishlistCountEl = qs("[data-account-wishlist-count]");

    var ordersCount = readOrders().length;
    var wishlistCount = readWishlist().length;

    if(totalOrdersEl) totalOrdersEl.textContent = String(ordersCount);
    if(wishlistCountEl) wishlistCountEl.textContent = String(wishlistCount) + " Items";
  }

  function renderAccountSection(){
    if(!qs("[data-account-total-orders]") &&
       !qs("[data-account-orders-body]") &&
       !qs("[data-account-wishlist-list]")){
      return;
    }
    renderAccountDashboard();
    renderAccountOrders();
    renderAccountWishlist();
  }

  function renderCartRow(item){
    return [
      '<tr data-cart-item-id="' + escapeHtml(item.id) + '">',
      '  <td>',
      '    <div class="d-flex gap-3 align-items-center">',
      '      <a href="' + escapeHtml(item.detailUrl) + '">',
      '        <img src="' + escapeHtml(item.image) + '" class="rounded-3" width="70" height="70" alt="' + escapeHtml(item.title) + '" loading="lazy">',
      '      </a>',
      '      <div>',
      '        <a class="text-reset text-decoration-none" href="' + escapeHtml(item.detailUrl) + '"><strong>' + escapeHtml(item.title) + '</strong></a>',
      '        <div class="text-muted small">' + escapeHtml(item.category) + '</div>',
      '      </div>',
      '    </div>',
      '  </td>',
      '  <td>',
      '    <div class="input-group input-group-sm">',
      '      <button class="btn btn-outline-dark" type="button" data-cart-qty-minus>-</button>',
      '      <input class="form-control text-center" value="' + clampQty(item.qty) + '" data-cart-qty readonly>',
      '      <button class="btn btn-outline-dark" type="button" data-cart-qty-plus>+</button>',
      '    </div>',
      '  </td>',
      '  <td><span class="product-price">' + formatPrice(item.price * clampQty(item.qty)) + '</span></td>',
      '  <td><button class="btn btn-outline-danger btn-sm" type="button" data-cart-remove aria-label="Remove item"><i class="bi bi-x-lg"></i></button></td>',
      '</tr>'
    ].join("");
  }

  function renderCartPage(){
    var tbody = qs("[data-cart-items]");
    if(!tbody) return;

    var emptyState = qs("[data-cart-empty]");
    var subtotalEl = qs("[data-cart-subtotal]");
    var discountEl = qs("[data-cart-discount]");
    var totalEl = qs("[data-cart-total]");
    var checkoutBtn = qs("[data-cart-checkout]");

    var items = readCart();
    var subtotal = items.reduce(function(sum, item){
      return sum + (item.price * clampQty(item.qty));
    }, 0);
    var discount = 0;
    var total = Math.max(0, subtotal - discount);

    if(!items.length){
      tbody.innerHTML = "";
      if(emptyState) emptyState.classList.remove("d-none");
      if(subtotalEl) subtotalEl.textContent = formatPrice(0);
      if(discountEl) discountEl.textContent = "-" + formatPrice(0);
      if(totalEl) totalEl.textContent = formatPrice(0);
      if(checkoutBtn){
        checkoutBtn.classList.add("disabled");
        checkoutBtn.setAttribute("aria-disabled", "true");
      }
      return;
    }

    if(emptyState) emptyState.classList.add("d-none");
    tbody.innerHTML = items.map(renderCartRow).join("");

    if(subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
    if(discountEl) discountEl.textContent = "-" + formatPrice(discount);
    if(totalEl) totalEl.textContent = formatPrice(total);
    if(checkoutBtn){
      checkoutBtn.classList.remove("disabled");
      checkoutBtn.removeAttribute("aria-disabled");
    }
  }

  // Scroll Top Button
  var scrollTopBtn = qs("#scrollTopBtn");

  function toggleScrollTop() {
    if (!scrollTopBtn) return;
    if (window.scrollY > 500) scrollTopBtn.classList.add("show");
    else scrollTopBtn.classList.remove("show");
  }

  if (scrollTopBtn) {
    scrollTopBtn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
  window.addEventListener("scroll", toggleScrollTop);

  function updateScrollRing(){
    if (!scrollTopBtn) return;
    var doc = document.documentElement;
    var total = Math.max(1, doc.scrollHeight - window.innerHeight);
    var pct = Math.round((window.scrollY / total) * 100);
    scrollTopBtn.style.setProperty("--scroll", pct + "%");
  }

  window.addEventListener("scroll", updateScrollRing);
  updateScrollRing();
  toggleScrollTop();

  // Smooth Scroll for in-page nav links
  qsa('a.nav-link[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var targetId = link.getAttribute("href");
      var targetEl = qs(targetId);
      if (!targetEl) return;

      e.preventDefault();
      var headerOffset = 80;
      var rect = targetEl.getBoundingClientRect();
      var offsetTop = rect.top + window.scrollY - headerOffset;

      window.scrollTo({ top: offsetTop, behavior: "smooth" });

      var navCollapse = qs("#mainNav");
      if (navCollapse && navCollapse.classList.contains("show")) {
        var toggler = qs(".navbar-toggler");
        if (toggler) toggler.click();
      }
    });
  });

  // Reveal on Scroll
  var revealEls = qsa(".reveal");
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("active"); });
  }

  // Initialize cart badge from storage
  setCartCount(getCartCount(readCart()));
  syncWishlistButtons();
  renderAccountSection();

  // Add to Cart buttons
  document.addEventListener("click", function(event){
    var btn = event.target.closest("[data-add-to-cart]");
    if(!btn) return;

    if(addToCartFromTrigger(btn)){
      showAddFeedback(btn);
      renderCartPage();
      renderAccountSection();
    }
  });

  // Buy Now should add current product before redirect
  document.addEventListener("click", function(event){
    var btn = event.target.closest("[data-buy-now]");
    if(!btn) return;
    addToCartFromTrigger(btn);
  });

  // Wishlist toggle buttons from product cards
  document.addEventListener("click", function(event){
    var btn = event.target.closest("[data-wishlist]");
    if(!btn) return;

    var card = btn.closest("[data-product-item], .product-card");
    var product = getProductFromCard(card);
    if(!product) return;

    toggleWishlistItem(product);
    syncWishlistButtons();
    renderAccountSection();
  });

  // Place order from cart/checkout and update account recent orders
  document.addEventListener("click", function(event){
    var cartCheckout = event.target.closest("[data-cart-checkout]");
    if(cartCheckout){
      event.preventDefault();
      if(placeOrderFromCart()){
        renderCartPage();
        renderAccountSection();
        window.location.href = "account.html#orders";
      }
      return;
    }

    var placeOrderBtn = event.target.closest("[data-place-order]");
    if(!placeOrderBtn) return;
    event.preventDefault();
    if(placeOrderFromCart()){
      renderCartPage();
      renderAccountSection();
      window.location.href = "account.html#orders";
    }
  });

  // Account wishlist actions
  document.addEventListener("click", function(event){
    var removeBtn = event.target.closest("[data-account-wishlist-remove]");
    if(removeBtn){
      var removeId = removeBtn.getAttribute("data-account-wishlist-remove");
      removeWishlistItemById(removeId);
      renderAccountSection();
      syncWishlistButtons();
      return;
    }

    var addBtn = event.target.closest("[data-account-wishlist-add]");
    if(!addBtn) return;
    var addId = addBtn.getAttribute("data-account-wishlist-add");
    var item = readWishlist().find(function(entry){ return entry.id === addId; });
    if(!item) return;
    if(addProductToCart(item, 1)){
      showAddFeedback(addBtn);
      renderCartPage();
    }
  });

  // Quick view modal
  var qvModalEl = qs("#quickViewModal");
  if (qvModalEl && window.bootstrap) {
    var qvModal = new window.bootstrap.Modal(qvModalEl);

    function getCardData(card){
      var cat = (qs(".product-meta", card) || {}).textContent || "Category";
      var title = (qs(".product-title", card) || {}).textContent || "Product";
      var price = (qs(".product-price", card) || {}).textContent || "\u20B90";
      var rating = (qs(".product-rating", card) || {}).textContent || "4.5";
      var img = (qs("img", card) || {}).src || "";
      var detailLink = qs("[data-product-link]", card) || qs('a[href*="product-details"]', card);
      var detailUrl = detailLink ? detailLink.getAttribute("href") : "product-details.html";

      return {
        cat: cat.trim(),
        title: title.trim(),
        price: price.trim(),
        rating: rating.trim(),
        img: img,
        detailUrl: detailUrl
      };
    }

    function openQuickView(card){
      if(!card) return;
      var data = getCardData(card);

      var qvImg = qs("#qvImg");
      var qvCat = qs("#qvCat");
      var qvTitle = qs("#qvTitle");
      var qvPrice = qs("#qvPrice");
      var qvRating = qs("#qvRating");
      var qvDetails = qs("[data-qv-details]");

      if(qvImg) qvImg.src = data.img;
      if(qvCat) qvCat.textContent = data.cat;
      if(qvTitle) qvTitle.textContent = data.title;
      if(qvPrice) qvPrice.textContent = data.price;
      if(qvRating) qvRating.textContent = data.rating;
      if(qvDetails) qvDetails.setAttribute("href", data.detailUrl);

      qvModal.show();
    }

    document.addEventListener("click", function(event){
      var trigger = event.target.closest("[data-quickview]");
      if(trigger){
        event.preventDefault();
        openQuickView(trigger.closest(".product-card"));
        return;
      }

      var card = event.target.closest("[data-quickview-card]");
      if(!card) return;
      if(event.target.closest("[data-add-to-cart], [data-wishlist], .product-actions, a, button")) return;

      event.preventDefault();
      openQuickView(card);
    });
  }

  // Cart page interactions
  renderCartPage();

  document.addEventListener("click", function(event){
    var actionBtn = event.target.closest("[data-cart-qty-minus], [data-cart-qty-plus], [data-cart-remove]");
    if(!actionBtn) return;

    var row = actionBtn.closest("[data-cart-item-id]");
    if(!row) return;

    var itemId = row.getAttribute("data-cart-item-id");
    if(!itemId) return;

    var items = readCart();
    var index = items.findIndex(function(item){ return item.id === itemId; });
    if(index === -1) return;

    if(actionBtn.hasAttribute("data-cart-remove")){
      items.splice(index, 1);
    } else if(actionBtn.hasAttribute("data-cart-qty-minus")){
      if(clampQty(items[index].qty) <= 1) items.splice(index, 1);
      else items[index].qty = clampQty(items[index].qty) - 1;
    } else if(actionBtn.hasAttribute("data-cart-qty-plus")){
      items[index].qty = Math.min(5, clampQty(items[index].qty) + 1);
    }

    writeCart(items);
    renderCartPage();
  });

})();


// PDP thumbnails + qty controls (shared)
(function(){
  function qs(sel, parent){ return (parent||document).querySelector(sel); }
  function qsa(sel, parent){ return Array.from((parent||document).querySelectorAll(sel)); }

  // thumbnails
  var main = qs("#pdMain");
  if(main){
    qsa("[data-thumb]").forEach(function(btn){
      btn.addEventListener("click", function(){
        var src = btn.getAttribute("data-thumb");
        if(src) main.src = src;
      });
    });
  }

  // qty
  function bindQty(scope){
    var minus = qs("[data-qty-minus]", scope);
    var plus  = qs("[data-qty-plus]", scope);
    var input = qs("[data-qty]", scope);
    if(!input) return;

    function getVal(){
      var v = parseInt(input.value, 10);
      if(!Number.isFinite(v) || v < 1) return 1;
      if(v > 5) return 5;
      return v;
    }

    function syncInput(){
      input.value = String(getVal());
    }

    if(minus) minus.addEventListener("click", function(){ input.value = String(Math.max(1, getVal() - 1)); });
    if(plus)  plus.addEventListener("click", function(){ input.value = String(Math.min(5, getVal() + 1)); });
    input.addEventListener("input", syncInput);
    input.addEventListener("blur", syncInput);
    syncInput();
  }
  // bind all qty groups in page
  qsa("body").forEach(function(b){ bindQty(b); });
})();


// PLP filters + sorting (products.html)
(function(){
  function qs(sel, parent){ return (parent||document).querySelector(sel); }
  function qsa(sel, parent){ return Array.from((parent||document).querySelectorAll(sel)); }

  var grid = qs("[data-products-grid]");
  if(!grid) return;

  var imageFiles = [
    "amazon-smart-home.jpg",
    "apple-14-mobile.jpg",
    "apple-watch.jpg",
    "Apple-WWDC22-MacBook-Air-hero-220606_big.jpg.large.jpg",
    "artis-audio.jpg",
    "asus-rog-gaming-2.jpg",
    "asus-rog-gaming-3.jpg",
    "asus-rog-gaming.jpg",
    "asus-vivobook-laptop.jpg",
    "boat-earpods-2.jpg",
    "boat-earpods-3.jpg",
    "boat-earpods.jpg",
    "con-nb-felicette-23c1-pavilion-15-eh3000-product-image.jpg",
    "hp paviloin.jpg",
    "iPhone_14_Pro_Max_Deep_Purple_PDP.jpg",
    "jbl-audio-system.jpg",
    "led-smart-bulb.jpg",
    "nava-gam9ing-2.jpg",
    "noise-audio.jpg",
    "noise-headphone.jpg",
    "noise-watch 3.jpg",
    "noise-watch-2.jpg",
    "noise-watch.jpg",
    "nova-gaming.jpg",
    "Nova-mobile-2.jpg",
    "Nova-mobile.jpg",
    "nova-watch-2.jpg",
    "nova-watch.jpg",
    "pavilion-hp.jpg",
    "realme-narzo-60-pro-5g-unbox-triveni-world-1.jpg",
    "samsung mobile 2.jpg",
    "samsung mobile S24.jpg",
    "samsung-mobile-1.jpg",
    "samsung-mobile-galaaxy.jpg",
    "samsung-smart-home.jpg",
    "samsung-watch.jpg",
    "smart-home-product.jpg",
    "smart-home.png",
    "sony-headphone.jpg",
    "sony-playstation.jpg",
    "vivo mobile 2.jpg",
    "vivo v29.jpg",
    "vivo-mobile.jpg",
    "x-box-playstation.jpg",
    "xaomi 14 mobile 2.jpg",
    "xaomi 14.jpg",
    "xaomi-led-smart-home.jpg",
    "xs9320t-cnb-00005ff090-sl-oled.jpg",
    "zenbook-laptop.jpg"
  ];

  var brandLabels = {
    apple: "Apple",
    samsung: "Samsung",
    vivo: "Vivo",
    xiaomi: "Xiaomi",
    realme: "Realme",
    asus: "Asus",
    hp: "HP",
    dell: "Dell",
    sony: "Sony",
    boat: "boAt",
    noise: "Noise",
    jbl: "JBL",
    artis: "Artis",
    amazon: "Amazon",
    nova: "Nova"
  };

  var categoryLabels = {
    smartphones: "Smartphones",
    laptops: "Laptops",
    audio: "Audio",
    gaming: "Gaming",
    wearables: "Wearables",
    smarthome: "Smart Home"
  };

  var detailByBrand = {
    apple: "apple-iphone14-pro-max",
    samsung: "samsung-galaxy-s24",
    vivo: "vivo-v29",
    xiaomi: "xiaomi-14",
    realme: "xiaomi-14",
    asus: "asus-rog-zephyrus",
    hp: "hp-pavilion-15",
    dell: "hp-pavilion-15",
    sony: "sony-wh-xb",
    boat: "sony-wh-xb",
    noise: "sony-wh-xb",
    jbl: "sony-wh-xb",
    artis: "sony-wh-xb",
    amazon: "amazon-echo-smart",
    nova: "vivo-v29"
  };

  function hashString(value){
    var hash = 0;
    var input = String(value || "");
    for(var i = 0; i < input.length; i += 1){
      hash = (hash * 31 + input.charCodeAt(i)) % 1000003;
    }
    return hash;
  }

  function slugify(value){
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function toTitleCase(value){
    return String(value || "").replace(/\b\w/g, function(ch){ return ch.toUpperCase(); });
  }

  function trimText(value, max){
    var text = String(value || "").trim();
    if(text.length <= max) return text;
    return text.slice(0, Math.max(0, max - 3)).trim() + "...";
  }

  function escapeHtml(value){
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function detectBrand(fileLower){
    if(fileLower.indexOf("iphone") !== -1 || fileLower.indexOf("apple") !== -1 || fileLower.indexOf("macbook") !== -1) return "apple";
    if(fileLower.indexOf("samsung") !== -1) return "samsung";
    if(fileLower.indexOf("vivo") !== -1) return "vivo";
    if(fileLower.indexOf("xaomi") !== -1 || fileLower.indexOf("xiaomi") !== -1) return "xiaomi";
    if(fileLower.indexOf("realme") !== -1) return "realme";
    if(fileLower.indexOf("asus") !== -1 || fileLower.indexOf("zenbook") !== -1) return "asus";
    if(fileLower.indexOf("pavilion") !== -1 || fileLower.indexOf(" hp") !== -1 || fileLower.indexOf("hp ") !== -1 || fileLower.indexOf("hp.") !== -1 || fileLower.indexOf("hp-") !== -1 || fileLower.indexOf("hp_") !== -1 || fileLower.indexOf("hp") === 0) return "hp";
    if(fileLower.indexOf("xs9320") !== -1 || fileLower.indexOf("dell") !== -1 || fileLower.indexOf("xps") !== -1) return "dell";
    if(fileLower.indexOf("sony") !== -1 || fileLower.indexOf("playstation") !== -1 || fileLower.indexOf("x-box") !== -1) return "sony";
    if(fileLower.indexOf("boat") !== -1) return "boat";
    if(fileLower.indexOf("noise") !== -1) return "noise";
    if(fileLower.indexOf("jbl") !== -1) return "jbl";
    if(fileLower.indexOf("artis") !== -1) return "artis";
    if(fileLower.indexOf("nova") !== -1 || fileLower.indexOf("nava") !== -1) return "nova";
    if(fileLower.indexOf("amazon") !== -1 || fileLower.indexOf("smart-home") !== -1 || fileLower.indexOf("bulb") !== -1) return "amazon";
    return "amazon";
  }

  function detectCategory(fileLower){
    if(fileLower.indexOf("watch") !== -1) return "wearables";
    if(fileLower.indexOf("audio") !== -1 || fileLower.indexOf("earpod") !== -1 || fileLower.indexOf("headphone") !== -1) return "audio";
    if(fileLower.indexOf("gaming") !== -1 || fileLower.indexOf("playstation") !== -1 || fileLower.indexOf("x-box") !== -1) return "gaming";
    if(fileLower.indexOf("smart-home") !== -1 || fileLower.indexOf("bulb") !== -1) return "smarthome";
    if(fileLower.indexOf("laptop") !== -1 || fileLower.indexOf("macbook") !== -1 || fileLower.indexOf("zenbook") !== -1 || fileLower.indexOf("pavilion") !== -1 || fileLower.indexOf("xs9320") !== -1 || fileLower.indexOf("nb") !== -1) return "laptops";
    return "smartphones";
  }

  function getPrice(category, seed){
    var ranges = {
      smartphones: { min: 11999, max: 129900, step: 500 },
      laptops: { min: 45990, max: 149990, step: 500 },
      audio: { min: 999, max: 28999, step: 100 },
      gaming: { min: 7999, max: 129990, step: 500 },
      wearables: { min: 1499, max: 44999, step: 100 },
      smarthome: { min: 899, max: 39999, step: 100 }
    };

    var range = ranges[category] || ranges.smartphones;
    var hash = hashString(seed);
    var steps = Math.max(1, Math.floor((range.max - range.min) / range.step));
    return range.min + (hash % steps) * range.step;
  }

  function getRating(seed){
    var hash = hashString(seed);
    return Number((4 + ((hash % 10) / 10)).toFixed(1));
  }

  function getReadableName(fileName, brandLabel){
    var base = String(fileName || "")
      .replace(/\.[^.]+$/g, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    base = toTitleCase(base);
    if(base.toLowerCase().indexOf(brandLabel.toLowerCase()) !== 0){
      base = brandLabel + " " + base;
    }
    return base;
  }

  function formatPrice(value){
    return "\u20B9" + Number(value || 0).toLocaleString("en-IN");
  }

  function buildProduct(fileName, order){
    var fileLower = String(fileName || "").toLowerCase();
    var brand = detectBrand(fileLower);
    var category = detectCategory(fileLower);
    var brandLabel = brandLabels[brand] || toTitleCase(brand);
    var categoryLabel = categoryLabels[category] || "Products";
    var fullName = getReadableName(fileName, brandLabel);
    var price = getPrice(category, fileLower + "|" + order);
    var rating = getRating(fileLower + "|" + order);
    var detailTarget = detailByBrand[brand] || "apple-iphone14-pro-max";
    var productId = slugify(brand + "-" + fileName + "-" + order);

    return {
      id: productId,
      order: order,
      brand: brand,
      brandLabel: brandLabel,
      category: category,
      categoryLabel: categoryLabel,
      name: fullName,
      cardTitle: trimText(fullName, 50),
      price: price,
      rating: rating,
      image: "assets/images/" + fileName,
      detailTarget: detailTarget
    };
  }

  function renderProductCard(product){
    var detailUrl = "product-details.html?product=" + encodeURIComponent(product.detailTarget);
    return [
      '<div class="col-12 col-sm-6 col-xl-4" data-product-item data-product-id="' + escapeHtml(product.id) + '" data-order="' + product.order + '" data-category="' + escapeHtml(product.category) + '" data-brand="' + escapeHtml(product.brand) + '" data-price="' + product.price + '" data-rating="' + product.rating.toFixed(1) + '" data-name="' + escapeHtml(product.name) + '">',
      '  <div class="card product-card h-100 shadow-sm">',
      '    <div class="product-media"><a href="' + detailUrl + '" data-product-link><img class="card-img-top" src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.name) + '" loading="lazy"></a></div>',
      '    <div class="card-body">',
      '      <p class="product-meta mb-1">' + escapeHtml(product.categoryLabel) + ' &#8226; ' + escapeHtml(product.brandLabel) + '</p>',
      '      <h5 class="product-title"><a class="text-reset text-decoration-none" href="' + detailUrl + '" data-product-link>' + escapeHtml(product.cardTitle) + '</a></h5>',
      '      <div class="d-flex justify-content-between mt-2"><span class="product-price">' + formatPrice(product.price) + '</span><span class="product-rating"><i class="bi bi-star-fill"></i> ' + product.rating.toFixed(1) + '</span></div>',
      '    </div>',
      '    <div class="card-footer bg-white border-0 pt-0 pb-3 px-3"><button class="btn btn-primary w-100" data-add-to-cart><i class="bi bi-cart3 me-2"></i>Add to Cart</button></div>',
      '  </div>',
      '</div>'
    ].join("");
  }

  function renderCatalogProducts(){
    if(!grid.hasAttribute("data-auto-products")) return;
    var cards = imageFiles.map(function(fileName, index){
      return renderProductCard(buildProduct(fileName, index + 1));
    });
    grid.innerHTML = cards.join("");
  }

  renderCatalogProducts();

  var items = qsa("[data-product-item]", grid);
  if(!items.length) return;

  var categoryInputs = qsa("[data-filter-category]");
  var brandInputs = qsa("[data-filter-brand]");
  var ratingInputs = qsa("[data-filter-rating]");
  var priceInput = qs("[data-filter-price]");
  var priceValue = qs("[data-filter-price-value]");
  var searchInput = qs("[data-filter-search]");
  var sortSelect = qs("[data-sort-products]");
  var countEl = qs("[data-product-count]");
  var emptyState = qs("[data-empty-state]");
  var resetButtons = qsa("[data-filter-reset]");
  var applyBtn = qs("[data-filter-apply]");
  var brandChips = qsa("[data-brand-chip]");

  function getCheckedValues(nodes, attr){
    return nodes.filter(function(node){ return node.checked; }).map(function(node){
      return node.getAttribute(attr);
    });
  }

  function getMinRating(){
    var selected = ratingInputs.find(function(node){ return node.checked; });
    return selected ? Number(selected.value) || 0 : 0;
  }

  function updatePriceLabel(){
    if(priceInput && priceValue) priceValue.textContent = formatPrice(priceInput.value);
  }

  function syncBrandChips(){
    brandChips.forEach(function(chip){
      var key = chip.getAttribute("data-brand-chip");
      var input = qs('[data-filter-brand="' + key + '"]');
      chip.classList.toggle("active", Boolean(input && input.checked));
    });
  }

  function applyFilters(){
    var selectedCategories = getCheckedValues(categoryInputs, "data-filter-category");
    var selectedBrands = getCheckedValues(brandInputs, "data-filter-brand");
    var minRating = getMinRating();
    var maxPrice = priceInput ? Number(priceInput.value) : Number.MAX_SAFE_INTEGER;
    var query = (searchInput && searchInput.value || "").trim().toLowerCase();
    var visibleCount = 0;

    items.forEach(function(item){
      var category = item.dataset.category || "";
      var brand = item.dataset.brand || "";
      var price = Number(item.dataset.price || 0);
      var rating = Number(item.dataset.rating || 0);
      var name = (item.dataset.name || "").toLowerCase();

      var categoryMatch = !selectedCategories.length || selectedCategories.indexOf(category) !== -1;
      var brandMatch = !selectedBrands.length || selectedBrands.indexOf(brand) !== -1;
      var priceMatch = price <= maxPrice;
      var ratingMatch = rating >= minRating;
      var queryMatch = !query || name.indexOf(query) !== -1 || brand.indexOf(query) !== -1 || category.indexOf(query) !== -1;
      var isVisible = categoryMatch && brandMatch && priceMatch && ratingMatch && queryMatch;

      item.classList.toggle("is-hidden", !isVisible);
      if(isVisible) visibleCount += 1;
    });

    if(countEl) countEl.textContent = String(visibleCount);
    if(emptyState) emptyState.classList.toggle("d-none", visibleCount !== 0);
    syncBrandChips();
  }

  function sortItems(mode){
    var sorted = items.slice();

    sorted.sort(function(a, b){
      var aPrice = Number(a.dataset.price || 0);
      var bPrice = Number(b.dataset.price || 0);
      var aRating = Number(a.dataset.rating || 0);
      var bRating = Number(b.dataset.rating || 0);
      var aOrder = Number(a.dataset.order || 0);
      var bOrder = Number(b.dataset.order || 0);

      if(mode === "price-low-high") return aPrice - bPrice;
      if(mode === "price-high-low") return bPrice - aPrice;
      if(mode === "rating-high-low") return bRating - aRating;
      if(mode === "newest") return bOrder - aOrder;
      return aOrder - bOrder;
    });

    sorted.forEach(function(item){ grid.appendChild(item); });
  }

  function resetFilters(){
    categoryInputs.forEach(function(node){ node.checked = false; });
    brandInputs.forEach(function(node){ node.checked = false; });
    ratingInputs.forEach(function(node){ node.checked = node.value === "0"; });

    if(priceInput) priceInput.value = priceInput.max || "150000";
    if(searchInput) searchInput.value = "";
    if(sortSelect) sortSelect.value = "recommended";

    if(priceInput && priceValue) priceValue.textContent = formatPrice(priceInput.value);

    sortItems("recommended");
    applyFilters();
  }

  function quickBrandFilter(key){
    var input = qs('[data-filter-brand="' + key + '"]');
    if(!input) return;

    var isOnlySelected = input.checked && brandInputs.every(function(node){
      return node === input || !node.checked;
    });

    if(isOnlySelected){
      brandInputs.forEach(function(node){ node.checked = false; });
      applyFilters();
      return;
    }

    // Clicking a brand tile should show related products immediately.
    brandInputs.forEach(function(node){ node.checked = false; });
    input.checked = true;
    categoryInputs.forEach(function(node){ node.checked = false; });
    ratingInputs.forEach(function(node){ node.checked = node.value === "0"; });
    if(searchInput) searchInput.value = "";
    if(priceInput){
      priceInput.value = priceInput.max || "150000";
      updatePriceLabel();
    }

    applyFilters();
  }

  function hydrateFromQuery(){
    var params;
    try { params = new URLSearchParams(window.location.search); }
    catch (err) { return; }

    var cat = params.get("cat");
    if(cat){
      var catInput = qs('[data-filter-category="' + cat + '"]');
      if(catInput) catInput.checked = true;
    }

    var q = params.get("q");
    if(q && searchInput) searchInput.value = q;

    var brand = (params.get("brand") || "").toLowerCase();
    if(brand){
      var brandInput = qs('[data-filter-brand="' + brand + '"]');
      if(brandInput) brandInput.checked = true;
    }
  }

  categoryInputs.forEach(function(node){ node.addEventListener("change", applyFilters); });
  brandInputs.forEach(function(node){ node.addEventListener("change", applyFilters); });
  ratingInputs.forEach(function(node){ node.addEventListener("change", applyFilters); });

  if(searchInput) searchInput.addEventListener("input", applyFilters);

  if(priceInput){
    priceInput.addEventListener("input", function(){
      updatePriceLabel();
      applyFilters();
    });
  }

  if(sortSelect){
    sortSelect.addEventListener("change", function(){
      sortItems(sortSelect.value);
      applyFilters();
    });
  }

  if(applyBtn){
    applyBtn.addEventListener("click", function(){
      if(sortSelect) sortItems(sortSelect.value);
      applyFilters();
    });
  }

  resetButtons.forEach(function(btn){
    btn.addEventListener("click", resetFilters);
  });

  brandChips.forEach(function(chip){
    chip.addEventListener("click", function(){
      var key = (chip.getAttribute("data-brand-chip") || "").toLowerCase();
      if(!key) return;
      quickBrandFilter(key);
    });
  });

  hydrateFromQuery();
  updatePriceLabel();
  sortItems("recommended");
  applyFilters();
})();


// PDP dynamic data binding (product-details.html)
(function(){
  function qs(sel, parent){ return (parent||document).querySelector(sel); }
  function qsa(sel, parent){ return Array.from((parent||document).querySelectorAll(sel)); }

  var pdPage = qs("[data-product-details-page]");
  if(!pdPage) return;

  var sources = qsa("[data-product-source]");
  if(!sources.length) return;

  function formatPrice(value){
    return "\u20B9" + Number(value || 0).toLocaleString("en-IN");
  }

  function parseSpecPairs(raw){
    return String(raw || "")
      .split(";")
      .map(function(pair){ return pair.trim(); })
      .filter(Boolean)
      .map(function(pair){
        var parts = pair.split("|");
        return {
          label: (parts[0] || "").trim(),
          value: (parts.slice(1).join("|") || "").trim()
        };
      });
  }

  function setText(sel, value){
    var el = qs(sel);
    if(!el || value == null) return;
    el.textContent = String(value);
  }

  var params;
  try { params = new URLSearchParams(window.location.search); }
  catch (err) { params = new URLSearchParams(""); }

  var productId = params.get("product");
  var source = sources.find(function(node){
    return node.dataset.productId === productId;
  }) || sources[0];

  if(!source) return;

  var title = source.dataset.title || "Product Details";
  var category = source.dataset.category || "Category";
  var rating = Number(source.dataset.rating || 0);
  var reviews = Number(source.dataset.reviews || 0);
  var stock = source.dataset.stock || "In Stock";
  var price = Number(source.dataset.price || 0);
  var originalPrice = Number(source.dataset.originalPrice || price);
  var discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  var description = ((qs("[data-source-description]", source) || {}).textContent || "").trim();
  var warranty = source.dataset.warranty || "";
  var keySpecs = parseSpecPairs(source.dataset.keySpecs);
  var detailSpecs = parseSpecPairs(source.dataset.detailSpecs);

  setText("[data-pd-category]", category);
  setText("[data-pd-title]", title);
  setText("[data-pd-reviews]", "(" + reviews.toLocaleString("en-IN") + " reviews)");
  setText("[data-pd-stock]", stock);
  setText("[data-pd-price]", formatPrice(price));
  setText("[data-pd-original-price]", formatPrice(originalPrice));
  setText("[data-pd-discount]", discount > 0 ? (discount + "% OFF") : "Best Price");
  setText("[data-pd-description]", description);
  setText("[data-pd-warranty]", warranty);
  setText("[data-pd-breadcrumb]", title);

  var ratingEl = qs("[data-pd-rating]");
  if(ratingEl){
    ratingEl.innerHTML = '<i class="bi bi-star-fill"></i> ' + rating.toFixed(1);
  }

  var mainImg = qs("#pdMain");
  var images = [
    source.dataset.imageMain || "",
    source.dataset.imageAlt1 || source.dataset.imageMain || "",
    source.dataset.imageAlt2 || source.dataset.imageMain || ""
  ];
  if(mainImg && images[0]){
    mainImg.src = images[0];
    mainImg.alt = title;
  }

  var thumbLabels = ["Front", "Side", "Back"];
  qsa("[data-thumb]").forEach(function(btn, idx){
    var src = images[idx] || images[0];
    if(src) btn.setAttribute("data-thumb", src);
    btn.textContent = thumbLabels[idx] || ("View " + (idx + 1));
  });

  qsa("[data-pd-key-spec-label]").forEach(function(node, idx){
    var pair = keySpecs[idx];
    if(!pair) return;
    node.textContent = pair.label;
  });
  qsa("[data-pd-key-spec-value]").forEach(function(node, idx){
    var pair = keySpecs[idx];
    if(!pair) return;
    node.textContent = pair.value;
  });

  qsa("[data-pd-spec-label]").forEach(function(node, idx){
    var pair = detailSpecs[idx];
    if(!pair) return;
    node.textContent = pair.label;
  });
  qsa("[data-pd-spec-value]").forEach(function(node, idx){
    var pair = detailSpecs[idx];
    if(!pair) return;
    node.textContent = pair.value;
  });

  if(title){
    document.title = title + " - ElectroMart";
  }
})();
