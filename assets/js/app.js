
/* =========================================
   LMA PRIVATE CLASS
   DASHBOARD + DATA SISWA
   SUPABASE INTEGRATION
========================================= */

const db = window.lmaSupabase;

const dateEl = document.getElementById("todayLabel");
const toast = document.getElementById("toast");
let toastTimer;

let allStudents = [];

/* =========================================
   FUNGSI UMUM
========================================= */

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function localDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

if (dateEl) {
  dateEl.textContent = formatDate(new Date());
}

/* =========================================
   NAVIGASI HALAMAN
========================================= */

function showPage(pageId) {
  const dashboard = document.getElementById("dashboard");
  const studentsPage = document.getElementById("students");

  if (dashboard) {
    dashboard.style.display =
      pageId === "dashboard" ? "block" : "none";
  }

  if (studentsPage) {
    studentsPage.classList.toggle(
      "active",
      pageId === "students"
    );
  }

  document.querySelectorAll(".nav-link").forEach(link => {
    link.classList.toggle(
      "active",
      link.getAttribute("href") === `#${pageId}`
    );
  });

  const pageNames = {
    dashboard: "Dashboard",
    students: "Data Siswa"
  };

  setText("breadcrumbPage", pageNames[pageId] || "Dashboard");

  document.getElementById("sidebar")?.classList.remove("open");

  if (pageId === "students") {
    loadStudents();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", event => {
    const pageId = link.getAttribute("href")?.slice(1);

    if (pageId === "dashboard" || pageId === "students") {
      event.preventDefault();
      history.replaceState(null, "", `#${pageId}`);
      showPage(pageId);
    } else {
      event.preventDefault();
      showToast("Modul ini akan diaktifkan pada tahap berikutnya.");
      document.getElementById("sidebar")?.classList.remove("open");
    }
  });
});

window.addEventListener("hashchange", () => {
  const pageId = location.hash.slice(1);
  showPage(pageId === "students" ? "students" : "dashboard");
});

document.getElementById("menuToggle")?.addEventListener("click", () => {
  document.getElementById("sidebar")?.classList.toggle("open");
});

/* =========================================
   GRAFIK PENDAPATAN
========================================= */

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

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

  const statusMap = {
    scheduled: ["Mendatang", "upcoming"],
    completed: ["Selesai", "done"],
    cancelled: ["Dibatalkan", "cancelled"]
  };

  container.innerHTML = rows.map(row => {
    const student = row.students?.full_name || "Siswa";
    const tutor = row.tutors?.full_name || "Tutor";
    const subject = row.subjects?.subject_name || "Mata pelajaran";
    const start = String(row.start_time || "").slice(0, 5);
    const end = String(row.end_time || "").slice(0, 5);
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
        <span class="status ${status[1]}">${status[0]}</span>
      </div>`;
  }).join("");
}

/* =========================================
   MEMUAT DASHBOARD
========================================= */

async function loadDashboardData() {
  if (!db) {
    setText("dashboardDataNote", "Koneksi Supabase belum tersedia.");
    return;
  }

  setText("dashboardDataNote", "Memuat data dari database...");

  const today = new Date();
  const todayString = localDate(today);
  const startDate = localDate(addMonths(today, -5));

  setText("scheduleDateLabel", formatDate(today));

  try {
    const [
      studentsResult,
      tutorsResult,
      schedulesCountResult,
      schedulesResult,
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
      schedulesResult,
      paymentsResult
    ];

    const failed = results.find(result => result.error);
    if (failed) throw failed.error;

    setText("totalStudents", studentsResult.count ?? 0);
    setText("totalTutors", tutorsResult.count ?? 0);
    setText("todaySchedules", schedulesCountResult.count ?? 0);

    const payments = paymentsResult.data || [];
    const currentMonth = todayString.slice(0, 7);

    const monthlyRevenue = payments
      .filter(row => row.payment_date?.startsWith(currentMonth))
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);

    setText("monthlyRevenue", rupiah(monthlyRevenue));

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
        .filter(row => row.payment_date?.startsWith(key))
        .reduce((sum, row) => sum + Number(row.amount || 0), 0);

      monthlyData.push({ key, label, amount });
    }

    renderRevenueChart(monthlyData);
    renderSchedules(schedulesResult.data || []);

    setText(
      "dashboardDataNote",
      "Data berhasil diperbarui dari database Supabase."
    );

  } catch (error) {
    console.error("Dashboard error:", error);
    setText("dashboardDataNote", "Gagal memuat data dashboard.");
    showToast("Gagal memuat dashboard: " + (error.message || "Kesalahan"));
  }
}

/* =========================================
   MODUL DATA SISWA
========================================= */

function openStudentModal(student = null) {
  const modal = document.getElementById("studentModal");
  const form = document.getElementById("studentForm");

  if (!modal || !form) return;

  form.reset();

  setText(
    "studentModalTitle",
    student ? "Edit Data Siswa" : "Tambah Siswa Baru"
  );

  setText("saveStudentBtn", "Simpan Siswa");

  document.getElementById("studentId").value = student?.id || "";
  document.getElementById("studentCode").value = student?.student_code || "";
  document.getElementById("studentName").value = student?.full_name || "";
  document.getElementById("studentGender").value = student?.gender || "";
  document.getElementById("studentBirthDate").value = student?.birth_date || "";
  document.getElementById("studentEducation").value = student?.education_level || "";
  document.getElementById("studentSchool").value = student?.school_name || "";
  document.getElementById("studentAddress").value = student?.address || "";
  document.getElementById("studentStatus").value = student?.status || "active";
  document.getElementById("studentNotes").value = student?.notes || "";

  modal.classList.add("show");
}

function closeStudentModal() {
  document.getElementById("studentModal")?.classList.remove("show");
}

document.getElementById("openStudentModal")?.addEventListener("click", () => {
  openStudentModal();
});

document.getElementById("addStudentBtn")?.addEventListener("click", () => {
  history.replaceState(null, "", "#students");
  showPage("students");
  openStudentModal();
});

document.getElementById("closeStudentModal")?.addEventListener("click", closeStudentModal);
document.getElementById("cancelStudentForm")?.addEventListener("click", closeStudentModal);

document.getElementById("studentModal")?.addEventListener("click", event => {
  if (event.target.id === "studentModal") closeStudentModal();
});

/* =========================================
   MEMUAT DATA SISWA
========================================= */

async function loadStudents() {
  const body = document.getElementById("studentsTableBody");
  if (!body) return;

  if (!db) {
    setText("studentDataNote", "Koneksi Supabase belum tersedia.");
    return;
  }

  body.innerHTML = `
    <tr>
      <td colspan="7" style="text-align:center;padding:25px;">
        Memuat data siswa...
      </td>
    </tr>`;

  try {
    const { data, error } = await db
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    allStudents = data || [];

    updateStudentSummary();
    renderStudentTable();

    setText(
      "studentDataNote",
      `${allStudents.length} data siswa ditemukan.`
    );

  } catch (error) {
    console.error("Gagal memuat siswa:", error);

    body.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:25px;">
          Gagal memuat data siswa.
        </td>
      </tr>`;

    setText("studentDataNote", error.message || "Terjadi kesalahan database.");
    showToast("Gagal memuat siswa.");
  }
}

/* =========================================
   RINGKASAN SISWA
========================================= */

function updateStudentSummary() {
  const total = allStudents.length;
  const active = allStudents.filter(s => s.status === "active").length;
  const other = total - active;

  setText("studentCountAll", total);
  setText("studentCountActive", active);
  setText("studentCountOther", other);
}

/* =========================================
   TABEL SISWA
========================================= */

function renderStudentTable() {
  const body = document.getElementById("studentsTableBody");
  if (!body) return;

  const keyword = (
    document.getElementById("studentSearch")?.value || ""
  ).trim().toLowerCase();

  const statusFilter =
    document.getElementById("studentStatusFilter")?.value || "";

  const filtered = allStudents.filter(student => {
    const matchKeyword =
      (student.full_name || "").toLowerCase().includes(keyword) ||
      (student.student_code || "").toLowerCase().includes(keyword);

    const matchStatus =
      !statusFilter || student.status === statusFilter;

    return matchKeyword && matchStatus;
  });

  if (filtered.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:25px;">
          Tidak ada data siswa yang sesuai.
        </td>
      </tr>`;
    return;
  }

  const statusLabels = {
    active: ["Aktif", "active"],
    inactive: ["Tidak Aktif", "inactive"],
    graduated: ["Lulus", "graduated"]
  };

  body.innerHTML = filtered.map((student, index) => {
    const status = statusLabels[student.status] ||
      ["Tidak diketahui", "inactive"];

    const gender = student.gender === "L"
      ? "Laki-laki"
      : student.gender === "P"
        ? "Perempuan"
        : "-";

    return `
      <tr>
        <td>${index + 1}</td>

        <td>
          <div class="student-name">${escapeHTML(student.full_name)}</div>
          <div class="student-code">${escapeHTML(student.student_code)}</div>
        </td>

        <td>${gender}</td>
        <td>${escapeHTML(student.education_level || "-")}</td>
        <td>${escapeHTML(student.school_name || "-")}</td>

        <td>
          <span class="student-badge ${status[1]}">
            ${status[0]}
          </span>
        </td>

        <td>
          <div class="student-actions">
            <button
              class="student-action-btn"
              data-student-edit="${student.id}"
              type="button"
            >Edit</button>

            <button
              class="student-action-btn delete"
              data-student-delete="${student.id}"
              type="button"
            >Hapus</button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

document.getElementById("studentSearch")?.addEventListener("input", renderStudentTable);

document.getElementById("studentStatusFilter")?.addEventListener("change", renderStudentTable);

/* =========================================
   SIMPAN SISWA BARU / EDIT SISWA
========================================= */

document.getElementById("studentForm")?.addEventListener("submit", async event => {
  event.preventDefault();

  if (!db) {
    showToast("Koneksi database tidak tersedia.");
    return;
  }

  const button = document.getElementById("saveStudentBtn");
  const studentId = document.getElementById("studentId").value;

  const studentData = {
    student_code: document.getElementById("studentCode").value.trim(),
    full_name: document.getElementById("studentName").value.trim(),
    gender: document.getElementById("studentGender").value || null,
    birth_date: document.getElementById("studentBirthDate").value || null,
    education_level: document.getElementById("studentEducation").value || null,
    school_name: document.getElementById("studentSchool").value.trim() || null,
    address: document.getElementById("studentAddress").value.trim() || null,
    status: document.getElementById("studentStatus").value,
    notes: document.getElementById("studentNotes").value.trim() || null
  };

  if (!studentData.student_code || !studentData.full_name) {
    showToast("Kode dan nama siswa wajib diisi.");
    return;
  }

  button.disabled = true;
  setText("saveStudentBtn", "Menyimpan...");

  try {
    let result;

    if (studentId) {
      result = await db
        .from("students")
        .update(studentData)
        .eq("id", studentId);
    } else {
      result = await db
        .from("students")
        .insert([studentData]);
    }

    if (result.error) throw result.error;

    closeStudentModal();
    await loadStudents();
    await loadDashboardData();

    showToast(
      studentId
        ? "Data siswa berhasil diperbarui."
        : "Siswa baru berhasil ditambahkan."
    );

  } catch (error) {
    console.error("Gagal menyimpan siswa:", error);

    if (error.code === "23505") {
      showToast("Kode siswa sudah digunakan. Gunakan kode lain.");
    } else {
      showToast("Gagal menyimpan: " + (error.message || "Kesalahan"));
    }

  } finally {
    button.disabled = false;
    setText("saveStudentBtn", "Simpan Siswa");
  }
});

/* =========================================
   EDIT DAN HAPUS SISWA
========================================= */

document.getElementById("studentsTableBody")?.addEventListener("click", async event => {
  const editButton = event.target.closest("[data-student-edit]");
  const deleteButton = event.target.closest("[data-student-delete]");

  if (editButton) {
    const student = allStudents.find(
      item => item.id === editButton.dataset.studentEdit
    );

    if (student) openStudentModal(student);
  }

  if (deleteButton) {
    const id = deleteButton.dataset.studentDelete;
    const student = allStudents.find(item => item.id === id);

    if (!student) return;

    const confirmed = confirm(
      `Yakin ingin menghapus data siswa ${student.full_name}?\n\nTindakan ini tidak dapat dibatalkan.`
    );

    if (!confirmed) return;

    try {
      const { error } = await db
        .from("students")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await loadStudents();
      await loadDashboardData();

      showToast("Data siswa berhasil dihapus.");

    } catch (error) {
      console.error("Gagal menghapus siswa:", error);
      showToast("Gagal menghapus: " + (error.message || "Kesalahan database"));
    }
  }
});

/* =========================================
   AKSES CEPAT
========================================= */

document.querySelectorAll(".quick-action").forEach(button => {
  button.addEventListener("click", () => {
    if (button.dataset.action === "Tambah siswa") {
      history.replaceState(null, "", "#students");
      showPage("students");
      openStudentModal();
    } else {
      showToast(`${button.dataset.action}: fitur sedang disiapkan.`);
    }
  });
});

/* =========================================
   AUTENTIKASI BERHASIL
========================================= */

window.addEventListener("lma:authenticated", async () => {
  showPage(location.hash === "#students" ? "students" : "dashboard");
  await loadDashboardData();
});

/* =========================================
   INISIALISASI
========================================= */

if (location.hash === "#students") {
  showPage("students");
} else {
  showPage("dashboard");
}
