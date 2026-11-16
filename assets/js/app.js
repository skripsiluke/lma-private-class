
/* =========================================
   LMA PRIVATE CLASS
   DASHBOARD INTEGRATION v2.0
   Supabase + HTML + JavaScript
========================================= */

const db = window.lmaSupabase;

const dateEl = document.getElementById("todayLabel");
const toast = document.getElementById("toast");
let toastTimer;

function localDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function rupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(
    () => toast.classList.remove("show"), 3000
  );
}

/* TANGGAL HARI INI */
if (dateEl) dateEl.textContent = formatDate(new Date());

/* =========================================
   GRAFIK PENDAPATAN
========================================= */

function renderRevenueChart(monthlyData) {
  const chart = document.querySelector(".chart");
  if (!chart) return;

  const labels = chart.querySelector(".x-labels");
  const svg = chart.querySelector("svg");

  if (labels) {
    labels.innerHTML = monthlyData.map(item =>
      `<span>${escapeHTML(item.label)}</span>`
    ).join("");
  }

  if (svg) {
    const values = monthlyData.map(item => item.amount);
    const max = Math.max(...values, 1);

    const points = values.map((value, index) => ({
      x: index * 120,
      y: 180 - (value / max) * 145
    }));

    const line = points.map((point, index) =>
      `${index === 0 ? "M" : "L"}${point.x} ${point.y}`
    ).join(" ");

    const area = `${line} L600 210 L0 210 Z`;

    const paths = svg.querySelectorAll("path");
    if (paths[0]) paths[0].setAttribute("d", area);
    if (paths[1]) paths[1].setAttribute("d", line);
  }

  const total = monthlyData.reduce(
    (sum, item) => sum + item.amount, 0
  );

  const legend = document.querySelector(".chart-legend strong");
  if (legend) legend.textContent = rupiah(total);
}

/* =========================================
   JADWAL HARI INI
========================================= */

function renderSchedules(rows) {
  const container = document.getElementById("scheduleList");
  if (!container) return;

  if (!rows || rows.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        Belum ada jadwal les untuk hari ini.
      </div>`;
    return;
  }

  container.innerHTML = rows.map(row => {
    const student = row.students?.full_name || "Siswa";
    const tutor = row.tutors?.full_name || "Tutor";
    const subject = row.subjects?.subject_name || "Mata pelajaran";
    const start = String(row.start_time || "").slice(0, 5);
    const end = String(row.end_time || "").slice(0, 5);

    const statusMap = {
      scheduled: ["Mendatang", "upcoming"],
      completed: ["Selesai", "done"],
      cancelled: ["Dibatalkan", "cancelled"]
    };

    const status = statusMap[row.status] || ["Terjadwal", "upcoming"];
    const mode = row.learning_mode === "online"
      ? "Online"
      : "Privat ke rumah";

    return `
      <div class="schedule-item">
        <div class="time">
          ${escapeHTML(start)}
          <small>${escapeHTML(end)}</small>
        </div>
        <div class="schedule-line"></div>
        <div class="schedule-info">
          <strong>${escapeHTML(subject)}</strong>
          <span>${escapeHTML(student)} · Tutor ${escapeHTML(tutor)}</span>
          <small>${escapeHTML(mode)}</small>
        </div>
        <span class="status ${status[1]}">
          ${status[0]}
        </span>
      </div>`;
  }).join("");
}

/* =========================================
   MEMUAT DATA DASHBOARD
========================================= */

async function loadDashboardData() {
  if (!db) {
    setText("dashboardDataNote", "Koneksi Supabase belum tersedia.");
    return;
  }

  setText("dashboardDataNote", "Memuat data dari database...");

  const today = new Date();
  const todayString = localDate(today);
  const firstMonth = addMonths(today, -5);
  const startDate = localDate(firstMonth);

  setText("scheduleDateLabel", formatDate(today));

  try {
    const [
      studentsResult,
      tutorsResult,
      schedulesCountResult,
      todaySchedulesResult,
      paymentsResult
    ] = await Promise.all([

      db.from("students")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),

      db.from("tutors")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),

      db.from("schedules")
        .select("id", { count: "exact", head: true })
        .eq("lesson_date", todayString),

      db.from("schedules")
        .select(`
          lesson_date,
          start_time,
          end_time,
          learning_mode,
          location,
          meeting_url,
          status,
          students(full_name),
          tutors(full_name),
          subjects(subject_name)
        `)
        .eq("lesson_date", todayString)
        .order("start_time", { ascending: true }),

      db.from("payments")
        .select("amount, payment_date")
        .gte("payment_date", startDate)
        .lte("payment_date", todayString)
        .order("payment_date", { ascending: true })
    ]);

    const results = [
      studentsResult,
      tutorsResult,
      schedulesCountResult,
      todaySchedulesResult,
      paymentsResult
    ];

    const failed = results.find(result => result.error);
    if (failed) throw failed.error;

    /* STATISTIK */
    setText("totalStudents", studentsResult.count ?? 0);
    setText("totalTutors", tutorsResult.count ?? 0);
    setText("todaySchedules", schedulesCountResult.count ?? 0);

    /* PENDAPATAN BULAN BERJALAN */
    const payments = paymentsResult.data || [];

    const currentMonth = todayString.slice(0, 7);

    const monthlyRevenue = payments
      .filter(payment =>
        payment.payment_date?.startsWith(currentMonth)
      )
      .reduce((sum, payment) =>
        sum + Number(payment.amount || 0), 0
      );

    setText("monthlyRevenue", rupiah(monthlyRevenue));

    /* GRAFIK 6 BULAN */
    const monthlyData = [];

    for (let i = 0; i < 6; i++) {
      const month = addMonths(today, i - 5);
      const key = `${month.getFullYear()}-${String(
        month.getMonth() + 1
      ).padStart(2, "0")}`;

      const label = new Intl.DateTimeFormat("id-ID", {
        month: "short"
      }).format(month);

      const amount = payments
        .filter(payment => payment.payment_date?.startsWith(key))
        .reduce((sum, payment) =>
          sum + Number(payment.amount || 0), 0
        );

      monthlyData.push({ key, label, amount });
    }

    renderRevenueChart(monthlyData);

    /* JADWAL HARI INI */
    renderSchedules(todaySchedulesResult.data || []);

    setText(
      "dashboardDataNote",
      "Data berhasil diperbarui dari database Supabase."
    );

  } catch (error) {
    console.error("Dashboard error:", error);

    setText(
      "dashboardDataNote",
      "Gagal memuat data. Periksa izin akses database."
    );

    showToast(
      "Gagal memuat dashboard: " + (error.message || "Kesalahan")
    );
  }
}

/* =========================================
   EVENT APLIKASI
========================================= */

window.addEventListener("lma:authenticated", loadDashboardData);

document.getElementById("addStudentBtn")
  ?.addEventListener("click", () =>
    showToast("Modul tambah siswa akan segera diaktifkan.")
  );

document.querySelectorAll(".quick-action")
  .forEach(button => {
    button.addEventListener("click", () =>
      showToast(`${button.dataset.action}: fitur sedang disiapkan.`)
    );
  });

document.getElementById("menuToggle")
  ?.addEventListener("click", () =>
    document.getElementById("sidebar")?.classList.toggle("open")
  );

document.querySelectorAll(".nav-link")
  .forEach(link => {
    link.addEventListener("click", () => {
      document.querySelectorAll(".nav-link")
        .forEach(item => item.classList.remove("active"));

      link.classList.add("active");
      document.getElementById("sidebar")?.classList.remove("open");
    });
  });
