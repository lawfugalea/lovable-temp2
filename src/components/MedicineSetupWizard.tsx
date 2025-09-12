import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { 
  Baby, 
  Pill, 
  Heart, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  User,
  Calendar,
  Clock,
  FileText,
  BarChart3,
  Bell,
  Shield
} from 'lucide-react'

interface Child {
  id: string
  name: string
  dateOfBirth: string
  notes?: string
}

interface Medicine {
  id: string
  name: string
  dosage: string
  frequency: string
  description?: string
  doctorName?: string
  currentQuantity?: number
  unit?: string
  expiryDate?: string
}

interface WizardStep {
  id: string
  title: string
  description: string
  icon: React.ComponentType<any>
  completed: boolean
}

interface MedicineSetupWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (data: { children: Child[], medicines: Medicine[] }) => void
}

export default function MedicineSetupWizard({ isOpen, onClose, onComplete }: MedicineSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [children, setChildren] = useState<Child[]>([])
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [newChild, setNewChild] = useState({ name: '', dateOfBirth: '', notes: '' })
  const [newMedicine, setNewMedicine] = useState({ 
    name: '', 
    dosage: '', 
    frequency: '', 
    description: '', 
    doctorName: '',
    currentQuantity: '',
    unit: '',
    expiryDate: ''
  })

  const steps: WizardStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Medicine Management',
      description: 'Let\'s set up your family\'s medicine tracking system',
      icon: Heart,
      completed: false
    },
    {
      id: 'children',
      title: 'Add Your Children',
      description: 'Add each child who will be taking medicines',
      icon: Baby,
      completed: children.length > 0
    },
    {
      id: 'medicines',
      title: 'Add Medicines',
      description: 'Add the medicines your children are taking',
      icon: Pill,
      completed: medicines.length > 0
    },
    {
      id: 'features',
      title: 'Explore Features',
      description: 'Learn about all the powerful features available',
      icon: BarChart3,
      completed: false
    },
    {
      id: 'complete',
      title: 'Setup Complete',
      description: 'You\'re all set to manage your family\'s medicines',
      icon: CheckCircle,
      completed: false
    }
  ]

  const addChild = () => {
    if (newChild.name && newChild.dateOfBirth) {
      const child: Child = {
        id: Date.now().toString(),
        name: newChild.name,
        dateOfBirth: newChild.dateOfBirth,
        notes: newChild.notes
      }
      setChildren([...children, child])
      setNewChild({ name: '', dateOfBirth: '', notes: '' })
    }
  }

  const addMedicine = () => {
    if (newMedicine.name && newMedicine.dosage && newMedicine.frequency) {
      const medicine: Medicine = {
        id: Date.now().toString(),
        name: newMedicine.name,
        dosage: newMedicine.dosage,
        frequency: newMedicine.frequency,
        description: newMedicine.description,
        doctorName: newMedicine.doctorName,
        currentQuantity: newMedicine.currentQuantity ? parseInt(newMedicine.currentQuantity) : undefined,
        unit: newMedicine.unit,
        expiryDate: newMedicine.expiryDate
      }
      setMedicines([...medicines, medicine])
      setNewMedicine({ 
        name: '', 
        dosage: '', 
        frequency: '', 
        description: '', 
        doctorName: '',
        currentQuantity: '',
        unit: '',
        expiryDate: ''
      })
    }
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const completeSetup = () => {
    onComplete({ children, medicines })
    onClose()
  }

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-cozy-primary rounded-full flex items-center justify-center mx-auto">
              <Heart className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-cozy-text mb-2">Welcome to HouseFlow Medicine</h2>
              <p className="text-cozy-text-muted">
                We'll help you set up a comprehensive medicine management system for your family.
                This wizard will guide you through adding your children and their medicines.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Baby className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-medium text-blue-800">Child Management</h3>
                <p className="text-sm text-blue-700">Track medicines for each child individually</p>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <Pill className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-medium text-green-800">Smart Tracking</h3>
                <p className="text-sm text-green-700">Automatic reminders and dose tracking</p>
              </div>
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <BarChart3 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-medium text-purple-800">Analytics</h3>
                <p className="text-sm text-purple-700">Monitor compliance and effectiveness</p>
              </div>
            </div>
          </div>
        )

      case 'children':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Baby className="w-12 h-12 text-cozy-primary mx-auto mb-3" />
              <h2 className="text-xl font-bold text-cozy-text mb-2">Add Your Children</h2>
              <p className="text-cozy-text-muted">
                Add each child who will be taking medicines. You can add more later.
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-cozy-text mb-3">Add New Child</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="Child's name"
                  value={newChild.name}
                  onChange={(e) => setNewChild({ ...newChild, name: e.target.value })}
                />
                <Input
                  type="date"
                  placeholder="Date of birth"
                  value={newChild.dateOfBirth}
                  onChange={(e) => setNewChild({ ...newChild, dateOfBirth: e.target.value })}
                />
                <Input
                  placeholder="Notes (optional)"
                  value={newChild.notes}
                  onChange={(e) => setNewChild({ ...newChild, notes: e.target.value })}
                  className="md:col-span-2"
                />
              </div>
              <Button onClick={addChild} className="mt-3" disabled={!newChild.name || !newChild.dateOfBirth}>
                Add Child
              </Button>
            </div>

            {children.length > 0 && (
              <div>
                <h3 className="font-medium text-cozy-text mb-3">Added Children</h3>
                <div className="space-y-2">
                  {children.map(child => (
                    <div key={child.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-cozy-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {child.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-cozy-text">{child.name}</p>
                          <p className="text-sm text-cozy-text-muted">
                            Born: {new Date(child.dateOfBirth).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-green-500 text-white">Added</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      case 'medicines':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Pill className="w-12 h-12 text-cozy-primary mx-auto mb-3" />
              <h2 className="text-xl font-bold text-cozy-text mb-2">Add Medicines</h2>
              <p className="text-cozy-text-muted">
                Add the medicines your children are currently taking or will be taking.
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-cozy-text mb-3">Add New Medicine</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="Medicine name (e.g., Paracetamol)"
                  value={newMedicine.name}
                  onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })}
                />
                <Input
                  placeholder="Dosage (e.g., 5ml, 1 tablet)"
                  value={newMedicine.dosage}
                  onChange={(e) => setNewMedicine({ ...newMedicine, dosage: e.target.value })}
                />
                <select
                  className="p-2 border border-gray-300 rounded-md"
                  value={newMedicine.frequency}
                  onChange={(e) => setNewMedicine({ ...newMedicine, frequency: e.target.value })}
                >
                  <option value="">Select frequency</option>
                  <option value="every 2 hours">Every 2 hours</option>
                  <option value="every 4 hours">Every 4 hours</option>
                  <option value="every 6 hours">Every 6 hours</option>
                  <option value="every 8 hours">Every 8 hours</option>
                  <option value="every 12 hours">Every 12 hours</option>
                  <option value="twice daily">Twice daily</option>
                  <option value="once daily">Once daily</option>
                  <option value="as needed">As needed</option>
                </select>
                <Input
                  placeholder="Doctor name (optional)"
                  value={newMedicine.doctorName}
                  onChange={(e) => setNewMedicine({ ...newMedicine, doctorName: e.target.value })}
                />
                <Input
                  placeholder="Description (optional)"
                  value={newMedicine.description}
                  onChange={(e) => setNewMedicine({ ...newMedicine, description: e.target.value })}
                  className="md:col-span-2"
                />
                <Input
                  type="number"
                  placeholder="Current quantity (optional)"
                  value={newMedicine.currentQuantity}
                  onChange={(e) => setNewMedicine({ ...newMedicine, currentQuantity: e.target.value })}
                />
                <Input
                  placeholder="Unit (e.g., ml, tablets)"
                  value={newMedicine.unit}
                  onChange={(e) => setNewMedicine({ ...newMedicine, unit: e.target.value })}
                />
                <Input
                  type="date"
                  placeholder="Expiry date (optional)"
                  value={newMedicine.expiryDate}
                  onChange={(e) => setNewMedicine({ ...newMedicine, expiryDate: e.target.value })}
                  className="md:col-span-2"
                />
              </div>
              <Button onClick={addMedicine} className="mt-3" disabled={!newMedicine.name || !newMedicine.dosage || !newMedicine.frequency}>
                Add Medicine
              </Button>
            </div>

            {medicines.length > 0 && (
              <div>
                <h3 className="font-medium text-cozy-text mb-3">Added Medicines</h3>
                <div className="space-y-2">
                  {medicines.map(medicine => (
                    <div key={medicine.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div>
                        <p className="font-medium text-cozy-text">{medicine.name}</p>
                        <p className="text-sm text-cozy-text-muted">
                          {medicine.dosage} • {medicine.frequency}
                        </p>
                        {medicine.doctorName && (
                          <p className="text-xs text-cozy-text-muted">
                            Prescribed by: {medicine.doctorName}
                          </p>
                        )}
                      </div>
                      <Badge className="bg-blue-500 text-white">Added</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      case 'features':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-cozy-primary mx-auto mb-3" />
              <h2 className="text-xl font-bold text-cozy-text mb-2">Explore Features</h2>
              <p className="text-cozy-text-muted">
                Here are all the powerful features available in your medicine management system.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Bell className="w-6 h-6 text-orange-600" />
                  <h3 className="font-medium text-cozy-text">Smart Reminders</h3>
                </div>
                <p className="text-sm text-cozy-text-muted">
                  Get push notifications when medicines are due. Never miss a dose again.
                </p>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="w-6 h-6 text-red-600" />
                  <h3 className="font-medium text-cozy-text">Inventory Tracking</h3>
                </div>
                <p className="text-sm text-cozy-text-muted">
                  Track medicine quantities and get alerts when running low or expiring.
                </p>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                  <h3 className="font-medium text-cozy-text">Side Effects Tracking</h3>
                </div>
                <p className="text-sm text-cozy-text-muted">
                  Record and monitor any side effects or reactions to medicines.
                </p>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                  <h3 className="font-medium text-cozy-text">Analytics & Reports</h3>
                </div>
                <p className="text-sm text-cozy-text-muted">
                  Monitor compliance rates and generate reports for healthcare providers.
                </p>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Heart className="w-6 h-6 text-pink-600" />
                  <h3 className="font-medium text-cozy-text">Health Tracking</h3>
                </div>
                <p className="text-sm text-cozy-text-muted">
                  Track fever readings and other health metrics alongside medicines.
                </p>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <User className="w-6 h-6 text-green-600" />
                  <h3 className="font-medium text-cozy-text">Emergency Info</h3>
                </div>
                <p className="text-sm text-cozy-text-muted">
                  Quick access to all medicine information and allergies in emergencies.
                </p>
              </div>
            </div>
          </div>
        )

      case 'complete':
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-cozy-text mb-2">Setup Complete!</h2>
              <p className="text-cozy-text-muted">
                You've successfully set up your medicine management system. 
                You can always add more children and medicines later.
              </p>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-800 mb-2">What's Next?</h3>
              <ul className="text-sm text-green-700 space-y-1 text-left">
                <li>• Start recording medicine doses</li>
                <li>• Set up inventory tracking for your medicines</li>
                <li>• Enable push notifications for reminders</li>
                <li>• Explore the analytics dashboard</li>
                <li>• Add emergency contact information</li>
              </ul>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-cozy-primary" />
              Medicine Setup Wizard
            </CardTitle>
            <Button onClick={onClose} variant="outline" size="sm">
              ×
            </Button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index <= currentStep 
                      ? 'bg-cozy-primary text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step.completed ? <CheckCircle className="w-4 h-4" /> : index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-1 mx-2 ${
                      index < currentStep ? 'bg-cozy-primary' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="text-center">
              <p className="text-sm text-cozy-text-muted">
                Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {renderStepContent()}
          
          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button 
              onClick={prevStep} 
              variant="outline" 
              disabled={currentStep === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            {currentStep === steps.length - 1 ? (
              <Button onClick={completeSetup} className="bg-green-500 hover:bg-green-600">
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete Setup
              </Button>
            ) : (
              <Button onClick={nextStep}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
