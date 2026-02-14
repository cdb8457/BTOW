interface SettingsSliderProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  id?: string;
  labelId?: string;
}

export function SettingsSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = '%',
  id,
  labelId,
}: SettingsSliderProps) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex items-center gap-4">
      {/* Track */}
      <div className="relative flex-1 h-2.5 rounded-full neumorphic-inset overflow-hidden">
        {/* Fill */}
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(to right, rgba(217,249,157,0.2), #d9f99d)',
            boxShadow: '0 0 20px #d9f99d',
          }}
        />
        {/* Native range — transparent, handles interaction */}
        <input
          type="range"
          id={id}
          aria-labelledby={labelId}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>

      {/* Thumb (decorative) */}
      <div
        className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center"
        style={{ background: '#d9f99d', boxShadow: '0 0 25px #d9f99d' }}
      >
        <div className="w-2 h-2 rounded-full bg-black" />
      </div>

      <span className="text-xs font-mono text-slate-400 w-10 text-right shrink-0">
        {value}
        {unit}
      </span>
    </div>
  );
}
