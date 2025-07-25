// Theme toggle functionality
function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";

  html.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
}

// Load saved theme or default to browser preference
function loadTheme() {
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme) {
    document.documentElement.setAttribute("data-theme", savedTheme);
  } else {
    // No saved preference, use browser default
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const theme = prefersDark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
  }
}

// Initialize theme on page load
loadTheme();

// Listen for system theme changes
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) {
      document.documentElement.setAttribute(
        "data-theme",
        e.matches ? "dark" : "light",
      );
    }
  });
