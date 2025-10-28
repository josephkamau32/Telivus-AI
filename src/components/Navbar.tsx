import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import telivusLogo from '@/assets/telivus-logo.png';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export const Navbar = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 sm:gap-3 transition-transform hover:scale-105">
          <img src={telivusLogo} alt="Telivus" className="h-8 w-8 sm:h-10 sm:w-10" />
          <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Telivus
          </span>
        </Link>
        
        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          <Link 
            to="/" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/') ? 'text-primary' : 'text-foreground/80'
            }`}
          >
            Home
          </Link>
          <Link 
            to="/about" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/about') ? 'text-primary' : 'text-foreground/80'
            }`}
          >
            About
          </Link>
          <Link 
            to="/contact" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/contact') ? 'text-primary' : 'text-foreground/80'
            }`}
          >
            Contact
          </Link>
        </div>
        
        {/* Desktop Right side actions */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <Link to="/auth">
            <Button variant="default" className="bg-gradient-to-r from-primary to-secondary">
              Get Started
            </Button>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur">
          <div className="container px-4 py-4 space-y-4">
            <Link 
              to="/" 
              className={`block text-sm font-medium transition-colors hover:text-primary ${
                isActive('/') ? 'text-primary' : 'text-foreground/80'
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/about" 
              className={`block text-sm font-medium transition-colors hover:text-primary ${
                isActive('/about') ? 'text-primary' : 'text-foreground/80'
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              About
            </Link>
            <Link 
              to="/contact" 
              className={`block text-sm font-medium transition-colors hover:text-primary ${
                isActive('/contact') ? 'text-primary' : 'text-foreground/80'
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Contact
            </Link>
            <div className="pt-2">
              <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="default" className="w-full bg-gradient-to-r from-primary to-secondary">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};