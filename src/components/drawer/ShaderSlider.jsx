import { memo } from 'react';

export const ShaderSlider = memo(function ShaderSlider({ slider, value, onChange }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between font-mono text-[10px]">
        <label htmlFor={slider.id} className="text-ink-soft">
          {slider.label}
        </label>
        <span className="text-ink font-medium">{slider.format(value)}</span>
      </div>
      <input
        id={slider.id}
        type="range"
        className="ink-slider"
        min={slider.min}
        max={slider.max}
        step={slider.step}
        value={value}
        onChange={(e) => onChange(slider.key, parseFloat(e.target.value))}
      />
    </div>
  );
});
