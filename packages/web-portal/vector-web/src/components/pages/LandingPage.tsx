import Navbar from "@/components/shared/Navbar";
import HeroSection from "@/components/features/HeroSection";
import FeaturesSection from "@/components/features/FeaturesSection";
import WorkflowSection from "@/components/features/WorkflowSection";
import CTASection from "@/components/features/CTASection";
import Footer from "@/components/shared/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <WorkflowSection />
      <CTASection />
      <Footer />
    </div>
  );
}