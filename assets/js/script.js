/* ===========================
   ElectroMart - UI JS (DOM only)
   - Scroll to top
   - Smooth nav scrolling
   - IntersectionObserver reveal
   - Mini cart counter (demo)
   - Quick view modal fill
   =========================== */

(function () {
  "use strict";

  function qs(sel, parent) { return (parent || document).querySelector(sel); }
  function qsa(sel, parent) { return Array.from((parent || document).querySelectorAll(sel)); }

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
  // update a CSS variable on the button so the ring fills as the user scrolls
  function updateScrollRing(){
    if (!scrollTopBtn) return;
    var doc = document.documentElement;
    var total = Math.max(1, doc.scrollHeight - window.innerHeight);
    var pct = Math.round((window.scrollY / total) * 100);
    scrollTopBtn.style.setProperty('--scroll', pct + '%');
  }

  window.addEventListener('scroll', updateScrollRing);
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

      // close mobile menu if open
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

  // Demo cart count (UI only)
  var cartCountEl = qs("[data-cart-count]");
  var cartCount = Number((cartCountEl && cartCountEl.textContent) || 0);

  function setCartCount(val){
    cartCount = val;
    if (cartCountEl) cartCountEl.textContent = String(cartCount);
  }

  qsa("[data-add-to-cart]").forEach(function(btn){
    btn.addEventListener("click", function(){
      setCartCount(cartCount + 1);

      // small feedback
      btn.classList.add("disabled");
      var old = btn.innerHTML;
      btn.innerHTML = '<i class="bi bi-check2 me-2"></i>Added';
      setTimeout(function(){
        btn.classList.remove("disabled");
        btn.innerHTML = old;
      }, 900);
    });
  });

  // Wishlist button toggle
  qsa("[data-wishlist]").forEach(function(btn){
    btn.addEventListener("click", function(){
      btn.classList.toggle("active");
      var icon = qs("i", btn);
      if(icon){
        icon.classList.toggle("bi-heart");
        icon.classList.toggle("bi-heart-fill");
      }
    });
  });

  // Quick view modal
  var qvModalEl = qs("#quickViewModal");
  if (qvModalEl && window.bootstrap) {
    var qvModal = new window.bootstrap.Modal(qvModalEl);

    function getCardData(card){
      var cat = (qs(".product-meta", card) || {}).textContent || "Category";
      var title = (qs(".product-title", card) || {}).textContent || "Product";
      var price = (qs(".product-price", card) || {}).textContent || "₹0";
      var rating = (qs(".product-rating", card) || {}).textContent || "4.5";
      var img = (qs("img", card) || {}).src || "";
      return {cat:cat.trim(), title:title.trim(), price:price.trim(), rating:rating.trim(), img:img};
    }

    qsa("[data-quickview]").forEach(function(btn){
      btn.addEventListener("click", function(){
        var card = btn.closest(".product-card");
        if (!card) return;
        var data = getCardData(card);

        var qvImg = qs("#qvImg");
        var qvCat = qs("#qvCat");
        var qvTitle = qs("#qvTitle");
        var qvPrice = qs("#qvPrice");
        var qvRating = qs("#qvRating");

        if(qvImg) qvImg.src = data.img;
        if(qvCat) qvCat.textContent = data.cat;
        if(qvTitle) qvTitle.textContent = data.title;
        if(qvPrice) qvPrice.textContent = data.price;
        if(qvRating) qvRating.textContent = data.rating;

        qvModal.show();
      });
    });
  }

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
      return Number.isFinite(v) && v > 0 ? v : 1;
    }
    if(minus) minus.addEventListener("click", function(){ input.value = Math.max(1, getVal()-1); });
    if(plus)  plus.addEventListener("click", function(){ input.value = getVal()+1; });
  }
  // bind all qty groups in page
  qsa("body").forEach(function(b){ bindQty(b); });
})();
