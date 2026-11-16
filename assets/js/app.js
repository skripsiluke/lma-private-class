const dateEl = document.getElementById("todayLabel");
function formatToday() {
  if (dateEl) dateEl.textContent = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
}
formatToday();
const toast = document.getElementById("toast");
let toastTimer;
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }
function rupiah(value) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0); }

async function loadDashboardData() {
  const db = window.lmaSupabase;
  if (!db) return;
  setText('dashboardDataNote', 'Memuat data dari database...');
  const today = new Date();
  const dateString = [today.getFullYear(), String(today.getMonth()+1).padStart(2,'0'), String(today.getDate()).padStart(2,'0')].join('-');
  const monthStart = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`;
  try {
    const [students, tutors, schedules, payments] = await Promise.all([
      db.from('students').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      db.from('tutors').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      db.from('schedules').select('id', { count: 'exact', head: true }).eq('lesson_date', dateString),
      db.from('payments').select('amount').gte('payment_date', monthStart).lte('payment_date', dateString)
    ]);
    const errors = [students.error, tutors.error, schedules.error, payments.error].filter(Boolean);
    if (errors.length) throw errors[0];
    const revenue = (payments.data || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
    setText('totalStudents', students.count ?? 0);
    setText('totalTutors', tutors.count ?? 0);
    setText('todaySchedules', schedules.count ?? 0);
    setText('monthlyRevenue', rupiah(revenue));
    setText('dashboardDataNote', 'Data dashboard berhasil dimuat dari Supabase.');
    setText('scheduleDateLabel', new Intl.DateTimeFormat('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' }).format(today));
    const scheduleList = document.getElementById('scheduleList');
    if (scheduleList) scheduleList.innerHTML = '<div class="empty-state">Data jadwal akan ditampilkan setelah modul jadwal diaktifkan.</div>';
  } catch (error) {
    console.error('Gagal memuat dashboard:', error);
    setText('dashboardDataNote', 'Belum dapat mengambil data. Periksa koneksi Supabase dan kebijakan RLS.');
    showToast('Gagal memuat data: ' + (error.message || 'Kesalahan koneksi'));
  }
}
window.addEventListener('lma:authenticated', loadDashboardData);

document.getElementById("addStudentBtn")?.addEventListener("click", () => showToast("Modul tambah siswa akan diaktifkan pada tahap berikutnya."));
document.querySelectorAll(".quick-action").forEach(button => button.addEventListener("click", () => showToast(`${button.dataset.action}: fitur sedang disiapkan.`)));
document.getElementById("menuToggle")?.addEventListener("click", () => document.getElementById("sidebar")?.classList.toggle("open"));
document.querySelectorAll(".nav-link").forEach(link => link.addEventListener("click", () => {
  document.querySelectorAll(".nav-link").forEach(item => item.classList.remove("active"));
  link.classList.add("active");
  document.getElementById("sidebar")?.classList.remove("open");
}));
