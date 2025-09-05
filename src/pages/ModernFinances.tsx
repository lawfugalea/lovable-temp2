import React, { useState } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard,
  PiggyBank,
  Target,
  Plus,
  Filter,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'

interface Transaction {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
  date: Date
  emoji: string
}

interface Budget {
  category: string
  allocated: number
  spent: number
  emoji: string
  color: string
}

const mockTransactions: Transaction[] = [
  {
    id: '1',
    description: 'Grocery Shopping',
    amount: -85.50,
    type: 'expense',
    category: 'Food',
    date: new Date('2024-01-15'),
    emoji: '🛒'
  },
  {
    id: '2',
    description: 'Salary',
    amount: 3200.00,
    type: 'income',
    category: 'Income',
    date: new Date('2024-01-14'),
    emoji: '💰'
  },
  {
    id: '3',
    description: 'Electric Bill',
    amount: -120.00,
    type: 'expense',
    category: 'Utilities',
    date: new Date('2024-01-13'),
    emoji: '⚡'
  },
  {
    id: '4',
    description: 'Coffee Shop',
    amount: -12.50,
    type: 'expense',
    category: 'Food',
    date: new Date('2024-01-12'),
    emoji: '☕'
  },
  {
    id: '5',
    description: 'Freelance Work',
    amount: 450.00,
    type: 'income',
    category: 'Income',
    date: new Date('2024-01-11'),
    emoji: '💼'
  }
]

const mockBudgets: Budget[] = [
  { category: 'Food', allocated: 500, spent: 320, emoji: '🍽️', color: 'bg-cozy-sage-soft' },
  { category: 'Utilities', allocated: 200, spent: 180, emoji: '🏠', color: 'bg-cozy-primary-soft' },
  { category: 'Entertainment', allocated: 150, spent: 95, emoji: '🎬', color: 'bg-cozy-terracotta-soft' },
  { category: 'Transportation', allocated: 300, spent: 250, emoji: '🚗', color: 'bg-cozy-cream' },
  { category: 'Savings', allocated: 800, spent: 800, emoji: '💰', color: 'bg-green-100' }
]

export default function ModernFinances() {
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [showAddTransaction, setShowAddTransaction] = useState(false)

  const totalIncome = mockTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = mockTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const netIncome = totalIncome - totalExpenses

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-cozy-text">Finances</h1>
          <p className="text-cozy-text-muted">Track your income, expenses, and budgets</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button onClick={() => setShowAddTransaction(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {['week', 'month', 'year'].map((period) => (
          <Button
            key={period}
            variant={selectedPeriod === period ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod(period)}
            className="capitalize"
          >
            {period}
          </Button>
        ))}
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-cozy-text-muted">
              Total Income
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalIncome)}
            </div>
            <p className="text-xs text-green-600 flex items-center">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-cozy-text-muted">
              Total Expenses
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalExpenses)}
            </div>
            <p className="text-xs text-red-600 flex items-center">
              <ArrowDownRight className="w-3 h-3 mr-1" />
              +5% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cozy-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-cozy-text-muted">
              Net Income
            </CardTitle>
            <DollarSign className="h-4 w-4 text-cozy-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(netIncome)}
            </div>
            <p className="text-xs text-cozy-text-muted">
              {netIncome >= 0 ? 'Positive cash flow' : 'Negative cash flow'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Recent Transactions
            </CardTitle>
            <CardDescription>
              Your latest financial activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockTransactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg bg-cozy-cream hover:bg-cozy-sage-soft transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{transaction.emoji}</div>
                    <div>
                      <p className="font-medium text-cozy-text">{transaction.description}</p>
                      <p className="text-sm text-cozy-text-muted">{transaction.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                    </p>
                    <p className="text-xs text-cozy-text-muted">
                      {transaction.date.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              View All Transactions
            </Button>
          </CardContent>
        </Card>

        {/* Budget Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Budget Overview
            </CardTitle>
            <CardDescription>
              Track your spending against budgets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockBudgets.map((budget) => {
                const percentage = (budget.spent / budget.allocated) * 100
                const isOverBudget = percentage > 100
                
                return (
                  <div key={budget.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{budget.emoji}</span>
                        <span className="font-medium text-cozy-text">{budget.category}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-cozy-text">
                          {formatCurrency(budget.spent)} / {formatCurrency(budget.allocated)}
                        </p>
                        <Badge variant={isOverBudget ? 'destructive' : percentage > 80 ? 'secondary' : 'default'}>
                          {percentage.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-cozy-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isOverBudget ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-cozy-sage'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <Button variant="outline" className="w-full mt-4">
              <PiggyBank className="w-4 h-4 mr-2" />
              Manage Budgets
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common financial tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Plus className="w-6 h-6" />
              <span className="text-sm">Add Income</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <TrendingDown className="w-6 h-6" />
              <span className="text-sm">Add Expense</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Target className="w-6 h-6" />
              <span className="text-sm">Set Budget</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Calendar className="w-6 h-6" />
              <span className="text-sm">View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
