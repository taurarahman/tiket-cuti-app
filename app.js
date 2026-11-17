'use strict';
const AIRPORTS = { CGK: 'Jakarta', SUB: 'Surabaya', DPS: 'Denpasar', KNO: 'Medan', UPG: 'Makassar', MLG: 'Malang' };
const AIRLINES = ['Garuda Indonesia', 'Lion Air', 'Citilink', 'Batik Air'];
const STATUSES = ['waiting for the payment', 'booked', 'confirmed'];
const YEAR = new Date().getFullYear();
const rupiah = (n) => 'Rp' + n.toLocaleString('id-ID');
const pad = (n) => String(n).padStart(2, '0');
const isoDate = (off) => { const d = new Date(); d.setDate(d.getDate() + off); return d.toISOString().slice(0, 10); };

function buildFlights() {
  const list = [];
  let n = 1;
  for (const from of Object.keys(AIRPORTS)) {
    for (const to of Object.keys(AIRPORTS)) {
      if (from === to) continue;
      for (let day = 1; day <= 3; day++) {
        for (let k = 0; k < 3; k++) {
          const seed = n * 7 + k * 3 + day;
          list.push({ id: 'F' + n++, from, to, date: isoDate(day), hour: 6 + ((seed * 5) % 15), minute: (seed % 2) * 30, airline: AIRLINES[seed % 4], price: (500 + ((seed * 37) % 900)) * 1000 });
        }
      }
    }
  }
  return list;
}

const state = {
  flights: buildFlights(),
  employees: [{ id: 'E1', name: 'Andi Pratama' }, { id: 'E2', name: 'Bunga Lestari' }, { id: 'E3', name: 'Citra Dewi' }],
  quota: 12,
  leaves: [
    { emp: 'E1', start: `${YEAR}-03-10`, end: `${YEAR}-03-12` }, { emp: 'E1', start: `${YEAR - 1}-12-23`, end: `${YEAR - 1}-12-27` },
    { emp: 'E2', start: `${YEAR}-03-11`, end: `${YEAR}-03-15` }, { emp: 'E2', start: `${YEAR}-08-17`, end: `${YEAR}-08-18` },
    { emp: 'E3', start: `${YEAR}-03-01`, end: `${YEAR}-03-05` }, { emp: 'E3', start: `${YEAR}-11-20`, end: `${YEAR}-11-25` },
  ],
  profile: { nama: 'Budi Santoso', identitas: '', lahir: '', telp: '' },
  visitors: [{ id: 'V1', nama: 'Sari Wulandari', email: 'sari@example.com' }, { id: 'V2', nama: 'Tono Wijaya', email: 'tono@example.com' }],
  bookings: [],
  emails: [],
};
state.bookings.push(
  { code: 'BK1001', flightId: 'F5', owner: 'V2', by: 'Manajer Travel', status: 'confirmed', validated: false },
  { code: 'BK1002', flightId: 'F40', owner: 'V2', by: 'Manajer Travel', status: 'booked', validated: false },
);

function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  el.append(...kids.flat().filter((x) => x !== null && x !== undefined && x !== false));
  return el;
}
const field = (label, input) => h('label', { class: 'f' }, label, input);
const select = (name, map, value) => h('select', { name }, Object.entries(map).map(([k, v]) => { const o = h('option', { value: k }, v); o.selected = k === value; return o; }));
const airportOpts = Object.fromEntries(Object.entries(AIRPORTS).map(([k, v]) => [k, `${v} (${k})`]));
const flightOf = (id) => state.flights.find((f) => f.id === id);
const timeOf = (f) => `${pad(f.hour)}:${pad(f.minute)}`;
const routeOf = (f) => `${AIRPORTS[f.from]} → ${AIRPORTS[f.to]}`;
const ownerName = (id) => (id === 'U1' ? state.profile.nama : state.visitors.find((v) => v.id === id)?.nama ?? id);
const table = (heads, rows) => h('div', { class: 't' }, h('table', {}, h('thead', {}, h('tr', {}, heads.map((x) => h('th', {}, x)))), h('tbody', {}, rows)));
const button = (label, fn, primary) => h('button', { type: 'button', class: primary ? 'p' : '', onclick: fn }, label);
const say = (box, text, ok) => { box.className = 'msg ' + (ok ? 'ok' : 'bad'); box.textContent = text; };

function createBooking(flightId, owner, by) {
  const b = { code: 'BK' + (1001 + state.bookings.length), flightId, owner, by, status: 'waiting for the payment', validated: false };
  state.bookings.push(b);
  return b;
}

function flightRows(list, action, bestPrice) {
  return list.map((f) => h('tr', { class: f.price === bestPrice ? 'best' : '' }, h('td', {}, routeOf(f)), h('td', {}, `${f.date} ${timeOf(f)}`), h('td', {}, f.airline), h('td', {}, rupiah(f.price)), action ? h('td', {}, action(f)) : null));
}

/* Panel pencarian generik: dipakai US2, US3, US4, US6, US8 */
function searchPane(o) {
  const out = h('div');
  const msg = h('p', { class: 'msg', role: 'status' });
  const dests = o.multi
    ? h('fieldset', {}, h('legend', {}, 'Tujuan'), Object.entries(AIRPORTS).map(([k, v]) => h('label', {}, h('input', { type: 'checkbox', name: 'dest', value: k }), ' ' + v)))
    : field('Tujuan', select('dest', airportOpts, 'DPS'));
  const form = h('form', {
    onsubmit: (e) => {
      e.preventDefault();
      const d = new FormData(form);
      const chosen = d.getAll('dest');
      if (chosen.length === 0) { out.replaceChildren(); return say(msg, 'Pilih minimal satu tujuan.', false); }
      let found = state.flights.filter((f) => f.from === d.get('from') && f.date === d.get('date') && chosen.includes(f.to));
      if (o.hour) found = found.filter((f) => f.hour >= Number(d.get('hour')));
      if (o.sort) found.sort((a, b) => a.price - b.price);
      if (found.length === 0) { out.replaceChildren(); return say(msg, 'Tidak ada penerbangan yang cocok.', false); }
      const best = Math.min(...found.map((f) => f.price));
      say(msg, o.summary ? `${found.length} penerbangan ditemukan, harga termurah ${rupiah(best)}.` : `${found.length} penerbangan ditemukan.`, true);
      out.replaceChildren(table(['Rute', 'Jadwal', 'Maskapai', 'Harga', o.action ? 'Aksi' : null].filter(Boolean), flightRows(found, o.action && ((f) => o.action(f, msg)), o.sort ? best : null)));
    },
  }, field('Berangkat dari', select('from', airportOpts, 'SUB')), field('Tanggal', h('input', { type: 'date', name: 'date', value: isoDate(1), min: isoDate(1), max: isoDate(3) })), dests, o.hour ? field('Berangkat setelah jam', h('input', { type: 'number', name: 'hour', min: 0, max: 23, value: 0 })) : null, h('button', { class: 'p', type: 'submit' }, 'Cari'));
  return h('section', {}, h('h2', {}, o.title), form, msg, out);
}

const bookAction = (owner, by) => (f, msg) => button('Pesan', () => { const b = createBooking(f.id, owner, by); say(msg, `Pesanan ${b.code} dibuat (${routeOf(f)}, ${f.airline}). Status: ${b.status}.`, true); });

function myBookings(owner, withValidate) {
  const msg = h('p', { class: 'msg', role: 'status' });
  const box = h('section', {}, h('h2', {}, 'Pesanan saya'));
  const draw = () => {
    const mine = state.bookings.filter((b) => b.owner === owner);
    const rows = mine.map((b) => {
      const f = flightOf(b.flightId);
      const acts = [];
      if (b.status === 'waiting for the payment') acts.push(button('Bayar', () => { b.status = 'booked'; draw(); }));
      if (b.status !== 'dibatalkan') acts.push(button('Batalkan', () => { b.status = 'dibatalkan'; draw(); say(msg, `Pesanan ${b.code} dibatalkan.`, true); }));
      if (withValidate && b.status !== 'dibatalkan') acts.push(button(b.validated ? 'Tervalidasi' : 'Validasi tiket', () => validate(b, msg, draw)));
      return h('tr', {}, h('td', {}, b.code), h('td', {}, routeOf(f)), h('td', {}, `${f.date} ${timeOf(f)}`), h('td', {}, f.airline), h('td', {}, b.status), h('td', {}, acts));
    });
    box.replaceChildren(h('h2', {}, 'Pesanan saya'), mine.length ? table(['Kode', 'Rute', 'Jadwal', 'Maskapai', 'Status', 'Aksi'], rows) : h('p', {}, 'Belum ada pesanan.'), msg);
  };
  draw();
  return box;
}

const profileComplete = () => Object.values(state.profile).every((v) => v.trim() !== '');
function validate(b, msg, redraw) {
  if (!profileComplete()) return say(msg, 'data profil tidak lengkap', false);
  b.validated = true;
  redraw();
  say(msg, `Tiket ${b.code} tervalidasi berdasarkan data profil.`, true);
}

function profilePane() {
  const msg = h('p', { class: 'msg', role: 'status' });
  const p = state.profile;
  const form = h('form', {
    onsubmit: (e) => {
      e.preventDefault();
      const d = new FormData(form);
      Object.assign(state.profile, { nama: d.get('nama'), identitas: d.get('identitas'), lahir: d.get('lahir'), telp: d.get('telp') });
      say(msg, profileComplete() ? 'Profil tersimpan dan lengkap.' : 'Profil tersimpan, tetapi belum lengkap.', profileComplete());
    },
  }, field('Nama lengkap', h('input', { name: 'nama', value: p.nama })), field('Nomor identitas', h('input', { name: 'identitas', value: p.identitas })), field('Tanggal lahir', h('input', { type: 'date', name: 'lahir', value: p.lahir })), field('Nomor telepon', h('input', { name: 'telp', value: p.telp })), h('button', { class: 'p', type: 'submit' }, 'Simpan profil'));
  return h('section', {}, h('h2', {}, 'Data profil'), form, msg);
}

function leavePane() {
  const out = h('div');
  const days = (l) => Math.round((new Date(l.end) - new Date(l.start)) / 86400000) + 1;
  const form = h('form', {
    onsubmit: (e) => {
      e.preventDefault();
      const d = new FormData(form);
      const y = Number(d.get('y')), m = Number(d.get('m')), dd = Number(d.get('d'));
      const mm = pad(m);
      let range = [`${y}-01-01`, `${y}-12-31`];
      if (m && dd) range = [`${y}-${mm}-${pad(dd)}`, `${y}-${mm}-${pad(dd)}`];
      else if (m) range = [`${y}-${mm}-01`, `${y}-${mm}-${pad(new Date(y, m, 0).getDate())}`];
      const hits = state.leaves.filter((l) => l.start <= range[1] && l.end >= range[0]);
      const rows = hits.map((l) => { const emp = state.employees.find((x) => x.id === l.emp); return h('tr', {}, h('td', {}, h('button', { type: 'button', onclick: () => history(emp) }, emp.name)), h('td', {}, `${l.start} s.d. ${l.end}`), h('td', {}, `${days(l)} hari`)); });
      out.replaceChildren(hits.length ? table(['Nama pegawai (klik untuk riwayat)', 'Periode cuti', 'Lama'], rows) : h('p', { class: 'msg bad' }, 'Tidak ada pengajuan cuti pada periode ini.'), h('div', { id: 'hist' }));
    },
  }, field('Tahun', h('input', { type: 'number', name: 'y', value: YEAR, min: 2000, max: 2100 })), field('Bulan', select('m', { 0: 'Semua', ...Object.fromEntries(['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((n, i) => [i + 1, n])) }, '0')), field('Tanggal (opsional, perlu bulan)', h('input', { type: 'number', name: 'd', min: 1, max: 31 })), h('button', { class: 'p', type: 'submit' }, 'Tampilkan'));
  function history(emp) {
    const mine = state.leaves.filter((l) => l.emp === emp.id);
    const used = mine.filter((l) => l.start.startsWith(String(YEAR))).reduce((s, l) => s + days(l), 0);
    out.querySelector('#hist').replaceChildren(h('h2', {}, `Riwayat cuti ${emp.name}`), table(['Periode', 'Lama'], mine.map((l) => h('tr', {}, h('td', {}, `${l.start} s.d. ${l.end}`), h('td', {}, `${days(l)} hari`)))), h('p', { class: 'msg ok' }, `Sisa cuti ${YEAR}: ${state.quota - used} dari ${state.quota} hari.`));
  }
  return h('section', {}, h('h2', {}, 'Pengajuan cuti per periode'), form, out);
}

function statusPane() {
  const out = h('div');
  const draw = (status) => {
    const list = state.bookings.filter((b) => !status || b.status === status);
    out.replaceChildren(list.length ? table(['Kode', 'Atas nama', 'Rute', 'Status'], list.map((b) => h('tr', {}, h('td', {}, b.code), h('td', {}, ownerName(b.owner)), h('td', {}, routeOf(flightOf(b.flightId))), h('td', {}, b.status)))) : h('p', {}, 'Tidak ada booking dengan status ini.'));
  };
  const filter = select('status', { '': 'Semua status', ...Object.fromEntries([...STATUSES, 'dibatalkan'].map((s) => [s, s])) }, '');
  filter.addEventListener('change', () => draw(filter.value));
  draw('');
  return h('section', {}, h('h2', {}, 'Status booking'), field('Filter status', filter), out);
}

function visitorBookPane() {
  const sel = select('visitor', Object.fromEntries(state.visitors.map((v) => [v.id, `${v.nama} <${v.email}>`])), 'V1');
  const pane = searchPane({
    title: 'Cari tiket untuk pengunjung', multi: false,
    action: (f, msg) => button('Pesan untuk pengunjung', () => {
      const v = state.visitors.find((x) => x.id === sel.value);
      const b = createBooking(f.id, v.id, 'Manajer Travel');
      state.emails.push({ to: v.email, subject: `E-tiket ${b.code}`, route: routeOf(f) });
      say(msg, `Pesanan ${b.code} disimpan atas nama ${v.nama}. E-tiket dikirim ke ${v.email}.`, true);
    }),
  });
  pane.insertBefore(field('Pengunjung', sel), pane.querySelector('form'));
  return pane;
}

function authPane() {
  const out = h('p', { class: 'msg', role: 'status' });
  const form = h('form', {
    onsubmit: (e) => {
      e.preventDefault();
      const code = new FormData(form).get('code').trim().toUpperCase();
      const b = state.bookings.find((x) => x.code === code);
      if (!b) return say(out, 'kode booking reference tidak sesuai. Masukkan ulang kode booking reference.', false);
      say(out, `Tiket ${b.code} (${ownerName(b.owner)}, ${routeOf(flightOf(b.flightId))}) terotorisasi. Status booking: ${b.status}.`, true);
    },
  }, field('Kode booking reference', h('input', { name: 'code', placeholder: 'contoh: BK1001', required: '' })), h('button', { class: 'p', type: 'submit' }, 'Otorisasi'));
  return h('section', {}, h('h2', {}, 'Otorisasi tiket'), form, out);
}

function visitorPane() {
  const mine = state.emails.filter((m) => m.to === state.visitors[0].email);
  return [myBookings('V1', false), h('section', {}, h('h2', {}, 'Kotak masuk e-tiket'), mine.length ? table(['Subjek', 'Rute'], mine.map((m) => h('tr', {}, h('td', {}, m.subject), h('td', {}, m.route)))) : h('p', {}, 'Belum ada e-tiket.'))];
}

const searchTab = { title: 'Cari tiket (satu atau beberapa tujuan)', multi: true, action: bookAction('U1', 'Pengguna') };
const memberTabs = {
  'Multi-destinasi': () => searchPane({ title: 'Cari penerbangan multi-destinasi', multi: true, summary: true, sort: true }),
  Bandingkan: () => searchPane({ title: 'Bandingkan penerbangan', multi: false, hour: true, sort: true, action: bookAction('U1', 'Member') }),
  'Profil & validasi': () => [profilePane(), myBookings('U1', true)],
};
const ROLES = {
  hrd: { label: 'HRD Manajer', tabs: { 'Cuti pegawai': leavePane } },
  user: { label: 'Pengguna', tabs: { 'Cari & pesan': () => searchPane(searchTab), 'Pesanan saya': () => myBookings('U1', false) } },
  member: { label: 'Member Frequent Traveller', tabs: { 'Cari & pesan': () => searchPane(searchTab), 'Pesanan saya': () => myBookings('U1', false), ...memberTabs } },
  travel: { label: 'Manajer Travel', tabs: { 'Status booking': statusPane, 'Pesan untuk pengunjung': visitorBookPane, Otorisasi: authPane } },
  visitor: { label: 'Pengunjung', tabs: { 'Tiket saya': visitorPane } },
};

const roleSel = document.getElementById('role');
const tabsEl = document.getElementById('tabs');
const mainEl = document.getElementById('main');
roleSel.append(...Object.entries(ROLES).map(([k, r]) => h('option', { value: k }, r.label)));

function showTab(role, name) {
  tabsEl.querySelectorAll('button').forEach((b) => (b.textContent === name ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  const view = ROLES[role].tabs[name]();
  mainEl.replaceChildren(...[view].flat());
}
function showRole() {
  const role = roleSel.value;
  const names = Object.keys(ROLES[role].tabs);
  tabsEl.replaceChildren(...names.map((n) => button(n, () => showTab(role, n))));
  showTab(role, names[0]);
}
roleSel.addEventListener('change', showRole);
showRole();
