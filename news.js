document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("news-list")) {
    renderNewsPage();
  }
  if (document.getElementById("news-detail")) {
    renderNewsDetail();
  }
});

function renderNewsPage() {
  const container = document.getElementById("news-list");
  if (!container || !DATA.news) return;

  container.innerHTML = DATA.news.map(n => `
    <div class="news-card">
      <img src="${n.image}" alt="${n.title}">
      <div class="news-body">
        <h3>${n.title}</h3>
        <p class="date">${n.date}</p>
        <p>${n.excerpt}</p>
        <a href="news-detail.html?id=${n.id}" class="btn small">Ətraflı oxu</a>
      </div>
    </div>
  `).join("");
}
