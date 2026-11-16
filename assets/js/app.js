const dateEl = document.getElementById("todayLabel");
if (dateEl) {
  dateEl.textContent = new Intl.DateTimeFormat("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  }).format(new Date());
}
const toast = document.getElementById("toast");
let toastTimer;
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
document.getElementById("addStudentBtn")?.addEventListener("click", () => {
  showToast("Modul tambah siswa akan diaktifkan pada tahap berikutnya.");
});
document.querySelectorAll(".quick-action").forEach(button => {
  button.addEventListener("click", () => showToast(`${button.dataset.action}: fitur sedang disiapkan.`));
});
document.getElementById("menuToggle")?.addEventListener("click", () => {
  document.getElementById("sidebar")?.classList.toggle("open");
});
document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach(item => item.classList.remove("active"));
    link.classList.add("active");
    document.getElementById("sidebar")?.classList.remove("open");
  });
});