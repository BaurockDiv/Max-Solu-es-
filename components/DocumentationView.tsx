
import React from 'react';

const DocumentationView: React.FC = () => {
  return (
    <div className="p-6 bg-white dark:bg-zinc-950 min-h-full space-y-8 prose dark:prose-invert max-w-none">
      <section>
        <h1 className="text-3xl font-bold mb-2">BizStream Specification</h1>
        <p className="text-zinc-500">Professional Discovery Platform v1.0.0</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b pb-2">1. App Overview</h2>
        <p>BizStream is a mobile-first discovery ecosystem designed to bridge the gap between creative professional content and consumer intent. Unlike entertainment-focused social networks, BizStream prioritizes <strong>Conversion, Contact, and Credibility</strong>.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b pb-2">2. User Flow</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Discovery:</strong> User lands on the vertical feed, optimized for location-based and interest-based business discovery.</li>
          <li><strong>Engagement:</strong> High-impact short-form media showcases specific services (e.g., a plumber showing a repair, a hotel showing a room).</li>
          <li><strong>Action:</strong> Sticky Call-to-Action buttons (Book, Buy, Contact) provide immediate utility.</li>
          <li><strong>Verification:</strong> Professional profiles offer detailed credibility markers: ratings, location, hours, and direct links.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b pb-2">3. Feature Breakdown</h2>
        <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl space-y-2">
          <p><strong>Professional Feed:</strong> 60s vertical video/photo limit with auto-play and high-retention scrolling.</p>
          <p><strong>Direct CTAs:</strong> Native WhatsApp, Phone, and Email integration without leaving the business context.</p>
          <p><strong>Link Tree Native:</strong> Integrated link aggregator in profiles for social media and external stores.</p>
          <p><strong>Affiliate Engine:</strong> Native support for affiliate tags and link performance tracking.</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b pb-2">4. Profile Structure</h2>
        <p>Modular dashboard layout for businesses including:</p>
        <ul className="list-disc pl-5">
          <li>Dynamic Bio + Verified Badge</li>
          <li>Operating Hours & Live Status</li>
          <li>Geofenced Physical Address (Map Integration)</li>
          <li>Custom Portfolio Tab (Reels Archive)</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b pb-2">5. Feed Logic</h2>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 border-l-4 border-blue-600">
          <p className="text-sm">The algorithm prioritizes <strong>Proximity</strong> and <strong>Intent</strong> over viral popularity. Businesses within 50km receive priority visibility for service-based categories.</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b pb-2">6. UI/UX Principles</h2>
        <ul className="list-disc pl-5">
          <li><strong>Professional Aesthetic:</strong> Higher information density than TikTok, cleaner than Instagram.</li>
          <li><strong>Frictionless Interaction:</strong> One-tap contact methods.</li>
          <li><strong>Trust Indicators:</strong> Prominent review scores and verified badges.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b pb-2">7. Technical Architecture</h2>
        <p>Built with scalability in mind:</p>
        <ul className="list-disc pl-5">
          <li><strong>Frontend:</strong> React (TypeScript) + Tailwind CSS.</li>
          <li><strong>Media Delivery:</strong> Global CDN with adaptive bitrate streaming (HLS/DASH).</li>
          <li><strong>Database:</strong> Scalable NoSQL for high-frequency engagement data.</li>
          <li><strong>AI Layer:</strong> Gemini-driven content moderation and smart caption suggestions.</li>
        </ul>
      </section>

      <section className="space-y-4 mb-12">
        <h2 className="text-xl font-bold border-b pb-2">8. Scalability</h2>
        <p>Future expansions include: Native payment processing, real-time booking calendar integration, and AR-based product visualization.</p>
      </section>
    </div>
  );
};

export default DocumentationView;
