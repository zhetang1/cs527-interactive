// Apply theme immediately (runs blocking in <head>) to prevent flash
(function () {
  const saved = localStorage.getItem('theme') || 'system';
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
  // 'system' → no attribute, CSS media query handles it
})();

// Inject toggle UI into nav after DOM is ready
document.addEventListener('DOMContentLoaded', function () {
  const nav = document.querySelector('nav');
  if (!nav) return;

  const toggle = document.createElement('div');
  toggle.className = 'theme-toggle';
  toggle.innerHTML = `
    <button class="theme-btn" data-theme-val="light" title="Light">☀︎</button>
    <button class="theme-btn" data-theme-val="system" title="System">⚙</button>
    <button class="theme-btn" data-theme-val="dark" title="Dark">☾</button>
  `;
  nav.appendChild(toggle);

  function updateActive() {
    const current = localStorage.getItem('theme') || 'system';
    toggle.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.themeVal === current);
    });
  }

  toggle.addEventListener('click', function (e) {
    const btn = e.target.closest('.theme-btn');
    if (!btn) return;
    const val = btn.dataset.themeVal;
    localStorage.setItem('theme', val);
    if (val === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else if (val === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    updateActive();
  });

  updateActive();
});
