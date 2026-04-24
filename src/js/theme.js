(function () {
  var KEY = "color-scheme";
  var mql = window.matchMedia("(prefers-color-scheme: dark)");
  var link = document.getElementById("prism-theme");
  var select = document.getElementById("theme-select");

  var u = "https://unpkg.com/prismjs@1.29.0/themes/";

  function getStored() {
    var v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark" || v === "system") {
      return v;
    }
    return "system";
  }

  function setHtmlThemeFromStorage() {
    var s = getStored();
    if (s === "light" || s === "dark") {
      document.documentElement.setAttribute("data-theme", s);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  function isDarkEffective() {
    var s = getStored();
    if (s === "light") return false;
    if (s === "dark") return true;
    return mql.matches;
  }

  function applyPrism() {
    if (!link) return;
    link.href = (isDarkEffective() ? u + "prism-okaidia.min.css" : u + "prism.min.css");
  }

  function syncSelect() {
    if (select) {
      select.value = getStored();
    }
  }

  setHtmlThemeFromStorage();
  applyPrism();
  syncSelect();

  if (select) {
    select.addEventListener("change", function () {
      var v = select.value;
      if (v === "light" || v === "dark" || v === "system") {
        localStorage.setItem(KEY, v);
        setHtmlThemeFromStorage();
        applyPrism();
      }
    });
  }

  mql.addEventListener("change", function () {
    if (getStored() === "system") {
      applyPrism();
    }
  });
})();
