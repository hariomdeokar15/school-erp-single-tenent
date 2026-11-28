type StudentFieldProps = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  minLength?: number;
  options?: { value: string; label: string }[];
};

export function StudentField({
  name,
  label,
  type = "text",
  required = false,
  defaultValue,
  minLength,
  options,
}: StudentFieldProps) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {type === "select" ? (
        <select
          name={name}
          required={required}
          defaultValue={defaultValue}
          className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        >
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          defaultValue={defaultValue}
          minLength={minLength}
          className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      )}
    </label>
  );
}
