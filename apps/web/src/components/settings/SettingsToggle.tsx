interface SettingsToggleProps {
  value: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}

export function SettingsToggle({ value, onChange, disabled = false }: SettingsToggleProps) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={[
        'relative w-14 h-7 rounded-full transition-colors duration-200 focus:outline-none',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
        value ? 'bg-lime-accent/20' : 'bg-black/60',
      ].join(' ')}
      style={{ boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05)' }}
    >
      <span
        className={[
          'absolute top-1 transition-transform duration-200 w-5 h-5 rounded-full border-2',
          value
            ? 'translate-x-8 border-lime-accent shadow-[0_0_12px_#d9f99d]'
            : 'translate-x-1 border-white/20',
        ].join(' ')}
        style={value ? {} : { background: 'rgba(255,255,255,0.1)' }}
      >
        {value && <span className="absolute inset-1 rounded-full bg-black" />}
      </span>
    </button>
  );
}
