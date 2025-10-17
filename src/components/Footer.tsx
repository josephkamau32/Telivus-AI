import { Phone, MapPin, Mail, Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';
import telivusLogo from '@/assets/telivus-logo.png';

export const Footer = () => {
  return (
    <footer className="border-t border-border/40 bg-card/50 backdrop-blur-sm">
      <div className="container px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={telivusLogo} alt="Telivus" className="h-10 w-10" />
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Telivus
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your AI-powered health companion for smarter self-care and personalized health insights.
            </p>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4 text-foreground">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Get Started
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Contact Information */}
          <div>
            <h3 className="font-semibold mb-4 text-foreground">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">+254 725 999 285</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">info@telivus.co.ke</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">
                  Kenrail Towers, Westlands<br />
                  P.O. Box 34209-00100<br />
                  Nairobi, Kenya
                </span>
              </li>
            </ul>
          </div>
          
          {/* Social Media */}
          <div>
            <h3 className="font-semibold mb-4 text-foreground">Follow Us</h3>
            <div className="flex gap-3">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-border/40 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Telivus. All rights reserved. | Privacy Policy | Terms of Service
          </p>
        </div>
      </div>
    </footer>
  );
};