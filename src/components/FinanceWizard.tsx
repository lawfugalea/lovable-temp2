import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { 
  Users, 
  CreditCard, 
  Target, 
  TrendingUp, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle,
  DollarSign,
  PiggyBank,
  Calculator,
  Lightbulb,
  X
} from 'lucide-react'

interface FinanceWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

interface WizardStep {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  content: React.ReactNode
}

export default function FinanceWizard({ isOpen, onClose, onComplete }: FinanceWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const steps: WizardStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Financial Planning',
      description: 'Let\'s set up your household budget in 4 simple steps',
      icon: Lightbulb,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-cozy-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="w-8 h-8 text-cozy-primary" />
            </div>
            <h3 className="text-lg font-semibold text-cozy-text mb-2">Smart Financial Planning</h3>
            <p className="text-sm text-cozy-text-muted">
              Our system helps you organize your household finances with a simple, mobile-first approach
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-cozy-cream rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Mobile-First Design</span>
              </div>
              <p className="text-xs text-cozy-text-muted">Optimized for phones and tablets</p>
            </div>
            <div className="p-4 bg-cozy-cream rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Real-Time Calculations</span>
              </div>
              <p className="text-xs text-cozy-text-muted">Instant budget updates and projections</p>
            </div>
            <div className="p-4 bg-cozy-cream rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Family-Friendly</span>
              </div>
              <p className="text-xs text-cozy-text-muted">Designed for shared household management</p>
            </div>
            <div className="p-4 bg-cozy-cream rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Goal Tracking</span>
              </div>
              <p className="text-xs text-cozy-text-muted">Set and monitor financial objectives</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'income',
      title: 'Step 1: Income Earners',
      description: 'Define who contributes to your household income',
      icon: Users,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-cozy-text mb-2">Income Earners</h3>
            <p className="text-sm text-cozy-text-muted">
              Add everyone who contributes to your household income
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">1</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-1">Name & Salary</h4>
                  <p className="text-xs text-blue-700">
                    Enter each person's name and their monthly salary or income
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">2</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-green-900 mb-1">Personal Keep</h4>
                  <p className="text-xs text-green-700">
                    Set aside money for personal expenses (clothes, hobbies, etc.)
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border border-purple-200 bg-purple-50 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">3</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-purple-900 mb-1">Available for Household</h4>
                  <p className="text-xs text-purple-700">
                    The remaining amount goes to shared household expenses
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-cozy-cream p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-4 h-4 text-cozy-primary" />
              <span className="text-sm font-medium text-cozy-text">Example Calculation</span>
            </div>
            <div className="text-xs text-cozy-text-muted space-y-1">
              <div>Salary: €3,000</div>
              <div>Personal Keep: €500</div>
              <div className="font-medium text-cozy-primary">Available for Household: €2,500</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'accounts',
      title: 'Step 2: Bank Accounts',
      description: 'Organize your accounts and track known expenses',
      icon: CreditCard,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-cozy-text mb-2">Bank Accounts</h3>
            <p className="text-sm text-cozy-text-muted">
              Set up your accounts and track recurring expenses
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">1</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-green-900 mb-1">Account Types</h4>
                  <p className="text-xs text-green-700">
                    Checking, Savings, Credit, or Investment accounts
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">2</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-1">Target Amounts</h4>
                  <p className="text-xs text-blue-700">
                    Set how much you want to allocate to each account monthly
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">3</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-orange-900 mb-1">Known Expenses</h4>
                  <p className="text-xs text-orange-700">
                    Track recurring bills like rent, utilities, insurance
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-cozy-cream p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-cozy-primary" />
              <span className="text-sm font-medium text-cozy-text">Smart Suggestions</span>
            </div>
            <p className="text-xs text-cozy-text-muted">
              We'll suggest common expense categories and amounts based on your income level
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'goals',
      title: 'Step 3: Financial Goals',
      description: 'Set and track your savings objectives',
      icon: Target,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-cozy-text mb-2">Financial Goals</h3>
            <p className="text-sm text-cozy-text-muted">
              Define what you're saving for and track your progress
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 border border-purple-200 bg-purple-50 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">1</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-purple-900 mb-1">Goal Types</h4>
                  <p className="text-xs text-purple-700">
                    Emergency fund, vacation, house down payment, retirement
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">2</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-1">Target Amount</h4>
                  <p className="text-xs text-blue-700">
                    Set how much you want to save for each goal
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">3</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-green-900 mb-1">Timeline</h4>
                  <p className="text-xs text-green-700">
                    Choose when you want to reach your goal
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-cozy-cream p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-cozy-primary" />
              <span className="text-sm font-medium text-cozy-text">Progress Tracking</span>
            </div>
            <p className="text-xs text-cozy-text-muted">
              We'll show you exactly how much to save each month and track your progress
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'reports',
      title: 'Step 4: Reports & Insights',
      description: 'Monitor your financial health with detailed reports',
      icon: TrendingUp,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-cozy-text mb-2">Reports & Insights</h3>
            <p className="text-sm text-cozy-text-muted">
              Get detailed insights into your financial situation
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">1</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-orange-900 mb-1">Budget Overview</h4>
                  <p className="text-xs text-orange-700">
                    See how your income is allocated across all categories
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">2</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-1">Savings Projections</h4>
                  <p className="text-xs text-blue-700">
                    Visualize your savings growth over time
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">3</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-green-900 mb-1">Goal Progress</h4>
                  <p className="text-xs text-green-700">
                    Track how close you are to reaching your financial goals
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-cozy-cream p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank className="w-4 h-4 text-cozy-primary" />
              <span className="text-sm font-medium text-cozy-text">Smart Recommendations</span>
            </div>
            <p className="text-xs text-cozy-text-muted">
              Get personalized tips to optimize your budget and reach your goals faster
            </p>
          </div>
        </div>
      )
    }
  ]

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (!isOpen) return null

  const currentStepData = steps[currentStep]
  const Icon = currentStepData.icon

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-cozy-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-cozy-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cozy-primary/10 rounded-full flex items-center justify-center">
              <Icon className="w-5 h-5 text-cozy-primary" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-cozy-text">
                {currentStepData.title}
              </h2>
              <p className="text-xs sm:text-sm text-cozy-text-muted">
                {currentStepData.description}
              </p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className="p-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 sm:px-6 py-3 bg-cozy-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-cozy-text-muted">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-xs text-cozy-text-muted">
              {Math.round(((currentStep + 1) / steps.length) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-cozy-gray-200 rounded-full h-2">
            <div 
              className="bg-cozy-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh]">
          {currentStepData.content}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-t border-cozy-gray-200 bg-cozy-gray-50">
          <Button
            onClick={prevStep}
            variant="outline"
            disabled={currentStep === 0}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          <div className="flex items-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep 
                    ? 'bg-cozy-primary' 
                    : index < currentStep 
                      ? 'bg-green-500' 
                      : 'bg-cozy-gray-300'
                }`}
              />
            ))}
          </div>

          <Button
            onClick={nextStep}
            className="flex items-center gap-2"
          >
            <span className="hidden sm:inline">
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            </span>
            <span className="sm:hidden">
              {currentStep === steps.length - 1 ? 'Start' : 'Next'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
