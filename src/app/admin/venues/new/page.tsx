const fieldTypes = ["Baseball", "Softball", "Soccer", "Football", "Multi-use"];

export default function NewVenuePage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Venue setup</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Create a venue</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Capture the basics for a venue shell. Data entry is intentionally local and non-functional in this first version.
        </p>
      </div>

      <form className="mt-8 grid gap-5 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Venue name</span>
          <input
            className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            placeholder="Enter venue name"
            type="text"
          />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold">City</span>
            <input
              className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
              placeholder="City"
              type="text"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">State</span>
            <input
              className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
              placeholder="State"
              type="text"
            />
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-bold">Primary field type</span>
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]">
            <option>Select a field type</option>
            {fieldTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold">Operations note</span>
          <textarea
            className="min-h-28 rounded-lg border border-[var(--line)] bg-white p-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            placeholder="Add a short internal note"
          />
        </label>

        <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold text-[var(--foreground)]"
          >
            Save draft
          </button>
          <button
            type="button"
            className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white"
          >
            Create venue
          </button>
        </div>
      </form>
    </section>
  );
}
