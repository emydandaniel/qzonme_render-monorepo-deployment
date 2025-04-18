import React from "react";
import { Link } from "wouter";

const Footer: React.FC = () => {
  return (
    <footer className="w-full py-4 mt-8 text-center text-sm text-muted-foreground">
      <div className="max-w-4xl mx-auto px-4">
        <nav className="flex flex-wrap justify-center gap-6 mb-2">
          <Link href="/privacy-policy">
            <span className="hover:text-primary transition-colors cursor-pointer">Privacy Policy</span>
          </Link>
          <Link href="/terms-conditions">
            <span className="hover:text-primary transition-colors cursor-pointer">Terms & Conditions</span>
          </Link>
          <Link href="/about">
            <span className="hover:text-primary transition-colors cursor-pointer">About</span>
          </Link>
        </nav>
        <div className="text-xs">
          &copy; {new Date().getFullYear()} QzonMe. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;