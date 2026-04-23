import { useState, useRef, useEffect } from 'react';

/**
 * OrderCell — inline editable cell for Orders table.
 * Supports: display → edit → save/cancel flow.
 *
 * Props:
 *   field     — field name (matches order object key)
 *   value     — current value
 *   orderId   — order ID for API calls
 *   onSave    — (orderId, field, newValue) => Promise<void>
 *   displayFormatter — fn(value) => ReactNode (optional, default identity)
 *   inputType — 'text' | 'number' | 'date' | 'select' (default 'text')
 *   inputProps — extra props passed to <input> (placeholder, step, etc.)
 *   options   — array of { value, label } for select type
 *   readOnly  — if true, never shows input (for computed fields)
 */
export default function OrderCell({
  field,
  value,
  orderId,
  onSave,
  displayFormatter = (v) => v,
  inputType = 'text',
  inputProps = {},
  options = [],
  readOnly = false,
}) {
  const [mode, setMode] = useState('display'); // 'display' | 'edit' | 'saving' | 'error'
  const [editValue, setEditValue] = useState(value);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  // Sync editValue when value changes from outside (e.g., after save)
  useEffect(() => {
    if (mode !== 'edit') {
      setEditValue(value);
    }
  }, [value, mode]);

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (mode === 'edit' && inputRef.current) {
      inputRef.current.focus();
      // Select all text for text/number inputs
      if (inputType !== 'select') {
        inputRef.current.select();
      }
    }
  }, [mode, inputType]);

  const enterEdit = () => {
    if (readOnly || mode !== 'display') return;
    setEditValue(value);
    setMode('edit');
  };

  const cancelEdit = () => {
    setEditValue(value);
    setErrorMsg('');
    setMode('display');
  };

  const saveEdit = async () => {
    if (editValue === value) {
      setMode('display');
      return;
    }
    setMode('saving');
    setErrorMsg('');
    try {
      await onSave(orderId, field, editValue);
      setMode('display');
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi lưu');
      setMode('error');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // For select, save immediately; for text/number, also save
      if (inputType === 'select') {
        saveEdit();
      }
      // For date/text/number: blur will trigger save
    }
  };

  const handleBlur = () => {
    // Delay to allow other handlers to fire first
    setTimeout(() => {
      if (mode === 'edit') {
        saveEdit();
      }
    }, 100);
  };

  // ---- Render ----
  if (mode === 'display' || readOnly) {
    return (
      <td
        className={readOnly ? 'order-cell order-cell-readonly' : 'order-cell order-cell-display'}
        onClick={enterEdit}
        title={readOnly ? undefined : 'Click để sửa'}
      >
        {displayFormatter(value)}
      </td>
    );
  }

  if (mode === 'edit' || mode === 'saving' || mode === 'error') {
    const baseClass = 'order-cell order-cell-edit';
    const errorClass = mode === 'error' ? ' order-cell-error' : '';
    const disabledClass = mode === 'saving' ? ' order-cell-disabled' : '';

    return (
      <td className={`${baseClass}${errorClass}${disabledClass}`}>
        {inputType === 'select' ? (
          <select
            ref={inputRef}
            value={editValue}
            disabled={mode === 'saving'}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="order-cell-input"
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            ref={inputRef}
            type={inputType}
            value={editValue}
            disabled={mode === 'saving'}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="order-cell-input"
            {...inputProps}
          />
        )}
        {mode === 'error' && (
          <span className="order-cell-error-msg" title={errorMsg}>
            ⚠
          </span>
        )}
      </td>
    );
  }

  return <td />;
}
