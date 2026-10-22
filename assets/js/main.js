(function () {
  var root = document.documentElement;

  // Light / dark mode switch in the top menu.
  var toggle = document.querySelector('.theme-toggle');
  function updateIcon() {
    if (!toggle) return;
    var dark = root.getAttribute('data-theme') === 'dark';
    toggle.innerHTML = '<i class="fas ' + (dark ? 'fa-sun' : 'fa-moon') + '" aria-hidden="true"></i>';
  }
  updateIcon();
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      updateIcon();
      document.dispatchEvent(new Event('themechange'));
    });
  }

  // "ABS" buttons show and hide a paper's abstract.
  document.querySelectorAll('.abs-toggle').forEach(function (button) {
    button.addEventListener('click', function () {
      var abstract = button.closest('.pub-body').querySelector('.pub-abstract');
      var opening = abstract.hasAttribute('hidden');
      abstract.toggleAttribute('hidden', !opening);
      button.classList.toggle('active', opening);
      button.setAttribute('aria-expanded', String(opening));
    });
  });
})();
