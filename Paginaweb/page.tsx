'use client'

import { useState, useEffect } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import {
  Menu, X, ArrowRight, ChevronDown, CheckCircle2,
  Settings, PenTool, Database, ShieldCheck, Mail, Phone, MapPin,
  Globe, Users, Briefcase, Factory
} from 'lucide-react'
import Link from 'next/link'
import { Montserrat, Noto_Sans_JP } from 'next/font/google'
import { cn } from '@/lib/utils'

// Fonts
const montserrat = Montserrat({ subsets: ['latin'], weight: ['400', '700', '900'] })
const notoSansJP = Noto_Sans_JP({ subsets: ['latin'], weight: ['400', '500', '700'] })

// Colors - Dark Industrial Theme
const colors = {
  bg: 'bg-[#0a0a0a]',
  bgSoft: 'bg-[#111111]',
  accent: 'text-cyan-400',
  accentBg: 'bg-cyan-500',
  accentHover: 'hover:bg-cyan-400',
  text: 'text-slate-200',
  textMuted: 'text-slate-400'
}

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { scrollY } = useScroll()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { name: 'Home', href: '#' },
    { name: 'Service', href: '#services' },
    { name: 'Company', href: '#company' },
    { name: 'Contact', href: '#contact' },
  ]

  return (
    <div className={cn("min-h-screen selection:bg-cyan-500/30", colors.bg, colors.text, notoSansJP.className)}>

      {/* Navigation */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent",
        isScrolled ? "bg-black/90 backdrop-blur-md border-white/10" : "bg-transparent"
      )}>
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className={cn("text-2xl font-black tracking-tighter flex items-center gap-2", montserrat.className)}>
            {/* Logo Image - Inverted for Dark Theme */}
            <div className="p-1">
              <img src="/logo-uns-corto-negro.png" alt="UNS Logo" className="h-10 w-auto invert brightness-0" />
            </div>
            <span className="text-white">ユニバーサル企画<span className="text-cyan-400">株式会社</span></span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className={cn("text-sm font-bold hover:text-cyan-400 transition-colors uppercase tracking-widest", montserrat.className)}
              >
                {link.name}
              </a>
            ))}
            <Link
              href="/dashboard"
              className={cn(
                "px-6 py-2 rounded font-bold text-black transition-all transform hover:scale-105 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] flex items-center gap-2",
                colors.accentBg, colors.accentHover
              )}
            >
              <Database className="w-4 h-4" />
              SYSTEM LOGIN
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white hover:text-cyan-400 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-black/95 border-b border-white/10 overflow-hidden"
            >
              <div className="flex flex-col p-6 gap-4">
                {navLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn("text-lg font-bold hover:text-cyan-400 tracking-wider", montserrat.className)}
                  >
                    {link.name}
                  </a>
                ))}
                <Link
                  href="/dashboard"
                  className={cn("mt-4 text-center py-3 rounded font-bold text-black", colors.accentBg)}
                >
                  SYSTEM LOGIN
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0 bg-[#050505]">
          {/* Abstract Industrial Tech Background */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=2664&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-luminosity" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-black/60" />
          {/* Animated Mesh Grid (CSS only for perf) */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]" />
        </div>

        <div className="container relative z-10 px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-4xl"
          >
            <div className="flex items-center gap-2 mb-6">
              <span className="h-[1px] w-12 bg-cyan-500"></span>
              <span className={cn("text-cyan-400 font-bold tracking-[0.2em] uppercase text-sm md:text-base", montserrat.className)}>
                Global Workforce Solutions
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-black leading-tight mb-8 text-white tracking-tight">
              世界の人材を、<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500">
                日本の現場へ。
              </span>
            </h1>

            <p className="max-w-2xl text-lg md:text-xl text-slate-300/90 mb-10 leading-relaxed font-light">
              外国人材派遣・業務請負・特定技能。<br />
              ユニバーサル企画は、多様化する雇用ニーズに応え、<br className="hidden md:block" />
              企業の生産性向上を強力にサポートします。
            </p>

            <div className="flex flex-col md:flex-row gap-4">
              <a
                href="#services"
                className={cn(
                  "px-8 py-4 rounded font-bold text-black transition-all flex items-center justify-center gap-2 group",
                  colors.accentBg, colors.accentHover
                )}
              >
                事業内容を見る
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="#contact"
                className="px-8 py-4 rounded font-bold text-white border border-white/20 hover:bg-white/5 transition-all text-center backdrop-blur-sm hover:border-cyan-400/50"
              >
                お問い合わせ
              </a>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/30"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="w-8 h-8" />
        </motion.div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 bg-[#0a0a0a] relative overflow-hidden">
        {/* Decorative BG */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className={cn("text-4xl md:text-5xl font-black mb-4", montserrat.className)}>
              OUR <span className="text-cyan-400">SERVICES</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              人材不足という課題に対し、具体的かつ実践的なソリューションを提供します。
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: '人材派遣サービス',
                en: 'Staffing Service',
                desc: '労働人口の減少に対応するため、意欲ある外国人材をご提案。貴社のニーズに合わせた最適なマッチングを実現します。',
                icon: Globe,
                image: '/images/cnc.png'
              },
              {
                title: '特定技能',
                en: 'Specified Skilled Worker',
                desc: '即戦力となる特定技能人材。製造ライン、加工、建設など、専門知識を要する現場でも活躍できる人材を紹介します。',
                icon: Factory,
                image: '/images/engineer.png'
              },
              {
                title: 'アウトソーシング',
                en: 'Outsourcing',
                desc: '業務請負による生産性向上。ルーティンワークやノンコア業務を委託いただくことで、貴社のコア業務への集中とコスト削減を支援します。',
                icon: Briefcase,
                image: '/images/qc.png'
              }
            ].map((service, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="group relative bg-[#151515] rounded-xl overflow-hidden border border-white/5 hover:border-cyan-500/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_40px_-10px_rgba(6,182,212,0.15)]"
              >
                <div className="h-56 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#151515] to-transparent z-10" />
                  <img
                    src={service.image}
                    alt={service.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-100"
                  />
                  <div className="absolute top-4 right-4 z-20 bg-black/60 p-2 rounded-lg backdrop-blur-md border border-white/10">
                    <service.icon className="w-6 h-6 text-cyan-400" />
                  </div>
                </div>
                <div className="p-8 relative z-20 -mt-10">
                  <p className={cn("text-cyan-400 text-xs font-bold tracking-widest uppercase mb-1", montserrat.className)}>
                    {service.en}
                  </p>
                  <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-cyan-400 transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    {service.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Corporate Info / Why Us */}
      <section id="company" className="py-24 bg-[#0a0a0a] border-y border-white/5 relative">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                <span className="text-cyan-400 font-bold uppercase tracking-widest text-sm">Corporate Mission</span>
              </div>
              <h2 className={cn("text-3xl md:text-4xl font-black mb-6 leading-sung text-white", montserrat.className)}>
                企業の期待に応える<br />
                <span className="text-cyan-400">確かな労働力</span>を。
              </h2>
              <div className="space-y-6 text-slate-400 leading-relaxed">
                <p>
                  ユニバーサル企画株式会社は、深刻化する人材不足という社会課題に対し、
                  グローバルな視点での解決策を提案します。
                </p>
                <p>
                  単なる人材紹介に留まらず、入社後のフォローアップから
                  生活面のサポートまで、企業様と働く方々の双方が安心できる
                  環境づくりに尽力しています。
                </p>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="bg-[#1a1a1a] p-4 rounded-lg border border-white/5">
                  <p className="text-2xl font-bold text-white mb-1">2021<span className="text-sm font-normal text-slate-500">年</span></p>
                  <p className="text-xs text-slate-400">Webサイト開設</p>
                </div>
                <div className="bg-[#1a1a1a] p-4 rounded-lg border border-white/5">
                  <p className="text-2xl font-bold text-white mb-1">2<span className="text-sm font-normal text-slate-500">拠点</span></p>
                  <p className="text-xs text-slate-400">名古屋本社・岡山営業所</p>
                </div>
              </div>
            </div>

            <div className="order-1 md:order-2 relative">
              <div className="absolute -inset-4 bg-cyan-500/20 rounded-xl blur-2xl -z-10" />
              <div className="aspect-video bg-[#1a1a1a] rounded-xl overflow-hidden border border-white/10 relative">
                <div className="absolute inset-0 bg-[url('/images/deal_discreet.png')] bg-cover bg-center grayscale opacity-60" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                  <h3 className={cn("text-3xl font-black text-white mb-2", montserrat.className)}>UNIVERSAL<br />PLANNING</h3>
                  <p className="text-cyan-400 tracking-[0.3em] text-sm uppercase">Co., Ltd.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-[#111] relative">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto bg-[#0a0a0a] rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col md:flex-row">

            {/* Info Area */}
            <div className="md:w-5/12 bg-[#151515] p-10 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none" />

              <div>
                <h3 className={cn("text-2xl font-bold text-white mb-6", montserrat.className)}>Contact Us</h3>
                <p className="text-slate-400 text-sm mb-8">
                  人材活用や業務請負に関するご相談は、<br />お気軽にお問い合わせください。
                </p>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <MapPin className="text-cyan-400 shrink-0 mt-1" />
                    <div>
                      <p className="text-white font-bold text-sm mb-1">名古屋本社</p>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        〒461-0025<br />
                        愛知県名古屋市東区徳川2丁目18-18
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <MapPin className="text-cyan-400 shrink-0 mt-1" />
                    <div>
                      <p className="text-white font-bold text-sm mb-1">岡山営業所</p>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        岡山県岡山市北区横井上 1538 201
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                    <Phone className="text-cyan-400 shrink-0" />
                    <p className="text-xl font-bold text-white tracking-widest">052-938-8840</p>
                  </div>
                </div>
              </div>

              <div className="mt-12">
                <div className="flex gap-4">
                  {/* Social placeholders if needed */}
                </div>
              </div>
            </div>

            {/* Form Area */}
            <div className="md:w-7/12 p-10 md:p-12 bg-[#0a0a0a]">
              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">会社名</label>
                    <input type="text" className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 transition-colors" placeholder="ABC株式会社" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">ご担当者名</label>
                    <input type="text" className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 transition-colors" placeholder="山田 太郎" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">メールアドレス</label>
                  <input type="email" className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 transition-colors" placeholder="info@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">お問い合わせ内容</label>
                  <textarea rows={4} className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 transition-colors" placeholder="ご用件をご記入ください" />
                </div>
                <button className={cn(
                  "w-full py-4 rounded-lg font-bold text-black transition-all hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] flex items-center justify-center gap-2",
                  colors.accentBg
                )}>
                  <Mail className="w-5 h-5" />
                  送信する
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-white/10 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="p-1">
                <img src="/logo-uns-corto-negro.png" alt="UNS Logo" className="h-8 w-auto invert brightness-0" />
              </div>
              <span className={cn("text-xl font-bold text-white tracking-widest", montserrat.className)}>ユニバーサル企画<span className="text-cyan-400">株式会社</span></span>
            </div>
            <p className="text-slate-600 text-sm">
              &copy; {new Date().getFullYear()} Universal Planning Co., Ltd. All rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
