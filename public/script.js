// ===== HEADER SCROLL EFFECT =====
const header = document.querySelector('.header');

function handleScroll() {
  if (window.scrollY > 20) {
    header?.classList.add('scrolled');
  } else {
    header?.classList.remove('scrolled');
  }
}

window.addEventListener('scroll', handleScroll, { passive: true });
handleScroll();

// ===== MOBILE MENU =====
const menuToggle = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('.mobile-nav');

menuToggle?.addEventListener('click', () => {
  menuToggle.classList.toggle('active');
  mobileNav?.classList.toggle('active');
  document.body.style.overflow = mobileNav?.classList.contains('active') ? 'hidden' : '';
});

// Close mobile nav on link click
document.querySelectorAll('.mobile-nav-link').forEach(link => {
  link.addEventListener('click', () => {
    menuToggle?.classList.remove('active');
    mobileNav?.classList.remove('active');
    document.body.style.overflow = '';
  });
});

// ===== REVEAL ON SCROLL =====
function createObserver() {
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -60px 0px',
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
    observer.observe(el);
  });
}

// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createObserver);
} else {
  createObserver();
}

// ===== SCREENSHOTS CAROUSEL =====
function initCarousel() {
  const track = document.querySelector('.screenshots-track');
  const prevBtn = document.querySelector('.carousel-prev');
  const nextBtn = document.querySelector('.carousel-next');

  if (!track) return;

  const scrollAmount = 260;

  prevBtn?.addEventListener('click', () => {
    track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  });

  nextBtn?.addEventListener('click', () => {
    track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  });

  // Auto-scroll
  let autoScroll;
  function startAutoScroll() {
    autoScroll = setInterval(() => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      if (track.scrollLeft >= maxScroll - 10) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }, 4000);
  }

  function stopAutoScroll() {
    clearInterval(autoScroll);
  }

  startAutoScroll();

  track.addEventListener('mouseenter', stopAutoScroll);
  track.addEventListener('mouseleave', startAutoScroll);
  track.addEventListener('touchstart', stopAutoScroll, { passive: true });
  track.addEventListener('touchend', () => {
    stopAutoScroll();
    startAutoScroll();
  });
}

initCarousel();

// ===== FAQ ACCORDION =====
document.querySelectorAll('.faq-question').forEach(question => {
  question.addEventListener('click', () => {
    const item = question.closest('.faq-item');
    const answer = item?.querySelector('.faq-answer');
    const isActive = item?.classList.contains('active');

    // Close all
    document.querySelectorAll('.faq-item').forEach(faq => {
      faq.classList.remove('active');
      const ans = faq.querySelector('.faq-answer');
      if (ans) ans.style.maxHeight = '0';
    });

    // Open clicked if not already active
    if (!isActive && answer) {
      item.classList.add('active');
      answer.style.maxHeight = answer.scrollHeight + 'px';
    }
  });
});

// ===== LIGHTBOX =====
function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  const lightboxImg = lightbox.querySelector('.lightbox-screen img');
  const lightboxCaption = lightbox.querySelector('.lightbox-caption');
  const lightboxClose = lightbox.querySelector('.lightbox-close');
  const lightboxPrev = lightbox.querySelector('.lightbox-prev');
  const lightboxNext = lightbox.querySelector('.lightbox-next');

  const galleryItems = document.querySelectorAll('.gallery-item');
  let currentIndex = 0;

  const images = Array.from(galleryItems).map(item => ({
    src: item.querySelector('img')?.src || '',
    label: item.querySelector('.gallery-label')?.textContent || ''
  }));

  function openLightbox(index) {
    currentIndex = index;
    updateLightbox();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  function updateLightbox() {
    if (lightboxImg) lightboxImg.src = images[currentIndex].src;
    if (lightboxCaption) lightboxCaption.textContent = images[currentIndex].label;
  }

  function nextImage() {
    currentIndex = (currentIndex + 1) % images.length;
    updateLightbox();
  }

  function prevImage() {
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    updateLightbox();
  }

  galleryItems.forEach((item, index) => {
    item.addEventListener('click', () => openLightbox(index));
  });

  lightboxClose?.addEventListener('click', closeLightbox);
  lightboxPrev?.addEventListener('click', prevImage);
  lightboxNext?.addEventListener('click', nextImage);

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'ArrowRight') nextImage();
  });
}

initLightbox();

// ===== SMOOTH SCROLL FOR ANCHOR LINKS =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const targetId = this.getAttribute('href');
    if (targetId === '#') return;

    const target = document.querySelector(targetId);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// ===== COUNTER ANIMATION =====
function animateCounters() {
  const counters = document.querySelectorAll('[data-count]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = entry.target;
        const countTo = parseInt(target.getAttribute('data-count') || '0');
        const suffix = target.getAttribute('data-suffix') || '';
        const duration = 2000;
        const step = countTo / (duration / 16);
        let current = 0;

        function update() {
          current += step;
          if (current >= countTo) {
            target.textContent = countTo + suffix;
          } else {
            target.textContent = Math.floor(current) + suffix;
            requestAnimationFrame(update);
          }
        }

        update();
        observer.unobserve(target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(counter => observer.observe(counter));
}

animateCounters();

// ===== SET ACTIVE NAV LINK =====
function setActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

setActiveNav();

// ===== CURRENCY CONVERTER =====
const currencyConfig = {
  'NGN': { symbol: '₦', rate: 1 },
  'USD': { symbol: '$', rate: 0.0006 },
  'EUR': { symbol: '€', rate: 0.00056 },
  'GBP': { symbol: '£', rate: 0.00048 },
  'CAD': { symbol: 'C$', rate: 0.00082 },
  'AUD': { symbol: 'A$', rate: 0.0009 },
  'ZAR': { symbol: 'R', rate: 0.011 },
  'KES': { symbol: 'KSh', rate: 0.078 },
  'GHS': { symbol: '₵', rate: 0.0093 }
};

function formatPrice(amount, currency) {
  const config = currencyConfig[currency];
  if (!config) return amount;

  const converted = amount * config.rate;
  
  // Determine decimal places based on currency
  let decimals = 0;
  if (['USD', 'EUR', 'GBP', 'CAD', 'AUD'].includes(currency)) {
    decimals = 2;
  } else if (['KES', 'GHS', 'ZAR'].includes(currency)) {
    decimals = 0;
  }

  const formatted = converted.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  return `${config.symbol}${formatted}`;
}

function convertAllPrices(currency) {
  // Find all pricing amount elements with data-ngn attribute
  const priceElements = document.querySelectorAll('[data-ngn]');
  
  priceElements.forEach(element => {
    const ngnAmount = parseInt(element.getAttribute('data-ngn'));
    const period = element.getAttribute('data-period');
    if (ngnAmount && !isNaN(ngnAmount)) {
      let text = formatPrice(ngnAmount, currency);
      if (period === 'monthly') text += ' /mo';
      element.textContent = text;
    }
  });

  // Update currency selector
  const selector = document.getElementById('currency-select');
  if (selector) {
    selector.value = currency;
  }

  // Save preference
  localStorage.setItem('preferredCurrency', currency);
}

// Initialize currency converter
function initCurrencyConverter() {
  const selector = document.getElementById('currency-select');
  if (!selector) return;

  // Get saved preference or default to NGN
  const saved = localStorage.getItem('preferredCurrency') || 'NGN';
  convertAllPrices(saved);

  // Listen for changes
  selector.addEventListener('change', (e) => {
    convertAllPrices(e.target.value);
  });
}

// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCurrencyConverter);
} else {
  initCurrencyConverter();
}