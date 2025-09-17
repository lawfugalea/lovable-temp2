import React from 'react'
import SEO from '../components/SEO'
import Link from 'next/link'

export default function PrivacyPolicy() {
  return (
    <>
      <SEO 
        title="Privacy Policy"
        description="HouseFlow's Privacy Policy - Learn how we protect your family's data and privacy in our household management app."
        keywords="privacy policy, data protection, family privacy, household app privacy, GDPR compliance"
        url="/privacy"
        noindex={true}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-sm border-b border-orange-200/50 sticky top-0 z-10 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl shadow-lg">
                <span className="text-white text-xl">🏠</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Privacy Policy</h1>
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
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Introduction</h2>
              <p className="text-gray-700 mb-6">
                Welcome to HouseFlow ("we," "our," or "us"). We are committed to protecting your privacy and the privacy of your family. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our family management application.
              </p>

              <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Personal Information</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-6">
                <li>Name and email address for account creation</li>
                <li>Family member names and basic information</li>
                <li>Household details and preferences</li>
                <li>Profile pictures and avatars</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Health Information</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-6">
                <li>Medicine schedules, dosages, and administration records</li>
                <li>Fever journal entries with temperature readings</li>
                <li>Medicine reaction tracking and adverse effects</li>
                <li>Children's health information and medical history</li>
                <li>Health reminders and medication notifications</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Usage Data</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-6">
                <li>App usage patterns and features accessed</li>
                <li>Device information and browser type</li>
                <li>IP address and location data (general area only)</li>
                <li>Cookies and similar tracking technologies</li>
                <li>Push notification subscription data</li>
                <li>OCR text extracted from uploaded images</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">How We Use Your Information</h2>
              <ul className="list-disc pl-6 text-gray-700 mb-6">
                <li>Provide and maintain our family management services</li>
                <li>Send medication reminders and push notifications</li>
                <li>Enable family collaboration and real-time sharing features</li>
                <li>Process and display price comparison data from external stores</li>
                <li>Extract searchable text from uploaded images using OCR</li>
                <li>Improve our app functionality and user experience</li>
                <li>Provide customer support and respond to inquiries</li>
                <li>Ensure security and prevent fraud</li>
                <li>Comply with legal obligations</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Information Sharing</h2>
              <p className="text-gray-700 mb-4">
                We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-6">
                <li><strong>Family Members:</strong> Information shared within your household as intended by the app</li>
                <li><strong>Service Providers:</strong> Trusted third parties who assist in app operations (hosting, analytics)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In case of merger, acquisition, or sale of assets</li>
                <li><strong>Consent:</strong> When you explicitly consent to sharing</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Data Security</h2>
              <p className="text-gray-700 mb-4">
                We implement industry-standard security measures to protect your information:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-6">
                <li>End-to-end encryption for sensitive data</li>
                <li>Secure data transmission (HTTPS/TLS)</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and authentication</li>
                <li>Secure data storage and backup procedures</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Your Rights</h2>
              <p className="text-gray-700 mb-4">
                You have the following rights regarding your personal information:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-6">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal data</li>
                <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
                <li><strong>Restriction:</strong> Limit how we process your data</li>
                <li><strong>Objection:</strong> Object to certain data processing activities</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Children's Privacy</h2>
              <p className="text-gray-700 mb-6">
                HouseFlow is designed for family use. We collect children's information only with explicit parental consent. Parents can review, modify, or delete their children's information at any time. We do not knowingly collect personal information from children under 13 without parental consent.
              </p>

              <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Data Retention</h2>
              <p className="text-gray-700 mb-6">
                We retain your personal information only as long as necessary to provide our services and comply with legal obligations. When you delete your account, we will delete your personal data within 30 days, except where retention is required by law.
              </p>

              <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">International Data Transfers</h2>
              <p className="text-gray-700 mb-6">
                Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data in accordance with applicable privacy laws.
              </p>

              <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Changes to This Policy</h2>
              <p className="text-gray-700 mb-6">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. Your continued use of HouseFlow after such changes constitutes acceptance of the updated policy.
              </p>

              <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-gray-700">
                  <strong>Email:</strong> privacy@galeahub.online<br/>
                  <strong>Website:</strong> https://galeahub.online<br/>
                  <strong>Response Time:</strong> We will respond to your inquiry within 48 hours
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-orange-200">
                <p className="text-sm text-gray-600">
                  This Privacy Policy is effective as of {new Date().toLocaleDateString()} and will remain in effect except with respect to any changes in its provisions in the future.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
