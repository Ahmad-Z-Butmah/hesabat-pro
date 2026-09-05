import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bars, Envelope, Lock, Eye, Building, ArrowLeft } from '../../components/icons/Icons.jsx'
import { login, saveToken, ApiError } from '../../utils/api.js'
import './Login.css'

const FEATURES = [
  'تقارير مالية ولوحات تحكّم فورية',
  'أمان وتشفير بمعايير بنكية',
  'متوافق مع أنظمة الفوترة الإلكترونية',
]

export default function Login() {
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { access_token } = await login(username, password)
      saveToken(access_token)
      navigate('/projects')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذّر الاتصال بالخادم')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login">
      {/* النموذج (يسار) */}
      <section className="login__form-side">
        <span className="login__lang">العربية</span>
        <div className="login__box">
          <div className="login__brand">
            <span className="login__logo"><Bars size={24} /></span>
            <span className="login__brand-name">حسابات برو</span>
          </div>

          <h1 className="login__title">تسجيل الدخول</h1>
          <p className="login__subtitle">مرحباً بعودتك، سجّل دخولك للمتابعة إلى لوحة التحكم.</p>

          <form className="login__form" onSubmit={submit}>
            <div className="login__field">
              <label>اسم المستخدم</label>
              <div className="login__control">
                <span className="login__icon"><Envelope size={20} /></span>
                <input
                  type="text"
                  placeholder="ADMIN"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="login__field">
              <label>كلمة المرور</label>
              <div className="login__control">
                <span className="login__eye" onClick={() => setShowPass((v) => !v)}><Eye size={20} /></span>
                <span className="login__icon"><Lock size={20} /></span>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <div className="login__row">
              <a className="login__link" href="#forgot">نسيت كلمة المرور؟</a>
              <label className="login__remember">
                <input type="checkbox" defaultChecked /><span>تذكّرني</span>
              </label>
            </div>

            {error && <p className="login__error">{error}</p>}

            <button type="submit" className="login__submit" disabled={loading}>
              <ArrowLeft size={20} /> {loading ? 'جارٍ الدخول...' : 'تسجيل الدخول'}
            </button>

            <div className="login__divider"><span>أو</span></div>

            <button type="button" className="login__sso">
              المتابعة عبر حساب الشركة (SSO) <Building size={20} />
            </button>

            <p className="login__foot">ليس لديك حساب؟ <a className="login__link" href="#admin">تواصل مع مسؤول النظام</a></p>
            <p className="login__secure">جميع البيانات محميّة باتصال مشفّر (SSL)</p>
          </form>
        </div>
      </section>

      {/* العلامة (يمين) */}
      <aside className="login__brand-side">
        <div className="login__brand-top">
          <span className="login__brand-logo"><Bars size={28} /></span>
          <span className="login__brand-title">حسابات برو</span>
        </div>
        <div className="login__hero">
          <h2>منصّتك المتكاملة لإدارة حسابات ومالية أعمالك</h2>
          <p>تحكّم كامل بالفواتير والمصروفات والتقارير المالية من مكان واحد، بواجهة واضحة وسريعة.</p>
          <ul className="login__features">
            {FEATURES.map((f) => (
              <li key={f}><span className="login__check">✓</span>{f}</li>
            ))}
          </ul>
        </div>
        <p className="login__copy">© 2026 حسابات برو — جميع الحقوق محفوظة</p>
      </aside>
    </div>
  )
}
