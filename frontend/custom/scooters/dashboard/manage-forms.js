// ── MANAGE FORMS PANEL ──
let mfTemplates = [];
let mfSchema = [];
let mfEditingId = null;
let mfInitialized = false;
const MF_ROLE_OPTIONS = ['Owner', 'General Manager', 'Manager'];
const MF_TYPE_LABELS = { text: 'Text', select: 'Dropdown', radio: 'Multiple Choice', checkbox: 'Checkbox', date: 'Date' };

function mfInit() {
    if (!mfInitialized) {
        mfBuildRoleCheckboxes();
        mfInitialized = true;
    }
    mfLoadTemplates();
}

function mfBuildRoleCheckboxes() {
    document.getElementById('mfRoleCheckboxes').innerHTML = MF_ROLE_OPTIONS.map(r =>
        `<label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:500;">
            <input type="checkbox" value="${r}" class="mfRoleCheckbox"> ${r}
         </label>`
    ).join('');
}

async function mfLoadTemplates() {
    try {
        const res = await fetch('/api/forms/templates', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load forms');
        mfTemplates = await res.json();
        mfRenderTable();
    } catch (err) {
        console.error('Load templates error:', err);
    }
}

function mfRenderTable() {
    const empty = document.getElementById('mfEmpty');
    const card = document.getElementById('mfTableCard');
    const body = document.getElementById('mfTableBody');

    if (!mfTemplates.length) {
        empty.style.display = 'block';
        card.style.display = 'none';
        return;
    }
    empty.style.display = 'none';
    card.style.display = 'block';

    body.innerHTML = mfTemplates.map(t => {
        const aud = t.audience || { type: 'all' };
        const audLabel = aud.type === 'all' ? 'All employees' : ((aud.roles || []).join(', ') || 'Specific roles');
        const created = new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return `
            <tr>
                <td><strong>${mfEsc(t.title)}</strong>${t.description ? `<div style="color:var(--text-muted);font-size:11.5px;margin-top:2px;">${mfEsc(t.description)}</div>` : ''}</td>
                <td>${mfEsc(audLabel)}</td>
                <td><span class="badge ${t.is_active ? 'badge-active' : 'badge-inactive'}">${t.is_active ? 'Active' : 'Archived'}</span></td>
                <td>${created}</td>
                <td class="dir-actions-cell">
                    <button class="dir-action-btn" onclick="mfEditTemplate(${t.id})">Edit</button>
                    ${t.is_active ? `<button class="dir-action-btn dir-action-delete" onclick="mfArchiveTemplate(${t.id})">Archive</button>` : ''}
                </td>
            </tr>`;
    }).join('');
}

function mfOpenModal(existing) {
    mfEditingId = existing ? existing.id : null;
    document.getElementById('mfModalTitle').textContent = existing ? 'Edit Form' : 'New Form';
    document.getElementById('mfTitle').value = existing ? existing.title : '';
    document.getElementById('mfDescription').value = existing ? (existing.description || '') : '';
    mfSchema = existing ? JSON.parse(JSON.stringify(existing.schema)) : [];
    const audience = existing ? existing.audience : { type: 'all' };

    document.querySelectorAll('input[name="mfCategory"]').forEach(r => { r.checked = r.value === (existing ? existing.category : 'documentation'); });
    document.querySelectorAll('input[name="mfAudienceType"]').forEach(r => { r.checked = r.value === (audience.type || 'all'); });
    document.querySelectorAll('.mfRoleCheckbox').forEach(cb => { cb.checked = (audience.roles || []).includes(cb.value); });
    mfOnAudienceChange();

    mfRenderFieldsList();
    mfRenderPreview();

    document.getElementById('mfModalOverlay').classList.add('open');
}

async function mfEditTemplate(id) {
    try {
        const res = await fetch(`/api/forms/templates/${id}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load form');
        mfOpenModal(await res.json());
    } catch (err) {
        console.error('Edit template error:', err);
        alert('Could not load this form for editing.');
    }
}

function mfCloseModal() {
    document.getElementById('mfModalOverlay').classList.remove('open');
}

function mfOnAudienceChange() {
    const type = document.querySelector('input[name="mfAudienceType"]:checked').value;
    document.getElementById('mfRolesBox').style.display = type === 'roles' ? 'block' : 'none';
}

function mfAddField(type) {
    const id = 'field_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const field = { id, type, label: '', required: false };
    if (type === 'select' || type === 'radio') field.options = ['Option 1', 'Option 2'];
    if (type === 'checkbox') field.checkboxLabel = 'I confirm';
    mfSchema.push(field);
    mfRenderFieldsList();
    mfRenderPreview();
}

function mfRemoveField(id) {
    mfSchema = mfSchema.filter(f => f.id !== id);
    mfRenderFieldsList();
    mfRenderPreview();
}

function mfMoveField(id, dir) {
    const idx = mfSchema.findIndex(f => f.id === id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= mfSchema.length) return;
    [mfSchema[idx], mfSchema[newIdx]] = [mfSchema[newIdx], mfSchema[idx]];
    mfRenderFieldsList();
    mfRenderPreview();
}

function mfUpdateFieldProp(id, prop, value) {
    const field = mfSchema.find(f => f.id === id);
    if (!field) return;
    if (prop === 'options') field.options = value.split('\n').map(s => s.trim()).filter(Boolean);
    else field[prop] = value;
    mfRenderPreview();
}

function mfRenderFieldsList() {
    const list = document.getElementById('mfFieldsList');
    const empty = document.getElementById('mfFieldsEmpty');
    if (!mfSchema.length) { list.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';

    list.innerHTML = mfSchema.map((f, i) => `
        <div class="mf-field-card">
            <div class="mf-field-card-header">
                <span class="mf-field-type-tag">${MF_TYPE_LABELS[f.type] || f.type}</span>
                <div class="mf-field-card-controls">
                    <button type="button" onclick="mfMoveField('${f.id}', -1)" ${i === 0 ? 'disabled' : ''}>&uarr;</button>
                    <button type="button" onclick="mfMoveField('${f.id}', 1)" ${i === mfSchema.length - 1 ? 'disabled' : ''}>&darr;</button>
                    <button type="button" class="danger" onclick="mfRemoveField('${f.id}')">Delete</button>
                </div>
            </div>
            ${f.type === 'checkbox' ? `
                <label class="form-label">Confirmation text</label>
                <input type="text" class="form-input" value="${mfEscAttr(f.checkboxLabel || '')}" oninput="mfUpdateFieldProp('${f.id}','checkboxLabel', this.value)">
            ` : `
                <label class="form-label">Field label</label>
                <input type="text" class="form-input" value="${mfEscAttr(f.label || '')}" placeholder="e.g. Reason for request" oninput="mfUpdateFieldProp('${f.id}','label', this.value)">
            `}
            ${(f.type === 'select' || f.type === 'radio') ? `
                <label class="form-label">Options (one per line)</label>
                <textarea class="form-input" oninput="mfUpdateFieldProp('${f.id}','options', this.value)">${mfEsc((f.options || []).join('\\n'))}</textarea>
            ` : ''}
            ${f.type !== 'checkbox' ? `
                <label class="mf-required-toggle">
                    <input type="checkbox" ${f.required ? 'checked' : ''} onchange="mfUpdateFieldProp('${f.id}','required', this.checked)"> Required
                </label>
            ` : ''}
        </div>
    `).join('');
}

function mfRenderPreview() {
    const box = document.getElementById('mfPreviewBox');
    if (!mfSchema.length) { box.innerHTML = '<p class="mf-preview-empty">Add fields above to see a live preview.</p>'; return; }
    box.innerHTML = renderFormFields(mfSchema, { readOnly: false });
}

async function mfSaveTemplate() {
    const title = document.getElementById('mfTitle').value.trim();
    const description = document.getElementById('mfDescription').value.trim();

    if (!title) { alert('Please enter a form title.'); return; }
    if (!mfSchema.length) { alert('Please add at least one field.'); return; }
    for (const f of mfSchema) {
        if (f.type !== 'checkbox' && !f.label.trim()) { alert('Every field needs a label.'); return; }
        if ((f.type === 'select' || f.type === 'radio') && (!f.options || f.options.length < 2)) {
            alert('Dropdown and multiple-choice fields need at least 2 options.'); return;
        }
    }

    const audienceType = document.querySelector('input[name="mfAudienceType"]:checked').value;
    let audience = { type: audienceType };
    if (audienceType === 'roles') {
        const roles = Array.from(document.querySelectorAll('.mfRoleCheckbox:checked')).map(cb => cb.value);
        if (!roles.length) { alert('Select at least one role, or choose "All employees".'); return; }
        audience.roles = roles;
    }

    const category = document.querySelector('input[name="mfCategory"]:checked').value;
    const payload = { title, description, schema: mfSchema, audience, category };
    const url = mfEditingId ? `/api/forms/templates/${mfEditingId}` : '/api/forms/templates';
    const method = mfEditingId ? 'PUT' : 'POST';

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
        mfCloseModal();
        await mfLoadTemplates();
    } catch (err) {
        console.error('Save template error:', err);
        alert('Something went wrong saving this form.');
    }
}

async function mfArchiveTemplate(id) {
    if (!confirm('Archive this form? Employees will no longer see it, but existing submissions are kept.')) return;
    try {
        const res = await fetch(`/api/forms/templates/${id}/archive`, { method: 'PATCH', credentials: 'include' });
        if (!res.ok) throw new Error('Failed to archive');
        await mfLoadTemplates();
    } catch (err) {
        console.error('Archive error:', err);
        alert('Could not archive this form.');
    }
}

function mfEsc(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}
function mfEscAttr(str) { return mfEsc(str).replace(/"/g, '&quot;'); }
