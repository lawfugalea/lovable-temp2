import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import SEO from '../components/SEO'

export default function HomePage() {
  const [isVisible, setIsVisible] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    setIsVisible(true)
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const features = [
    {
      icon: '🛒',
      title: 'Smart Shopping Lists',
      description: 'Collaborative lists that sync in real-time. Categorize by aisle, set priorities, and never forget essentials.',
      color: 'from-blue-400 to-blue-600'
    },
    {
      icon: '💰',
      title: 'Family Budgeting',
      description: 'Track income, split expenses fairly, and visualize your financial goals with beautiful charts.',
      color: 'from-green-400 to-green-600'
    },
    {
      icon: '💊',
      title: 'Medicine Tracking',
      description: 'Never miss a dose. Track medications for children and family members with smart reminders.',
      color: 'from-purple-400 to-purple-600'
    },
    {
      icon: '📝',
      title: 'Family Notes',
      description: 'Share important information, to-dos, and memories in a secure, organized space.',
      color: 'from-orange-400 to-orange-600'
    },
    {
      icon: '👪',
      title: 'Household Management',
      description: 'Invite family members, assign roles, and control what everyone can see and edit.',
      color: 'from-pink-400 to-pink-600'
    },
    {
      icon: '📊',
      title: 'Savings Projections',
      description: 'See how much you could save over time with zero-based budgeting principles.',
      color: 'from-teal-400 to-teal-600'
    }
  ]

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Mother of 3',
      content: 'HouseFlow has transformed how our family stays organized. The shopping lists are a game-changer!',
      avatar: '👩‍👧‍👦'
    },
    {
      name: 'Mike Chen',
      role: 'Father of 2',
      content: 'Finally, a budgeting app that actually works for families. The expense splitting is so intuitive.',
      avatar: '👨‍👧‍👦'
    },
    {
      name: 'Emma Rodriguez',
      role: 'Busy Parent',
      content: 'The medicine tracking feature gives me peace of mind. Never miss a dose again!',
      avatar: '👩‍⚕️'
    }
  ]

  return (
    <>
      <SEO 
        title="Your Family's Cozy Home Hub"
        description="The all-in-one family management app. Shopping lists, budgeting, medicine tracking, and family organization - all in one cozy place. Organize your family life with HouseFlow."
        keywords="family management app, household organization, shopping lists, medicine tracking, family budgeting, home management, family collaboration"
        url="/"
      />

      <div className="min-h-screen bg-cozy-warm relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute w-96 h-96 bg-cozy-primary/5 rounded-full blur-3xl animate-cozy-float"
            style={{
              left: `${mousePosition.x * 0.02}px`,
              top: `${mousePosition.y * 0.02}px`,
            }}
          />
          <div className="absolute top-20 right-20 w-64 h-64 bg-cozy-sage/10 rounded-full blur-2xl animate-cozy-float" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-20 left-20 w-80 h-80 bg-cozy-terracotta/8 rounded-full blur-3xl animate-cozy-float" style={{ animationDelay: '2s' }} />
        </div>

        {/* Navigation */}
        <nav className="sticky top-0 z-50 bg-cozy-surface/80 backdrop-blur-md border-b border-cozy-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-cozy-lg bg-cozy-primary-soft shadow-cozy-sm grid place-items-center text-xl border border-cozy-primary-soft animate-cozy-bounce-in">
                  🏠
                </div>
                <span className="text-xl font-bold text-cozy-text">HouseFlow</span>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href="/login"
                  className="text-cozy-text-muted hover:text-cozy-text transition-all duration-300 hover:scale-105"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="bg-cozy-primary text-cozy-surface px-6 py-2 rounded-cozy font-medium hover:bg-cozy-primary-deep transition-all shadow-cozy-sm hover:shadow-cozy-md hover:scale-105 transform"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <h1 className="text-5xl md:text-7xl font-bold text-cozy-text mb-6 leading-tight">
                  Your Family&apos;s
                  <span className="block text-cozy-primary bg-gradient-to-r from-cozy-primary to-cozy-terracotta bg-clip-text text-transparent animate-cozy-glow">
                    Cozy Home Hub
                  </span>
                </h1>
              </div>
              
              <div className={`transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <p className="text-xl text-cozy-text-muted mb-8 max-w-3xl mx-auto leading-relaxed">
                  The all-in-one app that brings your family together. Manage shopping lists, 
                  track budgets, organize medicines, and coordinate family life - all in one warm, 
                  welcoming place.
                </p>
              </div>
              
              <div className={`flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <Link
                  href="/register"
                  className="bg-cozy-primary text-cozy-surface px-8 py-4 rounded-cozy-lg font-semibold text-lg hover:bg-cozy-primary-deep transition-all shadow-cozy-md hover:shadow-cozy-lg hover:scale-105 transform animate-cozy-bounce-in"
                >
                  Start Your Family Journey
                </Link>
                <Link
                  href="/login"
                  className="border-2 border-cozy-primary text-cozy-primary px-8 py-4 rounded-cozy-lg font-semibold text-lg hover:bg-cozy-primary hover:text-cozy-surface transition-all hover:scale-105 transform"
                >
                  Sign In
                </Link>
              </div>

              {/* Floating feature previews */}
              <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                {[
                  { emoji: '🛒', label: 'Shopping', color: 'from-blue-400 to-blue-600' },
                  { emoji: '💰', label: 'Budgeting', color: 'from-green-400 to-green-600' },
                  { emoji: '💊', label: 'Medicine', color: 'from-purple-400 to-purple-600' },
                  { emoji: '📝', label: 'Notes', color: 'from-orange-400 to-orange-600' }
                ].map((item, index) => (
                  <div 
                    key={item.emoji}
                    className="bg-cozy-surface/60 backdrop-blur-sm rounded-cozy-lg p-4 shadow-cozy-sm hover:shadow-cozy-md transition-all duration-300 hover:scale-105 animate-cozy-float group cursor-pointer"
                    style={{ animationDelay: `${index * 0.5}s` }}
                  >
                    <div className="text-3xl mb-2 group-hover:animate-cozy-bounce">{item.emoji}</div>
                    <div className="text-sm text-cozy-text-muted group-hover:text-cozy-text transition-colors">{item.label}</div>
                    <div className={`h-0.5 bg-gradient-to-r ${item.color} rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 mt-2`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-cozy-surface/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-cozy-text mb-6">
                Everything Your Family Needs
              </h2>
              <p className="text-xl text-cozy-text-muted max-w-3xl mx-auto">
                From shopping lists to medicine tracking, HouseFlow keeps your family organized and connected.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div 
                  key={feature.title}
                  className={`bg-cozy-surface rounded-cozy-lg p-8 shadow-cozy-sm hover:shadow-cozy-lg transition-all duration-500 hover:scale-105 group cursor-pointer relative overflow-hidden ${isVisible ? 'animate-cozy-fade-in' : ''}`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Animated background gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                  
                  <div className="relative z-10">
                    <div className="text-5xl mb-4 group-hover:animate-cozy-bounce group-hover:animate-cozy-twinkle">{feature.icon}</div>
                    <h3 className="text-xl font-semibold text-cozy-text mb-3 group-hover:text-cozy-primary transition-colors duration-300">{feature.title}</h3>
                    <p className="text-cozy-text-muted leading-relaxed group-hover:text-cozy-text transition-colors duration-300">{feature.description}</p>
                    <div className={`mt-4 h-1 bg-gradient-to-r ${feature.color} rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300`} />
                  </div>
                  
                  {/* Floating particles effect */}
                  <div className="absolute top-4 right-4 w-2 h-2 bg-cozy-primary/20 rounded-full animate-cozy-float opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ animationDelay: '0.5s' }} />
                  <div className="absolute bottom-4 left-4 w-1 h-1 bg-cozy-terracotta/30 rounded-full animate-cozy-float opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ animationDelay: '1s' }} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-cozy-text mb-6">
                Loved by Families Everywhere
              </h2>
              <p className="text-xl text-cozy-text-muted">
                See what real families are saying about HouseFlow
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div 
                  key={testimonial.name}
                  className="bg-cozy-surface rounded-cozy-lg p-8 shadow-cozy-sm hover:shadow-cozy-md transition-all duration-300 hover:scale-105 group relative overflow-hidden"
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  {/* Quote decoration */}
                  <div className="absolute top-4 left-4 text-6xl text-cozy-primary/10 font-serif leading-none">"</div>
                  
                  <div className="text-4xl mb-4 group-hover:animate-cozy-bounce">{testimonial.avatar}</div>
                  <p className="text-cozy-text-muted mb-6 italic relative z-10 group-hover:text-cozy-text transition-colors duration-300">"{testimonial.content}"</p>
                  <div className="relative z-10">
                    <div className="font-semibold text-cozy-text group-hover:text-cozy-primary transition-colors duration-300">{testimonial.name}</div>
                    <div className="text-sm text-cozy-text-muted group-hover:text-cozy-text-muted transition-colors duration-300">{testimonial.role}</div>
                  </div>
                  
                  {/* Subtle background pattern */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cozy-primary/10 rounded-full blur-2xl" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-cozy-terracotta/10 rounded-full blur-xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Statistics Section */}
        <section className="py-16 bg-cozy-surface/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { number: '10K+', label: 'Happy Families', icon: '👨‍👩‍👧‍👦' },
                { number: '50K+', label: 'Shopping Lists', icon: '🛒' },
                { number: '1M+', label: 'Items Tracked', icon: '📊' },
                { number: '99%', label: 'Satisfaction', icon: '⭐' }
              ].map((stat, index) => (
                <div 
                  key={stat.label}
                  className="group"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="text-4xl mb-2 group-hover:animate-cozy-bounce">{stat.icon}</div>
                  <div className="text-3xl md:text-4xl font-bold text-cozy-primary mb-2 group-hover:scale-110 transition-transform duration-300">
                    {stat.number}
                  </div>
                  <div className="text-cozy-text-muted group-hover:text-cozy-text transition-colors duration-300">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-cozy-primary/10 to-cozy-terracotta/10 relative overflow-hidden">
          {/* Background decorations */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-10 left-10 w-32 h-32 bg-cozy-primary/5 rounded-full animate-cozy-float" />
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-cozy-terracotta/5 rounded-full animate-cozy-float" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cozy-sage/5 rounded-full animate-cozy-morph" />
          </div>
          
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold text-cozy-text mb-6">
              Ready to Transform Your Family Life?
            </h2>
            <p className="text-xl text-cozy-text-muted mb-8">
              Join thousands of families who have found their perfect home management solution.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/register"
                className="bg-cozy-primary text-cozy-surface px-8 py-4 rounded-cozy-lg font-semibold text-lg hover:bg-cozy-primary-deep transition-all shadow-cozy-md hover:shadow-cozy-lg hover:scale-105 transform animate-cozy-glow group relative overflow-hidden"
              >
                <span className="relative z-10">Start Free Today</span>
                <div className="absolute inset-0 bg-gradient-to-r from-cozy-primary-deep to-cozy-terracotta opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
              <Link
                href="/login"
                className="text-cozy-primary hover:text-cozy-primary-deep transition-colors font-semibold hover:scale-105 transform"
              >
                Already have an account? Sign in
              </Link>
            </div>
            
            {/* Trust indicators */}
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-cozy-text-muted">
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Free to start</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Setup in 2 minutes</span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-cozy-surface border-t border-cozy-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-8 rounded-cozy-lg bg-cozy-primary-soft shadow-cozy-sm grid place-items-center text-lg border border-cozy-primary-soft">
                    🏠
                  </div>
                  <span className="text-lg font-bold text-cozy-text">HouseFlow</span>
                </div>
                <p className="text-cozy-text-muted max-w-md">
                  The all-in-one family management app that brings your household together with love, organization, and simplicity.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-cozy-text mb-4">Features</h3>
                <ul className="space-y-2 text-cozy-text-muted">
                  <li><Link href="/shopping" className="hover:text-cozy-text transition-colors">Shopping Lists</Link></li>
                  <li><Link href="/finances" className="hover:text-cozy-text transition-colors">Budgeting</Link></li>
                  <li><Link href="/medicine" className="hover:text-cozy-text transition-colors">Medicine Tracking</Link></li>
                  <li><Link href="/notes" className="hover:text-cozy-text transition-colors">Family Notes</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-cozy-text mb-4">Support</h3>
                <ul className="space-y-2 text-cozy-text-muted">
                  <li><Link href="/privacy" className="hover:text-cozy-text transition-colors">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="hover:text-cozy-text transition-colors">Terms of Service</Link></li>
                  <li><Link href="/help" className="hover:text-cozy-text transition-colors">Help Center</Link></li>
                  <li><Link href="/contact" className="hover:text-cozy-text transition-colors">Contact Us</Link></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-cozy-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <span className="text-cozy-text-muted">
                © {new Date().getFullYear()} HouseFlow. All rights reserved.
              </span>
              <div className="flex items-center gap-6 text-sm text-cozy-text-muted">
                <span>Made with ❤️ for families</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}