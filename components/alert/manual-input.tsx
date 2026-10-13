'use client'

const QUICK_TAGS = [
  'Personne blessée',
  'Personne inconsciente',
  'Incendie',
  'Accident de la route',
  'Agression en cours',
  'Arme visible',
  'Cambriolage',
  'Noyade',
]

type ManualInputProps = {
  value: string
  onChange: (value: string) => void
}

export function ManualInput({ value, onChange }: ManualInputProps) {
  function addTag(tag: string) {
    onChange(value.trim() ? `${value.trim()}. ${tag}` : tag)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="description" className="text-sm font-semibold">
          Décrivez la situation
        </label>
        <textarea
          id="description"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          maxLength={2000}
          placeholder="Ex : Un accident vient de se produire au carrefour, deux personnes sont blessées…"
          className="w-full resize-none rounded-2xl border bg-card p-4 text-base leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-right text-xs text-muted-foreground">{value.length}/2000</p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">Ajout rapide</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              className="rounded-full border bg-secondary px-3 py-1.5 text-sm transition-colors hover:bg-accent"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
