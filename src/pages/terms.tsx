import React from 'react'
import SEO from '../components/SEO'
import Link from 'next/link'

export default function TermsOfService() {
  return (
    <>
      <SEO 
        title="Terms of Service"
        description="HouseFlow's Terms of Service - Read our terms and conditions for using our family management application."
        keywords="terms of service, terms and conditions, user agreement, family app terms"
        url="/terms"
        noindex={true}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-sm border-b border-orange-200/50 sticky top-0 z-10 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl shadow-lg">
                <span className="text-white text-xl">📋</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Terms of Service</h1>
                <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
              </div>
            </div>
            <Link 
              href="/"
              className="text-orange-600 hover:text-orange-700 font-medium"
            >
              ← Back to HouseFlow
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-orange-200/50 p-8">
            
            <div className="prose prose-lg max-w-none">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Agreement to Terms</h2>
              <p className="text-gray-700 mb-6">
                By accessing and using HouseFlow ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>

              <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Description of Service</h2>
              <p className="text-gray-700 mb-4">
                HouseFlow is a family management application that provides tools for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-6">
                <li>Managing family schedules and appointments</li>
                <li>Managing shopping lists with price comparison from external stores</li>
                <li>Tracking family medications, dosages, and health reactions</li>
                <li>Monitoring fever journals and temperature readings</li>
                <li>Organizing household finances and budgets</li>
                <li>Push notifications for medication reminders</li>
                <li>OCR text extraction from uploaded images</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">User Accounts</h2>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Account Creation</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>You must provide accurate and complete information when creating an account</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                <li>You must be at least 13 years old to create an account</li>
                <li>One person may not maintain multiple accounts</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Account Responsibilities</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-6">
                <li>You are responsible for all activities that occur under your account</li>
                <li>You must notify us immediately of any unauthorized use of your account</li>
                <li>You may not share your account credentials with others</li>
                <li>You may not use another person's account without permission</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Acceptable Use</h2>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Permitted Uses</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Personal and family use of the application</li>
                <li>Creating and managing household information</li>
                <li>Collaborating with family members and household members</li>
                <li>Using features as intended by the application design</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Prohibited Uses</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-6">
                <li>Violating any applicable laws or regulations</li>
                <li>Transmitting harmful, offensive, or inappropriate content</li>
                <li>Attempting to gain unauthorized access to the service or other users' accounts</li>
                <li>Using the service for commercial purposes without permission</li>
                <li>Interfering with or disrupting the service or servers</li>
                <li>Reverse engineering, decompiling, or disassembling the application</li>
                <li>Creating automated scripts or bots to access the service</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Content and Data</h2>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Your Content</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>You retain ownership of all content you create and upload</li>
                <li>You grant us a license to store, process, and display your content to provide the service</li>
                <li>You are responsible for ensuring your content does not violate these terms</li>
                <li>You represent that you have the right to share any content you upload</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Health Information</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-6">
                <li>Health information is stored securely and encrypted in our PostgreSQL database</li>
                <li>You are responsible for the accuracy of health data you enter</li>
                <li>We are not a medical service and do not provide medical advice</li>
                <li>Always consult healthcare professionals for medical decisions</li>
                <li>Medicine tracking features are for organizational purposes only</li>
                <li>Fever journal data should not replace professional medical monitoring</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Privacy and Data Protection</h2>
              <p className="text-gray-700 mb-6">
                Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the Service, you consent to the collection and use of information as described in our Privacy Policy.
              </p>

              <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Service Availability</h2>
              <ul className="list-disc pl-6 text-gray-700 mb-6">
                <li>We strive to maintain high service availability but cannot guarantee 100% uptime</li>
                <li>We may perform scheduled maintenance that temporarily affects service availability</li>
                <li>We reserve the right to modify or discontinue the service with reasonable notice</li>
                <li>We are not liable for any downtime or service interruptions</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Intellectual Property</h2>
              <p className="text-gray-700 mb-4">
                The HouseFlow application, including its design, features, and functionality, is owned by us and protected by intellectual property laws. You may not:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-6">
                <li>Copy, modify, or distribute the application</li>
                <li>Create derivative works based on the application</li>
                <li>Remove or alter any proprietary notices</li>
                <li>Use our trademarks or logos without permission</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Limitation of Liability</h2>
              <p className="text-gray-700 mb-6">
                To the maximum extent permitted by law, HouseFlow shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or use, arising out of or relating to your use of the service.
              </p>

              <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Disclaimers</h2>
              <ul className="list-disc pl-6 text-gray-700 mb-6">
                <li>The service is provided "as is" without warranties of any kind</li>
                <li>We do not warrant that the service will be uninterrupted or error-free</li>
                <li>We are not responsible for the accuracy of third-party data or integrations</li>
                <li>We do not provide medical, financial, or legal advice</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Termination</h2>
              <p className="text-gray-700 mb-4">
                We may terminate or suspend your account and access to the service immediately, without prior notice, for any reason, including if you breach these Terms. Upon termination:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-6">
                <li>Your right to use the service will cease immediately</li>
                <li>We may delete your account and associated data</li>
                <li>You may request data export before account deletion</li>
                <li>Provisions that by their nature should survive termination will remain in effect</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Changes to Terms</h2>
              <p className="text-gray-700 mb-6">
                We reserve the right to modify these Terms at any time. We will notify users of material changes via email or through the application. Your continued use of the service after such modifications constitutes acceptance of the updated Terms.
              </p>

              <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Governing Law</h2>
              <p className="text-gray-700 mb-6">
                These Terms shall be governed by and construed in accordance with applicable laws. Any disputes arising from these Terms or your use of the service shall be resolved through binding arbitration or in the courts of competent jurisdiction.
              </p>

              <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Contact Information</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-gray-700">
                  <strong>Email:</strong> legal@galeahub.online<br/>
                  <strong>Website:</strong> https://galeahub.online<br/>
                  <strong>Response Time:</strong> We will respond to your inquiry within 48 hours
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-orange-200">
                <p className="text-sm text-gray-600">
                  These Terms of Service are effective as of {new Date().toLocaleDateString()} and will remain in effect except with respect to any changes in their provisions in the future.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
