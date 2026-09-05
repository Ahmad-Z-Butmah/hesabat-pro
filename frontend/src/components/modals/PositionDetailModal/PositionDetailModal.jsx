import { statusMeta } from '../../../data/reportsData.js'
import { formatMoney, formatDateAr } from '../../../utils/format.js'
import './PositionDetailModal.css'

/** تفاصيل بند من «الموقف المالي» — قائمة الحركات التي تُكوّن قيمته */
export default function PositionDetailModal({ detail, onClose }) {
  return (
    <div className="pdm" onClick={onClose}>
      <div className="pdm__card" onClick={(e) => e.stopPropagation()}>
        <div className="pdm__head">
          <div className="pdm__head-left">
            <div className="pdm__icon" style={{ background: detail.soft }}>{detail.icon}</div>
            <div>
              <h2 className="pdm__title">{detail.label}</h2>
              <p className="pdm__subtitle">{detail.desc}</p>
            </div>
          </div>
          <div className="pdm__head-right">
            <div className="pdm__total"><span>القيمة</span><b>{formatMoney(detail.value)}</b></div>
            <button className="pdm__close" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="pdm__body">
          {detail.items.length === 0 ? (
            <div className="pdm__empty">لا يوجد شيء ضمن هذا البند لهذه الفترة</div>
          ) : (
            <div className="pdm__list">
              {detail.items.map((r, i) => {
                const isIn = r.dir === 'in'
                const sm = statusMeta(r.status)
                return (
                  <div key={i} className="pdm__item">
                    <span className="pdm__square" style={{ background: isIn ? 'var(--ok)' : 'var(--danger)' }} />
                    <div className="pdm__main">
                      <div className="pdm__party">{r.party}</div>
                      <div className="pdm__sub">{r.method === 'شيك' ? `شيك #${r.no} · ` : `${r.method} · `}{r.unit} · {formatDateAr(r.g)}</div>
                    </div>
                    <div className="pdm__side">
                      <div className="pdm__amount" style={{ color: isIn ? 'var(--ok-ink)' : 'var(--danger)' }}>{isIn ? '+ ' : '− '}{formatMoney(r.amount)}</div>
                      <span className="pdm__badge" style={{ color: sm.color, background: sm.soft }}>{r.status}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
