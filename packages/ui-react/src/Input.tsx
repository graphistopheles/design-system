// Andamio sobre specs/components/input.spec.json.
import { input, type InputContract } from '@ds-ia/core';
import { cx, defined } from './util';

/** Requisito input#6: type y autocomplete correctos. Si no se indica, se deduce del type cuando hay un valor estándar. */
const AUTOCOMPLETE_BY_TYPE: Partial<Record<NonNullable<InputContract['type']>, string>> = { email: 'email', url: 'url' };

export interface InputProps extends InputContract {
  className?: string;
  id?: string;
  autoComplete?: string;
  defaultValue?: string;
}

export function Input({ label, name, type = 'text', placeholder, helper, invalid = false, required = false, disabled = false, className, id: idProp, autoComplete, defaultValue }: InputProps) {
  const id = idProp ?? `field-${name}`;
  const helperId = helper ? `${id}-helper` : undefined;
  const c = input(defined({ label, name, type, placeholder, helper, invalid, required, disabled }));
  return (
    <div className={cx(c.root, className)}>
      <label className={c.label} htmlFor={id}>
        {label}
      </label>
      <input
        className={c.control}
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete ?? AUTOCOMPLETE_BY_TYPE[type]}
        defaultValue={defaultValue}
        aria-invalid={invalid ? 'true' : undefined}
        aria-describedby={helperId}
      />
      {helper && (
        <p className={c.helper} id={helperId}>
          {helper}
        </p>
      )}
    </div>
  );
}
