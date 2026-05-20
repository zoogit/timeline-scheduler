import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../supabaseClient';

const ROLE_HIERARCHY = { team_member: 0, coordinator: 1, manager: 2 };
const DEFAULT_FORM = { label: '', url: '', min_role: 'team_member', sort_order: 0 };

function ResourceLinkBanner({ userRole }) {
  const [links, setLinks] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isManager = userRole === 'manager';
  const userRoleLevel = ROLE_HIERARCHY[userRole] ?? 0;

  const fetchLinks = useCallback(async () => {
    const { data } = await supabase
      .from('resource_links')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    setLinks(data || []);
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const visibleLinks = links.filter(
    (link) => (ROLE_HIERARCHY[link.min_role] ?? 0) <= userRoleLevel
  );

  const handleSave = async () => {
    if (!form.label.trim() || !form.url.trim()) {
      setError('Label and URL are required.');
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      label: form.label.trim(),
      url: form.url.trim(),
      min_role: form.min_role,
      sort_order: form.sort_order,
      updated_at: new Date().toISOString(),
    };

    const { error: dbError } = editingId
      ? await supabase.from('resource_links').update(payload).eq('id', editingId)
      : await supabase.from('resource_links').insert([{ ...payload, is_active: true }]);

    setSaving(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    cancelForm();
    fetchLinks();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this link?')) return;
    await supabase.from('resource_links').update({ is_active: false }).eq('id', id);
    fetchLinks();
  };

  const startEdit = (link) => {
    setEditingId(link.id);
    setForm({ label: link.label, url: link.url, min_role: link.min_role, sort_order: link.sort_order });
    setShowAddForm(true);
    setError('');
  };

  const startAdd = () => {
    setEditingId(null);
    setForm({ ...DEFAULT_FORM, sort_order: links.length });
    setShowAddForm(true);
    setError('');
  };

  const cancelForm = () => {
    setEditingId(null);
    setShowAddForm(false);
    setForm(DEFAULT_FORM);
    setError('');
  };

  if (visibleLinks.length === 0 && !isManager) return null;

  return (
    <div style={{
      background: '#f0f4ff',
      borderRadius: '8px',
      padding: '10px 16px',
      marginBottom: '12px',
      border: '1px solid #dde4f0',
    }}>

      {/* ── Banner row ── */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <span style={{
          fontSize: '11px', fontWeight: '700', color: '#6c757d',
          textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap',
        }}>
          Resources
        </span>

        {visibleLinks.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '13px', color: '#0267ff',
              textDecoration: 'none', borderBottom: '1px solid #0267ff', paddingBottom: '1px',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.65')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            {link.label}
          </a>
        ))}

        {visibleLinks.length === 0 && isManager && (
          <span style={{ fontSize: '12px', color: '#adb5bd', fontStyle: 'italic' }}>
            No links added yet
          </span>
        )}

        {isManager && (
          <button
            onClick={() => { setShowPanel(!showPanel); if (showPanel) cancelForm(); }}
            style={{
              marginLeft: 'auto', fontSize: '12px', padding: '3px 10px', cursor: 'pointer',
              background: showPanel ? '#0267ff' : 'transparent',
              color: showPanel ? 'white' : '#6c757d',
              border: '1px solid #dee2e6', borderRadius: '4px',
            }}
          >
            {showPanel ? 'Done' : '⚙ Manage'}
          </button>
        )}
      </div>

      {/* ── Manager panel ── */}
      {isManager && showPanel && (
        <div style={{ marginTop: '12px', borderTop: '1px solid #dde4f0', paddingTop: '12px' }}>

          {/* Link table */}
          {links.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '10px' }}>
              <thead>
                <tr style={{ color: '#6c757d', textAlign: 'left' }}>
                  <th style={{ padding: '4px 8px', fontWeight: '600', width: '40px' }}>Order</th>
                  <th style={{ padding: '4px 8px', fontWeight: '600' }}>Label</th>
                  <th style={{ padding: '4px 8px', fontWeight: '600' }}>Visible to</th>
                  <th style={{ padding: '4px 8px', fontWeight: '600', width: '130px' }}></th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '6px 8px', color: '#adb5bd', textAlign: 'center' }}>{link.sort_order}</td>
                    <td style={{ padding: '6px 8px' }}>{link.label}</td>
                    <td style={{ padding: '6px 8px', color: '#6c757d', textTransform: 'capitalize' }}>
                      {link.min_role === 'team_member' ? 'Everyone' : link.min_role.replace('_', ' ') + '+'}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => startEdit(link)}
                          style={{ fontSize: '12px', padding: '2px 8px', background: '#fff', border: '1px solid #dee2e6', borderRadius: '3px', cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(link.id)}
                          style={{ fontSize: '12px', padding: '2px 8px', background: '#fff', border: '1px solid #ffcccc', color: '#e74c3c', borderRadius: '3px', cursor: 'pointer' }}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Add / Edit form */}
          {showAddForm && (
            <div style={{ background: '#fff', border: '1px solid #dde4f0', borderRadius: '6px', padding: '14px', marginBottom: '10px' }}>
              <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '600', color: '#495057' }}>
                {editingId ? 'Edit Link' : 'Add New Link'}
              </p>

              {error && (
                <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#e74c3c' }}>{error}</p>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 160px 80px', gap: '8px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#6c757d', marginBottom: '3px' }}>Label</label>
                  <input
                    value={form.label}
                    onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                    placeholder="Troubleshooting Guide"
                    style={{ width: '100%', padding: '5px 8px', fontSize: '13px', border: '1px solid #dee2e6', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#6c757d', marginBottom: '3px' }}>URL</label>
                  <input
                    value={form.url}
                    onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                    placeholder="https://..."
                    style={{ width: '100%', padding: '5px 8px', fontSize: '13px', border: '1px solid #dee2e6', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#6c757d', marginBottom: '3px' }}>Visible to</label>
                  <select
                    value={form.min_role}
                    onChange={(e) => setForm((p) => ({ ...p, min_role: e.target.value }))}
                    style={{ width: '100%', padding: '5px 8px', fontSize: '13px', border: '1px solid #dee2e6', borderRadius: '4px' }}
                  >
                    <option value="team_member">Everyone</option>
                    <option value="coordinator">Coordinators+</option>
                    <option value="manager">Managers only</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#6c757d', marginBottom: '3px' }}>Order</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm((p) => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '5px 8px', fontSize: '13px', border: '1px solid #dee2e6', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.label.trim() || !form.url.trim()}
                  style={{ padding: '5px 14px', background: '#0267ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', opacity: (saving || !form.label.trim() || !form.url.trim()) ? 0.6 : 1 }}
                >
                  {saving ? 'Saving…' : editingId ? 'Update' : 'Add Link'}
                </button>
                <button
                  onClick={cancelForm}
                  style={{ padding: '5px 14px', background: '#fff', color: '#6c757d', border: '1px solid #dee2e6', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!showAddForm && (
            <button
              onClick={startAdd}
              style={{ fontSize: '13px', padding: '5px 12px', background: '#fff', border: '1px dashed #0267ff', color: '#0267ff', borderRadius: '4px', cursor: 'pointer' }}
            >
              + Add Link
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ResourceLinkBanner;
