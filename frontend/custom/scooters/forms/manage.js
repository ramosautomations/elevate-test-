let templates = [];
let currentSchema = [];
let currentAudience = { type: 'all' };
let editingTemplateId = null;

const ROLE_OPTIONS = ['Owner', 'General Manager', 'Manager'];
const TYPE_LABELS = { text: 'Text', select: 'Dropdown', radio: 'Multiple Choice', checkbox: 'Checkbox', date: 'Date' };

document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        const res = await fetch('/auth/current-user', { credentials: 'include' });
        if (!res.ok) { window.location.href = '/'; return; }
    } catch (e) {
        window.location.href = '/';
        return;
    }
    buildRoleCheckboxes();
    await loadTemplates();
}

function buildRoleCheckboxes() {
    document.getElementById('roleCheckboxes').innerHTML = ROLE_OPTIONS.map(r =>
        `<label><input type="checkbox" value="${r}" class="roleCheckbox"> ${r}</label>`
    ).join('');
}

async function loadTemplates() {
    try {
        const res = await fetch('/api/forms/templates', { credentials: 'include' });
        if (res.status === 403) {
            document.getElementById('notAuthorized').style.display = 'block';
            document.getElementById('listView').style.display = 'none';
            return;
        }
        if (!res.ok) throw new Error('Failed to load');
        templates = await res.json();
        renderTemplatesList();
    } catch (err) {
        console.error('Load templates error:', err);
        alert('Could not load forms. Please refresh the page.');
    }
}

function renderTemplatesList() {
    const empty = document.getElementById('templatesEmpty');
    const table = document.getElementById('templatesTable');
    const body = document.getElementById('templatesTableBody');

    if (!templates.length) {
        empty.style.display = 'block';
        table.style.display = 'none';
        return;
    }
    empty.style.display = 'none';
    table.style.display = 'table';

    body.innerHTML = templates.map(t => {
        const aud = t.audience || { type: 'all' };
        const audLabel = aud.type === 'all' ? 'All employees' : ((aud.roles || []).join(', ') || 'Specific roles');
        const created = new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return `
            <tr>
                <td><strong>${escapeHtml(t.title)}</strong>${t.description ? `<div style="color:#888;font-size:12px;">${escapeHtml(t.description)}</div>` : ''}</td>
                <td>${escapeHtml(audLabel)}</td>
                <td><span class="badge ${t.is_active ? 'badge-active' : 'badge-inactive'}">${t.is_active ? 'Active' : 'Archived'}</span></td>
                <td>${created}</td>
                <td>
                    <button class="table-action" onclick="editTemplate(${t.id})">Edit</button>
                    ${t.is_active ? `<button class="table-action muted" onclick="archiveTemplate(${t.id})">Archive</button>` : ''}
                </td>
            </tr>`;
    }).join('');
}

function showBuilder(existing) {
    editingTemplateId = existing ? existing.id : null;
    document.getElementById('builderHeading').textContent = existing ? 'Edit Form' : 'New Form';
    document.getElementById('tplTitle').value = existing ? existing.title : '';
    document.getElementById('tplDescription').value = existing ? (existing.description || '') : '';
    currentSchema = existing ? JSON.parse(JSON.stringify(existing.schema)) : [];
    currentAudience = existing ? JSON.parse(JSON.stringify(existing.audience)) : { type: 'all' };

    document.querySelectorAll('input[name="audienceType"]').forEach(r => { r.checked = r.value === currentAudience.type; });
    document.querySelectorAll('.roleCheckbox').forEach(cb => { cb.checked = (currentAudience.roles || []).includes(cb.value); });
    onAudienceChange();

    renderFieldsList();
    renderPreview();

    document.getElementById('listView').style.display = 'none';
    document.getElementById('builderView').style.display = 'block';
}

async function editTemplate(id) {
    try {
        const res = await fetch(`/api/forms/templates/${id}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load form');
        showBuilder(await res.json());
    } catch (err) {
        console.error('Edit template error:', err);
        alert('Could not load this form for editing.');
    }
}

function cancelBuilder() {
    document.getElementById('builderView').style.display = 'none';
    document.getElementById('listView').style.display = 'block';
}

function onAudienceChange() {
    const type = document.querySelector('input[name="audienceType"]:checked').value;
    document.getElementById('audienceRolesBox').style.display = type === 'roles' ? 'block' : 'none';
}

function addField(type) {
    const id = 'field_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const field = { id, type, label: '', required: false };
    if (type === 'select' || type === 'radio') field.options = ['Option 1', 'Option 2'];
    if (type === 'checkbox') field.checkboxLabel = 'I confirm';
    currentSchema.push(field);
    renderFieldsList();
    renderPreview();
}

function removeField(id) {
    currentSchema = currentSchema.filter(f => f.id !== id);
    renderFieldsList();
    renderPreview();
}

function moveField(id, dir) {
    const idx = currentSchema.findIndex(f => f.id === id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= currentSchema.length) return;
    [currentSchema[idx], currentSchema[newIdx]] = [currentSchema[newIdx], currentSchema[idx]];
    renderFieldsList();
    renderPreview();
}

function updateFieldProp(id, prop, value) {
    const field = currentSchema.find(f => f.id === id);
    if (!field) return;
    if (prop === 'options') field.options = value.split('\n').map(s => s.trim()).filter(Boolean);
    else field[prop] = value;
    renderPreview();
}

function renderFieldsList() {
    const list = document.getElementById('fieldsList');
    const empty = document.getElementById('fieldsEmpty');
    if (!currentSchema.length) { list.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';

    list.innerHTML = currentSchema.map((f, i) => `
        <div class="field-card">
            <div class="field-card-header">
                <span class="field-type-tag">${TYPE_LABELS[f.type] || f.type}</span>
                <div class="field-card-controls">
                    <button type="button" onclick="moveField('${f.id}', -1)" ${i === 0 ? 'disabled' : ''}>&uarr;</button>
                    <button type="button" onclick="moveField('${f.id}', 1)" ${i === currentSchema.length - 1 ? 'disabled' : ''}>&darr;</button>
                    <button type="button" class="danger" onclick="removeField('${f.id}')">Delete</button>
                </div>
            </div>
            ${f.type === 'checkbox' ? `
                <label>Confirmation text</label>
                <input type="text" value="${escapeAttr(f.checkboxLabel || '')}" oninput="updateFieldProp('${f.id}','checkboxLabel', this.value)">
            ` : `
                <label>Field label</label>
                <input type="text" value="${escapeAttr(f.label || '')}" placeholder="e.g. Reason for request" oninput="updateFieldProp('${f.id}','label', this.value)">
            `}
            ${(f.type === 'select' || f.type === 'radio') ? `
                <label>Options (one per line)</label>
                <textarea oninput="updateFieldProp('${f.id}','options', this.value)">${escapeHtml((f.options || []).join('\\n'))}</textarea>
            ` : ''}
            ${f.type !== 'checkbox' ? `
                <label class="required-toggle">
                    <input type="checkbox" ${f.required ? 'checked' : ''} onchange="updateFieldProp('${f.id}','required', this.checked)"> Required
                </label>
            ` : ''}
        </div>
    `).join('');
}

function renderPreview() {
    const box = document.getElementById('previewBox');
    if (!currentSchema.length) { box.innerHTML = '<p class="preview-empty">Add fields above to see a live preview.</p>'; return; }
    box.innerHTML = renderFormFields(currentSchema, { readOnly: false });
}

async function saveTemplate() {
    const title = document.getElementById('tplTitle').value.trim();
    const description = document.getElementById('tplDescription').value.trim();

    if (!title) { alert('Please enter a form title.'); return; }
    if (!currentSchema.length) { alert('Please add at least one field.'); return; }
    for (const f of currentSchema) {
        if (f.type !== 'checkbox' && !f.label.trim()) { alert('Every field needs a label.'); return; }
        if ((f.type === 'select' || f.type === 'radio') && (!f.options || f.options.length < 2)) {
            alert('Dropdown and multiple-choice fields need at least 2 options.'); return;
        }
    }

    const audienceType = document.querySelector('input[name="audienceType"]:checked').value;
    let audience = { type: audienceType };
    if (audienceType === 'roles') {
        const roles = Array.from(document.querySelectorAll('.roleCheckbox:checked')).map(cb => cb.value);
        if (!roles.length) { alert('Select at least one role, or choose "All employees".'); return; }
        audience.roles = roles;
    }

    const payload = { title, description, schema: currentSchema, audience };
    const url = editingTemplateId ? `/api/forms/templates/${editingTemplateId}` : '/api/forms/templates';
    const method = editingTemplateId ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method, credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.json();
            alert('Error: ' + (err.error || 'Failed to save form'));
            return;
        }
        cancelBuilder();
        await loadTemplates();
    } catch (err) {
        console.error('Save template error:', err);
        alert('Something went wrong saving this form.');
    }
}

async function archiveTemplate(id) {
    if (!confirm('Archive this form? Employees will no longer see it, but existing submissions are kept.')) return;
    try {
        const res = await fetch(`/api/forms/templates/${id}/archive`, { method: 'PATCH', credentials: 'include' });
        if (!res.ok) throw new Error('Failed to archive');
        await loadTemplates();
    } catch (err) {
        console.error('Archive error:', err);
        alert('Could not archive this form.');
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}
function escapeAttr(str) { return escapeHtml(str).replace(/"/g, '&quot;'); }
