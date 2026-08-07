import React, { useCallback, useEffect, useMemo, useState } from 'react';
import supabase from '../supabaseClient';

const TABLE_SETTINGS_ID = 'preferred-client-matches';
const DEFAULT_HEADERS = ['Project name', 'Caller', 'Designer'];
const EMPTY_ROW = {
  project_name: '',
  caller: '',
  designer: '',
};

const FIELD_KEYS = ['project_name', 'caller', 'designer'];

function PreferredMatchesTable({ userRole, userId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [headers, setHeaders] = useState(DEFAULT_HEADERS);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const isManager = userRole === 'manager';
  const canUseTable = userRole === 'manager' || userRole === 'coordinator';

  const sortedRows = useMemo(
    () => [...rows].sort((left, right) => left.sort_order - right.sort_order),
    [rows]
  );

  const showStatus = useCallback((message) => {
    setStatus(message);
    window.setTimeout(() => {
      setStatus((current) => (current === message ? '' : current));
    }, 1800);
  }, []);

  const fetchTable = useCallback(async () => {
    if (!canUseTable) return;

    setLoading(true);
    setError('');

    try {
      const [{ data: settings, error: settingsError }, { data, error: rowsError }] =
        await Promise.all([
          supabase
            .from('preferred_match_table_settings')
            .select('headers')
            .eq('id', TABLE_SETTINGS_ID)
            .maybeSingle(),
          supabase
            .from('preferred_match_rows')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
        ]);

      if (settingsError) throw settingsError;
      if (rowsError) throw rowsError;

      if (Array.isArray(settings?.headers) && settings.headers.length === 3) {
        setHeaders(settings.headers);
      } else {
        setHeaders(DEFAULT_HEADERS);
      }

      setRows(data || []);
    } catch (loadError) {
      setError(
        'Preferred Matches could not load. The database table may still need to be created.'
      );
      console.error('Preferred Matches load failed:', loadError);
    } finally {
      setLoading(false);
    }
  }, [canUseTable]);

  useEffect(() => {
    fetchTable();
  }, [fetchTable]);

  useEffect(() => {
    if (!canUseTable) return undefined;

    const channel = supabase
      .channel('realtime-preferred-matches')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'preferred_match_rows' },
        fetchTable
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'preferred_match_table_settings' },
        fetchTable
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [canUseTable, fetchTable]);

  const saveHeaders = async (nextHeaders) => {
    if (!isManager) return;

    setHeaders(nextHeaders);
    setError('');
    showStatus('Saving...');

    const { error: saveError } = await supabase
      .from('preferred_match_table_settings')
      .upsert({
        id: TABLE_SETTINGS_ID,
        headers: nextHeaders,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      });

    if (saveError) {
      setError(saveError.message);
      return;
    }

    showStatus('Saved');
  };

  const saveCell = async (row, field, value) => {
    const nextValue = value.trim();

    if ((row[field] || '') === nextValue) return;

    setRows((current) =>
      current.map((item) =>
        item.id === row.id ? { ...item, [field]: nextValue } : item
      )
    );
    setError('');
    showStatus('Saving...');

    const { error: saveError } = await supabase
      .from('preferred_match_rows')
      .update({
        [field]: nextValue,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    if (saveError) {
      setError(saveError.message);
      fetchTable();
      return;
    }

    showStatus('Saved');
  };

  const addRow = async () => {
    const nextOrder =
      rows.length > 0 ? Math.max(...rows.map((row) => row.sort_order)) + 1 : 0;

    setError('');
    showStatus('Saving...');

    const { data, error: addError } = await supabase
      .from('preferred_match_rows')
      .insert([
        {
          ...EMPTY_ROW,
          sort_order: nextOrder,
          created_by: userId,
          updated_by: userId,
        },
      ])
      .select()
      .single();

    if (addError) {
      setError(addError.message);
      return;
    }

    setRows((current) => [...current, data]);
    showStatus('Saved');
  };

  const deleteRow = async (rowId) => {
    setError('');
    showStatus('Saving...');

    const { error: deleteError } = await supabase
      .from('preferred_match_rows')
      .update({
        is_active: false,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rowId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setRows((current) => current.filter((row) => row.id !== rowId));
    showStatus('Saved');
  };

  const handleEditableKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  if (!canUseTable) return null;

  return (
    <div className={`preferred-matches ${isOpen ? 'open' : ''}`}>
      <button
        type="button"
        className="preferred-matches-toggle"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <span>Preferred Matches</span>
        <span className="preferred-matches-toggle-meta">
          {isOpen ? 'Hide' : 'Open'}
        </span>
      </button>

      {isOpen && (
        <div className="preferred-matches-panel">
          <div className="preferred-matches-toolbar">
            <div>
              <div className="preferred-matches-title">Client match tracker</div>
              <div className="preferred-matches-subtitle">
                Preferred caller and designer pairings
              </div>
            </div>
            <div className="preferred-matches-actions">
              {status && <span className="preferred-matches-status">{status}</span>}
              <button
                type="button"
                className="preferred-matches-add"
                onClick={addRow}
                disabled={loading}
              >
                + Row
              </button>
            </div>
          </div>

          {error && <div className="preferred-matches-error">{error}</div>}

          <div className="preferred-matches-scroll">
            <table className="preferred-matches-table">
              <thead>
                <tr>
                  {headers.map((header, index) => (
                    <th key={FIELD_KEYS[index]}>
                      <span
                        contentEditable={isManager}
                        suppressContentEditableWarning
                        tabIndex={isManager ? 0 : -1}
                        onKeyDown={handleEditableKeyDown}
                        onBlur={(event) => {
                          const nextHeaders = [...headers];
                          nextHeaders[index] =
                            event.currentTarget.textContent.trim() ||
                            DEFAULT_HEADERS[index];
                          saveHeaders(nextHeaders);
                        }}
                      >
                        {header}
                      </span>
                    </th>
                  ))}
                  <th className="preferred-matches-delete-header" />
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={4} className="preferred-matches-empty">
                      Loading matches...
                    </td>
                  </tr>
                )}

                {!loading && sortedRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="preferred-matches-empty">
                      No matches tracked yet.
                    </td>
                  </tr>
                )}

                {!loading &&
                  sortedRows.map((row) => (
                    <tr key={row.id}>
                      {FIELD_KEYS.map((field) => (
                        <td key={field}>
                          <span
                            contentEditable
                            suppressContentEditableWarning
                            tabIndex={0}
                            className="preferred-matches-cell"
                            onKeyDown={handleEditableKeyDown}
                            onBlur={(event) =>
                              saveCell(row, field, event.currentTarget.textContent)
                            }
                          >
                            {row[field]}
                          </span>
                        </td>
                      ))}
                      <td className="preferred-matches-delete-cell">
                        <button
                          type="button"
                          className="preferred-matches-delete"
                          onClick={() => deleteRow(row.id)}
                          title="Delete row"
                          aria-label="Delete row"
                        >
                          x
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default PreferredMatchesTable;
