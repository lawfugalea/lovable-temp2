import React, { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { 
  ShoppingCart, 
  DollarSign, 
  Pill, 
  FileText, 
  Users, 
  ArrowRight, 
  CheckCircle, 
  Star,
  Heart,
  Home,
  TrendingUp,
  Calendar,
  Bell,
  Shield,
  Smartphone,
  Globe
} from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')

  const features = [
    {
      icon: ShoppingCart,
      title: "Smart Shopping Lists",
      description: "Create shared shopping lists that sync in real-time. Get smart suggestions, organize by categories, and never forget an item again.",
      emoji: "🧺",
      color: "bg-cozy-sage-soft",
      iconColor: "text-cozy-sage"
    },
    {
      icon: DollarSign,
      title: "Family Budgeting",
      description: "Track income, manage expenses, and plan savings together. Set spending limits and get alerts when approaching budgets.",
      emoji: "💰",
      color: "bg-cozy-primary-soft",
      iconColor: "text-cozy-primary"
    },
    {
      icon: Pill,
      title: "Medicine Tracking",
      description: "Never miss a dose with smart medicine schedules. Track children's medications, set reminders, and maintain health records.",
      emoji: "💊",
      color: "bg-cozy-terracotta/20",
      iconColor: "text-cozy-terracotta"
    },
    {
      icon: FileText,
      title: "Shared Notes",
      description: "Collaborate on notes with your family. Color-code, pin important items, and share information seamlessly.",
      emoji: "📝",
      color: "bg-cozy-cream",
      iconColor: "text-cozy-text"
    },
    {
      icon: Users,
      title: "Household Management",
      description: "Invite family members, assign roles, and control what everyone can see. Keep your home organized and connected.",
      emoji: "👪",
      color: "bg-cozy-sand",
      iconColor: "text-cozy-text-muted"
    },
    {
      icon: Shield,
      title: "Privacy & Security",
      description: "Your family's data is protected with enterprise-grade security. Control who sees what with granular permissions.",
      emoji: "🔒",
      color: "bg-cozy-gray-100",
      iconColor: "text-cozy-gray-400"
    }
  ]

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Mother of 3",
      content: "HouseFlow has transformed how our family stays organized. The shopping lists are a lifesaver!",
      rating: 5
    },
    {
      name: "Mike Chen",
      role: "Father of 2",
      content: "Finally, a budgeting app that actually works for families. We've saved 20% more this year!",
      rating: 5
    },
    {
      name: "Emily Rodriguez",
      role: "Busy Parent",
      content: "The medicine tracking feature is incredible. Never missed a dose since we started using it.",
      rating: 5
    }
  ]

  const handleGetStarted = () => {
    router.push('/register')
  }

  const handleLogin = () => {
    router.push('/login')
  }

  return (
    <>
      <Head>
        <title>HouseFlow - Your Family&apos;s Cozy Home Hub</title>
        <meta name="description" content="The all-in-one family management app. Shopping lists, budgeting, medicine tracking, and shared notes - all in one cozy place." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-cozy-warm">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 bg-cozy-surface/80 backdrop-blur-md border-b border-cozy-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-cozy-lg bg-cozy-primary-soft shadow-cozy-sm grid place-items-center text-xl border border-cozy-primary-soft">
                  🏠
                </div>
                <span className="text-xl font-bold text-cozy-text">HouseFlow</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleLogin}
                  className="text-cozy-text-muted hover:text-cozy-text transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={handleGetStarted}
                  className="bg-cozy-primary text-cozy-surface px-6 py-2 rounded-cozy font-medium hover:bg-cozy-primary-deep transition-all shadow-cozy-sm hover:shadow-cozy-md"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-cozy-primary-soft text-cozy-primary px-4 py-2 rounded-full text-sm font-medium mb-8 animate-cozy-bounce-in">
                <Heart className="w-4 h-4" />
                <span>Ready to get started?</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold text-cozy-text mb-6 leading-tight">
                Your Family&apos;s
                <span className="block text-cozy-primary animate-cozy-pulse-gentle">Cozy Home Hub</span>
              </h1>
              
              <p className="text-xl text-cozy-text-muted mb-8 max-w-3xl mx-auto leading-relaxed">
                The all-in-one app that brings your family together. Manage shopping lists, 
                track budgets, organize medicines, and share notes - all in one warm, 
                welcoming place.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                <button
                  onClick={handleGetStarted}
                  className="bg-cozy-primary text-cozy-surface px-8 py-4 rounded-cozy-lg font-semibold text-lg hover:bg-cozy-primary-deep transition-all shadow-cozy-md hover:shadow-cozy-lg flex items-center gap-2 group"
                >
                  Start Your Family Journey
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={handleLogin}
                  className="border-2 border-cozy-primary text-cozy-primary px-8 py-4 rounded-cozy-lg font-semibold text-lg hover:bg-cozy-primary hover:text-cozy-surface transition-all"
                >
                  Sign In
                </button>
              </div>

              {/* Hero Image/Preview */}
              <div className="relative max-w-4xl mx-auto">
                <div className="bg-cozy-surface rounded-cozy-xl shadow-cozy-lg p-8 border border-cozy-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-cozy-sage-soft rounded-cozy p-4 text-center">
                      <div className="text-3xl mb-2">🧺</div>
                      <h3 className="font-semibold text-cozy-text">Shopping</h3>
                      <p className="text-sm text-cozy-text-muted">4 items</p>
                    </div>
                    <div className="bg-cozy-primary-soft rounded-cozy p-4 text-center">
                      <div className="text-3xl mb-2">💰</div>
                      <h3 className="font-semibold text-cozy-text">Budget</h3>
                      <p className="text-sm text-cozy-text-muted">$2,450 saved</p>
                    </div>
                    <div className="bg-cozy-terracotta/20 rounded-cozy p-4 text-center">
                      <div className="text-3xl mb-2">💊</div>
                      <h3 className="font-semibold text-cozy-text">Medicine</h3>
                      <p className="text-sm text-cozy-text-muted">2 doses today</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Elements */}
          <div className="absolute top-20 left-10 text-2xl animate-cozy-float opacity-20 pointer-events-none">
            🌸
          </div>
          <div className="absolute top-40 right-20 text-xl animate-cozy-pulse-gentle opacity-30 pointer-events-none">
            ✨
          </div>
          <div className="absolute bottom-20 left-20 text-lg animate-cozy-wiggle opacity-25 pointer-events-none">
            🫖
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-cozy-surface">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-cozy-text mb-4">
                Everything Your Family Needs
              </h2>
              <p className="text-xl text-cozy-text-muted max-w-2xl mx-auto">
                Six powerful features designed to make family life simpler, 
                more organized, and more connected.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-cozy-surface rounded-cozy-xl p-8 border border-cozy-gray-200 shadow-cozy-sm hover:shadow-cozy-md transition-all hover:-translate-y-1 group"
                >
                  <div className={`w-16 h-16 ${feature.color} rounded-cozy-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <feature.icon className={`w-8 h-8 ${feature.iconColor}`} />
                  </div>
                  <div className="text-3xl mb-4">{feature.emoji}</div>
                  <h3 className="text-xl font-semibold text-cozy-text mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-cozy-text-muted leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 bg-cozy-warm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-cozy-text mb-4">
                Get Started in Minutes
              </h2>
              <p className="text-xl text-cozy-text-muted">
                Setting up your family&apos;s cozy home hub is simple and quick.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-cozy-primary rounded-cozy-lg flex items-center justify-center text-cozy-surface text-2xl font-bold mx-auto mb-6">
                  1
                </div>
                <h3 className="text-xl font-semibold text-cozy-text mb-3">
                  Create Your Household
                </h3>
                <p className="text-cozy-text-muted">
                  Sign up and create your family&apos;s private household space.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-cozy-sage rounded-cozy-lg flex items-center justify-center text-cozy-surface text-2xl font-bold mx-auto mb-6">
                  2
                </div>
                <h3 className="text-xl font-semibold text-cozy-text mb-3">
                  Invite Family Members
                </h3>
                <p className="text-cozy-text-muted">
                  Send invites to your partner, children, or other family members.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-cozy-terracotta rounded-cozy-lg flex items-center justify-center text-cozy-surface text-2xl font-bold mx-auto mb-6">
                  3
                </div>
                <h3 className="text-xl font-semibold text-cozy-text mb-3">
                  Start Organizing
                </h3>
                <p className="text-cozy-text-muted">
                  Begin creating lists, setting budgets, and sharing information.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 bg-cozy-surface">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-cozy-text mb-4">
                Loved by Families Everywhere
              </h2>
              <p className="text-xl text-cozy-text-muted">
                See what real families are saying about HouseFlow.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="bg-cozy-warm rounded-cozy-xl p-8 border border-cozy-gray-200 shadow-cozy-sm"
                >
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-cozy-primary text-cozy-primary" />
                    ))}
                  </div>
                  <p className="text-cozy-text-muted mb-6 italic">
                    &ldquo;{testimonial.content}&rdquo;
                  </p>
                  <div>
                    <p className="font-semibold text-cozy-text">{testimonial.name}</p>
                    <p className="text-sm text-cozy-text-muted">{testimonial.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-cozy-primary">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-cozy-surface mb-6">
              Ready to Transform Your Family Life?
            </h2>
            <p className="text-xl text-cozy-surface/90 mb-8">
              Join th
              ose families who have found their perfect home management solution.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleGetStarted}
                className="bg-cozy-surface text-cozy-primary px-8 py-4 rounded-cozy-lg font-semibold text-lg hover:bg-cozy-gray-100 transition-all shadow-cozy-md hover:shadow-cozy-lg flex items-center gap-2 justify-center group"
              >
                Start Free Today
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={handleLogin}
                className="border-2 border-cozy-surface text-cozy-surface px-8 py-4 rounded-cozy-lg font-semibold text-lg hover:bg-cozy-surface hover:text-cozy-primary transition-all"
              >
                Sign In
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-cozy-text text-cozy-surface py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-cozy-lg bg-cozy-primary-soft shadow-cozy-sm grid place-items-center text-xl border border-cozy-primary-soft">
                    🏠
                  </div>
                  <span className="text-xl font-bold">HouseFlow</span>
                </div>
                <p className="text-cozy-surface/80 mb-4 max-w-md">
                  The cozy home hub that brings families together. 
                  Organize, collaborate, and thrive as a family.
                </p>
                <div className="flex items-center gap-2 text-sm text-cozy-surface/60">
                  <Heart className="w-4 h-4" />
                  <span>Made with love for families everywhere</span>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4">Product</h3>
                <ul className="space-y-2 text-sm text-cozy-surface/80">
                  <li><a href="#" className="hover:text-cozy-surface transition-colors">Features</a></li>
                  <li><a href="#" className="hover:text-cozy-surface transition-colors">Pricing</a></li>
                  <li><a href="#" className="hover:text-cozy-surface transition-colors">Security</a></li>
                  <li><a href="#" className="hover:text-cozy-surface transition-colors">Updates</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4">Support</h3>
                <ul className="space-y-2 text-sm text-cozy-surface/80">
                  <li><a href="#" className="hover:text-cozy-surface transition-colors">Help Center</a></li>
                  <li><a href="#" className="hover:text-cozy-surface transition-colors">Contact Us</a></li>
                  <li><a href="#" className="hover:text-cozy-surface transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-cozy-surface transition-colors">Terms of Service</a></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-cozy-surface/20 mt-8 pt-8 text-center text-sm text-cozy-surface/60">
              <p>&copy; 2024 HouseFlow. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
