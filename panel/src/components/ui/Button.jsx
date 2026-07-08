export function Button({ children, variant = 'primary', disabled, type = 'button', ...rest }) {
  return (
    <button
      type={type}
      className={`btn btn-${variant}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
