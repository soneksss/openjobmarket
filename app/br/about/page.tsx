"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/client"
import { MapPin, Zap, MessageSquare, Star, Wrench, Home } from "lucide-react"

const HOW_IT_WORKS = [
  { step: 1, title: "Publique o serviço",       text: "Escolha o tipo de serviço e descreva o que precisa.",                            img: "/Post_job_1.jpg" },
  { step: 2, title: "Defina a urgência",         text: "Selecione com que rapidez precisa do serviço.",                                  img: "/Post_job_2.jpg" },
  { step: 3, title: "Local e publicação",        text: "Defina sua localização e publique o serviço.",                                   img: "/Post_job_3.jpg" },
  { step: 4, title: "Receba propostas",          text: "Profissionais próximos recebem notificações e enviam propostas.",                 img: "/Tradesperson_get_notification.jpeg" },
  { step: 5, title: "Compare e escolha",         text: "Veja até 3 candidatos em uma interface simples estilo Uber.",                    img: "/Find_tradespeople.jpg" },
  { step: 6, title: "Conclua e avalie",          text: "Confirme o serviço, combine a visita e deixe uma avaliação.",                    img: "/Completed.jpg" },
]

export default function AboutPage() {
  const [isSignedIn, setIsSignedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setIsSignedIn(!!user))
  }, [])

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 max-w-4xl py-8 space-y-8">

        {/* ── About description ──────────────────────────────────────── */}
        <section className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
          <h1 className="text-xs font-bold text-white mb-2">Sobre o Open Job Market</h1>
          <div className="space-y-1.5 text-[8px] text-slate-400 leading-relaxed">
            <p>
              O Open Job Market conecta proprietários com profissionais próximos em tempo real — sem espera, sem venda de leads, sem spam.
            </p>
            <div className="hidden sm:block space-y-1.5">
              <p>
                Os usuários publicam um serviço e alcançam instantaneamente profissionais na área. Os profissionais recebem notificações por localização e tipo de serviço, e se candidatam diretamente pelo app.
              </p>
              <p>
                Os proprietários comparam candidatos relevantes, revisam perfis e se comunicam sem ligações indesejadas.
              </p>
            </div>
            <p className="text-slate-300 font-medium">Duas formas de trabalhar:</p>
            <ul className="space-y-1 pl-2">
              <li className="flex items-start gap-1.5">
                <Zap className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span><span className="text-slate-200 font-medium">Serviços urgentes</span> — estilo aplicativo de corridas, profissionais próximos respondem rapidamente.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Star className="h-3 w-3 text-blue-400 mt-0.5 flex-shrink-0" />
                <span><span className="text-slate-200 font-medium">Trabalho flexível</span> — revise as opções e escolha a pessoa certa ao longo do tempo.</span>
              </li>
            </ul>
            <p className="text-emerald-400 font-medium">Rápido, justo e confiável — qualquer que seja o serviço.</p>
          </div>

          <div className="flex flex-wrap gap-2 mt-5">
            {isSignedIn ? (
              <>
                <Link href="/br/post-job" className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-xs transition-colors">Publicar Serviço</Link>
                <Link href="/br/?tab=traders&autoSearch=true" className="inline-flex items-center px-4 py-2 rounded-xl border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold text-xs transition-colors">Encontrar Profissionais</Link>
              </>
            ) : (
              <>
                <Link href="/br/auth/sign-up" className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-xs transition-colors">Começar Gratuitamente</Link>
                <Link href="/br/?tab=traders&autoSearch=true" className="inline-flex items-center px-4 py-2 rounded-xl border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold text-xs transition-colors">Ver Profissionais</Link>
              </>
            )}
          </div>
        </section>

        {/* ── Comparison ───────────────────────────────────────────────── */}
        <section>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest px-1 mb-3">
            Por que escolher o Open Job Market?
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Outras plataformas</p>
              <ul className="space-y-2">
                {["Vendem como leads pagos", "Múltiplas ligações indesejadas", "Frequentemente não locais", "Processo de orçamento lento"].map((p) => (
                  <li key={p} className="flex items-start gap-2 text-xs text-slate-500">
                    <span className="text-red-400 font-bold flex-shrink-0">✕</span>{p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-emerald-950/40 rounded-2xl border border-emerald-500/25 p-4">
              <p className="text-[11px] font-semibold text-emerald-500 uppercase tracking-widest mb-3">Open Job Market</p>
              <ul className="space-y-2">
                {["Sem venda de leads — preços justos", "Conexão direta com profissionais próximos", "Somente mensagens — sem spam", "Combinação rápida (estilo Uber)"].map((p) => (
                  <li key={p} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="text-emerald-400 font-bold flex-shrink-0">✓</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── For each audience ────────────────────────────────────────── */}
        <section className="grid md:grid-cols-2 gap-3">
          <div className="bg-slate-800/60 rounded-2xl border border-orange-500/25 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600/80 to-orange-700/80 px-4 py-3 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-orange-100 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-white leading-none">Para Profissionais</p>
                <p className="text-orange-200 text-xs mt-0.5">Mais serviços locais sem pagar por leads.</p>
              </div>
            </div>
            <ul className="px-4 py-3 space-y-1.5">
              {["Veja serviços próximos no mapa ao vivo", "Candidate-se instantaneamente", "Seja descoberto por clientes", "Preencha lacunas na agenda"].map((p) => (
                <li key={p} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="text-emerald-400 font-bold flex-shrink-0">✓</span>{p}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-800/60 rounded-2xl border border-blue-500/25 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-700/80 to-blue-800/80 px-4 py-3 flex items-center gap-2">
              <Home className="h-4 w-4 text-blue-100 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-white leading-none">Para Proprietários</p>
                <p className="text-blue-200 text-xs mt-0.5">Encontre a pessoa certa, rápido e localmente.</p>
              </div>
            </div>
            <ul className="px-4 py-3 space-y-1.5">
              {["Publique com fotos e orçamento", "Alcance profissionais próximos", "Compare propostas facilmente", "Contrate com confiança e avaliações"].map((p) => (
                <li key={p} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="text-emerald-400 font-bold flex-shrink-0">✓</span>{p}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── How It Works ─────────────────────────────────────────────── */}
        <section>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest px-1 mb-3">
            Como funciona
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {HOW_IT_WORKS.map(({ step, title, text, img }) => (
              <div key={step} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden flex flex-col">
                <div className="relative w-full aspect-[9/16] bg-slate-800">
                  <Image src={img} alt={title} fill className="object-cover object-top" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw" />
                </div>
                <div className="px-2.5 py-2 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-[9px] font-bold text-emerald-400 flex-shrink-0">
                      {step}
                    </span>
                    <p className="text-[11px] font-semibold text-slate-100 leading-tight">{title}</p>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-snug pl-5">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Trust badges ─────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon: MapPin,        label: "Hiperlocal",    sub: "Perto de você" },
            { icon: Zap,           label: "Sob demanda",   sub: "Urgente ou agendado" },
            { icon: MessageSquare, label: "Sem ligações",  sub: "Chat no app" },
            { icon: Star,          label: "Avaliados",     sub: "Notas reais" },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-center">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto mb-1.5">
                <Icon className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <p className="text-xs font-semibold text-slate-100">{label}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>
            </div>
          ))}
        </section>

        {/* ── Final CTA ────────────────────────────────────────────────── */}
        <section className="bg-slate-800/50 border border-emerald-700/25 rounded-2xl p-5 text-center">
          {isSignedIn ? (
            <>
              <p className="text-sm font-bold text-white mb-1">Pronto para publicar seu próximo serviço?</p>
              <p className="text-xs text-slate-500 mb-4">Alcance profissionais locais verificados em segundos.</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link href="/br/post-job" className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-xs transition-colors">Publicar Serviço</Link>
                <Link href="/br/?tab=traders&autoSearch=true" className="inline-flex items-center px-4 py-2 rounded-xl border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold text-xs transition-colors">Encontrar Profissionais</Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-white mb-1">Pronto para começar?</p>
              <p className="text-xs text-slate-500 mb-4">Junte-se a milhares que já usam o Open Job Market.</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link href="/br/auth/sign-up" className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-xs transition-colors">Criar Conta Grátis</Link>
                <Link href="/br/?tab=traders&autoSearch=true" className="inline-flex items-center px-4 py-2 rounded-xl border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold text-xs transition-colors">Ver Profissionais</Link>
              </div>
            </>
          )}
        </section>

      </div>
    </div>
  )
}
