import { SPONSOR_CATEGORY_GROUPS } from "@/lib/services/sponsor-category-core";

type SponsorCategorySelectProps = {
  defaultValue?: string | null;
  disabled?: boolean;
};

// Shared by the new-sponsor form and the edit page so both write the same
// vocabulary. Restricted classes are a separate optgroup — nobody should pick
// "Gambling" by accident on a list sorted next to "Fitness".
export function SponsorCategorySelect({ defaultValue, disabled }: SponsorCategorySelectProps) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold">Category</span>
      <select
        className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
        defaultValue={defaultValue ?? ""}
        disabled={disabled}
        name="category"
      >
        <option value="">Uncategorized</option>
        {SPONSOR_CATEGORY_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.categories.map((category) => (
              <option key={category.key} value={category.key}>
                {category.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <span className="text-xs text-[var(--muted)]">
        Used for sponsor exclusivity and advertising policy. Leave blank if you&apos;re not sure — nothing is assumed.
      </span>
    </label>
  );
}
