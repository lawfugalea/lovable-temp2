import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { Home, Users, Heart, User, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

interface NameSuggestion {
  name: string;
  type: string;
  description: string;
}

interface HouseholdCreationWizardProps {
  onComplete: (householdId: string) => void;
  onCancel: () => void;
}

export default function HouseholdCreationWizard({ onComplete, onCancel }: HouseholdCreationWizardProps) {
  const [step, setStep] = useState(1);
  const [householdName, setHouseholdName] = useState('');
  const [householdType, setHouseholdType] = useState('personal');
  const [customName, setCustomName] = useState('');
  const [suggestions, setSuggestions] = useState<NameSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load name suggestions on mount
  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      const response = await fetch('/api/household/name-suggestions');
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions);
        setHouseholdType(data.defaultType);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const handleSuggestionSelect = (suggestion: NameSuggestion) => {
    setHouseholdName(suggestion.name);
    setHouseholdType(suggestion.type);
    setCustomName('');
  };

  const handleCustomNameChange = (value: string) => {
    setCustomName(value);
    setHouseholdName(value);
  };

  const handleNext = () => {
    if (step === 1) {
      if (!householdName.trim()) {
        setError('Please select or enter a household name');
        return;
      }
      setError('');
      setStep(2);
    }
  };

  const handleCreate = async () => {
    if (!householdName.trim()) {
      setError('Please enter a household name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/household/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: householdName,
          type: householdType,
          description: customName ? 'Custom name' : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create household');
      }

      const data = await response.json();
      onComplete(data.householdId);
    } catch (error: any) {
      setError(error.message || 'Failed to create household');
    } finally {
      setLoading(false);
    }
  };

  const householdTypes = [
    { id: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦', description: 'Perfect for families with children' },
    { id: 'couple', label: 'Couple', icon: '💕', description: 'Great for couples and partners' },
    { id: 'roommates', label: 'Roommates', icon: '🏠', description: 'Ideal for shared living' },
    { id: 'personal', label: 'Personal', icon: '🏡', description: 'Your personal household' },
    { id: 'other', label: 'Other', icon: '✨', description: 'Something else' }
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step >= 1 ? 'bg-cozy-primary text-white' : 'bg-cozy-gray-200 text-cozy-text-muted'
        }`}>
          1
        </div>
        <div className={`w-16 h-1 ${step >= 2 ? 'bg-cozy-primary' : 'bg-cozy-gray-200'}`}></div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step >= 2 ? 'bg-cozy-primary text-white' : 'bg-cozy-gray-200 text-cozy-text-muted'
        }`}>
          2
        </div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5" />
              Choose Your Household Name
            </CardTitle>
            <CardDescription>
              Pick a name that represents your household. You can always change this later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Suggested names */}
            <div>
              <h3 className="text-sm font-medium text-cozy-text mb-3">Suggested Names</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {suggestions.slice(0, 6).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className={`p-3 text-left border rounded-lg transition-all hover:border-cozy-primary hover:bg-cozy-primary/5 ${
                      householdName === suggestion.name 
                        ? 'border-cozy-primary bg-cozy-primary/10' 
                        : 'border-cozy-gray-200'
                    }`}
                  >
                    <div className="font-medium text-cozy-text">{suggestion.name}</div>
                    <div className="text-xs text-cozy-text-muted mt-1">{suggestion.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom name input */}
            <div>
              <h3 className="text-sm font-medium text-cozy-text mb-3">Or create your own</h3>
              <Input
                type="text"
                placeholder="Enter a custom household name"
                value={customName}
                onChange={(e) => handleCustomNameChange(e.target.value)}
                className="w-full"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleNext} disabled={!householdName.trim()}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Confirm Your Household
            </CardTitle>
            <CardDescription>
              Review your household details before creating it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Household summary */}
            <div className="bg-cozy-primary/5 border border-cozy-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-cozy-primary rounded-lg flex items-center justify-center text-white text-xl">
                  🏡
                </div>
                <div>
                  <div className="font-semibold text-cozy-text text-lg">{householdName}</div>
                  <div className="text-sm text-cozy-text-muted">
                    {householdTypes.find(t => t.id === householdType)?.description}
                  </div>
                </div>
              </div>
            </div>

            {/* Features preview */}
            <div>
              <h3 className="text-sm font-medium text-cozy-text mb-3">What you'll get:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-cozy-text-muted">
                  <Users className="w-4 h-4" />
                  Invite family members
                </div>
                <div className="flex items-center gap-2 text-sm text-cozy-text-muted">
                  <Home className="w-4 h-4" />
                  Shared shopping lists
                </div>
                <div className="flex items-center gap-2 text-sm text-cozy-text-muted">
                  <Heart className="w-4 h-4" />
                  Medicine tracking
                </div>
                <div className="flex items-center gap-2 text-sm text-cozy-text-muted">
                  <User className="w-4 h-4" />
                  Family finances
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? 'Creating...' : 'Create Household'}
                <Sparkles className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
