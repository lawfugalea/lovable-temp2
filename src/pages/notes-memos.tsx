import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import ModernAppShell from '../components/ModernAppShell'
import SEO from '../components/SEO'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { FileText, Users, Search, Tag, Pin, Archive, Plus, ExternalLink } from 'lucide-react'

export default function NotesPage() {
  const { data: session, status } = useSession()
  const [memosUrl, setMemosUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get the Memos URL from environment variables
    const baseUrl = process.env.NEXT_PUBLIC_MEMOS_URL || 'http://localhost:5230'
    setMemosUrl(baseUrl)
    setIsLoading(false)
  }, [])

  if (status === 'loading') {
    return (
      <ModernAppShell>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cozy-primary"></div>
        </div>
      </ModernAppShell>
    )
  }

  if (!session) {
    return (
      <ModernAppShell>
        <div className="flex items-center justify-center h-64">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Sign In Required</CardTitle>
              <CardDescription className="text-center">
                Please sign in to access your family notes.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </ModernAppShell>
    )
  }

  return (
    <>
      <SEO 
        title="Family Notes - HouseFlow" 
        description="Collaborate on notes with your family. Share ideas, keep important information, and stay organized together."
      />
      <ModernAppShell>
        <div className="space-y-6">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-cozy-primary to-cozy-secondary rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <FileText className="h-8 w-8" />
                  Family Notes
                </h1>
                <p className="text-cozy-cream mt-2 text-lg">
                  Collaborate on notes with your family. Share ideas, keep important information, and stay organized together.
                </p>
              </div>
              <div className="hidden md:flex items-center gap-4">
                <Badge variant="secondary" className="bg-white/20 text-white">
                  <Users className="h-4 w-4 mr-1" />
                  Family Collaboration
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white">
                  <Search className="h-4 w-4 mr-1" />
                  Smart Search
                </Badge>
              </div>
            </div>
          </div>

          {/* Features Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-cozy-cream border-cozy-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cozy-primary/10 rounded-lg">
                    <Tag className="h-5 w-5 text-cozy-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-cozy-text">Organized</h3>
                    <p className="text-sm text-cozy-text-muted">Tag and categorize your notes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-cozy-cream border-cozy-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cozy-secondary/10 rounded-lg">
                    <Pin className="h-5 w-5 text-cozy-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-cozy-text">Important</h3>
                    <p className="text-sm text-cozy-text-muted">Pin and archive notes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-cozy-cream border-cozy-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cozy-accent/10 rounded-lg">
                    <Archive className="h-5 w-5 text-cozy-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-cozy-text">Secure</h3>
                    <p className="text-sm text-cozy-text-muted">Your data stays private</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Memos Integration */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-cozy-cream border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Your Family Notes
                  </CardTitle>
                  <CardDescription>
                    Powered by Memos - A privacy-first note-taking platform
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(memosUrl, '_blank')}
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open in New Tab
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cozy-primary mx-auto mb-4"></div>
                    <p className="text-cozy-text-muted">Loading your notes...</p>
                  </div>
                </div>
              ) : (
                <div className="h-[calc(100vh-24rem)] w-full">
                  <iframe
                    src={memosUrl}
                    className="w-full h-full border-0"
                    title="Family Notes - Memos"
                    allow="clipboard-write"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => window.open(`${memosUrl}/memo`, '_blank')}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create New Note
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(`${memosUrl}/explore`, '_blank')}
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Explore Notes
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(`${memosUrl}/archived`, '_blank')}
              className="flex items-center gap-2"
            >
              <Archive className="h-4 w-4" />
              Archived Notes
            </Button>
          </div>
        </div>
      </ModernAppShell>
    </>
  )
}

