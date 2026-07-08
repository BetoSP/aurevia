export function FormField({ label, name, type = 'text', required, children, error, ...rest }) {
  const fieldId = `field-${name}`;

  if (type === 'textarea') {
    return (
      <div className="form-field">
        <label htmlFor={fieldId}>{label}{required && <span className="required">*</span>}</label>
        <textarea id={fieldId} name={name} required={required} {...rest} />
        {error && <span className="form-error">{error}</span>}
      </div>
    );
  }

  if (type === 'select') {
    return (
      <div className="form-field">
        <label htmlFor={fieldId}>{label}{required && <span className="required">*</span>}</label>
        <select id={fieldId} name={name} required={required} {...rest}>
          {children}
        </select>
        {error && <span className="form-error">{error}</span>}
      </div>
    );
  }

  if (type === 'checkbox') {
    return (
      <div className="form-field form-field-checkbox">
        <label htmlFor={fieldId}>
          <input id={fieldId} name={name} type="checkbox" required={required} {...rest} />
          {label}{required && <span className="required">*</span>}
        </label>
        {error && <span className="form-error">{error}</span>}
      </div>
    );
  }

  return (
    <div className="form-field">
      <label htmlFor={fieldId}>{label}{required && <span className="required">*</span>}</label>
      <input id={fieldId} name={name} type={type} required={required} {...rest} />
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
