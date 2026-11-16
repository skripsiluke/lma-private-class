(() => {
  const loginView = document.getElementById('loginView');
  const loginForm = document.getElementById('loginForm');
  const loginMessage = document.getElementById('loginMessage');
  const appShell = document.querySelector('.app-shell');
  const logoutBtn = document.getElementById('logoutBtn');

  if (!window.supabase || !window.LMA_SUPABASE_URL || !window.LMA_SUPABASE_PUBLISHABLE_KEY || window.LMA_SUPABASE_PUBLISHABLE_KEY === 'TEMPEL_PUBLISHABLE_KEY_DI_SINI') {
    if (loginMessage) loginMessage.textContent = 'Konfigurasi Supabase belum lengkap. Periksa assets/js/supabase-config.js.';
    return;
  }

  const client = window.supabase.createClient(
    window.LMA_SUPABASE_URL,
    window.LMA_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );
  window.lmaSupabase = client;

  async function showApp(session) {
    if (!session) {
      document.body.classList.remove('authenticated');
      if (loginView) loginView.hidden = false;
      return;
    }
    const { data: profile, error } = await client
      .from('profiles')
      .select('full_name, role, is_active')
      .eq('id', session.user.id)
      .single();

    if (error || !profile || !profile.is_active || profile.role !== 'admin') {
      await client.auth.signOut();
      document.body.classList.remove('authenticated');
      if (loginView) loginView.hidden = false;
      if (loginMessage) loginMessage.textContent = 'Akun ini belum memiliki akses administrator. Hubungi pemilik aplikasi.';
      return;
    }

    document.body.classList.add('authenticated');
    if (loginView) loginView.hidden = true;
    if (appShell) appShell.hidden = false;
    const name = profile.full_name || session.user.email || 'Administrator';
    document.querySelectorAll('[data-profile-name]').forEach(el => el.textContent = name);
    const initials = name.trim().split(/\s+/).slice(0,2).map(x => x[0]).join('').toUpperCase();
    document.querySelectorAll('[data-profile-initials]').forEach(el => el.textContent = initials || 'AD');
    window.dispatchEvent(new CustomEvent('lma:authenticated'));
  }

  loginForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const submit = loginForm.querySelector('button[type="submit"]');
    if (submit) { submit.disabled = true; submit.textContent = 'Memeriksa...'; }
    if (loginMessage) loginMessage.textContent = '';
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      if (loginMessage) loginMessage.textContent = 'Login gagal: ' + error.message;
    } else {
      await showApp(data.session);
    }
    if (submit) { submit.disabled = false; submit.textContent = 'Masuk ke Dashboard'; }
  });

  logoutBtn?.addEventListener('click', async () => {
    await client.auth.signOut();
    document.body.classList.remove('authenticated');
    if (loginView) loginView.hidden = false;
    if (loginMessage) loginMessage.textContent = 'Kamu sudah keluar dari aplikasi.';
  });

  client.auth.onAuthStateChange((_event, session) => {
    // Jalankan verifikasi profil setelah event auth selesai diproses.
    setTimeout(() => showApp(session), 0);
  });

  client.auth.getSession().then(({ data }) => showApp(data.session));
})();
