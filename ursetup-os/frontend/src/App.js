import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { LangProvider } from "./contexts/LangContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";

import Loader from "./components/sections/Loader";
import PromoBanner from "./components/sections/PromoBanner";
import Header from "./components/sections/Header";
import Hero from "./components/sections/Hero";
import About from "./components/sections/About";
import WhyUs from "./components/sections/WhyUs";
import Reviews from "./components/sections/Reviews";
import Testimonials from "./components/sections/Testimonials";
import Stats from "./components/sections/Stats";
import FAQ from "./components/sections/FAQ";
import Newsletter from "./components/sections/Newsletter";
import Contact from "./components/sections/Contact";
import ComingSoon from "./components/sections/ComingSoon";
import Products from "./components/sections/Products";
import Footer from "./components/sections/Footer";
import FloatingWidgets from "./components/sections/FloatingWidgets";

// UR SETUP OS — single internal system
import OSLogin from "./os/OSLogin";
import OSLayout from "./os/OSLayout";
import OSAuthCallback from "./os/OSAuthCallback";
import OSDashboard from "./os/pages/OSDashboard";
import OSEmployees from "./os/pages/OSEmployees";
import OSLogs from "./os/pages/OSLogs";
import OSSettings from "./os/pages/OSSettings";
import OSComingSoon from "./os/pages/OSComingSoon";
import OSMarketing from "./os/pages/OSMarketing";
import OSSupport from "./os/pages/OSSupport";
import OSProducts from "./os/pages/OSProducts";
import OSPending from "./os/pages/OSPending";

const TOASTER_OPTIONS = {
  style: {
    background: "#0F0F11",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#F5F5F4",
  },
};

function PublicSite() {
  return (
    <>
      <Loader />
      <div className="grain min-h-screen">
        <PromoBanner />
        <Header />
        <main>
          <Hero />
          <Products />
          <About />
          <WhyUs />
          <Reviews />
          <Testimonials />
          <Stats />
          <FAQ />
          <Newsletter />
          <Contact />
          <ComingSoon />
        </main>
        <Footer />
        <FloatingWidgets />
      </div>
    </>
  );
}

function AppRouter() {
  const location = useLocation();
  // Emergent Google OAuth callback (#session_id=…)
  if (location.hash && location.hash.includes("session_id=") &&
      (location.pathname === "/os" || location.pathname === "/os/" || location.pathname === "/")) {
    return <OSAuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<PublicSite />} />

      {/* UR SETUP OS — single internal system */}
      <Route path="/os/login" element={<OSLogin />} />
      <Route path="/os/pending" element={<OSPending />} />
      <Route path="/os" element={<OSLayout />}>
        <Route index element={<OSDashboard />} />
        <Route path="orders" element={<OSComingSoon moduleKey="orders" />} />
        <Route path="customers" element={<OSComingSoon moduleKey="customers" />} />
        <Route path="products" element={<OSProducts />} />
        <Route path="marketing" element={<OSMarketing />} />
        <Route path="support" element={<OSSupport />} />
        <Route path="employees" element={<OSEmployees />} />
        <Route path="analytics" element={<OSComingSoon moduleKey="analytics" />} />
        <Route path="logs" element={<OSLogs />} />
        <Route path="settings" element={<OSSettings />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <LangProvider>
            <AppRouter />
            <Toaster position="top-center" theme="dark" toastOptions={TOASTER_OPTIONS} />
          </LangProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
