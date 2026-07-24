/* =================================================================
   PLACEHOLDER DATA
   All sample figures live here. When real aggregation endpoints
   exist, replace each property with an API fetch result.
================================================================= */
var SAMPLE_DATA = {
  kpis: {
    totalEmployees: 127,
    activeStaff:    114,
    formsThisMonth: 43,
    reviewsDue:     8
  },
  submissionsByMonth: {
    labels:    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    submitted: [12, 19, 15, 22, 28, 31, 43],
    approved:  [10, 16, 13, 19, 25, 27, 38]
  },
  formsByType: {
    labels: ['Onboarding', 'Performance', 'Leave Request', 'Other'],
    counts: [38, 27, 22, 13]
  },
  activityByDay: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    counts: [12, 18, 15, 24, 20, 8, 5]
  },
  headcountByLocation: [
    { name: 'Iowa Falls',   count: 47, colorVar: '--brand-primary'   },
    { name: 'Webster City', count: 38, colorVar: '--brand-secondary' },
    { name: 'Elkhorn',      count: 29, colorVar: '--chart-info'      },
    { name: 'Ames',         count: 13, colorVar: '--chart-accent'    }
  ],
  highlight: {
    value: '94%',
    label: 'Staff Retention Rate',
    trend: [88, 89, 90, 90, 91, 92, 93, 94]
  },
  currentUser: {
    name: 'Demo User',
    initials: 'DU'
  }
};
/* ================================================================= */

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/* ---- Navigation ---- */
function navigate(el) {
  var section = el.dataset.section;
  var label   = el.dataset.label || section;

  document.querySelectorAll('.nav-item').forEach(function(i) { i.classList.remove('active'); });
  el.classList.add('active');

  document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
  var target = document.getElementById('section-' + section);
  if (target) target.classList.add('active');

  document.getElementById('sidebar').classList.remove('open');
  if (section === 'directory') initDirCurrentView();
}

/* ---- Populate static UI from SAMPLE_DATA ---- */
function renderDashboard() {
  /* KPI values */
  var kpis = SAMPLE_DATA.kpis;
  setText('kpiTotal',   kpis.totalEmployees);
  setText('kpiActive',  kpis.activeStaff);
  setText('kpiForms',   kpis.formsThisMonth);
  setText('kpiReviews', kpis.reviewsDue);

  /* Highlight card */
  setText('hlValue', SAMPLE_DATA.highlight.value);
  setText('hlLabel', SAMPLE_DATA.highlight.label);

  /* User chip */
  setText('userAvatar', SAMPLE_DATA.currentUser.initials);
  setText('userName',   SAMPLE_DATA.currentUser.name);

  /* Headcount by location */
  var list = document.getElementById('locList');
  if (!list) return;
  var locs   = SAMPLE_DATA.headcountByLocation;
  var maxCnt = Math.max.apply(null, locs.map(function(l) { return l.count; }));
  list.innerHTML = locs.map(function(loc) {
    var pct = ((loc.count / maxCnt) * 100).toFixed(1);
    return '<div class="loc-row">'
      + '<div class="loc-name">' + loc.name + '</div>'
      + '<div class="loc-track">'
      +   '<div class="loc-fill" style="width:' + pct + '%;background:var(' + loc.colorVar + ')"></div>'
      + '</div>'
      + '<div class="loc-count">' + loc.count + '</div>'
      + '</div>';
  }).join('');
}

function setText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ---- Chart.js initialisation ---- */
function initCharts() {
  var primary   = cssVar('--brand-primary');
  var secondary = cssVar('--brand-secondary');
  var info      = cssVar('--chart-info');
  var accent    = cssVar('--chart-accent');
  var track     = cssVar('--track');
  var textMuted = cssVar('--text-muted');

  /* Shared tick/grid style */
  var scaleDefaults = {
    ticks: { color: textMuted, font: { family: "'DM Sans', sans-serif", size: 11 } },
    grid:  { color: track }
  };

  /* --- Bar chart: Form Submissions Trend --- */
  var barCtx = document.getElementById('chartSubmissions');
  if (barCtx) {
    new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: SAMPLE_DATA.submissionsByMonth.labels,
        datasets: [
          {
            label: 'Submitted',
            data: SAMPLE_DATA.submissionsByMonth.submitted,
            backgroundColor: primary,
            borderRadius: 4,
            barPercentage: 0.55
          },
          {
            label: 'Approved',
            data: SAMPLE_DATA.submissionsByMonth.approved,
            backgroundColor: accent,
            borderRadius: 4,
            barPercentage: 0.55
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { color: textMuted, font: { family: "'DM Sans', sans-serif", size: 11 }, boxWidth: 10, boxHeight: 10 }
          }
        },
        scales: {
          x: Object.assign({}, scaleDefaults, { grid: { display: false } }),
          y: Object.assign({}, scaleDefaults, { beginAtZero: true })
        }
      }
    });
  }

  /* --- Donut chart: Forms by Type --- */
  var donutCtx = document.getElementById('chartDonut');
  if (donutCtx) {
    var donutTotal = SAMPLE_DATA.formsByType.counts.reduce(function(a, b) { return a + b; }, 0);

    /* Center-text plugin (scoped to this chart via afterDraw) */
    var centerPlugin = {
      id: 'centerLabel',
      afterDraw: function(chart) {
        if (chart.canvas.id !== 'chartDonut') return;
        var ctx = chart.ctx;
        var cx  = chart.chartArea.left + (chart.chartArea.right  - chart.chartArea.left) / 2;
        var cy  = chart.chartArea.top  + (chart.chartArea.bottom - chart.chartArea.top)  / 2;
        ctx.save();
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.font         = "700 26px 'DM Sans', sans-serif";
        ctx.fillStyle    = cssVar('--text-primary');
        ctx.fillText(donutTotal, cx, cy - 9);
        ctx.font      = "400 11px 'DM Sans', sans-serif";
        ctx.fillStyle = cssVar('--text-muted');
        ctx.fillText('total', cx, cy + 13);
        ctx.restore();
      }
    };

    new Chart(donutCtx, {
      type: 'doughnut',
      plugins: [centerPlugin],
      data: {
        labels: SAMPLE_DATA.formsByType.labels,
        datasets: [{
          data: SAMPLE_DATA.formsByType.counts,
          backgroundColor: [primary, secondary, info, accent],
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: textMuted, font: { family: "'DM Sans', sans-serif", size: 11 }, boxWidth: 10, boxHeight: 10, padding: 14 }
          }
        }
      }
    });
  }

  /* --- Area chart: Activity --- */
  var actCtx = document.getElementById('chartActivity');
  if (actCtx) {
    var actGrad = actCtx.getContext('2d').createLinearGradient(0, 0, 0, 220);
    actGrad.addColorStop(0, hexToRgba(primary, 0.22));
    actGrad.addColorStop(1, hexToRgba(primary, 0));

    new Chart(actCtx, {
      type: 'line',
      data: {
        labels: SAMPLE_DATA.activityByDay.labels,
        datasets: [{
          label: 'Actions',
          data: SAMPLE_DATA.activityByDay.counts,
          borderColor: primary,
          backgroundColor: actGrad,
          fill: true,
          tension: 0.45,
          pointRadius: 4,
          pointBackgroundColor: primary,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: Object.assign({}, scaleDefaults, { grid: { display: false } }),
          y: Object.assign({}, scaleDefaults, { beginAtZero: true })
        }
      }
    });
  }

  /* --- Sparkline in highlight card --- */
  var sparkCtx = document.getElementById('chartSparkline');
  if (sparkCtx) {
    new Chart(sparkCtx, {
      type: 'line',
      data: {
        labels: SAMPLE_DATA.highlight.trend.map(function() { return ''; }),
        datasets: [{
          data: SAMPLE_DATA.highlight.trend,
          borderColor: 'rgba(255,255,255,0.85)',
          backgroundColor: 'rgba(255,255,255,0.15)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend:  { display: false },
          tooltip: { enabled: false }
        },
        scales: {
          x: { display: false },
          y: { display: false }
        }
      }
    });
  }
}

/* Convert a 6-digit hex color to rgba() string */
function hexToRgba(hex, alpha) {
  var h = hex.replace('#', '');
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  var r = parseInt(h.slice(0,2), 16);
  var g = parseInt(h.slice(2,4), 16);
  var b = parseInt(h.slice(4,6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

/* Shared fetch wrapper - redirects to login on 401 */
function apiFetch(url, options) {
  return fetch(url, options).then(function(res) {
    if (res.status === 401) { window.location.href = '/'; return null; }
    return res;
  });
}

/* ---- Bootstrap ---- */
document.addEventListener('DOMContentLoaded', function() {
  renderDashboard();

  apiFetch('/api/company-config', { credentials: 'include' })
    .then(function(res) {
      if (!res) return null; /* 401: redirect in progress */
      if (!res.ok) throw new Error('company-config ' + res.status);
      return res.json();
    })
    .then(function(cfg) {
      if (!cfg) return; /* 401: do not render */
      var root = document.documentElement;

      if (cfg.primary_color)   root.style.setProperty('--brand-primary',   cfg.primary_color);
      if (cfg.secondary_color) root.style.setProperty('--brand-secondary',  cfg.secondary_color);

      var logo = document.getElementById('companyLogo');
      if (logo) {
        logo.src = cfg.logo_url || '/images/elevate_logo_white.png';
        if (cfg.name) logo.alt = cfg.name;
      }

      var nameEl = document.getElementById('companyName');
      if (nameEl && cfg.name) nameEl.textContent = cfg.name;

      if (cfg.name) document.title = cfg.name + ' - Employee Portal';

      var features = cfg.features || {};
      document.querySelectorAll('.nav-item[data-section]').forEach(function(item) {
        if (features[item.dataset.section] === false) item.style.display = 'none';
      });

      initCharts();
    })
    .catch(function(err) {
      console.error('company-config fetch failed, using CSS defaults:', err);
      initCharts();
    });
});

/* ================================================================
   DIRECTORY
================================================================ */

var DIR_TINTS  = ['tint-orange', 'tint-green', 'tint-blue', 'tint-violet'];
var dirData    = null;  /* full cached list from /api/employees */
var dirFetched = false; /* prevents duplicate in-flight requests */
var empFormMode   = 'add';  /* 'add' | 'edit' */
var empFormEditId = null;   /* employee id when editing */
var empFormHidden = {};     /* pay_type, pay_amount, termination_date passthrough */
var dirViewArchived    = false; /* true = archived view active */
var dirArchivedData    = null;  /* cached archived list */
var dirArchivedFetched = false; /* prevents duplicate archived requests */
var dirCurrentEmpId  = null;  /* empId open in the detail modal */
var dirDocsLoaded    = false; /* true once docs have been fetched for dirCurrentEmpId */
var dirSortKey       = 'name'; /* active sort column */
var dirSortDir       = 'asc';  /* 'asc' | 'desc' */
var dirVisibleData   = null;   /* last rendered set - used by CSV export */

function initDirectory() {
  if (dirFetched) {
    applyDirFilters(); /* re-filter in case filters were changed */
    return;
  }
  dirFetched = true;
  showDirState('loading', 'Loading...');

  apiFetch('/api/employees', { credentials: 'include' })
    .then(function(res) {
      if (!res) return null;
      if (!res.ok) throw new Error('Server returned ' + res.status);
      return res.json();
    })
    .then(function(data) {
      if (!data) return;
      dirData = data;
      populateDirFilters(data);
      if (!dirViewArchived) renderDirTable(data);
    })
    .catch(function(err) {
      dirFetched = false; /* allow retry on next visit */
      showDirState('error', 'Could not load employees. ' + err.message);
    });
}

function showDirState(type, msg) {
  var body = document.getElementById('dirBody');
  if (!body) return;
  var cls = type === 'error' ? ' dir-state-error' : '';
  body.innerHTML = '<div class="dir-state' + cls + '">' + esc(msg) + '</div>';
  var cnt = document.getElementById('dirCount');
  if (cnt) cnt.textContent = '';
}

function populateDirFilters(data) {
  var locs     = [];
  var statuses = [];
  data.forEach(function(e) {
    if (e.location && locs.indexOf(e.location)         === -1) locs.push(e.location);
    if (e.status   && statuses.indexOf(e.status)       === -1) statuses.push(e.status);
  });
  locs.sort();
  statuses.sort();

  populateDirSelect('dirFilterLoc',    locs,     'All Locations', null);
  populateDirSelect('dirFilterStatus', statuses, 'All Status',    dirCapFirst);
}

function populateDirSelect(id, values, placeholder, labelFn) {
  var sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML = '<option value="">' + placeholder + '</option>';
  values.forEach(function(v) {
    var opt = document.createElement('option');
    opt.value = v;
    opt.textContent = labelFn ? labelFn(v) : v;
    sel.appendChild(opt);
  });
}

function applyDirFilters() {
  var data = getCurrentDirData();
  if (!data) return;
  var searchEl  = document.getElementById('dirSearch');
  var locEl     = document.getElementById('dirFilterLoc');
  var statusEl  = document.getElementById('dirFilterStatus');
  var q      = searchEl  ? searchEl.value.toLowerCase()  : '';
  var loc    = locEl     ? locEl.value                   : '';
  var status = statusEl  ? statusEl.value                : '';

  var filtered = data.filter(function(e) {
    var matchQ = !q
      || (e.employee_code && e.employee_code.toLowerCase().indexOf(q) !== -1)
      || (e.name          && e.name.toLowerCase().indexOf(q)          !== -1)
      || (e.title         && e.title.toLowerCase().indexOf(q)         !== -1)
      || (e.location      && e.location.toLowerCase().indexOf(q)      !== -1);
    var matchLoc    = !loc    || e.location === loc;
    var matchStatus = !status || e.status   === status;
    return matchQ && matchLoc && matchStatus;
  });

  renderDirTable(filtered);
}

/* ---- Sort ---- */

function dirSortEmployees(arr) {
  var key = dirSortKey;
  var dir = dirSortDir === 'asc' ? 1 : -1;
  return arr.slice().sort(function(a, b) {
    var av = a[key];
    var bv = b[key];
    if (!av && bv)   return 1;   /* nulls last */
    if (av  && !bv)  return -1;
    if (!av && !bv)  return 0;
    av = String(av).toLowerCase();
    bv = String(bv).toLowerCase();
    return av < bv ? -dir : av > bv ? dir : 0;
  });
}

function dirSortTh(label, key) {
  var isActive = dirSortKey === key;
  var caret = isActive
    ? '<span class="dir-sort-caret">' + (dirSortDir === 'asc' ? '&#9650;' : '&#9660;') + '</span>'
    : '<span class="dir-sort-caret dir-sort-caret--idle">&#9650;</span>';
  return '<th class="dir-th-sort" onclick="sortDirBy(\'' + key + '\')">' + label + caret + '</th>';
}

function sortDirBy(key) {
  if (dirSortKey === key) {
    dirSortDir = dirSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    dirSortKey = key;
    dirSortDir = 'asc';
  }
  applyDirFilters();
}

function renderDirTable(employees) {
  var body = document.getElementById('dirBody');
  if (!body) return;

  var currentData = getCurrentDirData();

  /* Update count badge */
  var total = currentData ? currentData.length : employees.length;
  var cnt   = document.getElementById('dirCount');
  if (cnt) {
    cnt.textContent = employees.length === total
      ? total + ' employee' + (total !== 1 ? 's' : '')
      : employees.length + ' of ' + total;
  }

  if (employees.length === 0) {
    dirVisibleData = [];
    var emptyMsg = (currentData && currentData.length === 0)
      ? (dirViewArchived ? 'No archived employees.' : 'No employees yet.')
      : 'No results match your filters.';
    body.innerHTML = '<div class="dir-state">' + emptyMsg + '</div>';
    return;
  }

  var sorted = dirSortEmployees(employees);
  dirVisibleData = sorted;

  var chevron = '<svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">'
    + '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>';

  var rows = sorted.map(function(emp) {
    var statusCell;
    if (emp.archived_at) {
      statusCell = '<span class="dir-pill dir-pill-archived">Archived</span>'
        + '<span class="dir-archived-date">' + esc(dirFmtDate(emp.archived_at) || '') + '</span>';
    } else {
      var dotClass  = dirDotClass(emp.status);
      var statusLbl = emp.status ? dirCapFirst(emp.status) : '--';
      statusCell = '<span class="dir-status"><span class="dir-dot ' + dotClass + '"></span>' + esc(statusLbl) + '</span>';
    }

    return '<tr class="dir-row" onclick="openDirModal(' + emp.id + ')">'
      + '<td class="dir-emp-code">' + esc(emp.employee_code || '--') + '</td>'
      + '<td class="dir-name">' + esc(emp.name || '--') + '</td>'
      + '<td>' + esc(emp.title || '--') + '</td>'
      + '<td>' + esc(emp.department || '--') + '</td>'
      + '<td><span class="dir-pill">' + esc(emp.location || '--') + '</span></td>'
      + '<td>' + statusCell + '</td>'
      + '<td class="dir-chevron">' + chevron + '</td>'
      + '</tr>';
  }).join('');

  var statusKey = dirViewArchived ? 'archived_at' : 'status';
  body.innerHTML = '<div class="dir-table-wrap"><table class="dir-table">'
    + '<thead><tr>'
    + dirSortTh('ID', 'employee_code')
    + dirSortTh('Name', 'name')
    + dirSortTh('Title', 'title')
    + dirSortTh('Department', 'department')
    + dirSortTh('Location', 'location')
    + dirSortTh(dirViewArchived ? 'Archived' : 'Status', statusKey)
    + '<th></th>'
    + '</tr></thead>'
    + '<tbody>' + rows + '</tbody>'
    + '</table></div>';
}

/* ---- CSV Export ---- */

function exportDirCsv() {
  var data = dirVisibleData;
  if (!data || data.length === 0) return;
  var isArchived = dirViewArchived;
  var today = new Date();
  var yyyy  = today.getFullYear();
  var mm    = String(today.getMonth() + 1).padStart(2, '0');
  var dd    = String(today.getDate()).padStart(2, '0');
  var filename = (isArchived ? 'employees-archived-' : 'employees-') + yyyy + '-' + mm + '-' + dd + '.csv';

  function csvCell(val) {
    return '"' + (val == null ? '' : String(val)).replace(/"/g, '""') + '"';
  }

  var headers = ['Employee ID','Name','Title','Department','Location','Status','Email','Phone','Supervisor','Hire Date'];
  if (isArchived) headers.push('Archived On');
  var lines = [headers.map(csvCell).join(',')];

  data.forEach(function(emp) {
    var status = emp.archived_at ? 'Archived' : (emp.status || '');
    var row = [
      emp.employee_code || '',
      emp.name          || '',
      emp.title         || '',
      emp.department  || '',
      emp.location    || '',
      status,
      emp.email       || '',
      emp.phone       || '',
      emp.supervisor  || '',
      emp.hire_date   ? String(emp.hire_date).split('T')[0] : ''
    ];
    if (isArchived) row.push(emp.archived_at ? String(emp.archived_at).split('T')[0] : '');
    lines.push(row.map(csvCell).join(','));
  });

  var blob = new Blob([lines.join('\r\n')], { type: 'text/csv' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function openDirModal(empId) {
  dirCurrentEmpId = empId;
  dirDocsLoaded   = false;
  /* Reset to Info tab */
  var tabInfo  = document.getElementById('dirTabInfo');
  var tabDocs  = document.getElementById('dirTabDocs');
  var infoBody = document.getElementById('dirModalInfoBody');
  var docsBody = document.getElementById('dirModalDocsBody');
  if (tabInfo)  { tabInfo.classList.add('active'); }
  if (tabDocs)  { tabDocs.classList.remove('active'); }
  if (infoBody) { infoBody.style.display = ''; }
  if (docsBody) { docsBody.style.display = 'none'; }

  var currentData = getCurrentDirData();
  if (!currentData) return;
  var emp = null;
  var empIdx = 0;
  for (var i = 0; i < currentData.length; i++) {
    if (currentData[i].id === empId) { emp = currentData[i]; empIdx = i; break; }
  }
  if (!emp) return;

  var tintClass = DIR_TINTS[empIdx % 4];
  var closeBtn  = '<button class="dir-modal-close" onclick="closeDirModal()" aria-label="Close">'
    + '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">'
    + '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>'
    + '</svg></button>';

  var hd = document.getElementById('dirModalHd');
  if (hd) {
    var subParts = [emp.title, emp.location].filter(Boolean);
    if (emp.archived_at) subParts.push('Archived ' + (dirFmtDate(emp.archived_at) || ''));
    var sub = subParts.join(' - ');
    hd.innerHTML = '<div class="dir-modal-avatar ' + tintClass + '">' + esc(dirInitials(emp.name)) + '</div>'
      + '<div class="dir-modal-info">'
      + '<div class="dir-modal-name">' + esc(emp.name || '--') + '</div>'
      + '<div class="dir-modal-sub">'  + esc(sub || '')         + '</div>'
      + '</div>'
      + closeBtn;
  }

  /* Field list - pay_type and pay_amount intentionally excluded */
  var fields = [
    ['Employee ID',      emp.employee_code],
    ['Title',            emp.title],
    ['Department',       emp.department],
    ['Location',         emp.location],
    ['Status',           emp.status ? dirCapFirst(emp.status) : null],
    ['Employment Type',  emp.employment_type ? dirCapFirst(emp.employment_type) : null],
    ['Email',            emp.email],
    ['Phone',            emp.phone],
    ['Supervisor',       emp.supervisor],
    ['Hire Date',        dirFmtDate(emp.hire_date)],
    ['Termination Date', dirFmtDate(emp.termination_date)]
  ];
  if (emp.archived_at) {
    fields.push(['Archived On', dirFmtDate(emp.archived_at)]);
  }

  var items = fields.map(function(pair) {
    return '<div class="dir-detail-item">'
      + '<div class="dir-detail-label">' + pair[0] + '</div>'
      + '<div class="dir-detail-value">' + esc(pair[1] || '--') + '</div>'
      + '</div>';
  }).join('');

  var footerHtml = emp.archived_at
    ? renderArchivedFooter(emp.id)
    : renderDetailFooter(emp.id);

  var mb = document.getElementById('dirModalInfoBody');
  if (mb) mb.innerHTML = '<div class="dir-detail-grid">' + items + '</div>'
    + '<div class="form-banner" id="dirArchiveBanner" role="alert"></div>'
    + '<div class="dir-modal-footer" id="dirDetailFooter">'
    + footerHtml
    + '</div>';

  var overlay = document.getElementById('dirOverlay');
  if (overlay) overlay.classList.add('open');
}

function closeDirModal() {
  var overlay = document.getElementById('dirOverlay');
  if (overlay) overlay.classList.remove('open');
  /* Reset tabs so the next open always starts on Info */
  var tabInfo  = document.getElementById('dirTabInfo');
  var tabDocs  = document.getElementById('dirTabDocs');
  var infoBody = document.getElementById('dirModalInfoBody');
  var docsBody = document.getElementById('dirModalDocsBody');
  if (tabInfo)  { tabInfo.classList.add('active'); }
  if (tabDocs)  { tabDocs.classList.remove('active'); }
  if (infoBody) { infoBody.style.display = ''; }
  if (docsBody) { docsBody.style.display = 'none'; }
}

/* ---- Documents tab ---- */
function switchDirTab(tab) {
  var infoBody = document.getElementById('dirModalInfoBody');
  var docsBody = document.getElementById('dirModalDocsBody');
  var tabInfo  = document.getElementById('dirTabInfo');
  var tabDocs  = document.getElementById('dirTabDocs');
  if (tab === 'info') {
    if (infoBody) infoBody.style.display = '';
    if (docsBody) docsBody.style.display = 'none';
    if (tabInfo)  tabInfo.classList.add('active');
    if (tabDocs)  tabDocs.classList.remove('active');
  } else {
    if (infoBody) infoBody.style.display = 'none';
    if (docsBody) docsBody.style.display = '';
    if (tabInfo)  tabInfo.classList.remove('active');
    if (tabDocs)  tabDocs.classList.add('active');
    if (!dirDocsLoaded) { loadDirDocs(dirCurrentEmpId); }
  }
}

function loadDirDocs(empId) {
  var body = document.getElementById('dirModalDocsBody');
  if (!body) return;
  dirDocsLoaded = true;
  body.innerHTML = '<div class="dir-state">Loading...</div>';

  apiFetch('/api/records?employee_id=' + encodeURIComponent(empId), { credentials: 'include' })
    .then(function(res) {
      if (!res) return null;
      if (!res.ok) return res.json().then(function(d) { throw new Error(d.error || 'Server error'); });
      return res.json();
    })
    .then(function(data) {
      if (!data) return;
      if (!Array.isArray(data) || data.length === 0) {
        body.innerHTML = '<div class="dir-state">No documents on file for this employee.</div>';
        return;
      }
      /* API returns rows sorted DESC by submission_date already */
      var rows = data.map(function(doc) {
        var title = esc(doc.form_title || doc.form_type || 'Document');
        var date  = esc(dirFmtDate(doc.submission_date) || '--');
        var by    = esc(doc.submitted_by_name || '--');
        var st    = esc(doc.status ? dirCapFirst(doc.status) : '--');
        var dl    = doc.pdf_filename
          ? '<a class="dir-doc-download" href="/api/forms/pdf/' + esc(doc.pdf_filename)
              + '" target="_blank" rel="noopener">Download</a>'
          : '';
        return '<div class="dir-doc-item">'
          + '<div class="dir-doc-info">'
          + '<div class="dir-doc-title">' + title + '</div>'
          + '<div class="dir-doc-meta">' + date + ' · ' + by + ' · ' + st + '</div>'
          + '</div>'
          + dl
          + '</div>';
      }).join('');
      body.innerHTML = '<div class="dir-docs-list">' + rows + '</div>';
    })
    .catch(function() {
      dirDocsLoaded = false; /* allow retry on next tab switch */
      body.innerHTML = '<div class="dir-state">Failed to load documents. Please try again.</div>';
    });
}

/* ---- Helpers ---- */
function dirInitials(name) {
  if (!name) return '?';
  var parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function dirDotClass(status) {
  if (!status) return 's-other';
  switch (status.toLowerCase()) {
    case 'active':     return 's-active';
    case 'inactive':   return 's-inactive';
    case 'terminated': return 's-terminated';
    default:           return 's-other';
  }
}

function dirCapFirst(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function dirFmtDate(d) {
  if (!d) return null;
  var str   = String(d).split('T')[0];
  var parts = str.split('-');
  if (parts.length !== 3) return str;
  var months = ['Jan','Feb','Mar','Apr','May','Jun',
                'Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[parseInt(parts[1], 10) - 1] + ' '
    + parseInt(parts[2], 10) + ', ' + parts[0];
}

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

/* ESC key closes whichever modal is open */
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') { closeDirModal(); closeAddEmpModal(); }
});

/* ================================================================
   ADD EMPLOYEE
================================================================ */

function openAddEmpModal() {
  empFormMode   = 'add';
  empFormEditId = null;
  empFormHidden = {};
  var titleEl = document.getElementById('empFormTitle');
  if (titleEl) titleEl.textContent = 'Add Employee';
  var submitBtn = document.getElementById('addEmpSubmit');
  if (submitBtn) submitBtn.textContent = 'Add Employee';
  /* Populate datalists from the cached directory data if available */
  if (dirData) {
    var locs  = [];
    var names = [];
    dirData.forEach(function(e) {
      if (e.location && locs.indexOf(e.location)   === -1) locs.push(e.location);
      if (e.name     && names.indexOf(e.name)       === -1) names.push(e.name);
    });
    populateDatalist('locOptions',  locs.sort());
    populateDatalist('supOptions',  names.sort());
  }
  resetAddEmpForm();
  var overlay = document.getElementById('addEmpOverlay');
  if (overlay) overlay.classList.add('open');
}

function closeAddEmpModal() {
  var overlay = document.getElementById('addEmpOverlay');
  if (overlay) overlay.classList.remove('open');
}

function populateDatalist(id, values) {
  var dl = document.getElementById(id);
  if (!dl) return;
  dl.innerHTML = values.map(function(v) {
    return '<option value="' + esc(v) + '">';
  }).join('');
}

function resetAddEmpForm() {
  var form = document.getElementById('addEmpForm');
  if (form) form.reset();
  clearAddEmpErrors();
  setAddEmpBanner('', '');
}

function clearAddEmpErrors() {
  ['errCode', 'errName', 'errTitle', 'errLoc', 'errEmail'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.textContent = '';
  });
  ['fCode', 'fName', 'fTitle', 'fLoc', 'fEmail'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('input-error');
  });
}

function setAddEmpBanner(type, msg) {
  var el = document.getElementById('addEmpBanner');
  if (!el) return;
  el.className = 'form-banner' + (type ? ' banner-' + type : '');
  el.textContent = msg;
}

function setFieldError(inputId, errId, msg) {
  var inp = document.getElementById(inputId);
  var err = document.getElementById(errId);
  if (inp) inp.classList.add('input-error');
  if (err) err.textContent = msg;
}

function resetSubmitBtn() {
  var btn = document.getElementById('addEmpSubmit');
  if (btn) {
    btn.disabled = false;
    btn.textContent = empFormMode === 'edit' ? 'Save Changes' : 'Add Employee';
  }
}

function submitAddEmp(event) {
  event.preventDefault();
  clearAddEmpErrors();
  setAddEmpBanner('', '');

  var name    = (document.getElementById('fName').value    || '').trim();
  var title   = (document.getElementById('fTitle').value   || '').trim();
  var dept    = (document.getElementById('fDept').value    || '').trim();
  var loc     = (document.getElementById('fLoc').value     || '').trim();
  var sup     = (document.getElementById('fSup').value     || '').trim();
  var email   = (document.getElementById('fEmail').value   || '').trim();
  var phone   = (document.getElementById('fPhone').value   || '').trim();
  var status  = document.getElementById('fStatus').value;
  var empType = document.getElementById('fEmpType').value;
  var code    = (document.getElementById('fCode').value    || '').trim();
  var hire    = document.getElementById('fHire').value;

  /* Client-side validation */
  var valid = true;
  if (!name)  { setFieldError('fName',  'errName',  'Name is required.');     valid = false; }
  if (!title) { setFieldError('fTitle', 'errTitle', 'Title is required.');    valid = false; }
  if (!loc)   { setFieldError('fLoc',   'errLoc',   'Location is required.'); valid = false; }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setFieldError('fEmail', 'errEmail', 'Enter a valid email address.');
    valid = false;
  }
  if (!valid) return;

  var payload = {
    name:            name,
    title:           title,
    location:        loc,
    status:          status  || 'active',
    employment_type: empType || 'full-time',
    employee_code:   code    || null
  };
  if (dept)  payload.department = dept;
  if (sup)   payload.supervisor = sup;
  if (email) payload.email      = email;
  if (phone) payload.phone      = phone;
  if (hire)  payload.hire_date  = hire;

  /* In edit mode, pass through pay and termination fields to avoid wiping them */
  if (empFormMode === 'edit') {
    payload.pay_type         = empFormHidden.pay_type || 'hourly';
    payload.pay_amount       = empFormHidden.pay_amount != null ? empFormHidden.pay_amount : null;
    payload.termination_date = empFormHidden.termination_date || null;
  }

  var btn = document.getElementById('addEmpSubmit');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  var url    = empFormMode === 'edit' ? '/api/employees/' + empFormEditId : '/api/employees';
  var method = empFormMode === 'edit' ? 'PUT' : 'POST';

  apiFetch(url, {
    method:      method,
    credentials: 'include',
    headers:     { 'Content-Type': 'application/json' },
    body:        JSON.stringify(payload)
  })
  .then(function(res) {
    if (!res) return null;
    return res.json().then(function(data) { return { status: res.status, data: data }; });
  })
  .then(function(r) {
    if (!r) return;
    resetSubmitBtn();
    var isSuccess = empFormMode === 'edit' ? r.status === 200 : r.status === 201;
    if (isSuccess) {
      closeAddEmpModal();
      dirFetched = false;
      dirData    = null;
      var sl = document.getElementById('dirFilterLoc');    if (sl) sl.value = '';
      var ss = document.getElementById('dirFilterStatus'); if (ss) ss.value = '';
      var si = document.getElementById('dirSearch');       if (si) si.value = '';
      switchToActiveView();
      initDirectory();
      showDirSuccessBanner(empFormMode === 'edit' ? 'Employee updated successfully.' : 'Employee added successfully.');
    } else if (r.status === 409) {
      var msg409 = (r.data && r.data.error) || '';
      if (msg409.toLowerCase().indexOf('email') !== -1) {
        setFieldError('fEmail', 'errEmail', msg409 || 'An employee with that email already exists.');
      } else {
        setFieldError('fCode', 'errCode', msg409 || 'That Employee ID is already in use.');
      }
    } else if (r.status === 404) {
      setAddEmpBanner('error', 'Employee not found. They may have been removed.');
    } else if (r.status === 400) {
      setAddEmpBanner('error', r.data.error || 'Invalid data. Check required fields.');
    } else {
      setAddEmpBanner('error', 'Something went wrong. Please try again.');
    }
  })
  .catch(function() {
    resetSubmitBtn();
    setAddEmpBanner('error', 'Network error. Please try again.');
  });
}

function showDirSuccessBanner(msg) {
  var el = document.getElementById('dirBanner');
  if (!el) return;
  el.className = 'form-banner banner-success';
  el.textContent = msg;
  setTimeout(function() {
    if (el) { el.className = 'form-banner'; el.textContent = ''; }
  }, 3500);
}

/* ================================================================
   EDIT / ARCHIVE
================================================================ */

function renderDetailFooter(empId) {
  return '<button class="btn-archive" onclick="initArchiveFlow(' + empId + ')" type="button">Archive</button>'
    + '<div class="dir-footer-right">'
    + '<button class="btn-cancel" onclick="closeDirModal()" type="button">Close</button>'
    + '<button class="btn-submit" onclick="openEditEmpModal(' + empId + ')" type="button">Edit</button>'
    + '</div>';
}

function openEditEmpModal(empId) {
  if (!dirData) return;
  var emp = null;
  for (var i = 0; i < dirData.length; i++) {
    if (dirData[i].id === empId) { emp = dirData[i]; break; }
  }
  if (!emp) return;

  empFormMode   = 'edit';
  empFormEditId = empId;
  empFormHidden = {
    pay_type:         emp.pay_type         || 'hourly',
    pay_amount:       emp.pay_amount != null ? emp.pay_amount : null,
    termination_date: emp.termination_date  || null
  };

  var locs  = [];
  var names = [];
  dirData.forEach(function(e) {
    if (e.location && locs.indexOf(e.location)  === -1) locs.push(e.location);
    if (e.name     && names.indexOf(e.name)     === -1) names.push(e.name);
  });
  populateDatalist('locOptions', locs.sort());
  populateDatalist('supOptions', names.sort());

  clearAddEmpErrors();
  setAddEmpBanner('', '');

  var setVal = function(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val != null ? val : '';
  };
  setVal('fCode',  emp.employee_code);
  setVal('fName',  emp.name);
  setVal('fTitle', emp.title);
  setVal('fDept',  emp.department);
  setVal('fLoc',   emp.location);
  setVal('fSup',   emp.supervisor);
  setVal('fEmail', emp.email);
  setVal('fPhone', emp.phone);
  setVal('fHire',  emp.hire_date ? String(emp.hire_date).split('T')[0] : '');

  var statusEl = document.getElementById('fStatus');
  if (statusEl) {
    var sv = (emp.status || 'active').toLowerCase();
    statusEl.value = sv;
    if (statusEl.value !== sv) statusEl.value = 'active';
  }

  var empTypeEl = document.getElementById('fEmpType');
  if (empTypeEl) {
    empTypeEl.value = (emp.employment_type || 'full-time').toLowerCase();
  }

  var titleEl = document.getElementById('empFormTitle');
  if (titleEl) titleEl.textContent = 'Edit Employee';

  var submitBtn = document.getElementById('addEmpSubmit');
  if (submitBtn) submitBtn.textContent = 'Save Changes';

  closeDirModal();
  var overlay = document.getElementById('addEmpOverlay');
  if (overlay) overlay.classList.add('open');
}

function initArchiveFlow(empId) {
  if (!dirData) return;
  var emp = null;
  for (var i = 0; i < dirData.length; i++) {
    if (dirData[i].id === empId) { emp = dirData[i]; break; }
  }
  if (!emp) return;

  var banner = document.getElementById('dirArchiveBanner');
  var footer = document.getElementById('dirDetailFooter');
  if (!banner || !footer) return;

  if (emp.status && emp.status.toLowerCase() === 'active') {
    banner.className = 'form-banner banner-error';
    banner.textContent = 'Set this employee to Inactive before archiving.';
    footer.innerHTML = '<div class="dir-footer-right">'
      + '<button class="btn-cancel" onclick="restoreDetailFooter(' + empId + ')" type="button">Cancel</button>'
      + '<button class="btn-submit" onclick="setInactiveForArchive(' + empId + ')" type="button">Set Inactive</button>'
      + '</div>';
  } else {
    banner.className = 'form-banner banner-error';
    banner.innerHTML = 'Archive <strong>' + esc(emp.name) + '</strong>?'
      + ' They will be removed from the directory.'
      + ' Their documents and records are retained.';
    footer.innerHTML = '<div class="dir-footer-right">'
      + '<button class="btn-cancel" onclick="restoreDetailFooter(' + empId + ')" type="button">Cancel</button>'
      + '<button class="btn-archive-confirm" onclick="confirmArchive(' + empId + ')" type="button">Archive</button>'
      + '</div>';
  }
}

function restoreDetailFooter(empId) {
  var banner = document.getElementById('dirArchiveBanner');
  if (banner) banner.className = 'form-banner';
  var footer = document.getElementById('dirDetailFooter');
  if (footer) footer.innerHTML = renderDetailFooter(empId);
}

function setInactiveForArchive(empId) {
  if (!dirData) return;
  var emp = null;
  for (var i = 0; i < dirData.length; i++) {
    if (dirData[i].id === empId) { emp = dirData[i]; break; }
  }
  if (!emp) return;

  var footer = document.getElementById('dirDetailFooter');
  var btn = footer ? footer.querySelector('.btn-submit') : null;
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  var payload = {
    name:             emp.name,
    title:            emp.title,
    location:         emp.location,
    status:           'inactive',
    employment_type:  emp.employment_type  || 'full-time',
    pay_type:         emp.pay_type         || 'hourly',
    pay_amount:       emp.pay_amount != null ? emp.pay_amount : null,
    termination_date: emp.termination_date  || null,
    employee_code:    emp.employee_code    || null
  };
  if (emp.department) payload.department = emp.department;
  if (emp.supervisor) payload.supervisor  = emp.supervisor;
  if (emp.email)      payload.email       = emp.email;
  if (emp.phone)      payload.phone       = emp.phone;
  if (emp.hire_date)  payload.hire_date   = String(emp.hire_date).split('T')[0];

  apiFetch('/api/employees/' + empId, {
    method:      'PUT',
    credentials: 'include',
    headers:     { 'Content-Type': 'application/json' },
    body:        JSON.stringify(payload)
  })
  .then(function(res) {
    if (!res) return null;
    return res.json().then(function(data) { return { status: res.status, data: data }; });
  })
  .then(function(r) {
    if (!r) return;
    if (r.status === 200) {
      for (var i = 0; i < dirData.length; i++) {
        if (dirData[i].id === empId) { dirData[i].status = 'inactive'; break; }
      }
      /* Re-render detail modal then immediately show archive confirmation */
      openDirModal(empId);
      initArchiveFlow(empId);
    } else {
      if (btn) { btn.disabled = false; btn.textContent = 'Set Inactive'; }
      var banner = document.getElementById('dirArchiveBanner');
      if (banner) banner.textContent = (r.data && r.data.error) || 'Failed to update status. Try again.';
    }
  })
  .catch(function() {
    if (btn) { btn.disabled = false; btn.textContent = 'Set Inactive'; }
  });
}

function confirmArchive(empId) {
  var footer = document.getElementById('dirDetailFooter');
  var btn = footer ? footer.querySelector('.btn-archive-confirm') : null;
  if (btn) { btn.disabled = true; btn.textContent = 'Archiving...'; }

  apiFetch('/api/employees/' + empId + '/archive', {
    method:      'PUT',
    credentials: 'include'
  })
  .then(function(res) {
    if (!res) return null;
    return res.json().then(function(data) { return { status: res.status, data: data }; });
  })
  .then(function(r) {
    if (!r) return;
    if (r.status === 200) {
      closeDirModal();
      dirFetched = false;
      dirData    = null;
      dirArchivedFetched = false;
      dirArchivedData    = null;
      switchToActiveView();
      initDirectory();
      showDirSuccessBanner('Employee archived. They have been removed from the directory.');
    } else if (r.status === 400) {
      if (btn) { btn.disabled = false; btn.textContent = 'Archive'; }
      var banner = document.getElementById('dirArchiveBanner');
      if (banner) banner.textContent = r.data.error || 'Cannot archive: set employee to Inactive first.';
    } else {
      if (btn) { btn.disabled = false; btn.textContent = 'Archive'; }
    }
  })
  .catch(function() {
    if (btn) { btn.disabled = false; btn.textContent = 'Archive'; }
  });
}

/* ---- Archived view helpers ---- */

function getCurrentDirData() {
  return dirViewArchived ? dirArchivedData : dirData;
}

function initDirCurrentView() {
  if (dirViewArchived) {
    initArchivedDirectory();
  } else {
    initDirectory();
  }
}

function switchDirView(toArchived) {
  if (dirViewArchived === toArchived) return;
  dirViewArchived = toArchived;

  var segActive   = document.getElementById('dirSegActive');
  var segArchived = document.getElementById('dirSegArchived');
  var addBtn      = document.getElementById('dirAddBtn');
  var notice      = document.getElementById('dirRetentionNotice');

  if (segActive)   { segActive.classList.toggle('active', !toArchived); }
  if (segArchived) { segArchived.classList.toggle('active', toArchived); }
  if (addBtn) addBtn.style.display = toArchived ? 'none' : '';
  if (notice) notice.style.display = toArchived ? '' : 'none';

  /* Reset search/filters on view switch */
  var sl = document.getElementById('dirFilterLoc');    if (sl) sl.value = '';
  var ss = document.getElementById('dirFilterStatus'); if (ss) ss.value = '';
  var si = document.getElementById('dirSearch');       if (si) si.value = '';

  if (dirViewArchived) {
    initArchivedDirectory();          /* direct call - fetches ?archived=true */
  } else {
    if (dirFetched && dirData) {
      applyDirFilters();              /* re-render active list from cache */
    } else {
      initDirectory();                /* first visit: fetch active list */
    }
  }
}

function initArchivedDirectory() {
  if (dirArchivedFetched && dirArchivedData) {
    renderDirTable(dirArchivedData);
    return;
  }
  var body = document.getElementById('dirBody');
  if (body) body.innerHTML = '<div class="dir-state">Loading...</div>';

  apiFetch('/api/employees?archived=true', { credentials: 'include' })
    .then(function(res) {
      if (!res) return null;
      return res.json();
    })
    .then(function(data) {
      if (!data) return;
      dirArchivedData    = data;
      dirArchivedFetched = true;
      if (dirViewArchived) renderDirTable(data);
    })
    .catch(function() {
      if (body) body.innerHTML = '<div class="dir-state">Failed to load archived employees.</div>';
    });
}

function renderArchivedFooter(empId) {
  return '<div class="dir-footer-right">'
    + '<button class="btn-archive-confirm" onclick="confirmUnarchive(' + empId + ')" type="button">Unarchive</button>'
    + '</div>';
}

function confirmUnarchive(empId) {
  var btn = document.querySelector('#dirDetailFooter .btn-archive-confirm');
  if (btn) { btn.disabled = true; btn.textContent = 'Unarchiving...'; }

  apiFetch('/api/employees/' + empId + '/unarchive', {
    method:      'PUT',
    credentials: 'include'
  })
  .then(function(res) {
    if (!res) return null;
    return res.json().then(function(data) { return { status: res.status, data: data }; });
  })
  .then(function(r) {
    if (!r) return;
    if (r.status === 200) {
      closeDirModal();
      dirArchivedFetched = false;
      dirArchivedData    = null;
      dirFetched = false;
      dirData    = null;
      switchToActiveView();
      initDirectory();
      showDirSuccessBanner('Employee unarchived and restored to the directory.');
    } else {
      if (btn) { btn.disabled = false; btn.textContent = 'Unarchive'; }
    }
  })
  .catch(function() {
    if (btn) { btn.disabled = false; btn.textContent = 'Unarchive'; }
  });
}

function switchToActiveView() {
  if (!dirViewArchived) return;
  dirViewArchived = false;
  var segActive   = document.getElementById('dirSegActive');
  var segArchived = document.getElementById('dirSegArchived');
  var addBtn      = document.getElementById('dirAddBtn');
  var notice      = document.getElementById('dirRetentionNotice');
  if (segActive)   { segActive.classList.add('active'); }
  if (segArchived) { segArchived.classList.remove('active'); }
  if (addBtn) addBtn.style.display = '';
  if (notice) notice.style.display = 'none';
}
