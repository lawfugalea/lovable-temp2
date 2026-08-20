import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { Alert, AlertDescription } from './ui/Alert';
import { Home, Users, Heart, CircleDollarSign, Sparkles, ArrowRight, ArrowLeft, MapPin, AlertCircle } from 'lucide-react';
import { COUNTRY_OPTIONS, FALLBACK_COUNTRY } from '@/lib/countries';
import { cn } from '@/lib/utils';

interface NameSuggestion {
  name: string;
  type: string;
  description: string;
}

interface HouseholdCreationWizardProps {
  onComplete: (householdId: string) => void;
  onCancel: () => void;
}

const STEP_LABELS = ['Name', 'Confirm'] as const;

export default function HouseholdCreationWizard({ onComplete, onCancel }: HouseholdCreationWizardProps) {
  const [step, setStep] = useState(1);
  const [householdName, setHouseholdName] = useState('');
  // Sent to /api/household/create, where it only seeds the generated name when
  // no name was typed. It is not stored — there is no Household.type column.
  const [householdType, setHouseholdType] = useState('personal');
  const [summary, setSummary] = useState('');
  const [customName, setCustomName] = useState('');
  const [suggestions, setSuggestions] = useState<NameSuggestion[]>([]);
  const [country, setCountry] = useState('MT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadSuggestions = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void loadSuggestions();
  }, [loadSuggestions]);

  // Prefill the country from infrastructure geo headers, falling back to the
  // browser timezone. Only a default — the user confirms it in step 2.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let detected: string | null = null;
      try {
        const response = await fetch('/api/geo/country');
        const data = await response.json().catch(() => ({}));
        if (typeof data.country === 'string') detected = data.country.toUpperCase();
      } catch {
        // No geo signal; fall through to the timezone check.
      }
      if (!detected) {
        try {
          detected = Intl.DateTimeFormat().resolvedOptions().timeZone === 'Europe/Malta' ? 'MT' : FALLBACK_COUNTRY;
        } catch {
          return;
        }
      }
      if (cancelled) return;
      setCountry(COUNTRY_OPTIONS.some(option => option.code === detected) ? detected : FALLBACK_COUNTRY);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSuggestionSelect = (suggestion: NameSuggestion) => {
    setHouseholdName(suggestion.name);
    setHouseholdType(suggestion.type);
    setSummary(suggestion.description);
    setCustomName('');
  };

  const handleCustomNameChange = (value: string) => {
    setCustomName(value);
    setHouseholdName(value);
    setSummary('');
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
          country,
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

  const errorAlert = error ? (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  ) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ol className="mb-8 flex items-center justify-center gap-4" aria-label="Household setup progress">
        {STEP_LABELS.map((label, index) => {
          const position = index + 1;
          const reached = step >= position;
          return (
            <React.Fragment key={label}>
              {index > 0 && (
                <li aria-hidden="true" className={cn('h-1 w-16 rounded-full', reached ? 'bg-primary' : 'bg-border')} />
              )}
              <li className="flex items-center gap-2" aria-current={step === position ? 'step' : undefined}>
                <span
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-full text-sm font-medium',
                    reached ? 'bg-primary text-primary-foreground' : 'bg-border text-muted-foreground',
                  )}
                >
                  {position}
                </span>
                <span className={cn('text-sm font-medium', reached ? 'text-foreground' : 'text-muted-foreground')}>
                  {label}
                </span>
              </li>
            </React.Fragment>
          );
        })}
      </ol>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Choose your household name
            </CardTitle>
            <CardDescription>
              Pick a name that represents your household. You can always change this later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-medium text-foreground">Suggested names</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {suggestions.slice(0, 6).map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionSelect(suggestion)}
                    aria-pressed={householdName === suggestion.name}
                    className={cn(
                      'rounded-lg border p-3 text-left transition-all hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      householdName === suggestion.name ? 'border-primary bg-primary/10' : 'border-border',
                    )}
                  >
                    <div className="font-medium text-foreground">{suggestion.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{suggestion.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-foreground">Or create your own</h3>
              <Input
                type="text"
                placeholder="Enter a custom household name"
                aria-label="Custom household name"
                value={customName}
                onChange={(e) => handleCustomNameChange(e.target.value)}
                className="w-full"
              />
            </div>

            {errorAlert}

            <div className="flex flex-wrap justify-between gap-3">
              <Button variant="ghost" onClick={onCancel}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext} disabled={!householdName.trim()}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Confirm your household
            </CardTitle>
            <CardDescription>
              Review your household details before creating it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary text-xl" aria-hidden="true">
                  🏡
                </div>
                <div>
                  <div className="text-lg font-semibold text-foreground">{householdName}</div>
                  <div className="text-sm text-muted-foreground">
                    {summary || 'Everything you share lives here.'}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <MapPin className="h-4 w-4" />
                Where is your home?
              </h3>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                aria-label="Household country"
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {COUNTRY_OPTIONS.map(option => (
                  <option key={option.code} value={option.code}>{option.label}</option>
                ))}
              </select>
              <p className="mt-2 text-xs text-muted-foreground">
                This helps ClanKeep use the right regional defaults for your household.
              </p>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-foreground">What you&apos;ll get</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4 shrink-0" />
                  Invite the rest of your household
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Home className="h-4 w-4 shrink-0" />
                  Shared shopping, meals and chores
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Heart className="h-4 w-4 shrink-0" />
                  Medicine tracking for one child
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CircleDollarSign className="h-4 w-4 shrink-0" />
                  <span>Money planner and banking</span>
                  <Badge variant="secondary" className="shrink-0">Family plan</Badge>
                </div>
              </div>
            </div>

            {errorAlert}

            <div className="flex flex-wrap justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? 'Creating…' : 'Create household'}
                <Sparkles className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
