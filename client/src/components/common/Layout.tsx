import React from "react";
import { Link } from "wouter";
import Footer from "./Footer";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl min-h-screen flex flex-col">
      {/* Logo/Header */}
      <header className="flex justify-center mb-6">
        <Link href="/">
          <div className="text-center cursor-pointer">
            <h1 className="text-3xl md:text-4xl font-bold text-primary font-poppins">
              <span className="inline-block transform -rotate-2">Qzon</span>
              <span className="inline-block text-[#E76F51] transform rotate-2">Me</span>
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              How well do your friends know you?
            </p>
          </div>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-grow">{children}</main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Layout;
