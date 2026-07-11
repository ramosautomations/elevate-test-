// Shared form field renderer — used by the builder preview and the
// generic fill-out page. One source of truth for how a schema becomes HTML,
// so the two never drift apart.

function renderFormFields(schema, opts = {}) {
    const readOnly = !!opts.readOnly;
    return schema.map(field => {
        const req = field.required ? '<span class="required">*</span>' : '';
        const reqAttr = field.required ? 'required' : '';
        const disabledAttr = readOnly ? 'disabled' : '';

        let inputHtml = '';
        switch (field.type) {
            case 'text':
                inputHtml = `<input type="text" id="${field.id}" name="${field.id}" ${reqAttr} ${disabledAttr}>`;
                break;
            case 'date':
                inputHtml = `<input type="date" id="${field.id}" name="${field.id}" ${reqAttr} ${disabledAttr}>`;
                break;
            case 'select':
                inputHtml = `<select id="${field.id}" name="${field.id}" ${reqAttr} ${disabledAttr}>
                    <option value="">Select...</option>
                    ${(field.options || []).map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('')}
                </select>`;
                break;
            case 'radio':
                inputHtml = (field.options || []).map((o, i) => `
                    <label style="display:flex;align-items:center;gap:6px;font-weight:400;margin:4px 0;">
                        <input type="radio" name="${field.id}" value="${escapeHtml(o)}" ${reqAttr} ${disabledAttr}> ${escapeHtml(o)}
                    </label>`).join('');
                break;
            case 'checkbox':
                inputHtml = `<label style="display:flex;align-items:center;gap:6px;font-weight:400;">
                    <input type="checkbox" id="${field.id}" name="${field.id}" ${disabledAttr}> ${escapeHtml(field.checkboxLabel || 'I confirm')}
                </label>`;
                break;
            default:
                inputHtml = `<input type="text" id="${field.id}" name="${field.id}" ${reqAttr} ${disabledAttr}>`;
        }

        const labelHtml = field.type === 'checkbox'
            ? ''
            : `<label for="${field.id}">${escapeHtml(field.label)} ${req}</label>`;

        return `<div class="form-group">${labelHtml}${inputHtml}</div>`;
    }).join('');
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}
