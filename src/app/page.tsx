'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { MapPin, Phone, Clock, ArrowRight } from 'lucide-react'

const UNITS = [
  {
    slug: 'boa-vista',
    name: 'Boa Vista',
    city: 'São Gonçalo',
    address: 'Av. Gov. Macedo Soares, 795 - Boa Vista, São Gonçalo - RJ, 24436-225',
    phone: '(21) 96556-5686',
    hours: 'Terça a Domingo',
    color: '#FF9A4D',
  },
  {
    slug: 'colubande',
    name: 'Colubandê',
    city: 'São Gonçalo',
    address: 'Av. Jorn. Roberto Marinho, 1320 - Colubandê, São Gonçalo - RJ, 24451-715',
    phone: '(21) 96556-5686',
    hours: 'Terça a Domingo',
    color: '#F47920',
  },
  {
    slug: 'araruama',
    name: 'Araruama',
    city: 'Araruama',
    address: 'R. Equador, 30 - Parque Hotel, Araruama - RJ, 28981-490',
    phone: '(21) 96556-5686',
    hours: 'Terça a Domingo',
    color: '#C45E0A',
  },
  {
    slug: 'niteroi',
    name: 'Niterói',
    city: 'Niterói',
    address: 'R. Noronha Torrezão, 165 - Santa Rosa, Niterói - RJ, 24240-185',
    phone: '(21) 96556-5686',
    hours: 'Terça a Domingo',
    color: '#FF6B0A',
  },
]

export default function HomePage() {
  return (
    <main style={{
      background: '#040201',
      minHeight: '100vh',
      color: '#fff',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* BACKGROUND EFFECTS */}
      <div style={{
        position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '100vw', height: '100vw', maxWidth: '1200px', maxHeight: '1200px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(244,121,32,0.06) 0%, rgba(0,0,0,0) 70%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      <div style={{
        position: 'absolute', top: '0', left: '0', right: '0', height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(244,121,32,0.2), transparent)',
        pointerEvents: 'none', zIndex: 0
      }} />

      {/* CONTENT ENVELOPE */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto', padding: '100px 24px 60px' }}>

        {/* HERO SECTION */}
        <motion.div
          style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Link href="/minha-reserva" style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', borderRadius: '99px',
              background: 'rgba(244,121,32,0.15)',
              border: '1px solid rgba(244,121,32,0.3)',
              color: '#F47920', fontSize: '14px', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 12px rgba(244,121,32,0.1)'
            }}>
              Já tenho Reserva
              <ArrowRight size={16} />
            </div>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: 'center', marginBottom: '80px' }}
        >
          {/* Removed Logo Badge as requested */}

          <h1 style={{
            fontSize: 'clamp(44px, 8vw, 88px)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 1.05,
            marginBottom: '24px'
          }}>
            Escolha sua <br />
            <span style={{
              background: 'linear-gradient(90deg, #FF9A4D, #F47920)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block'
            }}>
              Unidade
            </span>
          </h1>

          <p style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: 'clamp(16px, 2.5vw, 22px)',
            maxWidth: '650px',
            margin: '0 auto',
            fontWeight: 400,
            lineHeight: 1.5,
            letterSpacing: '-0.01em'
          }}>
            Cuidaremos de tudo para sua festa ser perfeita, do salgadinho a decoração. Sua única preocupação é aproveitar seu momento especial.
          </p>
        </motion.div>

        {/* CARDS GRID */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '24px',
          paddingBottom: '80px'
        }}>
          {UNITS.map((unit, i) => (
            <motion.div
              key={unit.slug}
              initial={{ opacity: 0, scale: 0.9, y: 30, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.8, delay: 0.15 * i, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link href={`/reservar/${unit.slug}`} style={{ display: 'block', textDecoration: 'none' }}>
                <motion.div
                  whileHover={{ scale: 1.02, y: -6 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '32px',
                    padding: '36px',
                    overflow: 'hidden',
                    position: 'relative',
                    backdropFilter: 'blur(40px)',
                    WebkitBackdropFilter: 'blur(40px)',
                    display: 'flex', flexDirection: 'column', height: '100%',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    cursor: 'pointer'
                  }}
                >
                  {/* Orange Glow behind the card on hover effect (simulated via standard bg) */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '40%',
                    background: `linear-gradient(180deg, ${unit.color}15, transparent)`,
                    pointerEvents: 'none'
                  }} />

                  {/* Unit icon/header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px', position: 'relative' }}>
                    <div style={{
                      width: '56px', height: '56px', borderRadius: '18px',
                      boxShadow: `0 8px 24px ${unit.color}50`,
                      flexShrink: 0,
                      overflow: 'hidden'
                    }}>
                      <Image
                        src="/fullhouse-logo.jpg"
                        alt={`Logo ${unit.name}`}
                        width={56}
                        height={56}
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                    <div>
                      <p style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.4)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        marginBottom: '2px'
                      }}>
                        Full House
                      </p>
                      <h2 style={{
                        fontSize: '26px',
                        fontWeight: 700,
                        color: '#fff',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.1
                      }}>
                        {unit.name}
                      </h2>
                    </div>
                  </div>

                  {/* Details layout */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '48px', flex: 1, position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.5)', fontSize: '15px', fontWeight: 500 }}>
                      <MapPin size={18} color={unit.color} />
                      <span>{unit.address}, {unit.city}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.5)', fontSize: '15px', fontWeight: 500 }}>
                      <Clock size={18} color={unit.color} />
                      <span>{unit.hours}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.5)', fontSize: '15px', fontWeight: 500 }}>
                      <Phone size={18} color={unit.color} />
                      <span>{unit.phone}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '18px 22px', borderRadius: '20px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    position: 'relative'
                  }}>
                    <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>
                      Reservar agora
                    </span>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '10px',
                      background: 'rgba(255,255,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <ArrowRight size={16} color="#fff" />
                    </div>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>

      </div>
    </main>
  )
}
