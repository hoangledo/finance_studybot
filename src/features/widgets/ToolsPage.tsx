import { useEffect, useState } from 'react'
import { recordToolUse } from '../../db/actions'
import { materializeRecurring } from '../../db/moneyActions'
import clsx from 'clsx'
import { PageHeader } from '../../components/ui'
import type { WidgetId } from '../../types'
import { Widget, WIDGET_META } from './Widgets'

export function ToolsPage() {
  const [active, setActive] = useState<WidgetId>('compound')
  useEffect(() => {
    recordToolUse()
  }, [active])
  // Keep "Use my numbers" current with recurring income/bills.
  useEffect(() => {
    materializeRecurring()
  }, [])
  return (
    <>
      <PageHeader title="Money Lab" subtitle="Interactive calculators. Drag the sliders or type your own numbers. Your inputs are saved." />
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {(Object.keys(WIDGET_META) as WidgetId[]).map((id) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={clsx(
              'card flex flex-col items-start p-3 text-left transition hover:-translate-y-0.5',
              active === id && 'border-sky bg-sky-soft',
            )}
          >
            <span className="text-2xl">{WIDGET_META[id].icon}</span>
            <span className="mt-1 text-sm font-extrabold">{WIDGET_META[id].title}</span>
          </button>
        ))}
      </div>
      <div className="card p-5 sm:p-6">
        <h2 className="font-display text-xl font-semibold">{WIDGET_META[active].title}</h2>
        <p className="mb-5 text-sm text-muted">{WIDGET_META[active].blurb}</p>
        <Widget key={active} id={active} persist />
      </div>
    </>
  )
}
